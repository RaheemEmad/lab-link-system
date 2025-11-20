import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
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
  Save
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

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
  const queryClient = useQueryClient();
  const [newSpecType, setNewSpecType] = useState<string>("");
  const [newSpecExpertise, setNewSpecExpertise] = useState<string>("intermediate");
  const [newSpecDays, setNewSpecDays] = useState<string>("5");

  // Check if user is lab staff and get their lab
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, lab_id")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch lab data
  const { data: lab, isLoading: labLoading } = useQuery({
    queryKey: ["lab-profile", userRole?.lab_id],
    queryFn: async () => {
      if (!userRole?.lab_id) return null;
      
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("id", userRole.lab_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.lab_id,
  });

  // Fetch lab specializations
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations-admin", userRole?.lab_id],
    queryFn: async () => {
      if (!userRole?.lab_id) return [];
      
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("*")
        .eq("lab_id", userRole.lab_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.lab_id,
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
  useState(() => {
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
  });

  // Update lab profile mutation
  const updateLabMutation = useMutation({
    mutationFn: async (data: LabProfileForm) => {
      if (!userRole?.lab_id) throw new Error("No lab assigned");
      
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
        .eq("id", userRole.lab_id);
      
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
      if (!userRole?.lab_id || !newSpecType) throw new Error("Invalid data");
      
      const { error } = await supabase
        .from("lab_specializations")
        .insert([{
          lab_id: userRole.lab_id,
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

  const onSubmit = (data: LabProfileForm) => {
    updateLabMutation.mutate(data);
  };

  // Check access
  if (!userRole || (userRole.role !== 'lab_staff' && userRole.role !== 'admin')) {
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

  if (labLoading || !lab) {
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

  const availableRestorationTypes = restorationTypes.filter(
    type => !specializations?.some(s => s.restoration_type === type)
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4 max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Lab Management</h1>
              <p className="text-muted-foreground">
                Manage your lab profile, specializations, and settings
              </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Profile & Settings
                </TabsTrigger>
                <TabsTrigger value="specializations" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Specializations
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
                            type="submit" 
                            disabled={updateLabMutation.isPending}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {updateLabMutation.isPending ? "Saving..." : "Save Changes"}
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
            </Tabs>
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />
      </div>
    </ProtectedRoute>
  );
};

export default LabAdmin;
