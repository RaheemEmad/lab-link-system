import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Collect all user data in parallel
    const [
      profileRes,
      ordersRes,
      templatesRes,
      messagesRes,
      notificationsRes,
      invoicesRes,
      patientCasesRes,
      reviewsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('orders').select('*').eq('doctor_id', user.id),
      supabase.from('order_templates').select('*').eq('user_id', user.id),
      supabase.from('chat_messages').select('*').eq('sender_id', user.id),
      supabase.from('notifications').select('*').eq('user_id', user.id),
      supabase.from('invoices').select('*, invoice_line_items(*)').in(
        'order_id',
        (await supabase.from('orders').select('id').eq('doctor_id', user.id)).data?.map(o => o.id) || []
      ),
      supabase.from('patient_cases').select('*').eq('doctor_id', user.id),
      supabase.from('lab_reviews').select('*').eq('dentist_id', user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profileRes.data,
      orders: ordersRes.data || [],
      templates: templatesRes.data || [],
      messages: messagesRes.data || [],
      notifications: notificationsRes.data || [],
      invoices: invoicesRes.data || [],
      patient_cases: patientCasesRes.data || [],
      reviews: reviewsRes.data || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="lablink-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
