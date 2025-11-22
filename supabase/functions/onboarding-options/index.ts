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

    // Return available roles and onboarding steps
    const response = {
      roles: [
        {
          id: 'doctor',
          name: 'Dentist/Doctor',
          description: 'I am a dental professional ordering lab work',
          steps: [
            { id: 'clinic_info', name: 'Clinic Information', fields: ['clinic_name', 'specialty'] },
            { id: 'contact_info', name: 'Contact Details', fields: ['phone'] }
          ]
        },
        {
          id: 'lab_staff',
          name: 'Lab Staff',
          description: 'I work at a dental laboratory',
          steps: [
            { id: 'lab_info', name: 'Lab Information', fields: ['lab_name', 'lab_license_number'] },
            { id: 'business_info', name: 'Business Details', fields: ['tax_id', 'business_address', 'phone'] }
          ]
        }
      ]
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in onboarding-options:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
