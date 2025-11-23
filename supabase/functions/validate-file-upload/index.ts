import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://lablink-479111.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
};

// File validation configuration
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 100; // 100 bytes

// Known file signatures (magic bytes)
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

// Suspicious patterns that might indicate malware
const SUSPICIOUS_PATTERNS = [
  // Windows executable
  [0x4D, 0x5A], // MZ header
  // ELF executable
  [0x7F, 0x45, 0x4C, 0x46], // \x7FELF
  // Script tags (potential XSS in images)
  '<script',
  '</script>',
  'javascript:',
  'onerror=',
  'onload=',
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    detectedType?: string;
    fileSize: number;
    fileName: string;
  };
}

function validateFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Special check for WebP
      if (mimeType === 'image/webp') {
        // Check for WEBP at offset 8
        const webpCheck = [0x57, 0x45, 0x42, 0x50];
        for (let i = 0; i < webpCheck.length; i++) {
          if (bytes[8 + i] !== webpCheck[i]) return false;
        }
      }
      return true;
    }
  }
  return false;
}

function scanForMalware(bytes: Uint8Array, textContent: string): string[] {
  const threats: string[] = [];

  // Check for executable signatures
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
    threats.push('Windows executable signature detected');
  }
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
    threats.push('Linux/Unix executable signature detected');
  }

  // Check for script injection attempts
  const lowerText = textContent.toLowerCase();
  if (lowerText.includes('<script')) {
    threats.push('Script tag detected - potential XSS attack');
  }
  if (lowerText.includes('javascript:')) {
    threats.push('JavaScript URL scheme detected');
  }
  if (lowerText.includes('onerror=') || lowerText.includes('onload=')) {
    threats.push('Suspicious event handler detected');
  }

  return threats;
}

async function validateFile(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bytes = new Uint8Array(fileBuffer);

  // Validate file size
  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  if (fileBuffer.byteLength < MIN_FILE_SIZE) {
    errors.push('File is suspiciously small');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    errors.push(`File type ${mimeType} is not allowed`);
  }

  // Validate file signature
  if (!validateFileSignature(bytes, mimeType)) {
    errors.push('File signature does not match declared MIME type - possible file type spoofing');
  }

  // Validate filename
  if (fileName.length > 255) {
    warnings.push('Filename is very long');
  }
  
  const suspiciousFilePatterns = /\.(exe|dll|scr|bat|cmd|com|pif|vbs|js)$/i;
  if (suspiciousFilePatterns.test(fileName)) {
    errors.push('Suspicious file extension detected');
  }

  if (/\.\./.test(fileName)) {
    errors.push('Path traversal attempt detected in filename');
  }

  if (/[<>:"|?*]/.test(fileName)) {
    errors.push('Invalid characters in filename');
  }

  // Scan for malware patterns
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const textContent = decoder.decode(bytes.slice(0, Math.min(4096, bytes.length)));
  const threats = scanForMalware(bytes, textContent);
  
  if (threats.length > 0) {
    errors.push(...threats);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      detectedType: mimeType,
      fileSize: fileBuffer.byteLength,
      fileName,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;
    const category = formData.get('category') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate file
    const fileBuffer = await file.arrayBuffer();
    const validation = await validateFile(fileBuffer, file.name, file.type);

    if (!validation.isValid) {
      // Log security alert for malicious file attempt
      await supabase.rpc('create_security_alert', {
        alert_type_param: 'malicious_file_upload',
        severity_param: 'high',
        title_param: 'Malicious File Upload Attempt Blocked',
        description_param: `User ${user.email} attempted to upload suspicious file: ${file.name}`,
        user_id_param: user.id,
        ip_address_param: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          errors: validation.errors,
          orderId,
        },
      });

      return new Response(
        JSON.stringify({
          valid: false,
          errors: validation.errors,
          warnings: validation.warnings,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Upload file to storage if valid
    const filePath = `${user.id}/${orderId}/${crypto.randomUUID()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Store file metadata in database
    const { error: dbError } = await supabase
      .from('order_attachments')
      .insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        attachment_category: category || 'general',
        uploaded_by: user.id,
      });

    if (dbError) {
      // Rollback - delete uploaded file
      await supabase.storage.from('order-attachments').remove([filePath]);
      
      console.error('Database error:', dbError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save file metadata' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        warnings: validation.warnings,
        filePath,
        metadata: validation.metadata,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ error: 'File validation failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
