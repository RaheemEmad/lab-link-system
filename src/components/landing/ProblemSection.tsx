import { AlertCircle, Shuffle, FileQuestion } from "lucide-react";

const ProblemSection = () => {
  const problems = [
    {
      icon: FileQuestion,
      title: "Missing details",
      description: "Shades and tooth numbers lost in chat",
    },
      {
        icon: Shuffle,
        title: "Non-repeatable process",
        description: "Each order handled differently, total chaos",
      },
    {
      icon: AlertCircle,
      title: "No accountability",
      description: "Who shipped what? When? No record",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-16 max-w-4xl mx-auto leading-tight animate-fade-in">
          Dental labs lose time and money because communication is built on WhatsApp: messy, missing, and dangerous
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="bg-card p-8 rounded-xl shadow-[0_8px_30px_rgba(47,59,74,0.08)] hover:shadow-[0_12px_40px_rgba(47,59,74,0.12)] transition-all duration-300 hover:-translate-y-1 border border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <problem.icon className="w-12 h-12 text-destructive mb-4" strokeWidth={1.5} />
              <h4 className="text-xl font-semibold mb-2">{problem.title}</h4>
              <p className="text-muted-foreground">{problem.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <a 
            href="#how-it-works" 
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
          >
            See how LabLink fixes this →
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
