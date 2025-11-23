import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Star, Trash2, Sparkles } from "lucide-react";
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

interface PreferredLabsStackProps {
  preferredLabs: PreferredLab[];
  onRemove: (id: string) => void;
}

export const PreferredLabsStack = ({
  preferredLabs,
  onRemove,
}: PreferredLabsStackProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const swipeTimestamps = useRef<number[]>([]);
  const easterEggTimeout = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const trackEasterEgg = () => {
    const now = Date.now();
    swipeTimestamps.current.push(now);
    swipeTimestamps.current = swipeTimestamps.current.filter(
      timestamp => now - timestamp <= 2000
    );

    if (swipeTimestamps.current.length >= 5 && !prefersReducedMotion) {
      setShowEasterEgg(true);
      
      if (easterEggTimeout.current) clearTimeout(easterEggTimeout.current);
      
      easterEggTimeout.current = setTimeout(() => {
        setShowEasterEgg(false);
      }, 3000);
      
      swipeTimestamps.current = [];
    }
  };

  const goToNext = () => {
    if (isAnimating || currentIndex >= preferredLabs.length - 1) return;
    setDirection('next');
    setIsAnimating(true);
    trackEasterEgg();
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setDirection(null);
      setIsAnimating(false);
    }, prefersReducedMotion ? 0 : 400);
  };

  const goToPrev = () => {
    if (isAnimating || currentIndex <= 0) return;
    setDirection('prev');
    setIsAnimating(true);
    trackEasterEgg();
    
    setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setDirection(null);
      setIsAnimating(false);
    }, prefersReducedMotion ? 0 : 400);
  };

  // Touch/Mouse handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (isAnimating) return;
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragStart || !isDragging) return;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    const threshold = 80;
    
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAnimating]);

  useEffect(() => {
    return () => {
      if (easterEggTimeout.current) clearTimeout(easterEggTimeout.current);
    };
  }, []);

  if (preferredLabs.length === 0) return null;

  const getCardStyle = (index: number) => {
    const diff = index - currentIndex;
    const isCurrent = diff === 0;
    const isPrev = diff < 0;
    
    let transform = '';
    let opacity = 1;
    let zIndex = preferredLabs.length - Math.abs(diff);
    
    if (isDragging && isCurrent) {
      transform = `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.1}px, 0) 
                   rotateY(${dragOffset.x * 0.05}deg) 
                   scale(${1 - Math.abs(dragOffset.x) * 0.0002})`;
    } else if (isPrev) {
      transform = `translate3d(-100%, 0, 0) rotateY(-15deg) scale(0.9)`;
      opacity = 0;
    } else if (diff > 0) {
      const offset = Math.min(diff, 3);
      transform = `translate3d(${offset * 8}px, ${offset * 4}px, -${offset * 100}px) 
                   scale(${1 - offset * 0.05}) 
                   rotateY(${offset * 2}deg)`;
      opacity = 1 - offset * 0.2;
    } else {
      transform = `translate3d(0, 0, 0)`;
    }

    return {
      transform,
      opacity,
      zIndex,
      transition: isDragging || prefersReducedMotion ? 'none' : 
                  'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    };
  };

  return (
    <div className="relative">
      {/* Easter Egg - Sparkle Burst */}
      {showEasterEgg && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute text-primary animate-in zoom-in-0 fade-in-0 duration-500",
                "animate-out zoom-out-0 fade-out-0"
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 50}ms`,
                fontSize: `${Math.random() * 20 + 20}px`,
              }}
            />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-in zoom-in-0 fade-in-0 spin-in-0 duration-500">
            🦷✨
          </div>
        </div>
      )}

      {/* Card Stack */}
      <div
        ref={containerRef}
        className="relative h-[400px] md:h-[450px] perspective-1000"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {preferredLabs.map((pref, index) => (
          <div
            key={pref.id}
            className="absolute inset-0 will-change-transform"
            style={getCardStyle(index)}
          >
            {/* Glow Layer */}
            <div 
              className={cn(
                "absolute inset-0 -z-10 blur-2xl opacity-30 rounded-xl",
                index === currentIndex && "animate-pulse"
              )}
              style={{
                background: `radial-gradient(circle at 50% 50%, 
                  hsl(var(--primary) / 0.4), 
                  hsl(var(--accent) / 0.2), 
                  transparent)`,
              }}
            />
            
            {/* Card */}
            <Card className={cn(
              "h-full border-2 shadow-2xl",
              index === currentIndex && "border-primary",
              isDragging && index === currentIndex && "cursor-grabbing",
              !isDragging && "cursor-grab"
            )}>
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Priority {index + 1}
                    </Badge>
                    {index === currentIndex && (
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
                              Remove {pref.labs.name} from your preferred labs?
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
                    )}
                  </div>

                  <h3 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {pref.labs.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-lg">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {pref.labs.pricing_tier}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold text-xl">
                        {pref.labs.performance_score?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  {index === currentIndex && (
                    <p className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                      👆 Swipe or use arrows to navigate
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-xl h-12 w-12",
          "transition-all duration-200 hover:scale-110",
          (currentIndex === 0 || isAnimating) && "opacity-30 cursor-not-allowed"
        )}
        onClick={goToPrev}
        disabled={currentIndex === 0 || isAnimating}
        aria-label="Previous lab"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-xl h-12 w-12",
          "transition-all duration-200 hover:scale-110",
          (currentIndex === preferredLabs.length - 1 || isAnimating) && "opacity-30 cursor-not-allowed"
        )}
        onClick={goToNext}
        disabled={currentIndex === preferredLabs.length - 1 || isAnimating}
        aria-label="Next lab"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Progress Indicator */}
      <div className="mt-6 flex justify-center gap-2">
        {preferredLabs.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              currentIndex === index 
                ? "w-12 bg-primary" 
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            onClick={() => {
              if (!isAnimating) {
                setDirection(index > currentIndex ? 'next' : 'prev');
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setDirection(null);
                  setIsAnimating(false);
                }, prefersReducedMotion ? 0 : 400);
              }
            }}
            aria-label={`Go to lab ${index + 1}`}
          />
        ))}
      </div>

      {/* Card Counter */}
      <div className="text-center mt-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{currentIndex + 1}</span>
        {" / "}
        {preferredLabs.length}
      </div>
    </div>
  );
};
