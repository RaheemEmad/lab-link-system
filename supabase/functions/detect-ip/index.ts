import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP from various headers (in order of preference)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    let ip: string | null = null;

    // x-forwarded-for can contain multiple IPs, take the first one (client IP)
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
      ip = realIP;
    } else if (cfConnectingIP) {
      ip = cfConnectingIP;
    }

    // Get user agent for additional tracking
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (!ip) {
      return new Response(
        JSON.stringify({ 
          error: 'Unable to detect IP address',
          ip: null 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log for debugging (optional)
    console.log('IP Detection:', {
      ip,
      userAgent,
      headers: {
        forwardedFor,
        realIP,
        cfConnectingIP
      }
    });

    return new Response(
      JSON.stringify({ 
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in detect-ip function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        ip: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
