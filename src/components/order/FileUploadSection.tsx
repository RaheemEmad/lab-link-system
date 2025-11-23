import { useState } from "react";
import { Upload, X, FileIcon, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage, validateImageType, formatFileSize } from "@/lib/imageCompression";
import { validateUploadFile } from "@/lib/fileValidation";

interface FileUpload {
  id: string;
  file: File;
  category: 'radiograph' | 'stl' | 'intraoral_photo' | 'other';
  preview?: string;
  uploading?: boolean;
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
const ACCEPTED_STL_TYPES = ["model/stl", "application/sla", "application/octet-stream"];
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"];

export function FileUploadSection({ orderId, onFilesChange, existingFiles = [] }: FileUploadSectionProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'radiograph':
      case 'intraoral_photo':
        return <Image className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, category: FileUpload['category']) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    for (const file of selectedFiles) {
      // Validate file type
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isSTL = ACCEPTED_STL_TYPES.includes(file.type);
      const isDocument = ACCEPTED_DOCUMENT_TYPES.includes(file.type);

      if (!isImage && !isSTL && !isDocument) {
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name} (max 20MB)`);
        continue;
      }

      // Security validation
      const validation = await validateUploadFile(file);
      if (!validation.isValid) {
        toast.error(`Security check failed: ${file.name}`, {
          description: validation.errors.join(', ')
        });
        continue;
      }

      if (validation.warnings.length > 0) {
        console.warn('File validation warnings:', validation.warnings);
      }

      // Compress images
      let processedFile = file;
      if (isImage && validateImageType(file)) {
        try {
          processedFile = await compressImage(file, 10, 1920);
          toast.success(`Compressed ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`);
        } catch (error) {
          console.error('Compression error:', error);
          toast.error(`Failed to compress ${file.name}`);
        }
      }

      const newFile: FileUpload = {
        id: crypto.randomUUID(),
        file: processedFile,
        category,
        preview: isImage ? URL.createObjectURL(processedFile) : undefined
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const fileUpload of files) {
        const filePath = `${user.id}/${orderId}/${fileUpload.id}-${fileUpload.file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, fileUpload.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('order_attachments')
          .insert({
            order_id: orderId,
            uploaded_by: user.id,
            file_name: fileUpload.file.name,
            file_path: filePath,
            file_type: fileUpload.file.type,
            file_size: fileUpload.file.size,
            attachment_category: fileUpload.category
          });

        if (dbError) throw dbError;
      }

      toast.success(`Uploaded ${files.length} file(s) successfully`);
      setFiles([]);
      onFilesChange?.([]);
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
      {/* Upload Section */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Order Attachments</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FileIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">STL Files</span>
                <span className="text-xs text-muted-foreground">STL, SLA</span>
              </div>
            </Label>
            <input
              id="stl-upload"
              type="file"
              accept={ACCEPTED_STL_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'stl')}
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
                <div key={file.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {file.preview ? (
                      <img src={file.preview} alt={file.file.name} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      getCategoryIcon(file.category)
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{file.category.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</span>
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
                  {getCategoryIcon(file.attachment_category)}
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {file.attachment_category.replace('_', ' ')}
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
