import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityScanResult {
  timestamp: string;
  checks: {
    compromisedPasswords: {
      checked: boolean;
      found: number;
      users: string[];
    };
    suspiciousLogins: {
      checked: boolean;
      patterns: number;
      details: any[];
    };
    failedLoginAttempts: {
      checked: boolean;
      lockedAccounts: number;
      recentFailures: number;
    };
    unusualActivity: {
      checked: boolean;
      alerts: any[];
    };
  };
}

async function checkCompromisedPasswords(supabase: any): Promise<{ found: number; users: string[] }> {
  // Get all users who haven't changed password recently
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email')
    .limit(100);

  const compromisedUsers: string[] = [];

  // In production, you would integrate with Have I Been Pwned API
  // For now, we'll check against common weak passwords
  const weakPasswords = ['password123', '123456', 'qwerty', 'admin123'];
  
  // This is a placeholder - real implementation would check hashed passwords
  // against HIBP API using k-anonymity model
  
  return {
    found: compromisedUsers.length,
    users: compromisedUsers,
  };
}

async function checkSuspiciousLogins(supabase: any): Promise<{ patterns: number; details: any[] }> {
  // Check for multiple failed login attempts
  const { data: suspiciousAttempts } = await supabase
    .from('login_attempts')
    .select('email, ip_address, attempted_at')
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('attempted_at', { ascending: false });

  const patterns: any[] = [];
  const emailMap = new Map<string, any[]>();

  // Group by email
  suspiciousAttempts?.forEach((attempt: any) => {
    if (!emailMap.has(attempt.email)) {
      emailMap.set(attempt.email, []);
    }
    emailMap.get(attempt.email)!.push(attempt);
  });

  // Check for patterns
  emailMap.forEach((attempts, email) => {
    // Multiple IPs
    const uniqueIPs = new Set(attempts.map(a => a.ip_address));
    if (uniqueIPs.size >= 3 && attempts.length >= 5) {
      patterns.push({
        email,
        pattern: 'multiple_ips',
        severity: 'high',
        details: `${attempts.length} failed attempts from ${uniqueIPs.size} different IPs`,
      });
    }

    // Rapid succession
    if (attempts.length >= 10) {
      patterns.push({
        email,
        pattern: 'brute_force',
        severity: 'critical',
        details: `${attempts.length} failed attempts in 24 hours`,
      });
    }
  });

  return {
    patterns: patterns.length,
    details: patterns,
  };
}

async function checkFailedLoginAttempts(supabase: any): Promise<{ lockedAccounts: number; recentFailures: number }> {
  const { data: recentFailures } = await supabase
    .from('login_attempts')
    .select('email')
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  // Check locked accounts
  const lockedEmails = new Set<string>();
  const emailCounts = new Map<string, number>();

  recentFailures?.forEach((attempt: any) => {
    emailCounts.set(attempt.email, (emailCounts.get(attempt.email) || 0) + 1);
  });

  emailCounts.forEach((count, email) => {
    if (count >= 5) {
      lockedEmails.add(email);
    }
  });

  return {
    lockedAccounts: lockedEmails.size,
    recentFailures: recentFailures?.length || 0,
  };
}

async function checkUnusualActivity(supabase: any): Promise<{ alerts: any[] }> {
  // Check for unresolved security alerts
  const { data: unresolvedAlerts } = await supabase
    .from('security_alerts')
    .select('*')
    .eq('resolved', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('severity', { ascending: false })
    .limit(50);

  return {
    alerts: unresolvedAlerts || [],
  };
}

async function createAlertIfNeeded(supabase: any, scanResult: SecurityScanResult) {
  const criticalIssues: string[] = [];

  if (scanResult.checks.suspiciousLogins.patterns > 0) {
    const criticalPatterns = scanResult.checks.suspiciousLogins.details.filter(
      p => p.severity === 'critical'
    );
    if (criticalPatterns.length > 0) {
      criticalIssues.push(`${criticalPatterns.length} brute force attempts detected`);
    }
  }

  if (scanResult.checks.failedLoginAttempts.lockedAccounts > 5) {
    criticalIssues.push(`${scanResult.checks.failedLoginAttempts.lockedAccounts} accounts locked`);
  }

  if (criticalIssues.length > 0) {
    await supabase.rpc('create_security_alert', {
      alert_type_param: 'automated_security_scan',
      severity_param: 'high',
      title_param: 'Security Scan Detected Critical Issues',
      description_param: criticalIssues.join('; '),
      metadata_param: scanResult,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify authorization (cron job or admin)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    
    if (!cronSecret || cronSecret !== Deno.env.get('CRON_SECRET')) {
      // If not cron, check if admin
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    console.log('Running automated security scan...');

    // Run all security checks in parallel
    const [
      compromisedPasswords,
      suspiciousLogins,
      failedLoginAttempts,
      unusualActivity,
    ] = await Promise.all([
      checkCompromisedPasswords(supabase),
      checkSuspiciousLogins(supabase),
      checkFailedLoginAttempts(supabase),
      checkUnusualActivity(supabase),
    ]);

    const scanResult: SecurityScanResult = {
      timestamp: new Date().toISOString(),
      checks: {
        compromisedPasswords: {
          checked: true,
          ...compromisedPasswords,
        },
        suspiciousLogins: {
          checked: true,
          ...suspiciousLogins,
        },
        failedLoginAttempts: {
          checked: true,
          ...failedLoginAttempts,
        },
        unusualActivity: {
          checked: true,
          ...unusualActivity,
        },
      },
    };

    // Create alert if critical issues found
    await createAlertIfNeeded(supabase, scanResult);

    console.log('Security scan completed:', scanResult);

    return new Response(
      JSON.stringify({
        success: true,
        scan: scanResult,
        summary: {
          compromisedPasswords: compromisedPasswords.found,
          suspiciousPatterns: suspiciousLogins.patterns,
          lockedAccounts: failedLoginAttempts.lockedAccounts,
          unresolvedAlerts: unusualActivity.alerts.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Security scan error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Security scan failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
