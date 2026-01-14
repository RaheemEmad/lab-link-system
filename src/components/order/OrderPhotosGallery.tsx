import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, Download, ChevronLeft, ChevronRight, X, ImageOff } from "lucide-react";

interface OrderPhotosGalleryProps {
  photosLink: string | null;
  showTitle?: boolean;
}

const parsePhotosLink = (photosLink: string): string[] => {
  return photosLink
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0);
};

export function OrderPhotosGallery({ photosLink, showTitle = true }: OrderPhotosGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  if (!photosLink) {
    return null;
  }

  const photos = parsePhotosLink(photosLink);

  if (photos.length === 0) {
    return null;
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `order-photo-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const navigatePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const navigateNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <>
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-primary" />
              Doctor-Uploaded Photos ({photos.length})
            </CardTitle>
            <CardDescription>
              Radiographs, scans, and reference photos from the doctor
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className={!showTitle ? "pt-6" : ""}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer group hover:ring-2 hover:ring-primary transition-all"
                onClick={() => !imageErrors.has(index) && setSelectedIndex(index)}
              >
                {imageErrors.has(index) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageOff className="h-8 w-8 mb-1" />
                    <span className="text-xs">Failed to load</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={url}
                      alt={`Order photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={() => handleImageError(index)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(url, index);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click any photo to view full size
          </p>
        </CardContent>
      </Card>

      {/* Full-size view dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95">
          <DialogTitle className="sr-only">
            Photo {selectedIndex !== null ? selectedIndex + 1 : 0} of {photos.length}
          </DialogTitle>
          {selectedIndex !== null && (
            <div className="relative">
              {/* Close button */}
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Navigation buttons */}
              {selectedIndex > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={navigatePrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {selectedIndex < photos.length - 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={navigateNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {/* Image */}
              <div className="flex items-center justify-center min-h-[400px] max-h-[80vh]">
                <img
                  src={photos[selectedIndex]}
                  alt={`Order photo ${selectedIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 flex items-center justify-between">
                <span className="text-white text-sm">
                  Photo {selectedIndex + 1} of {photos.length}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(photos[selectedIndex], selectedIndex)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
