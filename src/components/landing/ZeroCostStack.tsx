import { FileSpreadsheet, Layout, MessageCircle, Shield } from "lucide-react";

const ZeroCostStack = () => {
  const stack = [
    { icon: FileSpreadsheet, label: "Google Form", color: "text-green-600" },
    { icon: FileSpreadsheet, label: "Google Sheet", color: "text-green-700" },
    { icon: Layout, label: "Glide Dashboard", color: "text-purple-600" },
    { icon: MessageCircle, label: "WhatsApp Quick Reply", color: "text-green-500" },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-in">
            Built on a zero-cost, secure stack: transparent & auditable
          </h3>
          
          <div className="flex flex-wrap justify-center items-center gap-6 my-12">
            {stack.map((item, index) => (
              <div key={index} className="flex items-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-3 bg-card px-6 py-4 rounded-xl border border-border shadow-sm hover:shadow-md hover-scale transition-all duration-300">
                  <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {index < stack.length - 1 && (
                  <div className="mx-4 text-muted-foreground text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground bg-card px-6 py-4 rounded-xl border border-border inline-flex animate-fade-in [animation-delay:400ms]">
            <Shield className="w-5 h-5 text-success" />
            <span>Data stored in your Google Workspace, you control access</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ZeroCostStack;
