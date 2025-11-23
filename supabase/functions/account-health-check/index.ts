import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  issues: Array<{
    severity: 'low' | 'medium' | 'high';
    issue: string;
    suggestion: string;
    action?: string;
  }>;
  user: {
    authenticated: boolean;
    hasRole: boolean;
    onboardingComplete: boolean;
    email?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const result: HealthCheckResult = {
      status: 'healthy',
      issues: [],
      user: {
        authenticated: !!user,
        hasRole: false,
        onboardingComplete: false,
      },
    };

    if (authError || !user) {
      result.status = 'critical';
      result.issues.push({
        severity: 'high',
        issue: 'User is not authenticated',
        suggestion: 'Please sign in to your account',
        action: 'redirect_to_auth',
      });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    result.user.email = user.email;

    // Check user role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, lab_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) {
      console.error('Role fetch error:', roleError);
      result.status = 'warning';
      result.issues.push({
        severity: 'medium',
        issue: 'Unable to fetch user role',
        suggestion: 'There may be a temporary issue. Try refreshing the page.',
        action: 'retry',
      });
    } else if (!userRole) {
      result.status = 'critical';
      result.user.hasRole = false;
      result.issues.push({
        severity: 'high',
        issue: 'No role assigned to account',
        suggestion: 'Complete the onboarding process to assign a role',
        action: 'redirect_to_onboarding',
      });
    } else {
      result.user.hasRole = true;
    }

    // Check profile completion
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed, full_name, phone, clinic_name, lab_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      result.status = 'warning';
      result.issues.push({
        severity: 'medium',
        issue: 'Unable to fetch profile information',
        suggestion: 'There may be a temporary issue. Try refreshing the page.',
        action: 'retry',
      });
    } else if (profile) {
      result.user.onboardingComplete = profile.onboarding_completed ?? false;

      if (!profile.onboarding_completed) {
        result.status = result.status === 'critical' ? 'critical' : 'warning';
        result.issues.push({
          severity: 'medium',
          issue: 'Onboarding not completed',
          suggestion: 'Complete your profile to access all features',
          action: 'redirect_to_onboarding',
        });
      }

      if (!profile.full_name) {
        result.issues.push({
          severity: 'low',
          issue: 'Missing full name',
          suggestion: 'Add your full name in profile settings',
          action: 'redirect_to_profile',
        });
      }

      if (!profile.phone) {
        result.issues.push({
          severity: 'low',
          issue: 'Missing phone number',
          suggestion: 'Add your phone number for better communication',
          action: 'redirect_to_profile',
        });
      }

      // Role-specific checks
      if (userRole?.role === 'doctor' && !profile.clinic_name) {
        result.issues.push({
          severity: 'low',
          issue: 'Missing clinic name',
          suggestion: 'Add your clinic name for professional identification',
          action: 'redirect_to_profile',
        });
      }

      if (userRole?.role === 'lab_staff' && !profile.lab_name) {
        result.issues.push({
          severity: 'low',
          issue: 'Missing lab name',
          suggestion: 'Add your lab name for professional identification',
          action: 'redirect_to_profile',
        });
      }
    }

    // Check for stuck login attempts (potential security issue)
    const { data: recentAttempts } = await supabase
      .from('login_attempts')
      .select('success')
      .eq('email', user.email!)
      .gte('attempted_at', new Date(Date.now() - 3600000).toISOString())
      .order('attempted_at', { ascending: false })
      .limit(10);

    if (recentAttempts) {
      const failedAttempts = recentAttempts.filter(a => !a.success).length;
      if (failedAttempts > 3) {
        result.status = result.status === 'critical' ? 'critical' : 'warning';
        result.issues.push({
          severity: 'medium',
          issue: `${failedAttempts} failed login attempts detected in the last hour`,
          suggestion: 'Consider changing your password if you did not make these attempts',
          action: 'change_password',
        });
      }
    }

    // Final status determination
    if (result.issues.length === 0) {
      result.status = 'healthy';
    } else {
      const hasHighSeverity = result.issues.some(i => i.severity === 'high');
      if (hasHighSeverity && result.status !== 'critical') {
        result.status = 'critical';
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
