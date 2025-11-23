import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const demoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type DemoFormValues = z.infer<typeof demoSchema>;

export default function AutosaveDemo() {
  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const { saveData, clearSavedData, autosaveState } = useFormAutosave({
    storageKey: 'demo-form-autosave',
    debounceMs: 1500,
    onRecover: (data) => {
      form.reset(data);
    },
  });

  // Watch form values and trigger autosave
  useEffect(() => {
    const subscription = form.watch((values) => {
      saveData(values);
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, saveData]);

  const onSubmit = (data: DemoFormValues) => {
    console.log("Form submitted:", data);
    
    toast({
      title: "✅ Form Submitted",
      description: "Your data has been submitted successfully!",
    });

    // Clear autosaved data on successful submission
    clearSavedData();
    
    // Reset form
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Autosave Demo</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Try typing in the form below, then refresh the page or close and reopen this tab. Your data will be automatically recovered!
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Your form data is automatically saved to localStorage as you type</li>
                <li>Data is saved every 1.5 seconds after you stop typing</li>
                <li>If you refresh or leave, your progress is recovered when you return</li>
                <li>Submitted forms automatically clear the saved draft</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contact Form</CardTitle>
                <CardDescription>Fill out this form to test autosave</CardDescription>
              </div>
              <AutosaveIndicator 
                isSaving={autosaveState.isSaving}
                lastSaved={autosaveState.lastSaved}
                hasRecoveredData={autosaveState.hasRecoveredData}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your message here..." 
                          className="min-h-[150px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Form
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      clearSavedData();
                      form.reset();
                      toast({
                        title: "🗑️ Draft Cleared",
                        description: "Form has been reset and autosaved data cleared.",
                      });
                    }}
                  >
                    Clear Draft
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Implementation Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Import the hook and indicator:</h3>
              <pre className="bg-card p-4 rounded-lg overflow-x-auto text-sm">
{`import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Set up autosave in your component:</h3>
              <pre className="bg-card p-4 rounded-lg overflow-x-auto text-sm">
{`const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: 'your-form-key',
  debounceMs: 2000, // Save 2s after typing stops
  onRecover: (data) => form.reset(data)
});`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Watch form changes:</h3>
              <pre className="bg-card p-4 rounded-lg overflow-x-auto text-sm">
{`useEffect(() => {
  const subscription = form.watch((values) => {
    saveData(values);
  });
  return () => subscription.unsubscribe();
}, [form.watch, saveData]);`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Clear on submit:</h3>
              <pre className="bg-card p-4 rounded-lg overflow-x-auto text-sm">
{`const onSubmit = (data) => {
  // ... submit logic
  clearSavedData(); // Clear draft after success
};`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
