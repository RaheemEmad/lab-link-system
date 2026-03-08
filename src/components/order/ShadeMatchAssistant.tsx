import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Sparkles, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShadeResult {
  primary_shade: string;
  confidence: number;
  alternatives?: { shade: string; reason: string }[];
  notes: string;
  consult_lab: boolean;
}

interface ShadeMatchAssistantProps {
  shadeSystem: string;
  onShadeSelect: (shade: string) => void;
  className?: string;
}

export const ShadeMatchAssistant = ({ shadeSystem, onShadeSelect, className }: ShadeMatchAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ShadeResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
    
    e.target.value = "";
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/shade-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, shadeSystem }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");
      
      setResult(data.data);
    } catch (error: any) {
      toast.error("Shade analysis failed", { description: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("gap-1.5", className)}
      >
        <Sparkles className="h-4 w-4 text-amber-500" />
        AI Shade Match
      </Button>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Shade Matching
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setIsOpen(false); reset(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Upload Intraoral Photo</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WEBP • Max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image preview */}
            <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
              <img src={previewUrl} alt="Dental photo" className="w-full h-full object-cover" />
              {!isAnalyzing && !result && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={reset}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Loading state */}
            {isAnalyzing && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Analyzing shade...</p>
                  <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-3">
                {/* Primary shade */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
                  <div>
                    <p className="text-xs text-muted-foreground">Recommended Shade</p>
                    <p className="text-2xl font-bold">{result.primary_shade}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <div className="flex items-center gap-2">
                      <Progress value={result.confidence} className="w-16 h-2" />
                      <span className={cn(
                        "text-sm font-semibold",
                        result.confidence >= 80 ? "text-green-600" : result.confidence >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {result.confidence}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consult lab warning */}
                {result.consult_lab && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">Ambiguous shade detected — consider consulting the lab for a physical shade match.</p>
                  </div>
                )}

                {/* Alternatives */}
                {result.alternatives && result.alternatives.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Alternatives</p>
                    {result.alternatives.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onShadeSelect(alt.shade)}
                        className="flex items-center justify-between w-full p-2 rounded border hover:bg-muted/50 transition-colors text-left"
                      >
                        <Badge variant="outline">{alt.shade}</Badge>
                        <span className="text-xs text-muted-foreground">{alt.reason}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {result.notes && (
                  <p className="text-xs text-muted-foreground italic">{result.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onShadeSelect(result.primary_shade);
                      toast.success(`Shade ${result.primary_shade} applied`);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                    Use {result.primary_shade}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={reset}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
