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
    // Get the authorization header first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with user's JWT token for RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

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
      const { phone, lab_name, lab_license_number, tax_id, business_address, pricing_mode, pricing_entries } = requestData;

      // Validate required fields
      if (!phone || !lab_name || !lab_license_number || !tax_id || !business_address) {
        throw new Error('Missing required fields: phone, lab_name, lab_license_number, tax_id, business_address');
      }

      // Validate pricing mode
      if (!pricing_mode || !['TEMPLATE', 'CUSTOM'].includes(pricing_mode)) {
        throw new Error('Pricing mode must be configured (TEMPLATE or CUSTOM)');
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

      // Get the lab ID that was created/assigned
      const { data: userRole } = await supabaseClient
        .from('user_roles')
        .select('lab_id')
        .eq('user_id', user.id)
        .eq('role', 'lab_staff')
        .single();

      if (!userRole?.lab_id) {
        throw new Error('Lab not found after onboarding');
      }

      // Update lab with pricing mode
      const { error: labUpdateError } = await supabaseClient
        .from('labs')
        .update({
          pricing_mode,
          pricing_configured_at: new Date().toISOString()
        })
        .eq('id', userRole.lab_id);

      if (labUpdateError) {
        console.error('Error updating lab pricing mode:', labUpdateError);
        throw new Error(labUpdateError.message);
      }

      // If custom pricing mode, save pricing entries
      if (pricing_mode === 'CUSTOM' && pricing_entries && pricing_entries.length > 0) {
        const pricingRecords = pricing_entries.map((entry: any) => ({
          lab_id: userRole.lab_id,
          restoration_type: entry.restoration_type,
          fixed_price: entry.fixed_price,
          rush_surcharge_percent: entry.rush_surcharge_percent || 25,
          includes_rush: true,
          version: 1,
          effective_from: new Date().toISOString(),
          is_current: true
        }));

        const { error: pricingError } = await supabaseClient
          .from('lab_pricing')
          .insert(pricingRecords);

        if (pricingError) {
          console.error('Error saving lab pricing:', pricingError);
          // Don't fail the whole onboarding, just log the error
        }
      }

      // Log pricing history
      await supabaseClient
        .from('lab_pricing_history')
        .insert({
          lab_id: userRole.lab_id,
          changed_by: user.id,
          pricing_mode,
          pricing_data: pricing_entries || [],
          version: 1,
          effective_from: new Date().toISOString(),
          change_reason: 'Initial onboarding configuration'
        });
    } else {
      throw new Error('Invalid role');
    }

    console.log(`Onboarding completed for user ${user.id} with role ${role}`);

    // Log onboarding completion for audit trail
    await supabaseClient.rpc('log_audit_event', {
      action_type_param: 'onboarding_completed',
      table_name_param: 'profiles',
      record_id_param: user.id,
      metadata_param: {
        role: role,
        timestamp: new Date().toISOString()
      }
    });

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
