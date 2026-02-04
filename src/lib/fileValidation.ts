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
  {
    mimeType: 'application/zip',
    signature: [[0x50, 0x4B, 0x03, 0x04]], // PK header (normal ZIP)
  },
  {
    mimeType: 'application/zip',
    signature: [[0x50, 0x4B, 0x05, 0x06]], // Empty archive
  },
  {
    mimeType: 'application/zip',
    signature: [[0x50, 0x4B, 0x07, 0x08]], // Spanning marker
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

// ZIP validation types
interface ZipValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contents?: { name: string; size: number; type: string }[];
  totalUncompressedSize?: number;
  fileCount?: number;
}

// Dangerous file extensions not allowed inside ZIP
const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.scr', '.bat', '.cmd', '.com', '.pif', 
  '.vbs', '.js', '.jse', '.wsf', '.wsh', '.msc', '.msi',
  '.ps1', '.reg', '.hta', '.cpl', '.jar', '.sh', '.bash'
];

/**
 * Parses ZIP central directory to extract file entries
 * This is a lightweight parser that reads the end-of-central-directory
 */
async function parseZipEntries(file: File): Promise<{ name: string; compressedSize: number; uncompressedSize: number }[]> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const entries: { name: string; compressedSize: number; uncompressedSize: number }[] = [];
  
  // Find End of Central Directory (EOCD) signature (0x06054b50)
  // Search from end of file (EOCD is at least 22 bytes)
  let eocdOffset = -1;
  for (let i = buffer.byteLength - 22; i >= 0 && i >= buffer.byteLength - 65557; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP: EOCD not found');
  }
  
  // Read EOCD
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  
  // Parse central directory entries
  let offset = centralDirOffset;
  for (let i = 0; i < totalEntries && offset < eocdOffset; i++) {
    // Check for central directory file header signature (0x02014b50)
    if (view.getUint32(offset, true) !== 0x02014b50) {
      break;
    }
    
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    
    // Read filename
    const fileNameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const fileName = new TextDecoder().decode(fileNameBytes);
    
    entries.push({
      name: fileName,
      compressedSize,
      uncompressedSize
    });
    
    // Move to next entry
    offset += 46 + fileNameLength + extraFieldLength + commentLength;
  }
  
  return entries;
}

/**
 * Validates a ZIP file with comprehensive QC checks
 */
export async function validateZipFile(file: File): Promise<ZipValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contents: { name: string; size: number; type: string }[] = [];
  
  // Basic validations
  if (file.size < 22) {
    return { isValid: false, errors: ['File is too small to be a valid ZIP'], warnings };
  }
  
  // Check signature
  const header = await readFileHeader(file, 4);
  const isZip = (header[0] === 0x50 && header[1] === 0x4B && 
                 (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07));
  
  if (!isZip) {
    return { isValid: false, errors: ['File does not have valid ZIP signature'], warnings };
  }
  
  try {
    const entries = await parseZipEntries(file);
    let totalUncompressedSize = 0;
    
    for (const entry of entries) {
      const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
      const isDirectory = entry.name.endsWith('/');
      
      // Check for path traversal
      if (entry.name.includes('../') || entry.name.includes('..\\')) {
        errors.push(`Path traversal detected: ${entry.name}`);
        continue;
      }
      
      // Check for absolute paths
      if (entry.name.startsWith('/') || /^[A-Za-z]:/.test(entry.name)) {
        errors.push(`Absolute path detected: ${entry.name}`);
        continue;
      }
      
      // Check for dangerous file types
      if (!isDirectory && DANGEROUS_EXTENSIONS.includes(ext)) {
        errors.push(`Dangerous file type: ${entry.name}`);
      }
      
      // Check for nested archives (warning only)
      if (!isDirectory && (ext === '.zip' || ext === '.rar' || ext === '.7z' || ext === '.tar')) {
        warnings.push(`Nested archive: ${entry.name}`);
      }
      
      // Check for zip bombs (compression ratio)
      if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > 100) {
        warnings.push(`High compression ratio (possible zip bomb): ${entry.name}`);
      }
      
      totalUncompressedSize += entry.uncompressedSize;
      
      if (!isDirectory) {
        contents.push({
          name: entry.name,
          size: entry.uncompressedSize,
          type: ext
        });
      }
    }
    
    // Check total file count
    if (entries.length > 100) {
      warnings.push(`Archive contains ${entries.length} files (large archive)`);
    }
    
    // Check total uncompressed size
    if (totalUncompressedSize > 100 * 1024 * 1024) {
      warnings.push(`Total uncompressed size is ${(totalUncompressedSize / (1024 * 1024)).toFixed(1)}MB`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      contents,
      totalUncompressedSize,
      fileCount: entries.length
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Failed to parse ZIP file'],
      warnings
    };
  }
}
