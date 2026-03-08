import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ToothSelector } from "./ToothSelector";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";

const quickSchema = z.object({
  patientName: z.string().min(2, "Patient name is required").max(100),
  restorationType: z.enum(["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"]),
  teethNumber: z.string().min(1, "At least one tooth must be selected").max(100),
});

type QuickFormValues = z.infer<typeof quickSchema>;

const restorationTypes = ["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"] as const;

interface QuickOrderFormProps {
  onSubmitSuccess?: () => void;
  onSwitchToDetailed: () => void;
}

const QuickOrderForm = ({ onSubmitSuccess, onSwitchToDetailed }: QuickOrderFormProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const { user } = useAuth();

  const form = useForm<QuickFormValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      patientName: "",
      restorationType: "Zirconia",
      teethNumber: "",
    },
  });

  useEffect(() => {
    const fetchDoctorName = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setDoctorName(profile.full_name);
    };
    fetchDoctorName();
  }, [user]);

  const onSubmit = async (data: QuickFormValues) => {
    if (!user) {
      toast.error("You must be logged in to submit an order");
      return;
    }
    setIsLoading(true);
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error("Session expired", { description: "Please log in again." });
        setIsLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorName: doctorName || "Doctor",
          patientName: data.patientName,
          restorationType: data.restorationType,
          teethShade: "A2",
          shadeSystem: "VITA Classical",
          teethNumber: data.teethNumber,
          biologicalNotes: "",
          urgency: "Normal",
          assignedLabId: null,
          photosLink: "",
          htmlExport: "",
          handlingInstructions: "",
          desiredDeliveryDate: null,
          targetBudget: null,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const result = await response.json();

      if (response.status === 400 && result.validationErrors) {
        toast.error("Validation failed", {
          description: result.validationErrors.map((e: any) => `${e.field}: ${e.message}`).join("\n"),
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Failed to create order");
      }

      if (!result.order?.id || !result.order?.orderNumber) {
        throw new Error("Invalid response structure from server");
      }

      setOrderId(result.order.orderNumber);
      setIsSubmitted(true);
      toast.success("Order submitted!", { description: `Order ID: ${result.order.orderNumber}` });

      if (onSubmitSuccess) {
        setTimeout(() => onSubmitSuccess(), 3000);
      }
    } catch (error: any) {
      console.error("Quick order error:", error);
      toast.error("Failed to submit order", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const submittedValues = form.getValues();

  if (isSubmitted) {
    return (
      <>
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-success/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>
            <h3 className="mb-2 text-2xl font-bold">Order Submitted!</h3>
            <p className="mb-4 text-sm text-muted-foreground">Your quick order is being processed.</p>
            <div className="mb-6 rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">Order ID</p>
              <p className="text-xl font-mono font-bold break-all">{orderId}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowTemplateDialog(true)} variant="outline" className="w-full">
                Save as Template
              </Button>
              <Button onClick={() => window.location.reload()} className="w-full" size="lg">
                Submit Another Order
              </Button>
            </div>
          </CardContent>
        </Card>

        <SaveAsTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          orderData={{
            restoration_type: submittedValues.restorationType,
            teeth_number: submittedValues.teethNumber,
            teeth_shade: "A2",
            shade_system: "VITA Classical",
            urgency: "Normal",
            biological_notes: "",
            handling_instructions: "",
            assigned_lab_id: null,
          }}
        />
      </>
    );
  }

  return (
    <Card className="shadow-lg w-full">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Quick Order</CardTitle>
        </div>
        <CardDescription>Fill in just the essentials — we'll use smart defaults for the rest.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter patient name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="restorationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restoration Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select restoration type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {restorationTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
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
                  <FormLabel>Teeth Selection *</FormLabel>
                  <FormControl>
                    <ToothSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Smart defaults:</strong> Shade A2 (VITA Classical) · Normal urgency · Open marketplace</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Submit Quick Order
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={onSwitchToDetailed}
                className="text-xs text-muted-foreground hover:text-primary transition-colors text-center"
              >
                Need more options? Switch to detailed form →
              </button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default QuickOrderForm;
