import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="container px-4 py-12 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-muted-foreground text-lg">
            We're here to help with any questions or concerns about LabLink
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Technical Support</CardTitle>
              <CardDescription>
                For technical issues, bugs, or platform assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="mailto:raheem.amer.swe@gmail.com"
                className="text-primary hover:underline font-medium text-lg"
              >
                raheem.amer.swe@gmail.com
              </a>
              <p className="text-sm text-muted-foreground mt-4">
                We typically respond within 24 hours on business days
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Business Inquiries</CardTitle>
              <CardDescription>
                For partnerships, sales, or general business matters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="tel:+201018385093"
                className="text-primary hover:underline font-medium text-lg"
              >
                +20 101 838 5093
              </a>
              <p className="text-sm text-muted-foreground mt-4">
                Available Monday - Friday, 9 AM - 6 PM (Cairo Time)
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>What We Can Help With</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Technical Support</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Account access and login issues</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Platform bugs or errors</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Feature questions and guidance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Integration and API support</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Data export and backup requests</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-foreground">Business Inquiries</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Pricing and subscription plans</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Enterprise solutions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Partnership opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Custom development requests</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Demo and onboarding sessions</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/10">
          <h3 className="font-semibold text-lg mb-2">Before You Contact Us</h3>
          <p className="text-muted-foreground mb-4">
            For faster assistance, please check our documentation and FAQs. Many common questions are answered there.
          </p>
          <p className="text-sm text-muted-foreground">
            When contacting support, please include your account email, a detailed description of the issue, 
            and any relevant screenshots to help us assist you more efficiently.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
