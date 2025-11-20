import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const LandingHero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      <div className="container relative z-10 px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy + CTAs */}
          <div className="space-y-8 animate-fade-in">
            {/* Trust bar */}
            <p className="text-sm text-muted-foreground font-medium">
              Trusted by labs handling 1,000+ monthly cases — zero training required
            </p>
            
            {/* H1 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              LabLink — The End of WhatsApp Chaos for Dental Labs
            </h1>
            
            {/* H2 */}
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Track every case — every tooth, every shade, every delivery — with zero mistakes.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8 hover:scale-105 transition-transform duration-160"
                  onClick={() => window.open('https://forms.google.com/', '_blank')}
                >
                  Start LabLink Free — Submit an Order
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">2 minutes to complete</p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full sm:w-auto text-base px-8 hover:scale-105 transition-transform duration-160"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch 30-sec Demo
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">See LabLink in action</p>
              </div>
            </div>
            
            {/* Microcopy */}
            <p className="text-xs text-muted-foreground">
              No installs — Google Forms + Glide — free to start
            </p>
          </div>
          
          {/* Right: Split-screen mockup */}
          <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl shadow-[0_8px_30px_rgba(47,59,74,0.08)] p-8 border border-border/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Dashboard mockup placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
