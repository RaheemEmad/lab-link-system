import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUserRequest {
  email: string;
  password: string;
  role: 'doctor' | 'lab_staff';
  profileData: {
    full_name: string;
    phone?: string;
    clinic_name?: string;
    specialty?: string;
    lab_name?: string;
    lab_license_number?: string;
    tax_id?: string;
    business_address?: string;
  };
  lab_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const requestData: TestUserRequest = await req.json();
    console.log('Creating test user:', requestData.email);

    // Validate request
    if (!requestData.email || !requestData.password || !requestData.role) {
      throw new Error('Missing required fields: email, password, role');
    }

    if (!['doctor', 'lab_staff'].includes(requestData.role)) {
      throw new Error('Role must be doctor or lab_staff');
    }

    // Create the user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: {
        full_name: requestData.profileData.full_name,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log('User created:', authData.user.id);

    // Update profile with additional data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: requestData.profileData.full_name,
        phone: requestData.profileData.phone,
        clinic_name: requestData.profileData.clinic_name,
        specialty: requestData.profileData.specialty,
        lab_name: requestData.profileData.lab_name,
        lab_license_number: requestData.profileData.lab_license_number,
        tax_id: requestData.profileData.tax_id,
        business_address: requestData.profileData.business_address,
        onboarding_completed: true,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    console.log('Profile updated');

    // Set user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: requestData.role,
        lab_id: requestData.lab_id || null,
      });

    if (roleError) {
      console.error('Role error:', roleError);
      throw roleError;
    }

    console.log('Role assigned:', requestData.role);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test ${requestData.role} account created successfully`,
        user_id: authData.user.id,
        email: requestData.email,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating test user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
