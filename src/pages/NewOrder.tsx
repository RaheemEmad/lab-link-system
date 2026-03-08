import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import OrderForm from "@/components/OrderForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLayout from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDoctor, roleConfirmed } = useUserRole();

  useEffect(() => {
    if (roleConfirmed && !isDoctor) {
      toast.error("Access denied", {
        description: "Only doctors can create orders"
      });
      navigate('/dashboard');
    }
  }, [roleConfirmed, isDoctor, navigate]);

  return (
    <ProtectedRoute>
      <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">Create New Order</h1>
        <OrderForm onSubmitSuccess={() => navigate("/dashboard")} />
      </PageLayout>
    </ProtectedRoute>
  );
};

export default NewOrder;
