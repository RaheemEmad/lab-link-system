import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Progress } from "@/components/ui/progress";

const profileSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters"),
  specialty: z.string().min(2, "Specialty must be at least 2 characters"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfileCompletion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      clinicName: "",
      specialty: "",
    },
  });
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const values = form.watch();
    let filledFields = 0;
    const totalRequiredFields = 2; // clinicName and specialty (phone is optional)
    
    if (values.clinicName && values.clinicName.length >= 2) filledFields++;
    if (values.specialty && values.specialty.length >= 2) filledFields++;
    
    return Math.round((filledFields / totalRequiredFields) * 100);
  }, [form.watch()]);

  const handleSubmit = async (values: ProfileValues) => {
    if (!user) return;
    
    setIsLoading(true);

    try {
      // Call the complete_onboarding function
      const { error } = await supabase.rpc("complete_onboarding", {
        user_id_param: user.id,
        phone_param: values.phone || null,
        clinic_name_param: values.clinicName,
        specialty_param: values.specialty,
      });

      if (error) throw error;

      toast.success("Welcome to LabLink! Your profile is complete.");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Profile completion error:", error);
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 sm:p-6">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">Complete Your Profile</CardTitle>
            <CardDescription className="text-sm mt-2">
              Tell us a bit more about your practice to get started
            </CardDescription>
            
            {/* Progress Indicator */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-bold text-primary">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                {completionPercentage === 100 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Ready to launch!</span>
                  </>
                ) : (
                  <span>Fill in all fields to continue</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic/Practice Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Downtown Dental Clinic" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your dental practice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty *</FormLabel>
                      <FormControl>
                        <Input placeholder="General Dentistry, Prosthodontics, etc." {...field} />
                      </FormControl>
                      <FormDescription>
                        Your area of dental specialization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription>
                        For urgent order notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading || completionPercentage < 100}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up your workspace...
                    </>
                  ) : (
                    "Launch LabLink Free"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <LandingFooter />
    </div>
  );
}
