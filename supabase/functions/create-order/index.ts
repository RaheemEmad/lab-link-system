import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationError {
  field: string;
  message: string;
}

const VALID_RESTORATION_TYPES = ['Zirconia', 'Zirconia Layer', 'Zirco-Max', 'PFM', 'Acrylic', 'E-max'];
const VALID_SHADE_SYSTEMS = ['VITA Classical', 'VITA 3D-Master'];
const VALID_URGENCY_LEVELS = ['Normal', 'Urgent'];

function validateOrderData(data: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!data.doctorName || typeof data.doctorName !== 'string') {
    errors.push({ field: 'doctorName', message: 'Doctor name is required' });
  } else if (data.doctorName.trim().length < 2) {
    errors.push({ field: 'doctorName', message: 'Doctor name must be at least 2 characters' });
  } else if (data.doctorName.length > 100) {
    errors.push({ field: 'doctorName', message: 'Doctor name must be less than 100 characters' });
  }

  if (!data.patientName || typeof data.patientName !== 'string') {
    errors.push({ field: 'patientName', message: 'Patient name is required' });
  } else if (data.patientName.trim().length < 2) {
    errors.push({ field: 'patientName', message: 'Patient name must be at least 2 characters' });
  } else if (data.patientName.length > 100) {
    errors.push({ field: 'patientName', message: 'Patient name must be less than 100 characters' });
  }

  if (!data.restorationType || !VALID_RESTORATION_TYPES.includes(data.restorationType)) {
    errors.push({ field: 'restorationType', message: `Invalid restoration type. Must be one of: ${VALID_RESTORATION_TYPES.join(', ')}` });
  }

  if (!data.teethShade || typeof data.teethShade !== 'string' || data.teethShade.trim().length === 0) {
    errors.push({ field: 'teethShade', message: 'Teeth shade is required' });
  } else if (data.teethShade.length > 50) {
    errors.push({ field: 'teethShade', message: 'Teeth shade must be less than 50 characters' });
  }

  if (!data.shadeSystem || !VALID_SHADE_SYSTEMS.includes(data.shadeSystem)) {
    errors.push({ field: 'shadeSystem', message: `Invalid shade system. Must be one of: ${VALID_SHADE_SYSTEMS.join(', ')}` });
  }

  if (!data.teethNumber || typeof data.teethNumber !== 'string' || data.teethNumber.trim().length === 0) {
    errors.push({ field: 'teethNumber', message: 'At least one tooth must be selected' });
  } else if (data.teethNumber.length > 100) {
    errors.push({ field: 'teethNumber', message: 'Teeth number must be less than 100 characters' });
  }

  if (!data.urgency || !VALID_URGENCY_LEVELS.includes(data.urgency)) {
    errors.push({ field: 'urgency', message: `Invalid urgency level. Must be one of: ${VALID_URGENCY_LEVELS.join(', ')}` });
  }

  if (data.biologicalNotes && (typeof data.biologicalNotes !== 'string' || data.biologicalNotes.length > 1000)) {
    errors.push({ field: 'biologicalNotes', message: 'Biological notes must be a string under 1000 characters' });
  }

  if (data.assignedLabId != null && typeof data.assignedLabId === 'string' && data.assignedLabId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.assignedLabId)) {
    errors.push({ field: 'assignedLabId', message: 'Lab ID must be a valid UUID' });
  }

  return { isValid: errors.length === 0, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are accepted' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestData: any;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit — single DB function call instead of 4 sequential queries
    const { data: rateLimitResult, error: rlError } = await supabase.rpc(
      'check_and_increment_rate_limit',
      {
        p_identifier: user.id,
        p_endpoint: 'create-order',
        p_max_per_minute: 10,
        p_max_per_hour: 50,
      }
    );

    if (rlError) {
      console.error('Rate limit check error:', rlError);
      // Fail open
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      const resetAt = rateLimitResult.reset_at;
      const retryAfter = resetAt
        ? Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000).toString()
        : '60';
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: rateLimitResult.message,
          resetAt,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': retryAfter },
        }
      );
    }

    // Validate input
    const validation = validateOrderData(requestData);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', message: 'One or more fields contain invalid data', validationErrors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Per-order fee deduction ---
    // Check doctor's active subscription plan
    const { data: activeSub } = await supabase
      .from('doctor_subscriptions')
      .select('id, plan_id, subscription_plans(per_order_fee, name)')
      .eq('doctor_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const perOrderFee = (activeSub as any)?.subscription_plans?.per_order_fee ?? 0;

    if (perOrderFee > 0) {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet || wallet.balance < perOrderFee) {
        return new Response(
          JSON.stringify({
            error: 'INSUFFICIENT_BALANCE',
            message: `Insufficient wallet balance. You need ${perOrderFee} EGP for this order. Current balance: ${wallet?.balance ?? 0} EGP.`
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Creating order for user:', user.id);

    const { data: orderData, error: insertError } = await supabase
      .from('orders')
      .insert({
        doctor_id: user.id,
        doctor_name: requestData.doctorName.trim(),
        patient_name: requestData.patientName.trim(),
        restoration_type: requestData.restorationType,
        teeth_shade: requestData.teethShade.trim(),
        shade_system: requestData.shadeSystem,
        teeth_number: requestData.teethNumber.trim(),
        biological_notes: requestData.biologicalNotes?.trim() || '',
        urgency: requestData.urgency,
        assigned_lab_id: requestData.assignedLabId || null,
        auto_assign_pending: !requestData.assignedLabId,
        photos_link: requestData.photosLink || '',
        html_export: requestData.htmlExport || '',
        screenshot_url: requestData.screenshotUrl || '',
        order_number: '',
        target_budget: requestData.targetBudget || null,
      })
      .select('id, order_number, patient_name, restoration_type, urgency, status, created_at, assigned_lab_id')
      .single();

    if (insertError) {
      console.error('Database insert error:', JSON.stringify(insertError));
      return new Response(
        JSON.stringify({ error: 'DATABASE_WRITE_FAILED', message: 'Failed to create order. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orderData || !orderData.id || !orderData.order_number) {
      return new Response(
        JSON.stringify({ error: 'Invalid response', message: 'Order was created but response structure is invalid' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created successfully:', orderData.order_number);

    // Deduct per-order fee from wallet after successful order creation
    if (perOrderFee > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance - perOrderFee })
          .eq('id', wallet.id);

        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'order_fee',
            amount: perOrderFee,
            description: `Order fee for #${orderData.order_number} (${(activeSub as any)?.subscription_plans?.name} plan)`,
            order_id: orderData.id,
          });
      }
    }

    // Notify assigned lab if directly assigned
    if (orderData.assigned_lab_id) {
      const { data: labStaff } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('lab_id', orderData.assigned_lab_id)
        .eq('role', 'lab_staff');

      if (labStaff?.length) {
        await supabase.from('notifications').insert(
          labStaff.map((s: any) => ({
            user_id: s.user_id,
            order_id: orderData.id,
            type: 'new_order',
            title: 'New Order Assigned',
            message: `You've been assigned a new ${orderData.restoration_type} order #${orderData.order_number}`,
          }))
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order created successfully',
        order: {
          id: orderData.id,
          orderNumber: orderData.order_number,
          patientName: orderData.patient_name,
          restorationType: orderData.restoration_type,
          urgency: orderData.urgency,
          status: orderData.status,
          createdAt: orderData.created_at,
          assignedLabId: orderData.assigned_lab_id,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
