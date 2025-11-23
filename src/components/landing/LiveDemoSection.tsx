import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Building2, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Star,
  Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const LiveDemoSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("order-form");

  const demoFeatures = [
    {
      id: "order-form",
      icon: FileText,
      title: "Order Form",
      description: "Guided intake captures every detail",
      preview: {
        title: "Create New Order",
        fields: [
          { label: "Patient Name", value: "John Smith", icon: User },
          { label: "Tooth Number", value: "#14, #15", icon: CheckCircle2 },
          { label: "Restoration Type", value: "Zirconia Crown", icon: Star },
          { label: "Shade", value: "A2", icon: CheckCircle2 },
          { label: "Delivery Date", value: "Dec 15, 2025", icon: Clock },
        ],
        action: "Submit Order",
        route: "/new-order"
      }
    },
    {
      id: "lab-profile",
      icon: Building2,
      title: "Lab Profile",
      description: "Professional lab showcase",
      preview: {
        title: "Precision Dental Lab",
        fields: [
          { label: "Specializations", value: "Zirconia, E-max, PFM", icon: Star },
          { label: "Performance Score", value: "4.8/5.0", icon: TrendingUp },
          { label: "Turnaround Time", value: "3-5 days standard", icon: Clock },
          { label: "Current Capacity", value: "Available", icon: CheckCircle2 },
          { label: "Location", value: "New York, NY", icon: MapPin },
        ],
        action: "View Lab Details",
        route: "/labs"
      }
    },
    {
      id: "tracking",
      icon: TrendingUp,
      title: "Order Tracking",
      description: "Real-time status updates",
      preview: {
        title: "Order #ORD-2024-1234",
        fields: [
          { label: "Status", value: "In Progress", icon: TrendingUp, highlight: true },
          { label: "Lab", value: "Precision Dental Lab", icon: Building2 },
          { label: "Patient", value: "John Smith", icon: User },
          { label: "Expected Delivery", value: "Dec 15, 2025", icon: Truck },
          { label: "Last Updated", value: "2 hours ago", icon: Clock },
        ],
        action: "View Full Details",
        route: "/dashboard"
      }
    }
  ];

  const activeFeature = demoFeatures.find(f => f.id === activeTab) || demoFeatures[0];

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-br from-secondary/30 via-background to-primary/5">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Interactive Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            See LabLink in Action
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Explore the platform's key features and see how LabLink transforms dental lab workflows.
          </p>
        </div>

        {/* Demo Tabs */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-3 mb-8 sm:mb-12 h-auto p-1 bg-card border border-border">
              {demoFeatures.map((feature) => (
                <TabsTrigger
                  key={feature.id}
                  value={feature.id}
                  className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 py-3 sm:py-4 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <feature.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="text-center sm:text-left">
                    <div className="font-semibold text-xs sm:text-sm">{feature.title}</div>
                    <div className="hidden sm:block text-xs opacity-80">{feature.description}</div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content */}
            {demoFeatures.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="mt-0">
                <div className="grid lg:grid-cols-2 gap-8 items-center animate-fade-in">
                  {/* Preview Card */}
                  <Card className="p-6 sm:p-8 bg-card border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    {/* Card Header */}
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{feature.preview.title}</h3>
                        <p className="text-sm text-muted-foreground">Live preview</p>
                      </div>
                    </div>

                    {/* Preview Fields */}
                    <div className="space-y-4 mb-6">
                      {feature.preview.fields.map((field, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                            field.highlight ? 'bg-primary/10' : 'bg-secondary/50'
                          }`}
                        >
                          <field.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            field.highlight ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground font-medium mb-1">
                              {field.label}
                            </div>
                            <div className={`text-sm font-semibold truncate ${
                              field.highlight ? 'text-primary' : 'text-foreground'
                            }`}>
                              {field.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full group"
                      onClick={() => navigate(user ? feature.preview.route : "/auth")}
                    >
                      {feature.preview.action}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Card>

                  {/* Feature Description */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-2xl sm:text-3xl font-bold">
                        {feature.title}
                      </h3>
                      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                        {feature.id === "order-form" && (
                          "Streamlined digital forms guide dentists through every detail. Capture patient information, restoration specifics, shade matching, and delivery requirements in a structured, error-proof workflow."
                        )}
                        {feature.id === "lab-profile" && (
                          "Professional lab profiles showcase capabilities, specializations, and performance metrics. Dentists can browse labs, view ratings, and make informed decisions based on expertise and availability."
                        )}
                        {feature.id === "tracking" && (
                          "Real-time order tracking provides complete visibility from submission to delivery. Both dentists and labs stay updated with automatic status changes, delivery dates, and comprehensive order history."
                        )}
                      </p>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-3">
                      {feature.id === "order-form" && (
                        <>
                          <BenefitItem text="No missing information or unclear requirements" />
                          <BenefitItem text="Photo uploads for precise shade matching" />
                          <BenefitItem text="Automatic lab assignment based on preferences" />
                          <BenefitItem text="Complete audit trail of all submissions" />
                        </>
                      )}
                      {feature.id === "lab-profile" && (
                        <>
                          <BenefitItem text="Verified specializations and expertise levels" />
                          <BenefitItem text="Performance metrics and turnaround times" />
                          <BenefitItem text="Transparent pricing tiers and availability" />
                          <BenefitItem text="Easy comparison across multiple labs" />
                        </>
                      )}
                      {feature.id === "tracking" && (
                        <>
                          <BenefitItem text="Eliminate status check calls and emails" />
                          <BenefitItem text="Automatic notifications on status changes" />
                          <BenefitItem text="Complete order history and documentation" />
                          <BenefitItem text="Delivery tracking and confirmation" />
                        </>
                      )}
                    </div>

                    {/* CTA */}
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="group"
                      onClick={() => navigate(user ? feature.preview.route : "/auth")}
                    >
                      Try This Feature
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-16 sm:mt-20 animate-fade-in">
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            Ready to experience the full platform?
          </p>
          <Button 
            size="lg"
            className="text-base sm:text-lg px-8 py-6 h-auto hover:scale-105 transition-transform shadow-lg group"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            {user ? "Go to Dashboard" : "Start Free Trial"}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const BenefitItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3">
    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
    <span className="text-sm sm:text-base text-foreground">{text}</span>
  </div>
);

export default LiveDemoSection;
