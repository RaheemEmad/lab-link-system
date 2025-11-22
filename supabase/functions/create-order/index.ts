import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user
const MAX_REQUESTS_PER_HOUR = 50; // 50 requests per hour per user

interface CreateOrderRequest {
  doctorName: string;
  patientName: string;
  restorationType: string;
  teethShade: string;
  shadeSystem: string;
  teethNumber: string;
  biologicalNotes?: string;
  urgency: string;
  assignedLabId?: string | null;
  photosLink?: string;
  htmlExport?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const VALID_RESTORATION_TYPES = ['Zirconia', 'Zirconia Layer', 'Zirco-Max', 'PFM', 'Acrylic', 'E-max'];
const VALID_SHADE_SYSTEMS = ['VITA Classical', 'VITA 3D-Master'];
const VALID_URGENCY_LEVELS = ['Normal', 'Urgent'];

function validateOrderData(data: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Required string fields with min/max length
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

  // Restoration type validation
  if (!data.restorationType || typeof data.restorationType !== 'string') {
    errors.push({ field: 'restorationType', message: 'Restoration type is required' });
  } else if (!VALID_RESTORATION_TYPES.includes(data.restorationType)) {
    errors.push({ 
      field: 'restorationType', 
      message: `Invalid restoration type. Must be one of: ${VALID_RESTORATION_TYPES.join(', ')}` 
    });
  }

  // Shade validation
  if (!data.teethShade || typeof data.teethShade !== 'string') {
    errors.push({ field: 'teethShade', message: 'Teeth shade is required' });
  } else if (data.teethShade.trim().length === 0) {
    errors.push({ field: 'teethShade', message: 'Teeth shade cannot be empty' });
  } else if (data.teethShade.length > 50) {
    errors.push({ field: 'teethShade', message: 'Teeth shade must be less than 50 characters' });
  }

  // Shade system validation
  if (!data.shadeSystem || typeof data.shadeSystem !== 'string') {
    errors.push({ field: 'shadeSystem', message: 'Shade system is required' });
  } else if (!VALID_SHADE_SYSTEMS.includes(data.shadeSystem)) {
    errors.push({ 
      field: 'shadeSystem', 
      message: `Invalid shade system. Must be one of: ${VALID_SHADE_SYSTEMS.join(', ')}` 
    });
  }

  // Teeth number validation
  if (!data.teethNumber || typeof data.teethNumber !== 'string') {
    errors.push({ field: 'teethNumber', message: 'Teeth number is required' });
  } else if (data.teethNumber.trim().length === 0) {
    errors.push({ field: 'teethNumber', message: 'At least one tooth must be selected' });
  } else if (data.teethNumber.length > 100) {
    errors.push({ field: 'teethNumber', message: 'Teeth number must be less than 100 characters' });
  }

  // Urgency validation
  if (!data.urgency || typeof data.urgency !== 'string') {
    errors.push({ field: 'urgency', message: 'Urgency level is required' });
  } else if (!VALID_URGENCY_LEVELS.includes(data.urgency)) {
    errors.push({ 
      field: 'urgency', 
      message: `Invalid urgency level. Must be one of: ${VALID_URGENCY_LEVELS.join(', ')}` 
    });
  }

  // Optional fields validation
  if (data.biologicalNotes && typeof data.biologicalNotes !== 'string') {
    errors.push({ field: 'biologicalNotes', message: 'Biological notes must be a string' });
  } else if (data.biologicalNotes && data.biologicalNotes.length > 1000) {
    errors.push({ field: 'biologicalNotes', message: 'Biological notes must be less than 1000 characters' });
  }

  if (data.htmlExport && typeof data.htmlExport !== 'string') {
    errors.push({ field: 'htmlExport', message: 'HTML export must be a string' });
  }

  if (data.photosLink && typeof data.photosLink !== 'string') {
    errors.push({ field: 'photosLink', message: 'Photos link must be a string' });
  }

  // Lab ID validation (optional, but must be UUID if provided)
  if (data.assignedLabId !== null && data.assignedLabId !== undefined) {
    if (typeof data.assignedLabId !== 'string') {
      errors.push({ field: 'assignedLabId', message: 'Lab ID must be a string' });
    } else if (data.assignedLabId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.assignedLabId)) {
      errors.push({ field: 'assignedLabId', message: 'Lab ID must be a valid UUID' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; resetAt?: Date; message?: string }> {
  const now = new Date();
  
  // Check minute window
  const minuteAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW);
  const { data: minuteRecord } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', `${endpoint}_minute`)
    .gte('window_start', minuteAgo.toISOString())
    .single();

  if (minuteRecord && minuteRecord.request_count >= MAX_REQUESTS_PER_WINDOW) {
    const resetAt = new Date(new Date(minuteRecord.window_start).getTime() + RATE_LIMIT_WINDOW);
    return {
      allowed: false,
      resetAt,
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute. Try again at ${resetAt.toISOString()}`,
    };
  }

  // Check hour window
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const { data: hourRecord } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', `${endpoint}_hour`)
    .gte('window_start', hourAgo.toISOString())
    .single();

  if (hourRecord && hourRecord.request_count >= MAX_REQUESTS_PER_HOUR) {
    const resetAt = new Date(new Date(hourRecord.window_start).getTime() + 60 * 60 * 1000);
    return {
      allowed: false,
      resetAt,
      message: `Hourly rate limit exceeded. Maximum ${MAX_REQUESTS_PER_HOUR} requests per hour. Try again at ${resetAt.toISOString()}`,
    };
  }

  // Update or create minute record
  if (minuteRecord) {
    await supabase
      .from('rate_limits')
      .update({ request_count: minuteRecord.request_count + 1 })
      .eq('id', minuteRecord.id);
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint: `${endpoint}_minute`,
        request_count: 1,
        window_start: now.toISOString(),
      });
  }

  // Update or create hour record
  if (hourRecord) {
    await supabase
      .from('rate_limits')
      .update({ request_count: hourRecord.request_count + 1 })
      .eq('id', hourRecord.id);
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint: `${endpoint}_hour`,
        request_count: 1,
        window_start: now.toISOString(),
      });
  }

  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authorization header is required'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    let requestData: any;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'create-order');
    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests',
          message: rateLimitResult.message,
          resetAt: rateLimitResult.resetAt?.toISOString()
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.resetAt 
              ? Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
              : '60'
          },
        }
      );
    }

    // Parse request body

    // Validate input data
    const validation = validateOrderData(requestData);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          message: 'One or more fields contain invalid data',
          validationErrors: validation.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating order for user:', user.id);

    // Create the order
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
        photos_link: requestData.photosLink || '',
        html_export: requestData.htmlExport || '',
        order_number: '', // Will be auto-generated by trigger
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          message: insertError.message,
          details: insertError.details
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate response structure
    if (!orderData || !orderData.id || !orderData.order_number) {
      console.error('Invalid order data returned:', orderData);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response',
          message: 'Order was created but response structure is invalid'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Order created successfully:', orderData.order_number);

    // Return success response with complete order data
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
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
