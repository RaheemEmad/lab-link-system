import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ToothSelector } from "./order/ToothSelector";
import { ShadeSelector } from "./order/ShadeSelector";
import { LabSelector } from "./order/LabSelector";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  doctorName: z.string().min(2, "Doctor name is required").max(100),
  patientName: z.string().min(2, "Patient name is required").max(100),
  restorationType: z.enum(["Crown", "Bridge", "Zirconia Layer", "Zirco-Max"]),
  teethShade: z.string().min(1, "Shade is required").max(50),
  shadeSystem: z.enum(["VITA Classical", "VITA 3D-Master"]),
  teethNumber: z.string().min(1, "At least one tooth must be selected").max(100),
  biologicalNotes: z.string().max(1000).optional(),
  urgency: z.enum(["Normal", "Urgent"]),
  assignedLabId: z.string().nullable().optional(),
  htmlExport: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const restorationTypes = ["Crown", "Bridge", "Zirconia Layer", "Zirco-Max"] as const;

interface OrderFormProps {
  onSubmitSuccess?: () => void;
}

const OrderForm = ({ onSubmitSuccess }: OrderFormProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const { user } = useAuth();
  const [doctorName, setDoctorName] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doctorName: "",
      patientName: "",
      restorationType: "Crown",
      teethShade: "",
      shadeSystem: "VITA Classical",
      teethNumber: "",
      biologicalNotes: "",
      urgency: "Normal",
      assignedLabId: null,
      htmlExport: "",
    },
  });

  // Auto-fill doctor name from user profile
  useEffect(() => {
    const fetchDoctorName = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setDoctorName(profile.full_name);
        form.setValue('doctorName', profile.full_name);
      }
    };

    fetchDoctorName();
  }, [user, form]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`, {
          description: "Only JPG, PNG, and WEBP images are allowed",
        });
        return false;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}`, {
          description: "Maximum file size is 10MB",
        });
        return false;
      }
      
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];

    const uploadedPaths: string[] = [];
    const totalFiles = uploadedFiles.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = uploadedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from('design-files')
          .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('design-files')
          .getPublicUrl(fileName);

        uploadedPaths.push(publicUrl);
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`, {
          description: error.message,
        });
      }
    }

    return uploadedPaths;
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast.error("You must be logged in to submit an order");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Upload files first if any
      let photoUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        toast.info("Uploading images...");
        photoUrls = await uploadFiles();
        setUploadedUrls(photoUrls);
      }

      toast.info("Creating order...");
      
      const { data: orderData, error } = await supabase
        .from("orders")
        .insert({
          doctor_id: user.id,
          doctor_name: data.doctorName,
          patient_name: data.patientName,
          restoration_type: data.restorationType,
          teeth_shade: data.teethShade,
          shade_system: data.shadeSystem,
          teeth_number: data.teethNumber,
          biological_notes: data.biologicalNotes || "",
          urgency: data.urgency,
          assigned_lab_id: data.assignedLabId || null,
          photos_link: photoUrls.join(','), // Store multiple URLs as comma-separated
          html_export: data.htmlExport || "",
          order_number: "",  // Will be auto-generated by trigger
        })
        .select()
        .single();

      if (error) throw error;

      // If auto-assign was selected (assignedLabId is null), call the auto-routing function
      if (!data.assignedLabId) {
        const { error: autoAssignError } = await supabase.functions.invoke('auto-assign-lab', {
          body: {
            orderId: orderData.id,
            restorationType: data.restorationType,
            urgency: data.urgency,
            doctorId: user.id,
          },
        });

        if (autoAssignError) {
          console.error('Auto-assignment error:', autoAssignError);
          toast.error("Order created but auto-assignment failed", {
            description: "Please assign a lab manually from your dashboard.",
          });
        } else {
          toast.success("Order auto-assigned to optimal lab!");
        }
      }

      setOrderId(orderData.order_number);
      setIsSubmitted(true);

      toast.success("Order submitted successfully!", {
        description: `Order ID: ${orderData.order_number}`,
      });

      if (onSubmitSuccess) {
        setTimeout(() => onSubmitSuccess(), 2000);
      }
    } catch (error: any) {
      toast.error("Failed to submit order", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-md mx-auto shadow-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-success/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
          </div>
          <h3 className="mb-2 text-2xl font-bold">Order Submitted!</h3>
          <p className="mb-4 text-muted-foreground">Your order has been received and is being processed.</p>
          <div className="mb-6 rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Order ID</p>
            <p className="text-xl font-mono font-bold">{orderId}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full">
            Submit Another Order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>New Order Submission</CardTitle>
        <CardDescription>Fill out the form below to submit a new dental lab order</CardDescription>
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
                    <FormLabel>Doctor Name *</FormLabel>
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
                    <FormLabel>Patient Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="restorationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restoration Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select restoration type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {restorationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Normal">Regular</SelectItem>
                        <SelectItem value="Urgent">Rush</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shadeSystem"
              render={({ field }) => (
                <FormItem>
                  <ShadeSelector
                    value={form.watch("teethShade")}
                    onChange={(shade) => form.setValue("teethShade", shade)}
                    onSystemChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teethNumber"
              render={({ field }) => (
                <FormItem>
                  <ToothSelector value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedLabId"
              render={({ field }) => (
                <FormItem>
                  <LabSelector
                    value={field.value}
                    onChange={field.onChange}
                    restorationType={form.watch("restorationType")}
                    urgency={form.watch("urgency")}
                    userId={user?.id || ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="biologicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biological Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any allergies, specific patient concerns, or clinical notes..."
                      className="resize-none min-h-[100px]"
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
                  <FormLabel>HTML Export (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste HTML export from lab's visual system or provide a link..."
                      className="resize-none min-h-[80px] font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Patient Photos / Scans</FormLabel>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={isLoading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      asChild
                    >
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Images
                      </span>
                    </Button>
                  </label>
                  <FormDescription className="text-xs">
                    Max 10MB per file. JPG, PNG, WEBP
                  </FormDescription>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress > 0 && uploadProgress < 100 
                    ? `Uploading ${uploadProgress}%` 
                    : "Creating Order..."}
                </>
              ) : (
                "Submit Order"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default OrderForm;
