import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Package, 
  Truck, 
  Bell,
  Clock,
  Users,
  BarChart3
} from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: FileText,
      title: "1. Create Order",
      description: "Dentist fills out a simple digital form with patient details, restoration type, shade, and tooth numbers. No more messy WhatsApp messages.",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: Send,
      title: "2. Instant Submission",
      description: "Order is instantly sent to the lab with all details organized and clear. Photos and notes are attached securely.",
      color: "text-blue-600",
      bgColor: "bg-blue-600/10"
    },
    {
      icon: CheckCircle,
      title: "3. Lab Receives & Confirms",
      description: "Lab staff sees the order immediately in their dashboard, reviews details, and confirms acceptance with one click.",
      color: "text-green-600",
      bgColor: "bg-green-600/10"
    },
    {
      icon: Package,
      title: "4. Production Updates",
      description: "Lab updates the order status as it progresses: In Progress → Ready for QC → Ready for Delivery. Dentist sees real-time updates.",
      color: "text-orange-600",
      bgColor: "bg-orange-600/10"
    },
    {
      icon: Truck,
      title: "5. Delivery Tracking",
      description: "When ready, lab adds shipment tracking info. Dentist receives notification and can track delivery progress.",
      color: "text-purple-600",
      bgColor: "bg-purple-600/10"
    },
    {
      icon: Bell,
      title: "6. Completion",
      description: "Order marked as delivered. Full history preserved for reference, quality control, and future orders.",
      color: "text-teal-600",
      bgColor: "bg-teal-600/10"
    }
  ];

  const features = [
    {
      icon: Clock,
      title: "Real-Time Updates",
      description: "Both dentist and lab see order status changes instantly"
    },
    {
      icon: Users,
      title: "Clear Communication",
      description: "Add notes and comments at any stage of the process"
    },
    {
      icon: BarChart3,
      title: "Complete History",
      description: "Full audit trail of every order from creation to delivery"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-background">
        <div className="container px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-12 max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              How <span className="text-primary">LabLink</span> Works
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              A simple, transparent workflow that connects dentists and labs seamlessly
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-10">The Complete Workflow</h2>
            <div className="grid gap-6 md:gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={index} className="relative overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${step.bgColor}`}>
                          <Icon className={`h-6 w-6 ${step.color}`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                          <p className="text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-10">Key Features at Every Step</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="text-center">
                    <CardHeader>
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Streamline Your Workflow?</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Start managing your dental lab orders with precision and clarity today
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/auth")}>
                  Get Started Now
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default HowItWorks;
