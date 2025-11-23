import { useState, useEffect, useCallback, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Lab {
  id: string;
  name: string;
  pricing_tier: string;
  performance_score: number;
}

interface PreferredLab {
  id: string;
  lab_id: string;
  priority_order: number;
  labs: Lab;
}

interface PreferredLabsCarouselProps {
  preferredLabs: PreferredLab[];
  onRemove: (id: string) => void;
}

export const PreferredLabsCarousel = ({
  preferredLabs,
  onRemove,
}: PreferredLabsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  
  const clickTimestamps = useRef<number[]>([]);
  const easterEggTimeout = useRef<NodeJS.Timeout>();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (!emblaApi || isTransitioning) return;
    setIsTransitioning(true);
    emblaApi.scrollPrev();
    
    trackEasterEggClick();
    
    setTimeout(() => setIsTransitioning(false), 420);
  }, [emblaApi, isTransitioning]);

  const scrollNext = useCallback(() => {
    if (!emblaApi || isTransitioning) return;
    setIsTransitioning(true);
    emblaApi.scrollNext();
    
    trackEasterEggClick();
    
    setTimeout(() => setIsTransitioning(false), 420);
  }, [emblaApi, isTransitioning]);

  const trackEasterEggClick = () => {
    const now = Date.now();
    clickTimestamps.current.push(now);
    
    // Keep only clicks from last 2 seconds
    clickTimestamps.current = clickTimestamps.current.filter(
      timestamp => now - timestamp <= 2000
    );

    // Check if 5 clicks in 2 seconds
    if (clickTimestamps.current.length >= 5) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      if (!prefersReducedMotion) {
        setShowEasterEgg(true);
        
        if (easterEggTimeout.current) {
          clearTimeout(easterEggTimeout.current);
        }
        
        easterEggTimeout.current = setTimeout(() => {
          setShowEasterEgg(false);
        }, 2000);
      }
      
      clickTimestamps.current = [];
    }
  };

  useEffect(() => {
    return () => {
      if (easterEggTimeout.current) {
        clearTimeout(easterEggTimeout.current);
      }
    };
  }, []);

  const canScrollPrev = emblaApi?.canScrollPrev() ?? false;
  const canScrollNext = emblaApi?.canScrollNext() ?? false;

  if (preferredLabs.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {preferredLabs.map((pref, index) => (
            <div
              key={pref.id}
              className="flex-[0_0_100%] min-w-0 relative"
            >
              {/* Background Layer */}
              <div 
                className={cn(
                  "absolute inset-0 -z-10 blur-xl opacity-20 transition-all duration-[420ms] ease-out",
                  isTransitioning && "scale-105"
                )}
                style={{
                  background: "radial-gradient(circle at center, hsl(var(--primary) / 0.3), transparent)",
                }}
              />
              
              {/* Mid Layer */}
              <div 
                className={cn(
                  "absolute inset-0 -z-5 transition-all duration-[400ms]",
                  isTransitioning && "scale-[1.01]"
                )}
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.05))",
                  transitionTimingFunction: "cubic-bezier(0.25, 0.8, 0.25, 1)",
                }}
              />
              
              {/* Foreground Layer */}
              <Card 
                className={cn(
                  "border-l-4 border-l-primary mx-4 transition-all duration-[350ms] will-change-transform",
                  isTransitioning && "scale-[1.02] opacity-90"
                )}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <Badge variant="outline" className="text-sm">
                      Priority {index + 1}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Preferred Lab</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {pref.labs.name} from your preferred labs?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRemove(pref.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <h3 className="text-2xl font-bold mb-2">{pref.labs.name}</h3>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="secondary">
                      {pref.labs.pricing_tier}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium">{pref.labs.performance_score?.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg",
          "transition-opacity duration-200",
          !canScrollPrev && "opacity-50 cursor-not-allowed"
        )}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous lab"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg",
          "transition-opacity duration-200",
          !canScrollNext && "opacity-50 cursor-not-allowed"
        )}
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next lab"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {preferredLabs.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              selectedIndex === index 
                ? "w-8 bg-primary" 
                : "w-2 bg-muted-foreground/30"
            )}
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Go to lab ${index + 1}`}
          />
        ))}
      </div>

      {/* Easter Egg - Tooth Icon */}
      {showEasterEgg && (
        <div 
          className={cn(
            "absolute top-4 right-4 z-20 pointer-events-none",
            "animate-in fade-in zoom-in-95 duration-300",
            "animate-out fade-out zoom-out-95"
          )}
        >
          <div className="text-4xl">🦷</div>
        </div>
      )}
    </div>
  );
};
