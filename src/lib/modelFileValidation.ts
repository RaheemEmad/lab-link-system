/**
 * 3D Model File Validation (STL/OBJ)
 * Validates file structure and integrity
 */

interface ModelValidationResult {
  isValid: boolean;
  fileType: 'stl-ascii' | 'stl-binary' | 'obj' | 'unknown';
  errors: string[];
  warnings: string[];
  metadata: {
    vertexCount?: number;
    faceCount?: number;
    fileSize: number;
    hasNormals?: boolean;
    hasTextures?: boolean;
  };
}

/**
 * Validates STL binary file format
 */
function validateBinarySTL(buffer: ArrayBuffer): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const view = new DataView(buffer);

  // Binary STL must be at least 84 bytes (80 header + 4 triangle count)
  if (buffer.byteLength < 84) {
    errors.push('File too small to be a valid STL file');
    return {
      isValid: false,
      fileType: 'stl-binary',
      errors,
      warnings,
      metadata: { fileSize: buffer.byteLength }
    };
  }

  // Read triangle count (bytes 80-83, little-endian uint32)
  const triangleCount = view.getUint32(80, true);

  // Each triangle is 50 bytes (12 floats + 2 bytes attribute)
  const expectedSize = 84 + (triangleCount * 50);

  if (buffer.byteLength !== expectedSize) {
    errors.push(`File size mismatch: expected ${expectedSize} bytes for ${triangleCount} triangles, got ${buffer.byteLength} bytes`);
  }

  // Validate triangle count is reasonable
  if (triangleCount === 0) {
    errors.push('STL file contains zero triangles');
  } else if (triangleCount > 10000000) {
    warnings.push(`Very large model with ${triangleCount.toLocaleString()} triangles - may impact performance`);
  }

  // Check for valid float values in first triangle (if exists)
  if (triangleCount > 0 && buffer.byteLength >= 134) {
    for (let i = 0; i < 12; i++) {
      const floatValue = view.getFloat32(84 + (i * 4), true);
      if (!isFinite(floatValue)) {
        errors.push('Invalid geometry data detected - file may be corrupted');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    fileType: 'stl-binary',
    errors,
    warnings,
    metadata: {
      faceCount: triangleCount,
      vertexCount: triangleCount * 3,
      fileSize: buffer.byteLength,
      hasNormals: true
    }
  };
}

/**
 * Validates STL ASCII file format
 */
function validateAsciiSTL(text: string, fileSize: number): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required STL keywords
  const solidMatch = text.match(/^solid\s+(\S+)?/i);
  if (!solidMatch) {
    errors.push('Missing "solid" keyword at start of file');
  }

  if (!text.match(/endsolid/i)) {
    errors.push('Missing "endsolid" keyword at end of file');
  }

  // Count facets
  const facetMatches = text.match(/facet\s+normal/gi);
  const facetCount = facetMatches ? facetMatches.length : 0;

  if (facetCount === 0) {
    errors.push('No facets found in STL file');
  } else if (facetCount > 5000000) {
    warnings.push(`Very large ASCII STL with ${facetCount.toLocaleString()} facets - consider using binary STL for better performance`);
  }

  // Validate facet structure (check first facet)
  const facetPattern = /facet\s+normal\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s+outer\s+loop\s+vertex/i;
  if (facetCount > 0 && !facetPattern.test(text)) {
    errors.push('Invalid facet structure detected');
  }

  // Check for balanced loop/endloop
  const loopCount = (text.match(/outer\s+loop/gi) || []).length;
  const endloopCount = (text.match(/endloop/gi) || []).length;
  if (loopCount !== endloopCount) {
    errors.push('Unbalanced loop/endloop statements');
  }

  return {
    isValid: errors.length === 0,
    fileType: 'stl-ascii',
    errors,
    warnings,
    metadata: {
      faceCount: facetCount,
      vertexCount: facetCount * 3,
      fileSize,
      hasNormals: facetCount > 0
    }
  };
}

/**
 * Validates OBJ file format
 */
function validateOBJ(text: string, fileSize: number): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // Count vertices and faces
  let vertexCount = 0;
  let faceCount = 0;
  let normalCount = 0;
  let textureCount = 0;
  let hasInvalidLines = false;

  for (const line of lines.slice(0, Math.min(10000, lines.length))) {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('v ')) {
      vertexCount++;
      // Validate vertex format: v x y z [w]
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) {
        hasInvalidLines = true;
        errors.push('Invalid vertex format detected');
        break;
      }
      // Check if coordinates are valid numbers
      for (let i = 1; i < Math.min(4, parts.length); i++) {
        if (isNaN(parseFloat(parts[i]))) {
          hasInvalidLines = true;
          errors.push('Invalid vertex coordinates');
          break;
        }
      }
    } else if (trimmed.startsWith('vn ')) {
      normalCount++;
    } else if (trimmed.startsWith('vt ')) {
      textureCount++;
    } else if (trimmed.startsWith('f ')) {
      faceCount++;
      // Validate face format
      const parts = trimmed.split(/\s+/).slice(1);
      if (parts.length < 3) {
        hasInvalidLines = true;
        errors.push('Invalid face format - faces must have at least 3 vertices');
        break;
      }
    }
  }

  if (vertexCount === 0) {
    errors.push('No vertices found in OBJ file');
  }

  if (faceCount === 0) {
    warnings.push('No faces defined - file contains only vertices');
  }

  if (vertexCount > 10000000) {
    warnings.push(`Very large OBJ model with ${vertexCount.toLocaleString()} vertices - may impact performance`);
  }

  return {
    isValid: errors.length === 0,
    fileType: 'obj',
    errors,
    warnings,
    metadata: {
      vertexCount,
      faceCount,
      fileSize,
      hasNormals: normalCount > 0,
      hasTextures: textureCount > 0
    }
  };
}

/**
 * Main validation function for 3D model files
 */
export async function validate3DModelFile(file: File): Promise<ModelValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file extension
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['stl', 'obj'].includes(extension || '')) {
    errors.push('File must have .stl or .obj extension');
    return {
      isValid: false,
      fileType: 'unknown',
      errors,
      warnings,
      metadata: { fileSize: file.size }
    };
  }

  // Read file
  const buffer = await file.arrayBuffer();
  
  // For STL files, determine if binary or ASCII
  if (extension === 'stl') {
    // Check if it's ASCII by looking for "solid" keyword in first 100 bytes
    const decoder = new TextDecoder('utf-8');
    const header = decoder.decode(buffer.slice(0, 100));
    
    if (header.toLowerCase().includes('solid')) {
      // Likely ASCII STL
      const text = decoder.decode(buffer);
      return validateAsciiSTL(text, file.size);
    } else {
      // Binary STL
      return validateBinarySTL(buffer);
    }
  } else {
    // OBJ file
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
    return validateOBJ(text, file.size);
  }
}

/**
 * Get a human-readable summary of validation results
 */
export function getValidationSummary(result: ModelValidationResult): string {
  const { metadata, fileType } = result;
  const parts: string[] = [];

  if (fileType !== 'unknown') {
    parts.push(fileType.toUpperCase().replace('-', ' '));
  }

  if (metadata.vertexCount) {
    parts.push(`${metadata.vertexCount.toLocaleString()} vertices`);
  }

  if (metadata.faceCount) {
    parts.push(`${metadata.faceCount.toLocaleString()} faces`);
  }

  return parts.join(' • ');
}
