import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Upload, X, FileIcon, Image, Loader2, Box, Boxes, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage, validateImageType, formatFileSize } from "@/lib/imageCompression";
import { validateUploadFile, validateZipFile } from "@/lib/fileValidation";
import { validate3DModelFile, getValidationSummary } from "@/lib/modelFileValidation";
import { parallelCompression } from "@/lib/batchUpload";
import { UploadQueue } from "@/lib/uploadQueue";
import { UploadQueueVisualization } from "./UploadQueueVisualization";

// Lazy load ZIP preview component
const ZipContentsPreview = lazy(() => import('./ZipContentsPreview'));

interface ZipValidationInfo {
  contents: { name: string; size: number; type: string }[];
  warnings: string[];
  totalSize: number;
  fileCount: number;
}

interface FileUpload {
  id: string;
  file: File;
  category: 'radiograph' | 'stl' | 'obj' | 'intraoral_photo' | 'archive' | 'other';
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
  modelInfo?: string;
  zipInfo?: ZipValidationInfo;
}

interface FileUploadSectionProps {
  orderId?: string;
  onFilesChange?: (files: FileUpload[]) => void;
  existingFiles?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    attachment_category: string;
  }>;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_STL_TYPES = ["model/stl", "application/sla", "application/octet-stream", "model/obj", "application/obj"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"];
const ACCEPTED_ARCHIVE_TYPES = ["application/zip", "application/x-zip-compressed"];

export function FileUploadSection({ orderId, onFilesChange, existingFiles = [] }: FileUploadSectionProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadQueue = useRef(new UploadQueue({
    maxRetries: 3,
    initialRetryDelay: 1000,
    autoThrottle: true
  }));

  useEffect(() => {
    // Detect network speed on mount
    uploadQueue.current.detectNetworkSpeed().then(stats => {
      toast.info(`Network detected: ${stats.quality}`, {
        description: `Optimized for ${stats.recommendedConcurrency} concurrent uploads`
      });
    });
  }, []);

  const getCategoryIcon = (category: string, fileName?: string) => {
    switch (category) {
      case 'radiograph':
      case 'intraoral_photo':
        return <Image className="h-4 w-4" />;
      case 'stl':
        return <Box className="h-4 w-4" />;
      case 'obj':
        return <Boxes className="h-4 w-4" />;
      case 'archive':
        return <FileArchive className="h-4 w-4" />;
      default:
        // Check file extension for uploaded files
        if (fileName?.toLowerCase().endsWith('.stl')) {
          return <Box className="h-4 w-4" />;
        } else if (fileName?.toLowerCase().endsWith('.obj')) {
          return <Boxes className="h-4 w-4" />;
        } else if (fileName?.toLowerCase().endsWith('.zip')) {
          return <FileArchive className="h-4 w-4" />;
        }
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, category: FileUpload['category']) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Show batch processing notification for multiple files
    if (selectedFiles.length > 1) {
      toast.info(`Processing ${selectedFiles.length} files in parallel...`);
    }
    
    for (const file of selectedFiles) {
      // Validate file type
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isSTL = file.name.toLowerCase().endsWith('.stl') || ACCEPTED_STL_TYPES.includes(file.type);
      const isOBJ = file.name.toLowerCase().endsWith('.obj');
      const isDocument = ACCEPTED_DOCUMENT_TYPES.includes(file.type);
      const isZip = file.name.toLowerCase().endsWith('.zip') || ACCEPTED_ARCHIVE_TYPES.includes(file.type);

      if (!isImage && !isSTL && !isOBJ && !isDocument && !isZip) {
        toast.error(`Invalid file type: ${file.name}`, {
          description: 'Accepted formats: JPEG, PNG, WebP, PDF, STL, OBJ, ZIP'
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}`, {
          description: `Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`
        });
        continue;
      }

      // Show file size info for large files
      if (file.size > 5 * 1024 * 1024) {
        toast.info(`Large file detected: ${formatFileSize(file.size)}`, {
          description: 'Upload may take a moment'
        });
      }

      // Security validation for images
      if (isImage) {
        const validation = await validateUploadFile(file);
        if (!validation.isValid) {
          toast.error(`Security check failed: ${file.name}`, {
            description: validation.errors.join(', ')
          });
          continue;
        }
      }

      // ZIP file validation with QC checks
      let zipInfo: ZipValidationInfo | undefined;
      if (isZip) {
        toast.loading(`Validating ZIP archive: ${file.name}...`, { id: `validate-zip-${file.name}` });
        
        try {
          const zipValidation = await validateZipFile(file);
          toast.dismiss(`validate-zip-${file.name}`);
          
          if (!zipValidation.isValid) {
            toast.error(`Invalid ZIP archive: ${file.name}`, {
              description: zipValidation.errors.join(', ')
            });
            continue;
          }

          if (zipValidation.warnings.length > 0) {
            toast.warning(`ZIP archive warnings`, {
              description: zipValidation.warnings.slice(0, 2).join(', ') + 
                (zipValidation.warnings.length > 2 ? ` and ${zipValidation.warnings.length - 2} more` : '')
            });
          }

          zipInfo = {
            contents: zipValidation.contents || [],
            warnings: zipValidation.warnings,
            totalSize: zipValidation.totalUncompressedSize || 0,
            fileCount: zipValidation.fileCount || 0
          };

          toast.success(`Valid ZIP archive`, {
            description: `${zipInfo.fileCount} files, ${formatFileSize(zipInfo.totalSize)} uncompressed`
          });
        } catch (error) {
          toast.dismiss(`validate-zip-${file.name}`);
          toast.error(`Failed to validate ${file.name}`, {
            description: 'ZIP file may be corrupted'
          });
          continue;
        }
      }

      // 3D Model validation for STL/OBJ
      let modelInfo: string | undefined;
      if (isSTL || isOBJ) {
        toast.loading(`Validating ${file.name}...`, { id: `validate-${file.name}` });
        
        try {
          const modelValidation = await validate3DModelFile(file);
          toast.dismiss(`validate-${file.name}`);
          
          if (!modelValidation.isValid) {
            toast.error(`Invalid 3D model: ${file.name}`, {
              description: modelValidation.errors.join(', ')
            });
            continue;
          }

          if (modelValidation.warnings.length > 0) {
            toast.warning(`Model validation warnings`, {
              description: modelValidation.warnings.join(', ')
            });
          }

          modelInfo = getValidationSummary(modelValidation);
          toast.success(`Valid ${modelValidation.fileType.toUpperCase()} model`, {
            description: modelInfo
          });
        } catch (error) {
          toast.dismiss(`validate-${file.name}`);
          toast.error(`Failed to validate ${file.name}`, {
            description: 'File may be corrupted'
          });
          continue;
        }
      }

      // Note: Image compression will be handled in parallel batch at upload time
      let processedFile = file;

      // Determine category for STL/OBJ/ZIP
      let finalCategory = category;
      if (isSTL) finalCategory = 'stl';
      if (isOBJ) finalCategory = 'obj';
      if (isZip) finalCategory = 'archive';

      const newFile: FileUpload = {
        id: crypto.randomUUID(),
        file: processedFile,
        category: finalCategory,
        preview: isImage ? URL.createObjectURL(processedFile) : undefined,
        modelInfo,
        zipInfo
      };

      setFiles(prev => {
        const updated = [...prev, newFile];
        onFilesChange?.(updated);
        return updated;
      });
    }


    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const uploadFiles = async () => {
    if (!orderId) {
      toast.error("Order ID is required to upload files");
      return;
    }

    setUploading(true);
    const totalFiles = files.length;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Step 1: Parallel image compression (if any images)
      const imageFiles = files.filter(f => 
        ACCEPTED_IMAGE_TYPES.includes(f.file.type) && validateImageType(f.file)
      );

      let processedFiles = [...files];

      if (imageFiles.length > 0) {
        toast.info(`Compressing ${imageFiles.length} image(s) in parallel...`);
        
        const compressionResults = await parallelCompression(
          imageFiles.map(f => f.file),
          (file) => compressImage(file, 10, 1920),
          4 // Compress 4 images at once
        );

        // Update processed files with compressed versions
        processedFiles = files.map(fileUpload => {
          const compressionResult = compressionResults.find(r => r.original === fileUpload.file);
          if (compressionResult) {
            const originalSize = compressionResult.original.size;
            const compressedSize = compressionResult.compressed.size;
            if (compressedSize < originalSize) {
              toast.success(`Compressed ${fileUpload.file.name}`, {
                description: `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`
              });
            }
            return { ...fileUpload, file: compressionResult.compressed };
          }
          return fileUpload;
        });
      }

      // Step 2: Add to upload queue
      uploadQueue.current.addToQueue(
        processedFiles.map(fileUpload => ({
          id: fileUpload.id,
          file: fileUpload.file,
          orderId,
          userId: user.id,
          category: fileUpload.category
        }))
      );

      // Step 3: Process queue with retry logic
      await uploadQueue.current.processQueue(supabase);

      // Step 4: Check results
      const queueStats = uploadQueue.current.getStats();

      if (queueStats.completed > 0) {
        toast.success(`Successfully uploaded ${queueStats.completed} file(s)`);
        // Clear local file list
        setFiles([]);
        onFilesChange?.([]);
      }

      if (queueStats.failed > 0) {
        toast.error(`${queueStats.failed} file(s) failed to upload`, {
          description: 'Check the upload queue for details and retry options'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('order-attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Queue Visualization */}
      <UploadQueueVisualization queue={uploadQueue.current} />
      
      {/* Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Order Attachments</Label>
          <span className="text-xs text-muted-foreground">Max {formatFileSize(MAX_FILE_SIZE)} per file</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Radiographs */}
          <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-colors">
            <Label htmlFor="radiograph-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <Image className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Radiographs</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP</span>
              </div>
            </Label>
            <input
              id="radiograph-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'radiograph')}
            />
          </Card>

          {/* STL Files */}
          <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-colors">
            <Label htmlFor="stl-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <Box className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">STL Models</span>
                <span className="text-xs text-muted-foreground">Binary/ASCII STL</span>
              </div>
            </Label>
            <input
              id="stl-upload"
              type="file"
              accept=".stl,model/stl,application/sla"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'stl')}
            />
          </Card>

          {/* OBJ Files */}
          <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-colors">
            <Label htmlFor="obj-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <Boxes className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">OBJ Models</span>
                <span className="text-xs text-muted-foreground">Wavefront OBJ</span>
              </div>
            </Label>
            <input
              id="obj-upload"
              type="file"
              accept=".obj,model/obj,application/obj"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'obj')}
            />
          </Card>

          {/* Intraoral Photos */}
          <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-colors">
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <Image className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Intraoral Photos</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP</span>
              </div>
            </Label>
            <input
              id="photo-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'intraoral_photo')}
            />
          </Card>

          {/* ZIP Archives */}
          <Card className="p-4 border-2 border-dashed hover:border-primary/50 transition-colors">
            <Label htmlFor="zip-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2 text-center">
                <FileArchive className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">ZIP Archives</span>
                <span className="text-xs text-muted-foreground">Bundled files</span>
              </div>
            </Label>
            <input
              id="zip-upload"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'archive')}
            />
          </Card>
        </div>
      </div>

      {/* Pending Uploads */}
      {files.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Pending Uploads ({files.length})</Label>
              <Button
                size="sm"
                onClick={uploadFiles}
                disabled={uploading || !orderId}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            </div>
            
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {file.preview ? (
                        <img src={file.preview} alt={file.file.name} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded">
                          {getCategoryIcon(file.category, file.file.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {file.category === 'stl' ? 'STL' : 
                             file.category === 'obj' ? 'OBJ' : 
                             file.category === 'archive' ? 'ZIP' :
                             file.category.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</span>
                          {file.modelInfo && (
                            <span className="text-xs text-muted-foreground">{file.modelInfo}</span>
                          )}
                          {file.zipInfo && (
                            <span className="text-xs text-muted-foreground">
                              {file.zipInfo.fileCount} files • {formatFileSize(file.zipInfo.totalSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* ZIP Contents Preview (lazy loaded) */}
                  {file.zipInfo && file.zipInfo.contents.length > 0 && (
                    <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                      <ZipContentsPreview 
                        contents={file.zipInfo.contents}
                        warnings={file.zipInfo.warnings}
                        totalSize={file.zipInfo.totalSize}
                        fileCount={file.zipInfo.fileCount}
                      />
                    </Suspense>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <Card className="p-4">
          <Label className="text-sm font-semibold mb-3 block">Uploaded Files ({existingFiles.length})</Label>
          <div className="space-y-2">
            {existingFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 flex items-center justify-center bg-primary/10 rounded">
                    {getCategoryIcon(file.attachment_category, file.file_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {file.attachment_category === 'stl' ? 'STL' : file.attachment_category === 'obj' ? 'OBJ' : file.attachment_category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(file.file_path, file.file_name)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
