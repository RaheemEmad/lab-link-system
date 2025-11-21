import exifr from 'exifr';

/**
 * EXIF metadata extraction and image rotation correction utilities
 */

export interface ImageMetadata {
  width?: number;
  height?: number;
  orientation?: number;
  make?: string;
  model?: string;
  dateTime?: Date;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
}

/**
 * Extracts EXIF metadata from an image file
 */
export async function extractImageMetadata(file: File): Promise<ImageMetadata | null> {
  try {
    const exifData = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
    });
    
    if (!exifData) return null;
    
    return {
      width: exifData.ImageWidth || exifData.PixelXDimension,
      height: exifData.ImageHeight || exifData.PixelYDimension,
      orientation: exifData.Orientation,
      make: exifData.Make,
      model: exifData.Model,
      dateTime: exifData.DateTimeOriginal || exifData.DateTime,
      gps: exifData.latitude && exifData.longitude ? {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
      } : undefined,
      exposureTime: exifData.ExposureTime,
      fNumber: exifData.FNumber,
      iso: exifData.ISO,
      focalLength: exifData.FocalLength,
    };
  } catch (error) {
    console.warn('Failed to extract EXIF data:', error);
    return null;
  }
}

/**
 * Gets the rotation angle based on EXIF orientation
 */
function getRotationFromOrientation(orientation?: number): number {
  if (!orientation) return 0;
  
  switch (orientation) {
    case 3:
    case 4:
      return 180;
    case 5:
    case 6:
      return 90;
    case 7:
    case 8:
      return 270;
    default:
      return 0;
  }
}

/**
 * Checks if image needs flipping based on EXIF orientation
 */
function needsFlip(orientation?: number): boolean {
  if (!orientation) return false;
  return [2, 4, 5, 7].includes(orientation);
}

/**
 * Automatically corrects image rotation based on EXIF orientation
 */
export async function correctImageOrientation(file: File): Promise<File> {
  try {
    // Extract EXIF data
    const metadata = await extractImageMetadata(file);
    const orientation = metadata?.orientation;
    
    // If no orientation data or already correct, return original file
    if (!orientation || orientation === 1) {
      return file;
    }
    
    // Load image
    const img = await loadImageFromFile(file);
    
    // Get rotation and flip settings
    const rotation = getRotationFromOrientation(orientation);
    const shouldFlip = needsFlip(orientation);
    
    // Create canvas with correct dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Set canvas dimensions based on rotation
    if (rotation === 90 || rotation === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }
    
    // Apply transformations
    ctx.save();
    
    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Flip if needed
    if (shouldFlip) {
      ctx.scale(-1, 1);
    }
    
    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    ctx.restore();
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        file.type,
        0.95
      );
    });
    
    // Create new file with corrected orientation
    return new File([blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.warn('Failed to correct image orientation:', error);
    // Return original file if correction fails
    return file;
  }
}

/**
 * Loads an image from a file
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Strips sensitive EXIF data (GPS, device info) while keeping image data
 */
export async function stripSensitiveMetadata(file: File): Promise<File> {
  try {
    const img = await loadImageFromFile(file);
    
    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob (this strips all EXIF data)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        file.type,
        0.95
      );
    });
    
    return new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Failed to strip metadata:', error);
    return file;
  }
}

/**
 * Process image: extract metadata, correct orientation, optionally strip sensitive data
 */
export async function processImageForUpload(
  file: File,
  options: {
    correctOrientation?: boolean;
    stripSensitiveData?: boolean;
    extractMetadata?: boolean;
  } = {}
): Promise<{
  file: File;
  metadata?: ImageMetadata;
}> {
  const {
    correctOrientation = true,
    stripSensitiveData = true,
    extractMetadata = true,
  } = options;
  
  let processedFile = file;
  let metadata: ImageMetadata | null = null;
  
  // Extract metadata first (before any processing)
  if (extractMetadata) {
    metadata = await extractImageMetadata(file);
  }
  
  // Correct orientation based on EXIF
  if (correctOrientation) {
    processedFile = await correctImageOrientation(processedFile);
  }
  
  // Strip sensitive metadata (GPS, device info)
  if (stripSensitiveData) {
    processedFile = await stripSensitiveMetadata(processedFile);
  }
  
  return {
    file: processedFile,
    metadata: metadata || undefined,
  };
}
