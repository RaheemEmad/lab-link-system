import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import OrderForm from "@/components/OrderForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data?.role !== 'doctor') {
        toast.error("Access denied", {
          description: "Only doctors can create orders"
        });
        navigate('/dashboard');
      }
    };
    
    checkRole();
  }, [user, navigate]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 md:py-12">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">Create New Order</h1>
              <OrderForm onSubmitSuccess={() => navigate("/dashboard")} />
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default NewOrder;
