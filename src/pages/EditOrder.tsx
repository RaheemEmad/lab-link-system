import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ToothSelector } from "@/components/order/ToothSelector";
import { ShadeSelector } from "@/components/order/ShadeSelector";
import { LabSelector } from "@/components/order/LabSelector";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const formSchema = z.object({
  doctorName: z.string().min(2, "Doctor name is required"),
  patientName: z.string().min(2, "Patient name is required"),
  restorationType: z.enum(["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"]),
  teethShade: z.string().min(1, "Shade is required"),
  shadeSystem: z.enum(["VITA Classical", "VITA 3D-Master"]),
  teethNumber: z.string().min(1, "At least one tooth must be selected"),
  biologicalNotes: z.string().optional(),
  urgency: z.enum(["Normal", "Urgent"]),
  assignedLabId: z.string().nullable().optional(),
  htmlExport: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EditOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doctorName: "",
      patientName: "",
      restorationType: "Zirconia",
      teethShade: "",
      shadeSystem: "VITA Classical",
      teethNumber: "",
      biologicalNotes: "",
      urgency: "Normal",
      assignedLabId: null,
      htmlExport: "",
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchOrderData();
  }, [user, orderId]);

  const fetchOrderData = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Order not found");
        navigate("/dashboard");
        return;
      }

      // Check if user owns this order or is lab staff
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();

      const isLabStaff = roleData?.role === 'lab_staff' || roleData?.role === 'admin';
      
      if (data.doctor_id !== user!.id && !isLabStaff) {
        toast.error("Access denied", {
          description: "You don't have permission to edit this order"
        });
        navigate("/dashboard");
        return;
      }

      form.reset({
        doctorName: data.doctor_name,
        patientName: data.patient_name,
        restorationType: data.restoration_type as any,
        teethShade: data.teeth_shade,
        shadeSystem: (data.shade_system || "VITA Classical") as any,
        teethNumber: data.teeth_number,
        biologicalNotes: data.biological_notes || "",
        urgency: data.urgency as any,
        assignedLabId: data.assigned_lab_id,
        htmlExport: data.html_export || "",
      });
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error("Failed to load order", {
        description: error.message
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!orderId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          doctor_name: data.doctorName,
          patient_name: data.patientName,
          restoration_type: data.restorationType,
          teeth_shade: data.teethShade,
          shade_system: data.shadeSystem,
          teeth_number: data.teethNumber,
          biological_notes: data.biologicalNotes || null,
          urgency: data.urgency,
          assigned_lab_id: data.assignedLabId,
          html_export: data.htmlExport || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Order updated successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error("Failed to update order", {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container max-w-4xl mx-auto px-4">
            <Skeleton className="h-10 w-64 mb-6" />
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30 py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Edit Order</CardTitle>
              <CardDescription>Update order details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="doctorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doctor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="restorationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restoration Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Zirconia">Zirconia</SelectItem>
                            <SelectItem value="Zirconia Layer">Zirconia Layer</SelectItem>
                            <SelectItem value="Zirco-Max">Zirco-Max</SelectItem>
                            <SelectItem value="PFM">PFM</SelectItem>
                            <SelectItem value="Acrylic">Acrylic</SelectItem>
                            <SelectItem value="E-max">E-max</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teethNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Teeth</FormLabel>
                        <FormControl>
                          <ToothSelector value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shadeSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shade System</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="VITA Classical">VITA Classical</SelectItem>
                            <SelectItem value="VITA 3D-Master">VITA 3D-Master</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teethShade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teeth Shade</FormLabel>
                        <FormControl>
                          <ShadeSelector
                            value={field.value}
                            onChange={field.onChange}
                            onSystemChange={(system) => form.setValue("shadeSystem", system)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="biologicalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biological Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any specific requirements or notes..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgency Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Normal">Normal</SelectItem>
                              <SelectItem value="Urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedLabId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Lab (Optional)</FormLabel>
                          <FormControl>
                            <LabSelector
                              value={field.value}
                              onChange={field.onChange}
                              restorationType={form.watch("restorationType")}
                              urgency={form.watch("urgency")}
                              userId={user?.id || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="htmlExport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Export (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste HTML content or URL..."
                            className="min-h-[100px] font-mono text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default EditOrder;
