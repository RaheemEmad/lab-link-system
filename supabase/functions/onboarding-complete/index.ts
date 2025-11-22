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

    // Get user's role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRoles) {
      throw new Error('User role not found. Please choose a role first.');
    }

    const { role } = userRoles;
    const requestData = await req.json();

    // Complete onboarding based on role
    if (role === 'doctor') {
      const { phone, clinic_name, specialty } = requestData;

      // Validate required fields
      if (!phone || !clinic_name || !specialty) {
        throw new Error('Missing required fields: phone, clinic_name, specialty');
      }

      // Call doctor onboarding function
      const { error } = await supabaseClient.rpc('complete_doctor_onboarding', {
        user_id_param: user.id,
        phone_param: phone,
        clinic_name_param: clinic_name,
        specialty_param: specialty
      });

      if (error) {
        console.error('Error completing doctor onboarding:', error);
        throw new Error(error.message);
      }
    } else if (role === 'lab_staff') {
      const { phone, lab_name, lab_license_number, tax_id, business_address } = requestData;

      // Validate required fields
      if (!phone || !lab_name || !lab_license_number || !tax_id || !business_address) {
        throw new Error('Missing required fields: phone, lab_name, lab_license_number, tax_id, business_address');
      }

      // Call lab onboarding function
      const { error } = await supabaseClient.rpc('complete_lab_onboarding', {
        user_id_param: user.id,
        phone_param: phone,
        lab_name_param: lab_name,
        lab_license_param: lab_license_number,
        tax_id_param: tax_id,
        address_param: business_address
      });

      if (error) {
        console.error('Error completing lab onboarding:', error);
        throw new Error(error.message);
      }
    } else {
      throw new Error('Invalid role');
    }

    console.log(`Onboarding completed for user ${user.id} with role ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Onboarding completed successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in onboarding-complete:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
