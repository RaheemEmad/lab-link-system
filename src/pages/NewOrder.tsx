import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/OrderForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const NewOrder = () => {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-6 sm:py-12">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-bold mb-6">Create New Order</h1>
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
