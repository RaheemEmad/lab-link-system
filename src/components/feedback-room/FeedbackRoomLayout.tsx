import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquareMore, Upload, CheckSquare, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeedbackRoomHeader from "./FeedbackRoomHeader";
import AttachmentsTab from "./AttachmentsTab";
import ChecklistTab from "./ChecklistTab";
import DecisionsTab from "./DecisionsTab";
import ActivityTab from "./ActivityTab";
import { useFeedbackRoomRealtime } from "@/hooks/useFeedbackRoomRealtime";

interface FeedbackRoomLayoutProps {
  order: any;
}

const FeedbackRoomLayout = ({ order }: FeedbackRoomLayoutProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("attachments");

  // Enable real-time updates
  useFeedbackRoomRealtime(order.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <MessageSquareMore className="h-6 w-6 text-primary" />
                Feedback Room
              </h1>
              <p className="text-sm text-muted-foreground">
                Collaborate on order details and quality
              </p>
            </div>
          </div>
          
          <FeedbackRoomHeader order={order} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attachments" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Attachments</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Decisions</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="attachments">
              <AttachmentsTab orderId={order.id} />
            </TabsContent>

            <TabsContent value="checklist">
              <ChecklistTab orderId={order.id} />
            </TabsContent>

            <TabsContent value="decisions">
              <DecisionsTab orderId={order.id} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTab orderId={order.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default FeedbackRoomLayout;
