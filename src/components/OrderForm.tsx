import { useState, useEffect, useRef } from "react";
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
import { CheckCircle2, Upload, X, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ToothSelector } from "./order/ToothSelector";
import { ShadeSelector } from "./order/ShadeSelector";
import { LabSelector } from "./order/LabSelector";
import { Progress } from "@/components/ui/progress";
import { compressImage, createThumbnail, validateImageType, validateImageSize, formatFileSize } from "@/lib/imageCompression";
import { processImageForUpload } from "@/lib/imageMetadata";
import { validateUploadFile } from "@/lib/fileValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  doctorName: z.string().min(2, "Doctor name is required").max(100),
  patientName: z.string().min(2, "Patient name is required").max(100),
  restorationType: z.enum(["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"]),
  teethShade: z.string().min(1, "Shade is required").max(50),
  shadeSystem: z.enum(["VITA Classical", "VITA 3D-Master"]),
  teethNumber: z.string().min(1, "At least one tooth must be selected").max(100),
  biologicalNotes: z.string().max(1000).optional(),
  urgency: z.enum(["Normal", "Urgent"]),
  assignedLabId: z.string().nullable().optional(),
  htmlExport: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const restorationTypes = ["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"] as const;

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
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadAbortController = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const [doctorName, setDoctorName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    };
    
    fetchUserRole();
  }, [user]);

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
  
  // Cleanup thumbnails on unmount
  useEffect(() => {
    return () => {
      thumbnails.forEach(url => URL.revokeObjectURL(url));
    };
  }, [thumbnails]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    // Reset input
    e.target.value = '';
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const processFiles = async (files: File[]) => {
    setUploadError(null);
    
    const processedFiles: File[] = [];
    const newThumbnails: string[] = [];
    
    for (const file of files) {
      // Validate file security first
      const validationResult = await validateUploadFile(file);
      
      if (!validationResult.isValid) {
        toast.error(`Security check failed: ${file.name}`, {
          description: validationResult.errors.join(', '),
        });
        continue;
      }
      
      // Show warnings if any
      if (validationResult.warnings.length > 0) {
        toast.warning(`File warnings: ${file.name}`, {
          description: validationResult.warnings.join(', '),
        });
      }
      
      // Validate file type
      if (!validateImageType(file, ACCEPTED_IMAGE_TYPES)) {
        toast.error(`Unsupported file type: ${file.name}`, {
          description: `Only JPG, PNG, and WEBP images are allowed. Got: ${file.type || 'unknown'}`,
        });
        continue;
      }
      
      // Process image: extract metadata, correct orientation, strip sensitive data
      toast.info(`Processing ${file.name}...`);
      const { file: processedFile, metadata } = await processImageForUpload(file, {
        correctOrientation: true,
        stripSensitiveData: true,
        extractMetadata: true,
      });
      
      // Log metadata if available (for debugging)
      if (metadata) {
        console.log(`Image metadata for ${file.name}:`, metadata);
      }
      
      let finalFile = processedFile;
      
      // Check if file needs compression
      if (!validateImageSize(finalFile, 10)) {
        toast.info(`Compressing ${file.name}...`, {
          description: `Original size: ${formatFileSize(finalFile.size)}`,
        });
        
        try {
          finalFile = await compressImage(finalFile, 10, 1920);
          toast.success(`${file.name} processed`, {
            description: `New size: ${formatFileSize(finalFile.size)}`,
          });
        } catch (error: any) {
          toast.error(`Failed to compress ${file.name}`, {
            description: error.message,
          });
          continue;
        }
      } else {
        toast.success(`${file.name} processed successfully`);
      }
      
      // Create thumbnail
      const thumbnail = createThumbnail(finalFile);
      newThumbnails.push(thumbnail);
      processedFiles.push(finalFile);
    }
    
    if (processedFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...processedFiles]);
      setThumbnails(prev => [...prev, ...newThumbnails]);
    }
  };

  const removeFile = (index: number) => {
    // Revoke thumbnail URL to prevent memory leaks
    if (thumbnails[index]) {
      URL.revokeObjectURL(thumbnails[index]);
    }
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
    setThumbnails(prev => prev.filter((_, i) => i !== index));
  };
  
  const cancelUpload = () => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      toast.info("Upload cancelled");
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];

    setIsUploading(true);
    setUploadError(null);
    uploadAbortController.current = new AbortController();
    
    const uploadedPaths: string[] = [];
    const totalFiles = uploadedFiles.length;

    for (let i = 0; i < totalFiles; i++) {
      // Check if upload was cancelled
      if (uploadAbortController.current.signal.aborted) {
        throw new Error('Upload cancelled');
      }
      
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
        if (error.message === 'Upload cancelled') {
          throw error;
        }
        
        const errorMsg = `Failed to upload ${file.name}: ${error.message}`;
        console.error('Upload error:', error);
        setUploadError(errorMsg);
        toast.error(`Upload failed: ${file.name}`, {
          description: error.message,
        });
      }
    }
    
    setIsUploading(false);
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
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Call the create-order edge function with validation
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorName: data.doctorName,
          patientName: data.patientName,
          restorationType: data.restorationType,
          teethShade: data.teethShade,
          shadeSystem: data.shadeSystem,
          teethNumber: data.teethNumber,
          biologicalNotes: data.biologicalNotes || "",
          urgency: data.urgency,
          assignedLabId: data.assignedLabId || null,
          photosLink: photoUrls.join(','),
          htmlExport: data.htmlExport || "",
        }),
      });

      // Ensure response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();

      // Handle validation errors
      if (response.status === 400 && result.validationErrors) {
        const errorMessages = result.validationErrors
          .map((err: any) => `${err.field}: ${err.message}`)
          .join('\n');
        
        toast.error("Validation failed", {
          description: errorMessages,
        });
        setIsLoading(false);
        return;
      }

      // Handle other errors
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Failed to create order');
      }

      // Validate response structure
      if (!result.order || !result.order.id || !result.order.orderNumber) {
        throw new Error('Invalid response structure from server');
      }

      const orderData = result.order;

      // Success message based on workflow
      if (data.assignedLabId) {
        toast.success("Order submitted to lab successfully!", {
          description: "The assigned lab has been notified and can now view your order."
        });
      } else {
        toast.success("Order published to marketplace!", {
          description: "Labs can now apply. You'll review and approve applications."
        });
      }

      setOrderId(orderData.orderNumber);
      setIsSubmitted(true);

      toast.success("Order submitted successfully!", {
        description: `Order ID: ${orderData.orderNumber}`,
      });

      if (onSubmitSuccess) {
        setTimeout(() => onSubmitSuccess(), 2000);
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      toast.error("Failed to submit order", {
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-md mx-auto shadow-lg">
        <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="rounded-full bg-success/10 p-3 sm:p-4">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-success" />
            </div>
          </div>
          <h3 className="mb-2 text-xl sm:text-2xl font-bold">Order Submitted!</h3>
          <p className="mb-3 sm:mb-4 text-sm sm:text-base text-muted-foreground">Your order has been received and is being processed.</p>
          <div className="mb-4 sm:mb-6 rounded-lg bg-muted p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Order ID</p>
            <p className="text-lg sm:text-xl font-mono font-bold break-all">{orderId}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full" size="lg">
            Submit Another Order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg w-full">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl">New Order Submission</CardTitle>
        <CardDescription className="text-sm">Fill out the form below to submit a new dental lab order</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
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

            {/* Only show lab selector for doctors */}
            {userRole === 'doctor' && (
              <FormField
                control={form.control}
                name="assignedLabId"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <LabSelector
                        value={field.value}
                        onChange={field.onChange}
                        restorationType={form.watch("restorationType")}
                        urgency={form.watch("urgency")}
                        userId={user?.id || ""}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  <div className="flex items-center justify-between">
                    <FormLabel>HTML Export (Optional)</FormLabel>
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const content = field.value.trim();
                          
                          // Check if it's a URL
                          const isUrl = /^https?:\/\/.+/i.test(content);
                          
                          if (isUrl) {
                            // For URLs, open directly in a new tab
                            window.open(content, '_blank', 'noopener,noreferrer');
                          } else {
                            // For HTML content, render in a new window
                            const previewWindow = window.open('', '_blank', 'width=1024,height=768');
                            if (!previewWindow) {
                              toast.error('Failed to open preview window. Please allow popups.');
                              return;
                            }
                            previewWindow.document.write(content);
                            previewWindow.document.close();
                          }
                        }}
                        className="text-xs"
                      >
                        Preview HTML
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Paste HTML content or provide a URL to HTML export from lab's system..."
                      className="resize-none min-h-[80px] font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Paste HTML content directly or provide a URL to open it in a new tab
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Patient Photos / Scans</FormLabel>
              <div className="space-y-3">
                {/* Drag and Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-lg transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/5 scale-[1.02]' 
                      : 'border-border hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className={`rounded-full p-4 transition-all ${
                        isDragging ? 'bg-primary/10 scale-110' : 'bg-muted'
                      }`}>
                        <Upload className={`h-8 w-8 transition-colors ${
                          isDragging ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {isDragging ? 'Drop images here' : 'Drag & drop images here'}
                        </p>
                        <p className="text-xs text-muted-foreground">or</p>
                      </div>
                      
                      <Input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
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
                            Browse Files
                          </span>
                        </Button>
                      </label>
                      
                      <FormDescription className="text-xs text-center">
                        Max 10MB per file • JPG, PNG, WEBP only
                      </FormDescription>
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{uploadError}</AlertDescription>
                  </Alert>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group rounded-lg border border-border bg-card overflow-hidden">
                        <div className="aspect-video relative bg-muted flex items-center justify-center">
                          {thumbnails[index] ? (
                            <img 
                              src={thumbnails[index]} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-2 space-y-1">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Uploading images...</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelUpload}
                      >
                        Cancel
                      </Button>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {uploadProgress}% complete
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
