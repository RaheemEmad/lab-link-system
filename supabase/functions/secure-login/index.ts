import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
}

// Input validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password }: LoginRequest = await req.json();

    // Get client IP and user agent for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!validatePassword(password)) {
      return new Response(
        JSON.stringify({ error: 'Invalid password format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if account is locked
    const { data: isLocked, error: lockCheckError } = await supabase
      .rpc('is_account_locked', { user_email: email.toLowerCase() });

    if (lockCheckError) {
      console.error('Lock check error');
      return new Response(
        JSON.stringify({ error: 'An error occurred. Please try again.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (isLocked) {
      // Log the failed attempt due to lockout
      await supabase.from('login_attempts').insert({
        email: email.toLowerCase(),
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ 
          error: 'ACCOUNT_LOCKED',
          message: 'Account temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or contact support.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Attempt login with password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log failed attempt
    if (signInError) {
      await supabase.from('login_attempts').insert({
        email: email.toLowerCase(),
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log successful attempt
    await supabase.from('login_attempts').insert({
      email: email.toLowerCase(),
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Return session data
    return new Response(
      JSON.stringify({ 
        session: signInData.session,
        user: signInData.user,
        message: 'Login successful' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error');
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
