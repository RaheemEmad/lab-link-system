import { useNavigate } from "react-router-dom";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, User } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary/30 py-12">
        <div className="container px-4">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              
              <Button onClick={() => navigate("/new-order")}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </div>
          </div>
          
          <OrderDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
