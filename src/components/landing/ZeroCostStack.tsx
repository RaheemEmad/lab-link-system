import { UserPlus, ShieldCheck, Package, MessageSquare, Clock, Bell } from "lucide-react";

const ZeroCostStack = () => {
  const workflow = [
    { icon: UserPlus, label: "Sign Up & Choose Role", color: "text-primary" },
    { icon: ShieldCheck, label: "Role-Based Access", color: "text-accent" },
    { icon: Package, label: "Manage Orders", color: "text-primary" },
  ];

  const features = [
    { icon: Package, title: "Order Management", description: "Create, track, and update dental lab orders in real-time" },
    { icon: Clock, title: "Status History", description: "Complete timeline of all order status changes with timestamps" },
    { icon: MessageSquare, title: "Internal Notes", description: "Collaborative commenting system for doctors and lab staff" },
    { icon: Bell, title: "Smart Notifications", description: "Automatic alerts for status changes and updates" },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-in">
              Simple Workflow, Powerful Features
            </h3>
            <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              Role-based access ensures everyone sees exactly what they need
            </p>
          </div>
          
          {/* Workflow Steps */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-16">
            {workflow.map((item, index) => (
              <div key={index} className="flex items-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-3 bg-card px-6 py-4 rounded-xl border border-border shadow-sm hover:shadow-md hover-scale transition-all duration-300">
                  <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {index < workflow.length - 1 && (
                  <div className="mx-4 text-muted-foreground text-2xl">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="w-6 h-6 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Role-based access info */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 text-sm text-muted-foreground bg-card px-6 py-4 rounded-xl border border-border animate-fade-in" style={{ animationDelay: '700ms' }}>
              <ShieldCheck className="w-5 h-5 text-success" />
              <span><strong>Doctors</strong> manage their orders • <strong>Lab Staff</strong> update status & add notes • <strong>Admins</strong> oversee everything</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ZeroCostStack;
