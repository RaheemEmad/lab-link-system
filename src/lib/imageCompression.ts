/**
 * Compresses an image file to meet size requirements
 * @param file - The image file to compress
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @param maxWidthOrHeight - Maximum width or height in pixels (default 1920)
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 10,
  maxWidthOrHeight: number = 1920
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Start with high quality and reduce if needed
        let quality = 0.9;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              // If size is acceptable or quality is too low, use this blob
              if (blob.size <= maxSizeBytes || quality <= 0.1) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Try again with lower quality
                quality -= 0.1;
                tryCompress();
              }
            },
            file.type,
            quality
          );
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a thumbnail preview URL for an image file
 * @param file - The image file
 * @returns Object URL for the thumbnail
 */
export function createThumbnail(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Validates image file type
 * @param file - The file to validate
 * @param acceptedTypes - Array of accepted MIME types
 * @returns True if valid, false otherwise
 */
export function validateImageType(
  file: File,
  acceptedTypes: string[] = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
): boolean {
  return acceptedTypes.includes(file.type);
}

/**
 * Validates image file size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns True if valid, false otherwise
 */
export function validateImageSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
