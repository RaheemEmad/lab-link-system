import { ClipboardCheck, Clock, Package, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ClipboardCheck,
    title: "Digital Order Intake",
    description: "Submit orders quickly with our streamlined digital form. All information captured in real-time.",
  },
  {
    icon: Clock,
    title: "Real-Time Status Tracking",
    description: "Monitor order progress from pending to delivery. Stay informed at every stage.",
  },
  {
    icon: Package,
    title: "Shipment Management",
    description: "Track delivery dates and shipment details. Never lose sight of your cases.",
  },
  {
    icon: Search,
    title: "Easy Search & Filter",
    description: "Find orders instantly by doctor name, patient, or status. Powerful filtering tools.",
  },
];

const Features = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete solution for managing your dental lab operations efficiently
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/50 transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
