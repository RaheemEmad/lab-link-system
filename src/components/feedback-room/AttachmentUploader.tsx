import { useState, useCallback } from "react";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface AttachmentUploaderProps {
  orderId: string;
  onUploadComplete: () => void;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "design", label: "Design" },
  { value: "photos", label: "Photos" },
  { value: "xray", label: "X-Ray" },
  { value: "model", label: "Model" },
];

const AttachmentUploader = ({ orderId, onUploadComplete }: AttachmentUploaderProps) => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff } = useUserRole();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("general");
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const logActivity = async (fileName: string, fileCategory: string) => {
    if (!user?.id) return;
    
    const userRole = isDoctor ? "doctor" : isLabStaff ? "lab_staff" : "unknown";
    
    try {
      await supabase.rpc("log_feedback_activity", {
        p_order_id: orderId,
        p_user_id: user.id,
        p_user_role: userRole,
        p_action_type: "attachment_uploaded",
        p_action_description: `Uploaded file: ${fileName}`,
        p_metadata: { file_name: fileName, category: fileCategory }
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const uploadFiles = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("order-attachments")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("order-attachments")
          .getPublicUrl(fileName);

        // Insert record
        const { error: insertError } = await supabase
          .from("feedback_room_attachments")
          .insert({
            order_id: orderId,
            uploaded_by: user.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            category: category,
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          toast.error(`Failed to save ${file.name}`);
          continue;
        }

        // Log activity for successful upload
        await logActivity(file.name, category);
        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`);
        setSelectedFiles([]);
        onUploadComplete();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">Drag & drop files here</p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="outline" asChild>
            <span>Browse Files</span>
          </Button>
        </label>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={uploadFiles}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
