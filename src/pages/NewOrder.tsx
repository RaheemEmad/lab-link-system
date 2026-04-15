import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import OrderForm from "@/components/OrderForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLayout from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { OrderModeChooser, OrderMode } from "@/components/order/OrderModeChooser";
import QuickOrderForm from "@/components/order/QuickOrderForm";
import { OrderTemplateSelector } from "@/components/order/OrderTemplateSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PREFERRED_MODE_KEY = "lablink-preferred-order-mode";

const NewOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isDoctor, roleConfirmed } = useUserRole();

  // If coming from a template link, go straight to detailed mode
  const fromTemplate = searchParams.get("fromTemplate");
  const initialMode = fromTemplate
    ? "detailed"
    : (localStorage.getItem(PREFERRED_MODE_KEY) as OrderMode | null);

  const [orderMode, setOrderMode] = useState<OrderMode | null>(initialMode);

  // Check if user has templates
  const { data: templates } = useQuery({
    queryKey: ["order-templates-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_templates")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const hasTemplates = (templates?.length ?? 0) > 0;

  useEffect(() => {
    if (roleConfirmed && !isDoctor) {
      toast.error("Access denied", { description: "Only doctors can create orders" });
      navigate("/dashboard");
    }
  }, [roleConfirmed, isDoctor, navigate]);

  const handleModeSelect = (mode: OrderMode) => {
    if (mode === "template") {
      // Template mode: user picks template from the existing selector,
      // then we switch to detailed mode with pre-fill via URL params
      setOrderMode("template");
      return;
    }
    localStorage.setItem(PREFERRED_MODE_KEY, mode);
    setOrderMode(mode);
  };

  const handleTemplateSelect = (template: any) => {
    // Navigate to new-order with template data as search params
    const params = new URLSearchParams();
    if (template.restoration_type) params.set("restorationType", template.restoration_type);
    if (template.teeth_number) params.set("teethNumber", template.teeth_number);
    if (template.teeth_shade) params.set("teethShade", template.teeth_shade);
    if (template.shade_system) params.set("shadeSystem", template.shade_system);
    if (template.biological_notes) params.set("biologicalNotes", template.biological_notes);
    if (template.assigned_lab_id) params.set("assignedLabId", template.assigned_lab_id);
    localStorage.setItem(PREFERRED_MODE_KEY, "detailed");
    navigate(`/new-order?${params.toString()}`, { replace: true });
    setOrderMode("detailed");
  };

  const resetMode = () => {
    setOrderMode(null);
    localStorage.removeItem(PREFERRED_MODE_KEY);
  };

  return (
    <ProtectedRoute>
      <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="w-fit">
            <ArrowLeft className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
            Back to Dashboard
          </Button>
          {orderMode && (
            <Button variant="ghost" size="sm" onClick={resetMode} className="text-xs">
              Change mode
            </Button>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">
          {orderMode === "template"
            ? "Create from Template"
            : "Place Order with Lab"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {orderMode === "template"
            ? "Select a saved template to quickly place a repeat order."
            : "Submit your case to a preferred lab, or open it for labs to review and place bids. You can also use an invitation link from a lab."}
        </p>

        {/* Mode Chooser */}
        {!orderMode && (
          <OrderModeChooser onSelect={handleModeSelect} hasTemplates={hasTemplates} />
        )}

        {/* Template picker mode */}
        {orderMode === "template" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a template to pre-fill your order:</p>
            <OrderTemplateSelector
              onSelect={handleTemplateSelect}
              className="w-full justify-start"
            />
            <Button variant="ghost" size="sm" onClick={resetMode} className="text-xs">
              ← Back to mode selection
            </Button>
          </div>
        )}

        {/* Quick Order */}
        {orderMode === "quick" && (
          <QuickOrderForm
            onSubmitSuccess={() => navigate("/dashboard")}
            onSwitchToDetailed={() => {
              localStorage.setItem(PREFERRED_MODE_KEY, "detailed");
              setOrderMode("detailed");
            }}
          />
        )}

        {/* Detailed Order (existing wizard) */}
        {orderMode === "detailed" && (
          <OrderForm onSubmitSuccess={() => navigate("/dashboard")} />
        )}
      </PageLayout>
    </ProtectedRoute>
  );
};

export default NewOrder;
