import { supabase } from "@/integrations/supabase/client";

/**
 * Get the user's IP address using server-side detection via Edge Function
 * Falls back to client-side API if edge function fails
 * Returns null if unable to fetch (graceful degradation)
 */
export async function getUserIP(): Promise<string | null> {
  try {
    // Try server-side IP detection first (most reliable)
    const { data, error } = await supabase.functions.invoke('detect-ip', {
      method: 'GET',
    });

    if (!error && data?.ip) {
      console.log('IP detected via edge function:', data.ip);
      return data.ip;
    }

    console.warn('Edge function IP detection failed, trying fallback:', error);

    // Fallback to client-side IP detection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const fallbackData = await response.json();
      if (fallbackData.ip) {
        console.log('IP detected via fallback API:', fallbackData.ip);
        return fallbackData.ip;
      }
    }

    // Both methods failed - return null (rate limiting will be skipped)
    console.warn('All IP detection methods failed');
    return null;
  } catch (error) {
    // Silently fail - IP detection is optional for UX
    console.warn('IP detection unavailable:', error);
    return null;
  }
}

/**
 * Check if OAuth attempts from this IP are rate limited
 */
export async function checkOAuthRateLimit(
  ipAddress: string,
  email?: string
): Promise<{
  isLocked: boolean;
  attempts: number;
  maxAttempts: number;
  retryAfterSeconds?: number;
  lockoutEnd?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('check_oauth_rate_limit', {
      ip_address_param: ipAddress,
      email_param: email || null,
    });

    if (error) {
      console.error('Error checking OAuth rate limit:', error);
      return {
        isLocked: false,
        attempts: 0,
        maxAttempts: 5,
      };
    }

    const result = data as any;
    
    return {
      isLocked: result?.is_locked || false,
      attempts: result?.attempts || 0,
      maxAttempts: result?.max_attempts || 5,
      retryAfterSeconds: result?.retry_after_seconds,
      lockoutEnd: result?.lockout_end,
    };
  } catch (error) {
    console.error('Error in checkOAuthRateLimit:', error);
    return {
      isLocked: false,
      attempts: 0,
      maxAttempts: 5,
    };
  }
}

/**
 * Log an OAuth attempt to the database
 */
export async function logOAuthAttempt(
  email: string,
  success: boolean,
  ipAddress: string
): Promise<void> {
  try {
    const userAgent = navigator.userAgent;
    
    await supabase.rpc('log_oauth_attempt', {
      email_param: email,
      success_param: success,
      ip_address_param: ipAddress,
      user_agent_param: userAgent,
    });
  } catch (error) {
    console.error('Error logging OAuth attempt:', error);
  }
}

/**
 * Check if a user's email is verified
 */
export function isEmailVerified(user: any): boolean {
  // Google OAuth users have verified emails
  if (user?.app_metadata?.provider === 'google') {
    return true;
  }
  
  // Check if email is confirmed
  return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
}

/**
 * Format retry time for user display
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
