import { useNavigate } from "react-router-dom";
import OrderForm from "@/components/OrderForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NewOrder = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 py-12">
      <div className="container px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        
        <div className="mx-auto max-w-3xl">
          <OrderForm onSubmitSuccess={() => navigate("/dashboard")} />
        </div>
      </div>
    </div>
  );
};

export default NewOrder;
