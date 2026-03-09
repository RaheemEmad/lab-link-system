import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { compressImage, validateImageType, validateImageSize } from "@/lib/imageCompression";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface CasePhotoUploaderProps {
  caseId: string;
  photos: string[];
  maxPhotos?: number;
}

const MAX_PHOTOS = 6;
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Extracts the storage path from either a full public URL or a raw path.
 * Handles both legacy public URLs and new path-only entries.
 */
function extractStoragePath(entry: string): string {
  const marker = "/patient-case-photos/";
  const idx = entry.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(entry.slice(idx + marker.length));
  }
  return entry;
}

export const CasePhotoUploader = ({
  caseId,
  photos,
  maxPhotos = MAX_PHOTOS,
}: CasePhotoUploaderProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for all photos
  useEffect(() => {
    if (!photos.length) {
      setSignedUrls({});
      return;
    }

    let cancelled = false;

    const generateSignedUrls = async () => {
      const paths = photos.map(extractStoragePath);
      const { data, error } = await supabase.storage
        .from("patient-case-photos")
        .createSignedUrls(paths, SIGNED_URL_EXPIRY);

      if (cancelled) return;

      if (error) {
        console.error("Failed to generate signed URLs:", error);
        return;
      }

      const urlMap: Record<string, string> = {};
      data?.forEach((item, i) => {
        if (item.signedUrl) {
          urlMap[photos[i]] = item.signedUrl;
        }
      });
      setSignedUrls(urlMap);
    };

    generateSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [photos]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !user) return;

      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${maxPhotos} photos per case`);
        return;
      }

      const toUpload = Array.from(files).slice(0, remaining);
      const invalid = toUpload.filter(
        (f) => !validateImageType(f) || !validateImageSize(f, 10)
      );
      if (invalid.length) {
        toast.error("Some files are invalid (must be JPEG/PNG/WebP, ≤10 MB)");
        return;
      }

      setUploading(true);
      try {
        const newPaths: string[] = [];

        for (const file of toUpload) {
          const compressed = await compressImage(file, 2, 1600);
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${caseId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("patient-case-photos")
            .upload(path, compressed, { upsert: false });

          if (uploadErr) throw uploadErr;

          // Store the path, not the public URL
          newPaths.push(path);
        }

        const updatedPhotos = [...photos, ...newPaths];
        const { error: updateErr } = await supabase
          .from("patient_cases")
          .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
          .eq("id", caseId);

        if (updateErr) throw updateErr;

        queryClient.invalidateQueries({ queryKey: ["patient-cases"] });
        toast.success(`${newPaths.length} photo(s) uploaded`);
      } catch (err: any) {
        console.error("Upload failed:", err);
        toast.error("Failed to upload photo", { description: err.message });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [user, caseId, photos, maxPhotos, queryClient]
  );

  const handleRemove = useCallback(
    async (photoEntry: string) => {
      if (!user) return;
      setRemovingUrl(photoEntry);
      try {
        const storagePath = extractStoragePath(photoEntry);
        await supabase.storage
          .from("patient-case-photos")
          .remove([storagePath]);

        const updatedPhotos = photos.filter((p) => p !== photoEntry);
        const { error } = await supabase
          .from("patient_cases")
          .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
          .eq("id", caseId);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["patient-cases"] });
        toast.success("Photo removed");
      } catch (err: any) {
        console.error("Remove failed:", err);
        toast.error("Failed to remove photo", { description: err.message });
      } finally {
        setRemovingUrl(null);
      }
    },
    [user, caseId, photos, queryClient]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((entry) => (
            <div key={entry} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img
                src={signedUrls[entry] || ""}
                alt="Case photo"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => handleRemove(entry)}
                disabled={removingUrl === entry}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                {removingUrl === entry ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {photos.length < maxPhotos && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                Drop photos or click to upload ({photos.length}/{maxPhotos})
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};
