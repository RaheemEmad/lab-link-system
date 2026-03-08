import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Image, Loader2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ExtractedOrderData {
  patientName?: string;
  doctorName?: string;
  restorationType?: string;
  teethNumber?: string;
  teethShade?: string;
  biologicalNotes?: string;
  handlingInstructions?: string;
  urgency?: string;
}

interface ImportOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ExtractedOrderData) => void;
}

export function ImportOrderDialog({ open, onOpenChange, onImport }: ImportOrderDialogProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:image/...;base64, prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = async (mode: "text" | "image") => {
    if (mode === "text" && !text.trim()) {
      toast.error("Please paste some text first");
      return;
    }
    if (mode === "image" && !imageFile) {
      toast.error("Please upload an image first");
      return;
    }

    setExtracting(true);
    try {
      const body: Record<string, string> = {};
      if (mode === "text") {
        body.text = text.trim();
      } else if (imageFile) {
        body.imageBase64 = await fileToBase64(imageFile);
        body.imageMimeType = imageFile.type;
      }

      const { data, error } = await supabase.functions.invoke("extract-order-details", { body });

      if (error) throw error;
      if (!data?.extracted) throw new Error("No data extracted");

      onImport(data.extracted);
      toast.success("Order details extracted! Review and edit before submitting.");
      onOpenChange(false);
      setText("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error("Extract error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("Rate limit exceeded, please try again later");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("AI credits exhausted, please add funds");
      } else {
        toast.error("Failed to extract order details. Try again or enter manually.");
      }
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Order Details
          </DialogTitle>
          <DialogDescription>
            Paste a prescription text or upload a photo to auto-fill the order form using AI
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              Upload Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <Textarea
              placeholder="Paste prescription or order text here...&#10;&#10;Example: Patient John Doe needs a Zirconia crown on tooth #14, shade A2 VITA Classical, urgent case..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[160px]"
            />
            <Button
              onClick={() => handleExtract("text")}
              disabled={extracting || !text.trim()}
              className="w-full"
              variant="gradient"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract Details
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Uploaded prescription"
                  className="w-full max-h-[200px] object-contain rounded-lg border border-border"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[160px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Click to upload prescription photo</span>
                <span className="text-xs">JPG, PNG, WebP — max 10MB</span>
              </button>
            )}
            <Button
              onClick={() => handleExtract("image")}
              disabled={extracting || !imageFile}
              className="w-full"
              variant="gradient"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract from Photo
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
