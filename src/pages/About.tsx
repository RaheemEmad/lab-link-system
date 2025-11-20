import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Target, Users, Shield, Zap, Heart, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            About LabLink
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Transforming dental lab workflows from WhatsApp chaos to streamlined digital precision
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-12 border-primary/20">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl text-center">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground text-center leading-relaxed max-w-3xl mx-auto">
              We exist to eliminate the chaos of manual, WhatsApp-driven dental lab communications. 
              LabLink provides dental professionals and lab technicians with a modern, clinical-grade 
              platform that brings transparency, accuracy, and efficiency to every order—from submission 
              to delivery.
            </p>
          </CardContent>
        </Card>

        {/* The Problem We Solve */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">The Problem We Solve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-destructive/20 hover:border-destructive/40 transition-colors">
              <CardContent className="pt-5 sm:pt-6">
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">❌</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-base sm:text-lg">Lost Messages</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Critical order details buried in endless WhatsApp threads
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 hover:border-destructive/40 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⏰</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">Manual Tracking</h3>
                  <p className="text-muted-foreground">
                    Hours wasted on status updates and order verification
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 hover:border-destructive/40 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">Communication Errors</h3>
                  <p className="text-muted-foreground">
                    Miscommunication leading to costly remakes and delays
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle>Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Every order detail—materials, shades, timelines—captured with absolute accuracy
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Clarity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Guided workflows with zero confusion—everyone knows what to do next
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Reliability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Always available, always tracking—your operations never miss a beat
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Speed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fast intake, instant updates, rapid delivery—time is precious in dental care
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Professionalism</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Clinical-grade UX built for real business operations, not consumer apps
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Patient-Focused</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Better workflows mean better patient outcomes and experiences
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How We're Different */}
        <Card className="mb-12 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl text-center">How We're Different</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Built for Healthcare
                </h3>
                <p className="text-muted-foreground">
                  HIPAA-compliant infrastructure with role-based access control, audit trails, 
                  and secure patient data handling from day one
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Dental-Specific Workflows
                </h3>
                <p className="text-muted-foreground">
                  Purpose-built for dental lab operations—not adapted from generic project 
                  management tools
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Real-Time Visibility
                </h3>
                <p className="text-muted-foreground">
                  Every stakeholder sees order status instantly—no more "checking in" 
                  on WhatsApp
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Modern but Familiar
                </h3>
                <p className="text-muted-foreground">
                  Clean, intuitive interface that dental professionals can use without 
                  extensive training
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Story */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Our Story</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  LabLink was born from a simple observation: dental professionals and lab technicians 
                  were spending countless hours managing orders through scattered WhatsApp messages, 
                  Excel spreadsheets, and phone calls. Critical information was getting lost, orders 
                  were delayed, and everyone was frustrated.
                </p>
                <p>
                  We knew there had to be a better way. Not a generic project management tool adapted 
                  for dental labs, but a purpose-built platform that understood the unique workflows, 
                  terminology, and requirements of dental laboratory operations.
                </p>
                <p>
                  Today, LabLink serves dental practices and laboratories by providing a single source 
                  of truth for every order. From the moment a dentist submits an order to final delivery, 
                  every detail is tracked, every status update is instant, and every stakeholder stays 
                  informed.
                </p>
                <p className="text-foreground font-medium">
                  We're not just building software—we're transforming how dental labs operate in the 
                  digital age.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-primary/5 rounded-lg p-8 sm:p-12 border border-primary/20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Join dental professionals and labs who've replaced WhatsApp chaos with organized, 
            trackable workflows
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="w-full sm:w-auto">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
