import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Upload,
  CheckSquare,
  Check,
  MessageSquare,
  ThumbsUp,
  Loader2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface ActivityTabProps {
  orderId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  attachment_uploaded: <Upload className="h-4 w-4" />,
  checklist_item_added: <CheckSquare className="h-4 w-4" />,
  checklist_confirmed: <Check className="h-4 w-4" />,
  comment_added: <MessageSquare className="h-4 w-4" />,
  reaction_added: <ThumbsUp className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  attachment_uploaded: "bg-blue-500",
  checklist_item_added: "bg-purple-500",
  checklist_confirmed: "bg-green-500",
  comment_added: "bg-amber-500",
  reaction_added: "bg-pink-500",
};

const ActivityTab = ({ orderId }: ActivityTabProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["feedback-activity", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_room_activity")
        .select(`
          *,
          user:profiles!feedback_room_activity_user_id_fkey(full_name, email)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching activity:", error);
        throw error;
      }
      return data;
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
          {activities && activities.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({activities.length} events)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No activity yet</p>
            <p className="text-sm">All actions will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {/* Activity Items */}
            <div className="space-y-6">
              {activities.map((activity) => {
                const userName =
                  activity.user?.full_name || activity.user?.email || "Unknown";
                const userInitials = userName.slice(0, 2).toUpperCase();

                return (
                  <div key={activity.id} className="relative pl-10">
                    {/* Timeline Dot */}
                    <div
                      className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        actionColors[activity.action_type] || "bg-muted"
                      }`}
                    >
                      {actionIcons[activity.action_type] || (
                        <Activity className="h-3 w-3" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {activity.action_description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {userInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {userName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {activity.user_role?.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTab;
