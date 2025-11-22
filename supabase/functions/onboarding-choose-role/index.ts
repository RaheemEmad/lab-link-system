import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { role } = await req.json();

    // Validate role
    if (!role || !['doctor', 'lab_staff'].includes(role)) {
      throw new Error('Invalid role. Must be doctor or lab_staff');
    }

    // Call the set_user_role function
    const { error: roleError } = await supabaseClient.rpc('set_user_role', {
      user_id_param: user.id,
      role_param: role
    });

    if (roleError) {
      console.error('Error setting user role:', roleError);
      throw new Error(roleError.message);
    }

    console.log(`Role ${role} assigned to user ${user.id}`);

    // Log the role assignment for audit trail
    await supabaseClient.rpc('log_audit_event', {
      action_type_param: 'role_assignment',
      table_name_param: 'user_roles',
      metadata_param: {
        role: role,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        role,
        message: 'Role assigned successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in onboarding-choose-role:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
