import { Button } from "@/components/ui/button";

const FinalCTA = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Start LabLink in under 2 minutes — Zero cost, zero risk
          </h2>
          
          <Button 
            size="lg"
            className="text-lg px-12 py-6 h-auto hover:scale-105 transition-transform duration-160"
            onClick={() => window.open('https://forms.google.com/', '_blank')}
          >
            Launch LabLink Free — Submit an order
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
