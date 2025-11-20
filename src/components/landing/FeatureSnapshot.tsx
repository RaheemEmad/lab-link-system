import { ClipboardCheck, TrendingUp, Truck, Search } from "lucide-react";

const FeatureSnapshot = () => {
  const features = [
    {
      icon: ClipboardCheck,
      title: "Intake",
      description: "Standardized forms capture exact tooth, shade & files",
    },
    {
      icon: TrendingUp,
      title: "Workflow",
      description: "Status updates from pending to delivered, visible to all",
    },
    {
      icon: Truck,
      title: "Delivery",
      description: "Add tracking numbers & target dates to reduce missed deliveries",
    },
    {
      icon: Search,
      title: "Search",
      description: "Find any case by doctor, patient, or tooth in seconds",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">LabLink in one sentence</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A lightweight digital intake + dashboard system built on Google Forms, Sheets and Glide so your team stops guessing and starts delivering.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(47,59,74,0.08)] hover-scale animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" strokeWidth={2} />
              </div>
              <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSnapshot;
