import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  labId: string;
}

export function LabGalleryManager({ labId }: Props) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [caseType, setCaseType] = useState("");
  const [material, setMaterial] = useState("");
  const [caption, setCaption] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["lab-gallery", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_gallery")
        .select("*")
        .eq("lab_id", labId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${labId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lab-gallery")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("lab-gallery").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("lab_gallery").insert({
        lab_id: labId,
        image_url: urlData.publicUrl,
        case_type: caseType || null,
        material: material || null,
        caption: caption || null,
      });
      if (insertErr) throw insertErr;

      toast.success("Photo added to gallery");
      setCaseType("");
      setMaterial("");
      setCaption("");
      qc.invalidateQueries({ queryKey: ["lab-gallery", labId] });
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const path = imageUrl.split("/lab-gallery/")[1];
      if (path) {
        await supabase.storage.from("lab-gallery").remove([path]);
      }
      const { error } = await supabase.from("lab_gallery").delete().eq("id", id);
      if (error) throw error;
      toast.success("Photo removed");
      qc.invalidateQueries({ queryKey: ["lab-gallery", labId] });
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Add to Gallery
          </CardTitle>
          <CardDescription>
            Showcase your best work. Photos appear publicly on your lab profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Case type</Label>
              <Input
                placeholder="Crown, Bridge..."
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Input
                placeholder="Zirconia, E-max..."
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Caption (optional)</Label>
              <Input
                placeholder="Brief note"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor="gallery-upload"
              className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-accent transition-colors min-h-[44px]"
            >
              <Upload className="h-5 w-5" />
              <span>{uploading ? "Uploading..." : "Choose image to upload"}</span>
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !items?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No photos yet. Upload your first piece above.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img
                    src={item.image_url}
                    alt={item.caption || item.case_type || "Lab work"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="text-white text-xs space-y-0.5">
                      {item.case_type && <p className="font-semibold">{item.case_type}</p>}
                      {item.material && <p>{item.material}</p>}
                      {item.caption && <p className="opacity-90">{item.caption}</p>}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.image_url)}
                      className="self-end min-h-[44px]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
