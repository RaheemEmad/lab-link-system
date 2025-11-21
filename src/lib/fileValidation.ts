/**
 * File validation utilities for security
 */

interface FileSignature {
  mimeType: string;
  signature: number[][];
  offset?: number;
}

// Known file signatures (magic bytes)
const FILE_SIGNATURES: FileSignature[] = [
  {
    mimeType: 'image/jpeg',
    signature: [[0xFF, 0xD8, 0xFF]],
  },
  {
    mimeType: 'image/png',
    signature: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  },
  {
    mimeType: 'image/webp',
    signature: [[0x52, 0x49, 0x46, 0x46]], // RIFF
    offset: 0,
  },
];

/**
 * Reads the first bytes of a file
 */
async function readFileHeader(file: File, numBytes: number = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(0, numBytes);
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file header'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Checks if byte sequence matches a signature
 */
function matchesSignature(bytes: Uint8Array, signature: number[], offset: number = 0): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Validates file signature (magic bytes) to ensure file type matches content
 * This helps prevent file type spoofing attacks
 */
export async function validateFileSignature(file: File): Promise<{
  isValid: boolean;
  detectedType?: string;
  declaredType: string;
  error?: string;
}> {
  try {
    const header = await readFileHeader(file);
    const declaredType = file.type;
    
    // Find matching signature
    for (const sig of FILE_SIGNATURES) {
      for (const signature of sig.signature) {
        if (matchesSignature(header, signature, sig.offset || 0)) {
          // Check if detected type matches declared type
          if (sig.mimeType === declaredType) {
            return {
              isValid: true,
              detectedType: sig.mimeType,
              declaredType,
            };
          } else {
            return {
              isValid: false,
              detectedType: sig.mimeType,
              declaredType,
              error: `File signature mismatch. File appears to be ${sig.mimeType} but is declared as ${declaredType}`,
            };
          }
        }
      }
    }
    
    // Special case for WebP - check for WEBP after RIFF
    if (declaredType === 'image/webp' && matchesSignature(header, [0x52, 0x49, 0x46, 0x46], 0)) {
      if (matchesSignature(header, [0x57, 0x45, 0x42, 0x50], 8)) {
        return {
          isValid: true,
          detectedType: 'image/webp',
          declaredType,
        };
      }
    }
    
    return {
      isValid: false,
      declaredType,
      error: 'Unknown or unsupported file signature',
    };
  } catch (error) {
    return {
      isValid: false,
      declaredType: file.type,
      error: error instanceof Error ? error.message : 'Failed to validate file',
    };
  }
}

/**
 * Scans file for suspicious content patterns
 * This is a basic check - for production, use a proper antivirus API
 */
export async function scanFileForThreats(file: File): Promise<{
  isSafe: boolean;
  threats: string[];
}> {
  const threats: string[] = [];
  
  // Check file size - suspiciously small or large files
  if (file.size < 100) {
    threats.push('File is suspiciously small');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB
    threats.push('File exceeds maximum safe size');
  }
  
  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.dll$/i,
    /\.scr$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.pif$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.\./,  // Path traversal
    /[<>:"|?*]/,  // Invalid filename characters
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      threats.push(`Suspicious filename pattern: ${file.name}`);
      break;
    }
  }
  
  // Read a sample of the file to check for executable signatures
  try {
    const header = await readFileHeader(file, 4);
    
    // Check for PE/COFF executable signature (Windows executables)
    if (header[0] === 0x4D && header[1] === 0x5A) { // "MZ"
      threats.push('File contains executable code signature');
    }
    
    // Check for ELF executable (Linux/Unix)
    if (header[0] === 0x7F && header[1] === 0x45 && 
        header[2] === 0x4C && header[3] === 0x46) { // "\x7FELF"
      threats.push('File contains executable code signature');
    }
  } catch (error) {
    console.warn('Failed to scan file content:', error);
  }
  
  return {
    isSafe: threats.length === 0,
    threats,
  };
}

/**
 * Comprehensive file validation
 */
export async function validateUploadFile(file: File): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate signature
  const signatureResult = await validateFileSignature(file);
  if (!signatureResult.isValid) {
    errors.push(signatureResult.error || 'Invalid file signature');
  }
  
  // Scan for threats
  const scanResult = await scanFileForThreats(file);
  if (!scanResult.isSafe) {
    errors.push(...scanResult.threats);
  }
  
  // Additional checks
  if (file.name.length > 255) {
    warnings.push('Filename is very long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
