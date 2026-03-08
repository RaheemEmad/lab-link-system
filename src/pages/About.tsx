import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Shield, Zap, Heart, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";

const About = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
          About <span className="text-primary">LabLink</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
          Transforming dental lab workflows from chaotic WhatsApp messages to streamlined, trackable, professional operations.
        </p>
      </div>

      {/* Mission Section */}
      <Card className="mb-8 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            LabLink was built to solve a real problem in dental practices: the endless back-and-forth of WhatsApp messages, lost orders, unclear timelines, and manual tracking chaos. We believe dental professionals deserve better tools—clinical-grade software that brings precision, clarity, and reliability to every order.
          </p>
        </CardContent>
      </Card>

      {/* Values Grid */}
      <div className="mb-12">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-8">Our Values</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "Precision", desc: "Every detail matters—from shades to materials to delivery dates. We ensure nothing gets lost in translation." },
            { icon: Zap, title: "Speed", desc: "Fast intake, instant updates, and real-time tracking. No more waiting for responses or digging through chat history." },
            { icon: Users, title: "Clarity", desc: "Guided workflows and transparent status tracking. Everyone knows exactly where every order stands." },
            { icon: Heart, title: "Reliability", desc: "Always available, always tracking. A system you can depend on, every single day." },
            { icon: Award, title: "Professionalism", desc: "Clinical-grade interface built for real business operations, not casual messaging." },
            { icon: Target, title: "Simplicity", desc: "Powerful features without complexity. Easy to learn, faster to master." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join dental professionals who have already moved from WhatsApp chaos to organized, trackable lab operations.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Today
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default About;
