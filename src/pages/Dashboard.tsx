import { useNavigate } from "react-router-dom";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary/30 py-12">
        <div className="container px-4">
          <div className="mb-6 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Button onClick={() => navigate("/new-order")}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
          
          <OrderDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
