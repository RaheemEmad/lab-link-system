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

    const { reason } = await req.json();

    // Log the deletion request
    await supabase.from('user_deletion_requests').insert({
      user_id: user.id,
      reason: reason || null,
      status: 'processing',
    });

    // Cascade delete user data (order matters for FK constraints)
    // 1. Chat messages
    await supabase.from('chat_messages').delete().eq('sender_id', user.id);
    
    // 2. Notifications
    await supabase.from('notifications').delete().eq('user_id', user.id);
    
    // 3. Patient cases
    await supabase.from('patient_cases').delete().eq('doctor_id', user.id);
    
    // 4. Lab reviews
    await supabase.from('lab_reviews').delete().eq('dentist_id', user.id);
    
    // 5. Order templates
    await supabase.from('order_templates').delete().eq('user_id', user.id);
    
    // 6. Support tickets
    await supabase.from('support_tickets').delete().eq('user_id', user.id);
    
    // 7. Direct messages
    await supabase.from('direct_messages').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    
    // 8. Feedback room data
    await supabase.from('feedback_room_reactions').delete().eq('user_id', user.id);
    await supabase.from('feedback_room_comments').delete().eq('user_id', user.id);
    
    // 9. Anonymize profile (soft-delete approach for audit trail)
    await supabase.from('profiles').update({
      full_name: '[Deleted User]',
      email: `deleted-${user.id}@lablink.app`,
      phone: null,
      avatar_url: null,
      onboarding_completed: false,
    }).eq('id', user.id);

    // 10. Update deletion request status
    await supabase.from('user_deletion_requests').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('status', 'processing');

    // 11. Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Delete user data error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
