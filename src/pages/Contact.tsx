import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, MessageSquare, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().max(20).optional(),
  subject: z.enum(["technical", "business", "general", "feedback"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      contactFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    // Simulate form submission (in production, this would send to your backend)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Message sent successfully!", {
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Get in Touch</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            We're here to help with any questions or concerns about LabLink
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-8 sm:mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <CardTitle>Technical Support</CardTitle>
              <CardDescription>
                For technical issues, bugs, or platform assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="mailto:raheem.amer.swe@gmail.com"
                className="text-primary hover:underline font-medium text-base sm:text-lg break-all"
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

        {/* Contact Form */}
        <Card className="mb-12">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Send Us a Message</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you as soon as possible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => handleInputChange("subject", value)}
                    required
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Support</SelectItem>
                      <SelectItem value="business">Business Inquiry</SelectItem>
                      <SelectItem value="general">General Question</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us how we can help you..."
                  className="min-h-[150px] resize-none"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  required
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.message.length}/2000 characters
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
