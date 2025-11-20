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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, restorationType, urgency, doctorId } = await req.json();

    console.log('Auto-assigning lab for order:', orderId, {
      restorationType,
      urgency,
      doctorId,
    });

    // Fetch preferred labs for this dentist
    const { data: preferredLabs } = await supabase
      .from('preferred_labs')
      .select('lab_id, priority_order')
      .eq('dentist_id', doctorId)
      .order('priority_order', { ascending: true });

    console.log('Preferred labs:', preferredLabs);

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

    console.log('Available labs:', labs?.length);

    // Score each lab
    const labScores: LabScore[] = [];

    for (const lab of labs || []) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Specialization match (40 points max)
      const specialization = lab.lab_specializations?.find(
        (s: any) => s.restoration_type === restorationType
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
        // No specialization - very low score
        score += 5;
        reasons.push('No specialization');
      }

      // 2. Capacity availability (25 points max)
      const capacityRatio = lab.current_load / lab.max_capacity;
      if (capacityRatio >= 1) {
        score += 0; // At capacity
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

      // 3. Preferred lab bonus (20 points max, decreasing by priority)
      const preferredIndex = preferredLabs?.findIndex(p => p.lab_id === lab.id);
      if (preferredIndex !== undefined && preferredIndex >= 0) {
        const bonus = Math.max(20 - (preferredIndex * 5), 5);
        score += bonus;
        reasons.push(`Preferred #${preferredIndex + 1}`);
      }

      // 4. Performance score (15 points max)
      const performanceBonus = ((lab.performance_score || 5) / 5) * 15;
      score += performanceBonus;
      reasons.push(`Performance: ${lab.performance_score || 5}/5`);

      labScores.push({
        labId: lab.id,
        score,
        reason: reasons.join(', '),
      });

      console.log(`Lab ${lab.name}: ${score} points - ${reasons.join(', ')}`);
    }

    // Sort by score descending
    labScores.sort((a, b) => b.score - a.score);

    if (labScores.length === 0) {
      throw new Error('No available labs found');
    }

    const selectedLab = labScores[0];
    console.log('Selected lab:', selectedLab);

    // Update the order with the assigned lab
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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auto-assignment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
