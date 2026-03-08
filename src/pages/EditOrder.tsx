import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CalendarIcon, RotateCcw, ChevronDown, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ToothSelector } from "@/components/order/ToothSelector";
import { ShadeSelector } from "@/components/order/ShadeSelector";
import { LabSelector } from "@/components/order/LabSelector";
import { FileUploadSection } from "@/components/order/FileUploadSection";
import PageLayout from "@/components/layouts/PageLayout";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { useConflictResolution } from "@/hooks/useConflictResolution";
import { Paperclip } from "lucide-react";

const formSchema = z.object({
  doctorName: z.string().min(2, "Doctor name is required"),
  patientName: z.string().min(2, "Patient name is required"),
  restorationType: z.enum(["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"]),
  teethShade: z.string().min(1, "Shade is required"),
  shadeSystem: z.enum(["VITA Classical", "VITA 3D-Master"]),
  teethNumber: z.string().min(1, "At least one tooth must be selected"),
  biologicalNotes: z.string().optional(),
  handlingInstructions: z.string().optional(),
  urgency: z.enum(["Normal", "Urgent"]),
  assignedLabId: z.string().nullable().optional(),
  htmlExport: z.string().optional(),
  desiredDeliveryDate: z.date().nullable().optional(),
  targetBudget: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FIELD_LABELS: Record<keyof FormValues, string> = {
  doctorName: "Doctor Name",
  patientName: "Patient Name",
  restorationType: "Restoration Type",
  teethShade: "Teeth Shade",
  shadeSystem: "Shade System",
  teethNumber: "Teeth Number",
  biologicalNotes: "Biological Notes",
  handlingInstructions: "Handling Instructions",
  urgency: "Urgency",
  assignedLabId: "Assigned Lab",
  htmlExport: "HTML Export",
  desiredDeliveryDate: "Desired Delivery Date",
  targetBudget: "Target Budget",
};

const EditOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<FormValues | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orderUpdatedAt, setOrderUpdatedAt] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

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
      handlingInstructions: "",
      urgency: "Normal",
      assignedLabId: null,
      htmlExport: "",
      desiredDeliveryDate: null,
      targetBudget: null,
    },
  });

  const { saveData, clearSavedData, autosaveState } = useFormAutosave({
    storageKey: `edit-order-${orderId}`,
    debounceMs: 2000,
    onRecover: (data) => {
      // Parse date string back to Date if present
      if (data.desiredDeliveryDate && typeof data.desiredDeliveryDate === "string") {
        data.desiredDeliveryDate = new Date(data.desiredDeliveryDate);
      }
      form.reset(data);
      toast.success("Draft Recovered", {
        description: "Your unsaved changes have been restored.",
      });
    },
  });

  const { checkForConflicts, resolveConflict, conflictState } = useConflictResolution({
    tableName: "orders",
    recordId: orderId || "",
    onConflict: () => "use_local",
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!isLoading) {
      const subscription = form.watch((values) => {
        saveData({ ...values, timestamp: new Date().toISOString() });
      });
      return () => subscription.unsubscribe();
    }
  }, [form.watch, saveData, isLoading]);

  const currentValues = form.watch();

  const isFieldModified = (fieldName: keyof FormValues): boolean => {
    if (!originalData) return false;
    const curr = currentValues[fieldName];
    const orig = originalData[fieldName];
    if (curr instanceof Date && orig instanceof Date) return curr.getTime() !== orig.getTime();
    if (curr instanceof Date || orig instanceof Date) return String(curr) !== String(orig);
    return JSON.stringify(curr) !== JSON.stringify(orig);
  };

  const modifiedFields = useMemo(() => {
    if (!originalData) return {};
    const changes: Record<string, { old: any; new: any }> = {};
    (Object.keys(FIELD_LABELS) as Array<keyof FormValues>).forEach((key) => {
      if (isFieldModified(key)) {
        let oldVal = originalData[key];
        let newVal = currentValues[key];
        if (oldVal instanceof Date) oldVal = format(oldVal, "PPP");
        if (newVal instanceof Date) newVal = format(newVal, "PPP");
        changes[FIELD_LABELS[key]] = {
          old: oldVal || "Not set",
          new: newVal || "Not set",
        };
      }
    });
    return changes;
  }, [originalData, currentValues]);

  const hasChanges = Object.keys(modifiedFields).length > 0;

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
        .from("orders")
        .select("id, order_number, status, doctor_id, doctor_name, patient_name, restoration_type, teeth_shade, shade_system, teeth_number, biological_notes, handling_instructions, urgency, assigned_lab_id, html_export, desired_delivery_date, target_budget, updated_at")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("Order not found");
        navigate("/dashboard");
        return;
      }

      // Role check will be done after component renders using useUserRole
      // For now, use a lightweight check from the existing query context
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();

      const isLabStaffCheck = roleData?.role === "lab_staff" || roleData?.role === "admin";
      setUserRole(roleData?.role || null);

      if (data.doctor_id !== user!.id && !isLabStaff) {
        toast.error("Access denied", {
          description: "You don't have permission to edit this order",
        });
        navigate("/dashboard");
        return;
      }

      setOrderNumber(data.order_number || "");
      setOrderStatus(data.status || "");

      const formData: FormValues = {
        doctorName: data.doctor_name,
        patientName: data.patient_name,
        restorationType: data.restoration_type as any,
        teethShade: data.teeth_shade,
        shadeSystem: (data.shade_system || "VITA Classical") as any,
        teethNumber: data.teeth_number,
        biologicalNotes: data.biological_notes || "",
        handlingInstructions: data.handling_instructions || "",
        urgency: data.urgency as any,
        assignedLabId: data.assigned_lab_id,
        htmlExport: data.html_export || "",
        desiredDeliveryDate: data.desired_delivery_date ? new Date(data.desired_delivery_date) : null,
        targetBudget: data.target_budget ?? null,
      };

      form.reset(formData);
      setOriginalData(formData);
      setOrderUpdatedAt(data.updated_at);

      // Fetch existing attachments
      const { data: attachments } = await supabase
        .from("order_attachments")
        .select("id, order_id, file_name, file_path, file_type, file_size, attachment_category, uploaded_by, created_at")
        .eq("order_id", orderId);
      setExistingAttachments(attachments || []);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order", { description: error.message });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (originalData) {
      form.reset(originalData);
      toast.info("Form reset to original values");
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!orderId) return;

    if (!hasChanges) {
      toast.error("No changes detected", {
        description: "Please modify at least one field before saving",
      });
      return;
    }

    if (orderUpdatedAt) {
      const hasConflict = await checkForConflicts(orderUpdatedAt);
      if (hasConflict && conflictState.serverData) {
        resolveConflict(data);
      }
    }

    setIsSaving(true);
    try {
      const changeSummary = Object.keys(modifiedFields).join(", ");

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          doctor_name: data.doctorName,
          patient_name: data.patientName,
          restoration_type: data.restorationType,
          teeth_shade: data.teethShade,
          shade_system: data.shadeSystem,
          teeth_number: data.teethNumber,
          biological_notes: data.biologicalNotes || null,
          handling_instructions: data.handlingInstructions || null,
          urgency: data.urgency,
          assigned_lab_id: data.assignedLabId,
          html_export: data.htmlExport || null,
          desired_delivery_date: data.desiredDeliveryDate
            ? data.desiredDeliveryDate.toISOString()
            : null,
          target_budget: data.targetBudget,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Log edit history
      await supabase.from("order_edit_history").insert({
        order_id: orderId,
        changed_by: user!.id,
        changed_fields: modifiedFields,
        change_summary: `Updated: ${changeSummary}`,
      });

      // Notify lab staff if assigned
      const { data: orderData } = await supabase
        .from("orders")
        .select("assigned_lab_id")
        .eq("id", orderId)
        .single();

      if (orderData?.assigned_lab_id) {
        const { data: labStaffUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("lab_id", orderData.assigned_lab_id)
          .eq("role", "lab_staff");

        if (labStaffUsers?.length) {
          await supabase.from("notifications").insert(
            labStaffUsers.map((staff) => ({
              user_id: staff.user_id,
              order_id: orderId,
              type: "Order Edit",
              title: "Order Updated by Doctor",
              message: `Doctor made changes: ${changeSummary}`,
            }))
          );
        }
      }

      // Sync new attachments to feedback room
      try {
        const { data: currentAttachments } = await supabase
          .from("order_attachments")
          .select("*")
          .eq("order_id", orderId);

        if (currentAttachments && currentAttachments.length > 0) {
          const { data: existingFeedback } = await supabase
            .from("feedback_room_attachments")
            .select("file_name, file_url")
            .eq("order_id", orderId);

          const existingUrls = new Set(existingFeedback?.map((f) => f.file_url) || []);

          const newFiles = currentAttachments.filter(
            (att) => !existingUrls.has(att.file_path)
          );

          if (newFiles.length > 0 && user) {
            const categoryMap: Record<string, string> = {
              radiograph: "radiograph",
              stl: "3d_model",
              obj: "3d_model",
              intraoral_photo: "photo",
              archive: "archive",
              other: "general",
            };

            await supabase.from("feedback_room_attachments").insert(
              newFiles.map((file) => ({
                order_id: orderId,
                uploaded_by: user.id,
                file_url: file.file_path,
                file_name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                category: categoryMap[file.attachment_category] || "general",
              }))
            );

            // Log activity
            await supabase.from("feedback_room_activity").insert({
              order_id: orderId,
              user_id: user.id,
              user_role: userRole,
              action_type: "attachment_uploaded",
              action_description: `Uploaded ${newFiles.length} file(s) via Edit Order`,
            });
          }
        }
      } catch (syncError) {
        console.error("Feedback room sync error:", syncError);
        // Non-blocking — order was already saved
      }

      clearSavedData();
      toast.success("Order updated successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "Pending": return "secondary";
      case "In Progress": return "default";
      case "Ready for Delivery": return "outline";
      case "Delivered": return "default";
      case "Cancelled": return "destructive";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-4xl">
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
      </PageLayout>
    );
  }

  const isDoctor = userRole === "doctor";

  return (
    <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-xl">Edit Order</CardTitle>
                {orderNumber && (
                  <Badge variant="outline" className="font-mono text-xs">
                    #{orderNumber}
                  </Badge>
                )}
                {orderStatus && (
                  <Badge variant={statusVariant(orderStatus)}>{orderStatus}</Badge>
                )}
              </div>
              <CardDescription className="mt-1">Update order details below</CardDescription>
            </div>
            <AutosaveIndicator
              isSaving={autosaveState.isSaving}
              lastSaved={autosaveState.lastSaved}
              hasRecoveredData={autosaveState.hasRecoveredData}
              className="hidden sm:flex"
            />
          </div>
          <AutosaveIndicator
            isSaving={autosaveState.isSaving}
            lastSaved={autosaveState.lastSaved}
            hasRecoveredData={autosaveState.hasRecoveredData}
            className="flex sm:hidden mt-2"
          />
          {conflictState.hasConflict && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">⚠️ Conflict Detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                This order was modified by someone else. Your changes may overwrite theirs.
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Section: Patient Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Patient Information
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Doctor Name
                          {isFieldModified("doctorName") && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Dr. Smith"
                            {...field}
                            readOnly={isDoctor}
                            className={isDoctor ? "bg-muted cursor-not-allowed" : ""}
                          />
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
                        <FormLabel className="flex items-center gap-2">
                          Patient Name
                          {isFieldModified("patientName") && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section: Restoration Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Restoration Details
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="restorationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Restoration Type
                        {isFieldModified("restorationType") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-2">
                        Select Teeth
                        {isFieldModified("teethNumber") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-2">
                        Shade System
                        {isFieldModified("shadeSystem") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-2">
                        Teeth Shade
                        {isFieldModified("teethShade") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
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
              </div>

              {/* Section: Attachments & Files */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Attachments & Files
                  </h3>
                  <Separator className="flex-1" />
                </div>
                <FileUploadSection
                  orderId={orderId}
                  existingFiles={existingAttachments}
                />
              </div>

              {/* Section: Delivery & Budget */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Delivery & Budget
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Urgency Level
                          {isFieldModified("urgency") && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </FormLabel>
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
                    name="desiredDeliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2">
                          Desired Delivery Date
                          {isFieldModified("desiredDeliveryDate") && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="targetBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target Budget (EGP)
                          {isFieldModified("targetBudget") && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 500"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {userRole !== "lab_staff" && (
                    <FormField
                      control={form.control}
                      name="assignedLabId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Assign to Lab (Optional)
                            {isFieldModified("assignedLabId") && (
                              <Badge variant="secondary" className="text-xs">Modified</Badge>
                            )}
                          </FormLabel>
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
                  )}
                </div>
              </div>

              {/* Section: Additional Notes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Additional Notes
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <FormField
                  control={form.control}
                  name="biologicalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Biological Notes (Optional)
                        {isFieldModified("biologicalNotes") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific biological requirements or notes..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handlingInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Handling Instructions (Optional)
                        {isFieldModified("handlingInstructions") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Special handling, packaging, or shipping instructions..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="htmlExport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        HTML Export (Optional)
                        {isFieldModified("htmlExport") && (
                          <Badge variant="secondary" className="text-xs">Modified</Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Paste HTML content or URL..."
                            className="min-h-[100px] font-mono text-xs"
                            {...field}
                          />
                          {field.value && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const isUrl =
                                  field.value?.startsWith("http://") ||
                                  field.value?.startsWith("https://");
                                if (isUrl) {
                                  window.open(field.value, "_blank", "noopener,noreferrer");
                                } else {
                                  const previewWindow = window.open("", "_blank");
                                  if (previewWindow) {
                                    previewWindow.document.write(field.value || "");
                                    previewWindow.document.close();
                                  }
                                }
                              }}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5" />
                              Preview HTML
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Changes Summary */}
              {hasChanges && (
                <Collapsible open={changesOpen} onOpenChange={setChangesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10"
                    >
                      <span className="text-sm font-medium">
                        {Object.keys(modifiedFields).length} field
                        {Object.keys(modifiedFields).length !== 1 ? "s" : ""} modified
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          changesOpen && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      {Object.entries(modifiedFields).map(([label, { old: oldVal, new: newVal }]) => (
                        <div key={label} className="text-sm grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                          <div>
                            <span className="text-muted-foreground text-xs block">{label}</span>
                            <span className="line-through text-muted-foreground/60 text-xs break-all">
                              {String(oldVal)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div>
                            <span className="text-xs font-medium break-all">{String(newVal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={!hasChanges || isSaving}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Original
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || !hasChanges}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default EditOrder;
