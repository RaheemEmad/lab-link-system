import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabScore {
  labId: string;
  score: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { orderId, restorationType, urgency } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return new Response(JSON.stringify({ error: 'orderId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load order and enforce authorization: caller must be doctor owner or admin
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('id, doctor_id, restoration_type, urgency')
      .eq('id', orderId)
      .single();
    if (orderErr || !orderRow) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle();
    const isAdmin = callerRole?.role === 'admin';
    if (!isAdmin && orderRow.doctor_id !== callerId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Derive trusted values from the DB row; ignore untrusted client fields where possible
    const doctorId = orderRow.doctor_id as string;
    const effectiveRestorationType = orderRow.restoration_type || restorationType;
    const effectiveUrgency = orderRow.urgency || urgency;

    console.log('Auto-assigning lab for order:', orderId, {
      restorationType: effectiveRestorationType,
      urgency: effectiveUrgency,
      doctorId,
    });

    // Fetch preferred labs for this dentist
    const { data: preferredLabs } = await supabase
      .from('preferred_labs')
      .select('lab_id, priority_order')
      .eq('dentist_id', doctorId)
      .order('priority_order', { ascending: true });

    // Fetch all active labs with their specializations
    const { data: labs, error: labsError } = await supabase
      .from('labs')
      .select(`
        id,
        name,
        current_load,
        max_capacity,
        performance_score,
        pricing_tier,
        standard_sla_days,
        urgent_sla_days,
        lab_specializations(restoration_type, expertise_level, turnaround_days)
      `)
      .eq('is_active', true);

    if (labsError) throw labsError;

    // Score each lab
    const labScores: LabScore[] = [];

    for (const lab of labs || []) {
      let score = 0;
      const reasons: string[] = [];

      const specialization = lab.lab_specializations?.find(
        (s: any) => s.restoration_type === effectiveRestorationType
      );

      if (specialization) {
        if (specialization.expertise_level === 'expert') {
          score += 40;
          reasons.push('Expert specialization');
        } else if (specialization.expertise_level === 'intermediate') {
          score += 25;
          reasons.push('Intermediate specialization');
        } else {
          score += 15;
          reasons.push('Basic specialization');
        }
      } else {
        score += 5;
        reasons.push('No specialization');
      }

      const capacityRatio = lab.current_load / lab.max_capacity;
      if (capacityRatio >= 1) {
        reasons.push('At capacity');
      } else if (capacityRatio < 0.5) {
        score += 25;
        reasons.push('Low workload');
      } else if (capacityRatio < 0.8) {
        score += 15;
        reasons.push('Moderate workload');
      } else {
        score += 5;
        reasons.push('High workload');
      }

      const preferredIndex = preferredLabs?.findIndex(p => p.lab_id === lab.id);
      if (preferredIndex !== undefined && preferredIndex >= 0) {
        const bonus = Math.max(20 - (preferredIndex * 5), 5);
        score += bonus;
        reasons.push(`Preferred #${preferredIndex + 1}`);
      }

      const performanceBonus = ((lab.performance_score || 5) / 5) * 15;
      score += performanceBonus;
      reasons.push(`Performance: ${lab.performance_score || 5}/5`);

      labScores.push({ labId: lab.id, score, reason: reasons.join(', ') });
    }

    labScores.sort((a, b) => b.score - a.score);

    if (labScores.length === 0) {
      throw new Error('No available labs found');
    }

    const selectedLab = labScores[0];

    const { error: updateError } = await supabase
      .from('orders')
      .update({ assigned_lab_id: selectedLab.labId })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        assignedLabId: selectedLab.labId,
        score: selectedLab.score,
        reason: selectedLab.reason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto-assignment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
