import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { LabToolsBreadcrumb } from "@/components/layout/LabToolsBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Settings,
  Award,
  Plus,
  Trash2,
  Save,
  Eye,
  Upload,
  X,
  Package,
  DollarSign
} from "lucide-react";
import LabPricingSetup from "@/components/billing/LabPricingSetup";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { LabProfilePreview } from "@/components/labs/LabProfilePreview";

const labProfileSchema = z.object({
  name: z.string().min(2, "Lab name is required").max(100),
  description: z.string().max(500).optional(),
  contact_email: z.string().email("Valid email required"),
  contact_phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  max_capacity: z.number().min(1, "Capacity must be at least 1").max(1000),
  standard_sla_days: z.number().min(1, "SLA must be at least 1 day").max(60),
  urgent_sla_days: z.number().min(1, "SLA must be at least 1 day").max(30),
  pricing_tier: z.enum(['budget', 'standard', 'premium']),
  website_url: z.string().url().optional().or(z.literal("")),
});

type LabProfileForm = z.infer<typeof labProfileSchema>;

const restorationTypes = [
  "Crown", "Bridge", "Zirconia Layer", "Zirco-Max", 
  "Zirconia", "E-max", "PFM", "Metal", "Acrylic"
] as const;

const expertiseLevels = ['basic', 'intermediate', 'expert'] as const;

const LabAdmin = () => {
  const { user } = useAuth();
  const { role, labId, isLoading: roleLoading, isLabStaff, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [newSpecType, setNewSpecType] = useState<string>("");
  const [newSpecExpertise, setNewSpecExpertise] = useState<string>("intermediate");
  const [newSpecDays, setNewSpecDays] = useState<string>("5");
  const [showPreview, setShowPreview] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fetch lab data
  const { data: lab, isLoading: labLoading } = useQuery({
    queryKey: ["lab-profile", labId],
    queryFn: async () => {
      if (!labId) return null;
      
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("id", labId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  // Fetch lab specializations
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations-admin", labId],
    queryFn: async () => {
      if (!labId) return [];
      
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("*")
        .eq("lab_id", labId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  const form = useForm<LabProfileForm>({
    resolver: zodResolver(labProfileSchema),
    defaultValues: {
      name: lab?.name || "",
      description: lab?.description || "",
      contact_email: lab?.contact_email || "",
      contact_phone: lab?.contact_phone || "",
      address: lab?.address || "",
      max_capacity: lab?.max_capacity || 10,
      standard_sla_days: lab?.standard_sla_days || 7,
      urgent_sla_days: lab?.urgent_sla_days || 3,
      pricing_tier: lab?.pricing_tier || 'standard',
      website_url: lab?.website_url || "",
    },
  });

  // Update form when lab data loads
  useEffect(() => {
    if (lab) {
      form.reset({
        name: lab.name,
        description: lab.description || "",
        contact_email: lab.contact_email,
        contact_phone: lab.contact_phone || "",
        address: lab.address || "",
        max_capacity: lab.max_capacity,
        standard_sla_days: lab.standard_sla_days,
        urgent_sla_days: lab.urgent_sla_days,
        pricing_tier: lab.pricing_tier as 'budget' | 'standard' | 'premium',
        website_url: lab.website_url || "",
      });
    }
  }, [lab, form]);

  // Update lab profile mutation
  const updateLabMutation = useMutation({
    mutationFn: async (data: LabProfileForm) => {
      if (!labId) throw new Error("No lab assigned");
      
      const { error } = await supabase
        .from("labs")
        .update({
          name: data.name,
          description: data.description,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          address: data.address,
          max_capacity: data.max_capacity,
          standard_sla_days: data.standard_sla_days,
          urgent_sla_days: data.urgent_sla_days,
          pricing_tier: data.pricing_tier,
          website_url: data.website_url,
        })
        .eq("id", labId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-profile"] });
      toast.success("Lab profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile", { description: error.message });
    },
  });

  // Add specialization mutation
  const addSpecializationMutation = useMutation({
    mutationFn: async () => {
      if (!labId || !newSpecType) throw new Error("Invalid data");
      
      const { error } = await supabase
        .from("lab_specializations")
        .insert([{
          lab_id: labId,
          restoration_type: newSpecType as any,
          expertise_level: newSpecExpertise as any,
          turnaround_days: parseInt(newSpecDays),
          is_preferred: false,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-specializations-admin"] });
      setNewSpecType("");
      setNewSpecDays("5");
      toast.success("Specialization added");
    },
    onError: (error: Error) => {
      toast.error("Failed to add specialization", { description: error.message });
    },
  });

  // Remove specialization mutation
  const removeSpecializationMutation = useMutation({
    mutationFn: async (specId: string) => {
      const { error } = await supabase
        .from("lab_specializations")
        .delete()
        .eq("id", specId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-specializations-admin"] });
      toast.success("Specialization removed");
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile || !user?.id) return null;
    
    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lab-logos')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lab-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload logo", { description: error.message });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const onSubmit = async (data: LabProfileForm) => {
    let logoUrl = lab?.logo_url;
    
    // Upload new logo if one was selected
    if (logoFile) {
      const uploadedUrl = await uploadLogo();
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      }
    }
    
    updateLabMutation.mutate({ ...data, logo_url: logoUrl } as any);
  };

  // Check access
  if (roleLoading || (!isLabStaff && !isAdmin)) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You need to be assigned to a lab to access this page.
                </p>
              </CardContent>
            </Card>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  if (labLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading lab data...</p>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  if (!lab && !labId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  No Lab Assigned
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your account is not currently assigned to a lab. Please contact an administrator.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">To unlock this feature:</p>
                  <p className="text-sm text-muted-foreground">
                    Send an email to{" "}
                    <a
                      href="mailto:raheem.amer.swe@gmail.com"
                      className="text-primary hover:underline"
                    >
                      raheem.amer.swe@gmail.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  const availableRestorationTypes = restorationTypes.filter(
    type => !specializations?.some(s => s.restoration_type === type)
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-5xl mx-auto">
            
            <LabToolsBreadcrumb currentPage="Lab Admin" />
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Lab Management</h1>
              <p className="text-muted-foreground">
                Manage your lab profile, specializations, and settings
              </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Profile & Settings</span>
                  <span className="sm:hidden">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Pricing</span>
                  <span className="sm:hidden">Price</span>
                </TabsTrigger>
                <TabsTrigger value="specializations" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Specializations</span>
                  <span className="sm:hidden">Specs</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Inventory</span>
                  <span className="sm:hidden">Inv.</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Lab Profile</CardTitle>
                    <CardDescription>
                      Update your lab information and service settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Logo Upload Section */}
                        <div className="border-b pb-6">
                          <h3 className="text-lg font-semibold mb-4">Lab Logo</h3>
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              {logoPreview || lab?.logo_url ? (
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-border">
                                  <img 
                                    src={logoPreview || lab?.logo_url || ''} 
                                    alt="Lab logo" 
                                    className="w-full h-full object-cover"
                                  />
                                  {logoPreview && (
                                    <button
                                      type="button"
                                      onClick={removeLogo}
                                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                                  <Building2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Upload a logo to represent your lab. This will appear in lab listings and on your profile.
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('logo-upload')?.click()}
                                  className="gap-2"
                                >
                                  <Upload className="h-4 w-4" />
                                  {logoPreview || lab?.logo_url ? 'Change Logo' : 'Upload Logo'}
                                </Button>
                                <input
                                  id="logo-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoChange}
                                  className="hidden"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Max size: 5MB. Formats: JPG, PNG, WebP
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lab Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pricing_tier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pricing Tier *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="budget">Budget</SelectItem>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} className="min-h-[80px]" />
                              </FormControl>
                              <FormDescription>
                                Brief description of your lab and services
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="contact_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="contact_phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website URL</FormLabel>
                              <FormControl>
                                <Input type="url" placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">Capacity & SLA Settings</h3>
                          
                          <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                              control={form.control}
                              name="max_capacity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Capacity *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Maximum concurrent orders
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="standard_sla_days"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Standard SLA (days) *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Regular delivery time
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="urgent_sla_days"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Urgent SLA (days) *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Rush delivery time
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPreview(true)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview Profile
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={updateLabMutation.isPending || uploadingLogo}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {updateLabMutation.isPending || uploadingLogo ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Specializations Tab */}
              <TabsContent value="specializations">
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Current Specializations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Specializations</CardTitle>
                      <CardDescription>
                        Restoration types your lab specializes in
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {specializations && specializations.length > 0 ? (
                        <div className="space-y-3">
                          {specializations.map((spec) => (
                            <Card key={spec.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium mb-1">{spec.restoration_type}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="secondary" className="capitalize">
                                        {spec.expertise_level}
                                      </Badge>
                                      <span>•</span>
                                      <span>{spec.turnaround_days} days</span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSpecializationMutation.mutate(spec.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p>No specializations added yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Add New Specialization */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add Specialization</CardTitle>
                      <CardDescription>
                        Add a new restoration type expertise
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Restoration Type *</Label>
                        <Select value={newSpecType} onValueChange={setNewSpecType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRestorationTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Expertise Level *</Label>
                        <Select value={newSpecExpertise} onValueChange={setNewSpecExpertise}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Turnaround Days *</Label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={newSpecDays}
                          onChange={(e) => setNewSpecDays(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Typical days needed to complete this restoration type
                        </p>
                      </div>

                      <Button
                        className="w-full gap-2"
                        onClick={() => addSpecializationMutation.mutate()}
                        disabled={!newSpecType || addSpecializationMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                        Add Specialization
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing">
                {labId && <LabPricingSetup labId={labId} />}
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Inventory Management
                        </CardTitle>
                        <CardDescription>
                          Track materials, supplies, and equipment
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700 w-fit">
                        Under Development
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-8 sm:py-12">
                    <div className="text-center space-y-4">
                      <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/50" />
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">Coming Soon</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto px-4">
                          Inventory management features including material tracking, 
                          stock alerts, supplier management, and usage analytics are 
                          currently in development.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 mt-6 px-4">
                        <Badge variant="outline" className="text-xs">Material Tracking</Badge>
                        <Badge variant="outline" className="text-xs">Stock Alerts</Badge>
                        <Badge variant="outline" className="text-xs">Supplier Management</Badge>
                        <Badge variant="outline" className="text-xs">Usage Analytics</Badge>
                        <Badge variant="outline" className="text-xs">Reorder Automation</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />

        {/* Preview Modal */}
        {showPreview && lab && (
          <LabProfilePreview
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            labData={{
              name: form.getValues('name') || lab.name,
              description: form.getValues('description') || lab.description || '',
              contact_email: form.getValues('contact_email') || lab.contact_email,
              contact_phone: form.getValues('contact_phone') || lab.contact_phone || '',
              address: form.getValues('address') || lab.address || '',
              max_capacity: form.getValues('max_capacity') || lab.max_capacity,
              current_load: lab.current_load,
              standard_sla_days: form.getValues('standard_sla_days') || lab.standard_sla_days,
              urgent_sla_days: form.getValues('urgent_sla_days') || lab.urgent_sla_days,
              pricing_tier: form.getValues('pricing_tier') || lab.pricing_tier,
              performance_score: lab.performance_score || 5,
              logo_url: logoPreview || lab.logo_url || null,
              website_url: form.getValues('website_url') || lab.website_url || '',
            }}
            specializations={specializations || []}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default LabAdmin;
