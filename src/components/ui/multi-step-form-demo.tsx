import { MultiStepForm, Step } from "@/components/ui/multi-step-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, FileText, CheckCircle } from "lucide-react";

export const MultiStepFormDemo = () => {
  const steps: Step[] = [
    {
      id: "personal",
      title: "Personal Info",
      description: "Tell us about yourself",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              className="transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              className="transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              className="transition-all duration-300"
            />
          </div>
        </div>
      ),
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Customize your experience",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Your Role</Label>
            <Select>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dentist">Dentist</SelectItem>
                <SelectItem value="lab">Lab Technician</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Dentistry</SelectItem>
                <SelectItem value="orthodontics">Orthodontics</SelectItem>
                <SelectItem value="prosthodontics">Prosthodontics</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      id: "details",
      title: "Additional Details",
      description: "Help us understand your needs",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Tell us more</Label>
            <Textarea
              id="message"
              placeholder="Share any additional information..."
              rows={5}
              className="transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral">How did you hear about us?</Label>
            <Select>
              <SelectTrigger id="referral">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="search">Search Engine</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review & Submit",
      description: "Confirm your information",
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                <CheckCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold">Almost Done!</h4>
                <p className="text-sm text-muted-foreground">
                  Review your information before submitting
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>Personal information completed</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>Preferences set</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>Additional details provided</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Click "Complete" to submit your information
          </p>
        </div>
      ),
    },
  ];

  const handleComplete = (data: any) => {
    console.log("Form completed with data:", data);
    // Handle form submission
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Multi-Step Form Demo
          </h1>
          <p className="text-muted-foreground">
            Experience smooth transitions with blue/teal progress indicators
          </p>
        </div>
        <MultiStepForm steps={steps} onComplete={handleComplete} />
      </div>
    </div>
  );
};

export default MultiStepFormDemo;
