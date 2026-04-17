import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";

interface Props {
  labId: string;
}

interface GalleryItem {
  id: string;
  image_url: string;
  case_type: string | null;
  material: string | null;
  caption: string | null;
}

export function LabGallery({ labId }: Props) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["lab-gallery-public", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_gallery")
        .select("id, image_url, case_type, material, caption")
        .eq("lab_id", labId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GalleryItem[];
    },
    enabled: !!labId,
  });

  if (isLoading) return null;
  if (!items?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Work Gallery
          <Badge variant="secondary" className="ml-2">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img
                src={item.image_url}
                alt={item.caption || item.case_type || "Lab work"}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {(item.case_type || item.material) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">
                    {item.case_type}
                    {item.material && ` · ${item.material}`}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selected && (
            <div>
              <img
                src={selected.image_url}
                alt={selected.caption || selected.case_type || "Lab work"}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4 space-y-1">
                {selected.case_type && (
                  <p className="font-semibold">{selected.case_type}</p>
                )}
                {selected.material && (
                  <p className="text-sm text-muted-foreground">{selected.material}</p>
                )}
                {selected.caption && <p className="text-sm">{selected.caption}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
