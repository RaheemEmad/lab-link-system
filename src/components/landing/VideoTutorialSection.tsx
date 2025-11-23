import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  FileText, 
  Building2, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Video
} from "lucide-react";

const VideoTutorialSection = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const tutorials = [
    {
      id: "create-order",
      icon: FileText,
      title: "Creating Your First Order",
      duration: "3:24",
      difficulty: "Beginner",
      description: "Learn how to submit a complete dental lab order in under 2 minutes",
      thumbnail: "order-form",
      steps: [
        "Enter patient information and case details",
        "Select tooth numbers and restoration type",
        "Upload photos for accurate shade matching",
        "Choose your preferred lab or auto-assign",
        "Set delivery requirements and submit"
      ],
      videoUrl: "" // Placeholder - can be replaced with actual video URL
    },
    {
      id: "lab-profile",
      icon: Building2,
      title: "Setting Up Your Lab Profile",
      duration: "4:12",
      difficulty: "Beginner",
      description: "Create a professional lab profile that attracts dentist partnerships",
      thumbnail: "lab-profile",
      steps: [
        "Add your lab information and contact details",
        "Upload your lab logo and branding",
        "Configure specializations and expertise levels",
        "Set pricing tiers and turnaround times",
        "Preview and publish your profile"
      ],
      videoUrl: ""
    },
    {
      id: "track-orders",
      icon: TrendingUp,
      title: "Tracking Orders & Updates",
      duration: "2:45",
      difficulty: "Beginner",
      description: "Monitor order progress and manage status updates in real-time",
      thumbnail: "tracking",
      steps: [
        "Access your order dashboard",
        "Filter and search for specific orders",
        "Update order status and add notes",
        "Upload delivery tracking information",
        "Confirm delivery and close orders"
      ],
      videoUrl: ""
    }
  ];

  const getThumbnailGradient = (type: string) => {
    switch (type) {
      case "order-form":
        return "from-primary/20 via-primary/10 to-accent/10";
      case "lab-profile":
        return "from-accent/20 via-accent/10 to-primary/10";
      case "tracking":
        return "from-primary/10 via-accent/10 to-primary/20";
      default:
        return "from-primary/20 to-accent/20";
    }
  };

  const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "outline" => {
    return "secondary";
  };

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-background">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Video Tutorials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Learn LabLink in Minutes
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Watch step-by-step guides to master the platform's key features and start improving your workflow today.
          </p>
        </div>

        {/* Tutorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto mb-12">
          {tutorials.map((tutorial, index) => (
            <Card 
              key={tutorial.id}
              className="overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                {/* Gradient placeholder for video */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getThumbnailGradient(tutorial.thumbnail)} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
                  {/* Icon overlay */}
                  <div className="relative z-10">
                    <tutorial.icon className="w-16 h-16 sm:w-20 sm:h-20 text-primary/40" strokeWidth={1.5} />
                  </div>
                  
                  {/* Grid pattern overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
                </div>

                {/* Play button overlay */}
                <button
                  onClick={() => setActiveVideo(tutorial.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                >
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </button>

                {/* Duration badge */}
                <div className="absolute top-3 right-3 z-20">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {tutorial.duration}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Title & Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight">
                    {tutorial.title}
                  </h3>
                  <Badge variant={getDifficultyVariant(tutorial.difficulty)} className="flex-shrink-0">
                    {tutorial.difficulty}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {tutorial.description}
                </p>

                {/* Steps */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    What You'll Learn
                  </div>
                  {tutorial.steps.slice(0, 3).map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground leading-relaxed">{step}</span>
                    </div>
                  ))}
                  {tutorial.steps.length > 3 && (
                    <div className="text-xs text-muted-foreground ml-6">
                      +{tutorial.steps.length - 3} more steps
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button 
                  className="w-full group/btn"
                  variant="outline"
                  onClick={() => setActiveVideo(tutorial.id)}
                >
                  <Play className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                  Watch Tutorial
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Full Tutorial List */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8 border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Complete Tutorial Library</h3>
                <p className="text-sm text-muted-foreground">All walkthroughs in one place</p>
              </div>
            </div>

            <div className="space-y-3">
              {tutorials.map((tutorial) => (
                <button
                  key={tutorial.id}
                  onClick={() => setActiveVideo(tutorial.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left group/item"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/20 transition-colors">
                    <tutorial.icon className="w-5 h-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base mb-1">{tutorial.title}</div>
                    <div className="text-xs text-muted-foreground">{tutorial.description}</div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="secondary" className="hidden sm:flex">
                      {tutorial.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {tutorial.duration}
                    </div>
                    <Play className="w-5 h-5 text-primary group-hover/item:scale-110 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom Info */}
        <div className="max-w-3xl mx-auto text-center mt-12 sm:mt-16 animate-fade-in">
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            New tutorials added regularly. Have a suggestion?{" "}
            <a href="/contact" className="text-primary hover:underline font-medium">
              Let us know
            </a>
          </p>
        </div>
      </div>

      {/* Video Modal Placeholder - Could be enhanced with actual video player */}
      {activeVideo && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <div 
            className="bg-card rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <Video className="w-16 h-16 text-primary mx-auto" />
                <p className="text-lg font-semibold">Video Player</p>
                <p className="text-sm text-muted-foreground">
                  Tutorial video will be displayed here
                </p>
                <Button onClick={() => setActiveVideo(null)}>
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VideoTutorialSection;
