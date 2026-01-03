import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Star, ArrowLeftRight, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface PortfolioItem {
  id: string;
  lab_id: string;
  title: string;
  description: string | null;
  restoration_type: string | null;
  image_urls: string[];
  before_image_url: string | null;
  after_image_url: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

interface LabPortfolioProps {
  labId: string;
}

export function LabPortfolio({ labId }: LabPortfolioProps) {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  const { data: portfolioItems, isLoading } = useQuery({
    queryKey: ["lab-portfolio", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_portfolio_items")
        .select("*")
        .eq("lab_id", labId)
        .order("display_order");
      
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portfolioItems || portfolioItems.length === 0) {
    return null; // Don't show section if no portfolio items
  }

  const featuredItems = portfolioItems.filter(item => item.is_featured);
  const regularItems = portfolioItems.filter(item => !item.is_featured);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Portfolio ({portfolioItems.length} cases)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Featured Work
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredItems.map((item) => (
                <PortfolioCard 
                  key={item.id} 
                  item={item} 
                  onSelect={setSelectedItem}
                  isFeatured
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Items */}
        {regularItems.length > 0 && (
          <div className="space-y-3">
            {featuredItems.length > 0 && (
              <h3 className="text-sm font-medium">More Cases</h3>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regularItems.map((item) => (
                <PortfolioCard 
                  key={item.id} 
                  item={item} 
                  onSelect={setSelectedItem}
                />
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedItem.title}
                    {selectedItem.restoration_type && (
                      <Badge variant="secondary">{selectedItem.restoration_type}</Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Before/After Comparison */}
                  {selectedItem.before_image_url && selectedItem.after_image_url && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Before & After
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <img
                            src={selectedItem.before_image_url}
                            alt="Before"
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <p className="text-xs text-center text-muted-foreground">Before</p>
                        </div>
                        <div className="space-y-1">
                          <img
                            src={selectedItem.after_image_url}
                            alt="After"
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <p className="text-xs text-center text-muted-foreground">After</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Images */}
                  {selectedItem.image_urls && selectedItem.image_urls.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Gallery</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedItem.image_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Image ${idx + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedItem.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface PortfolioCardProps {
  item: PortfolioItem;
  onSelect: (item: PortfolioItem) => void;
  isFeatured?: boolean;
}

function PortfolioCard({ item, onSelect, isFeatured = false }: PortfolioCardProps) {
  // Determine the primary image to show
  const primaryImage = item.after_image_url 
    || (item.image_urls && item.image_urls[0]) 
    || item.before_image_url;

  return (
    <div 
      className={`group relative overflow-hidden rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
        isFeatured ? 'ring-2 ring-yellow-400' : ''
      }`}
      onClick={() => onSelect(item)}
    >
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={item.title}
          className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="font-medium truncate">{item.title}</p>
          {item.restoration_type && (
            <p className="text-xs text-white/80">{item.restoration_type}</p>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <Maximize2 className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Before/After indicator */}
      {item.before_image_url && item.after_image_url && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            <ArrowLeftRight className="h-3 w-3 mr-1" />
            B/A
          </Badge>
        </div>
      )}

      {/* Featured star */}
      {isFeatured && (
        <div className="absolute top-2 right-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
        </div>
      )}
    </div>
  );
}