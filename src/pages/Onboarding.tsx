import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Progress } from "@/components/ui/progress";
import { Building2, Stethoscope, ArrowRight } from "lucide-react";
import WelcomeAnimation from "@/components/onboarding/WelcomeAnimation";
import { PricingModeSelector } from "@/components/labs/PricingModeSelector";

type OnboardingStep = "role" | "profile" | "pricing" | "welcome";
type PricingMode = 'TEMPLATE' | 'CUSTOM';

interface PricingEntry {
  restoration_type: string;
  fixed_price: number;
  rush_surcharge_percent: number;
}

const Onboarding = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<"doctor" | "lab_staff" | null>(null);
  const [loading, setLoading] = useState(false);

  // Doctor form fields
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");

  // Lab form fields
  const [labName, setLabName] = useState("");
  const [labLicense, setLabLicense] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  
  // Pricing state for labs
  const [pricingMode, setPricingMode] = useState<PricingMode | null>(null);
  const [customPricing, setCustomPricing] = useState<PricingEntry[]>([]);

  // Check if user already has a role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data?.role;
    },
    enabled: !!user?.id,
  });

  // Check onboarding status
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // If user already has a role, skip to profile step
  useEffect(() => {
    if (userRole) {
      setSelectedRole(userRole as "doctor" | "lab_staff");
      setStep("profile");
    }
  }, [userRole]);

  // Choose role mutation
  const chooseRoleMutation = useMutation({
    mutationFn: async (role: "doctor" | "lab_staff") => {
      const { data, error } = await supabase.functions.invoke('onboarding-choose-role', {
        body: { role },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role selected successfully!");
      setStep("profile");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to select role");
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const { data, error } = await supabase.functions.invoke('onboarding-complete', {
        body: profileData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Onboarding completed successfully!");
      setStep("welcome");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete onboarding");
    },
  });

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);
    await chooseRoleMutation.mutateAsync(selectedRole);
    setLoading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For lab staff, go to pricing step instead of completing
    if (selectedRole === "lab_staff") {
      setStep("pricing");
      return;
    }
    
    // For doctors, complete onboarding directly
    setLoading(true);
    const profileData = { phone, clinic_name: clinicName, specialty };
    await completeOnboardingMutation.mutateAsync(profileData);
    setLoading(false);
  };

  const handlePricingComplete = async (mode: PricingMode, pricing?: PricingEntry[]) => {
    setPricingMode(mode);
    if (pricing) setCustomPricing(pricing);
    
    setLoading(true);
    const profileData = {
      phone,
      lab_name: labName,
      lab_license_number: labLicense,
      tax_id: taxId,
      business_address: businessAddress,
      pricing_mode: mode,
      pricing_entries: pricing || []
    };
    
    await completeOnboardingMutation.mutateAsync(profileData);
    setLoading(false);
  };

  const getProgress = () => {
    if (step === "role") return 25;
    if (step === "profile") return selectedRole === "lab_staff" ? 50 : 66;
    if (step === "pricing") return 75;
    return 100;
  };
  
  const progress = getProgress();

  // Show welcome animation after onboarding
  if (step === "welcome" && selectedRole) {
    return (
      <WelcomeAnimation 
        role={selectedRole} 
        userName={user?.user_metadata?.full_name}
      />
    );
  }

  return (
    <>
      <LandingNav />
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to LabLink</h1>
            <p className="text-muted-foreground">Complete your profile to get started</p>
            <Progress value={progress} className="mt-4" />
          </div>

          {step === "role" && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Role</CardTitle>
                <CardDescription>
                  Select the option that best describes you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedRole || ""}
                  onValueChange={(value) => setSelectedRole(value as "doctor" | "lab_staff")}
                  className="space-y-4"
                >
                  <div
                    className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRole === "doctor"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedRole("doctor")}
                  >
                    <RadioGroupItem value="doctor" id="doctor" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        <Label htmlFor="doctor" className="text-lg font-semibold cursor-pointer">
                          Dentist/Doctor
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        I am a dental professional ordering lab work
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRole === "lab_staff"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedRole("lab_staff")}
                  >
                    <RadioGroupItem value="lab_staff" id="lab_staff" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <Label htmlFor="lab_staff" className="text-lg font-semibold cursor-pointer">
                          Lab Staff
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        I work at a dental laboratory
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                <Button
                  onClick={handleRoleSelection}
                  disabled={!selectedRole || loading}
                  className="w-full mt-6"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRole === "doctor" ? "Clinic Information" : "Lab Information"}
                </CardTitle>
                <CardDescription>
                  {selectedRole === "doctor" 
                    ? "Complete your clinic profile to start ordering lab work. Your account is secured with advanced password protection including breach detection."
                    : "Complete your lab profile to start receiving orders. Your account is secured with advanced password protection including breach detection."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {selectedRole === "doctor" ? (
                    <>
                      <div>
                        <Label htmlFor="clinicName">Clinic Name *</Label>
                        <Input
                          id="clinicName"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                          required
                          placeholder="Enter your clinic name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialty">Specialty *</Label>
                        <Input
                          id="specialty"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          required
                          placeholder="e.g., General Dentistry, Orthodontics"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="labName">Lab Name *</Label>
                        <Input
                          id="labName"
                          value={labName}
                          onChange={(e) => setLabName(e.target.value)}
                          required
                          placeholder="Enter your lab name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="labLicense">Lab License Number *</Label>
                        <Input
                          id="labLicense"
                          value={labLicense}
                          onChange={(e) => setLabLicense(e.target.value)}
                          required
                          placeholder="License number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxId">Tax ID *</Label>
                        <Input
                          id="taxId"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          required
                          placeholder="Tax ID / EIN"
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessAddress">Business Address *</Label>
                        <Input
                          id="businessAddress"
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          required
                          placeholder="Full business address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {selectedRole === "lab_staff" ? (
                      <>
                        Continue to Pricing
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      loading ? "Completing..." : "Complete Onboarding"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "pricing" && selectedRole === "lab_staff" && (
            <PricingModeSelector
              onComplete={handlePricingComplete}
              isLoading={loading}
            />
          )}
        </div>
      </div>
      <LandingFooter />
    </>
  );
};

export default Onboarding;
