import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Shield, Zap, Heart, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-background">
        <div className="container px-4 py-8 sm:py-12 max-w-6xl mx-auto">

          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6">
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
            <h2 className="text-3xl font-bold text-center mb-8">Our Values</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Precision</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every detail matters—from shades to materials to delivery dates. We ensure nothing gets lost in translation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Speed</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Fast intake, instant updates, and real-time tracking. No more waiting for responses or digging through chat history.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Clarity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Guided workflows and transparent status tracking. Everyone knows exactly where every order stands.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Reliability</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Always available, always tracking. A system you can depend on, every single day.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Professionalism</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Clinical-grade interface built for real business operations, not casual messaging.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Simplicity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Powerful features without complexity. Easy to learn, faster to master.
                  </p>
                </CardContent>
              </Card>
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
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default About;
