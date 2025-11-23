import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  endpoint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limiting utility for edge functions
 * Uses database table for distributed rate limiting across function instances
 */
export async function checkRateLimit(
  supabaseClient: SupabaseClient<any>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier, endpoint } = config;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Get current request count for this identifier + endpoint in the time window
    const { data: existingLimits, error: selectError } = await supabaseClient
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking rate limit:', selectError);
      // Fail open - allow request on error
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }

    let currentCount = 0;
    let resetAt = new Date(now.getTime() + windowMs);

    if (existingLimits && existingLimits.request_count !== null) {
      currentCount = existingLimits.request_count;
      if (existingLimits.window_start) {
        resetAt = new Date(new Date(existingLimits.window_start).getTime() + windowMs);
      }
    }

    // Check if limit exceeded
    if (currentCount >= maxRequests) {
      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
      
      // Log rate limit violation
      console.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);

      // Create admin notification for rate limit exceeded
      try {
        await supabaseClient.rpc('create_admin_notification', {
          title_param: 'Rate Limit Exceeded',
          message_param: `Rate limit exceeded on ${endpoint}. Identifier: ${identifier.substring(0, 20)}...`,
          severity_param: 'warning',
          category_param: 'rate_limiting',
          metadata_param: {
            endpoint,
            identifier: identifier.substring(0, 50),
            currentCount,
            maxRequests,
            retryAfter,
            timestamp: now.toISOString()
          }
        });
      } catch (notifError) {
        console.error('Failed to create admin notification:', notifError);
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Update or insert rate limit record
    if (existingLimits) {
      await supabaseClient
        .from('rate_limits')
        .update({
          request_count: currentCount + 1,
        })
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString());
    } else {
      await supabaseClient
        .from('rate_limits')
        .insert({
          identifier,
          endpoint,
          request_count: 1,
          window_start: now.toISOString(),
        });
    }

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request on error
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Order creation: 10 orders per hour per user
  ORDER_CREATION: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Chat messages: 60 messages per minute per user
  CHAT_MESSAGES: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // File uploads: 20 files per hour per user
  FILE_UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Lab requests: 30 requests per hour per lab
  LAB_REQUESTS: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // API calls (general): 100 requests per minute per IP
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Login attempts: 5 attempts per 15 minutes per IP
  LOGIN_ATTEMPTS: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Get client identifier (user ID or IP address)
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) return userId;
  
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
}
