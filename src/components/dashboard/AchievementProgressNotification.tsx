import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Target, Trophy, MessageSquare } from "lucide-react";

interface ProgressCheck {
  id: string;
  current: number;
  required: number;
  name: string;
  description: string;
  icon: any;
}

export function AchievementProgressNotification() {
  const { user } = useAuth();
  const notifiedProgressRef = useRef<Set<string>>(new Set());

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      return data?.role || null;
    },
    enabled: !!user?.id,
  });

  const { data: earnedAchievements } = useQuery({
    queryKey: ["earned-achievements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map(a => a.achievement_id) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch progress for doctors
  const { data: doctorProgress } = useQuery({
    queryKey: ["doctor-progress", user?.id],
    queryFn: async () => {
      if (!user?.id || userRole !== "doctor") return null;

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, urgency")
        .eq("doctor_id", user.id);

      if (error) throw error;

      const { data: notes } = await supabase
        .from("order_notes")
        .select("id")
        .eq("user_id", user.id);

      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter(o => o.status === "Delivered").length || 0;
      const urgentOrders = orders?.filter(o => o.urgency === "Urgent" && o.status === "Delivered").length || 0;
      const totalNotes = notes?.length || 0;

      return {
        totalOrders,
        deliveredOrders,
        urgentOrders,
        totalNotes,
      };
    },
    enabled: !!user?.id && userRole === "doctor",
    refetchInterval: 10000,
  });

  // Fetch progress for lab staff
  const { data: labProgress } = useQuery({
    queryKey: ["lab-progress", user?.id],
    queryFn: async () => {
      if (!user?.id || userRole !== "lab_staff") return null;

      const { data: assignments } = await supabase
        .from("order_assignments")
        .select("order_id")
        .eq("user_id", user.id);

      const orderIds = assignments?.map(a => a.order_id) || [];

      if (orderIds.length === 0) {
        return { processedToday: 0, totalQC: 0, totalUploads: 0 };
      }

      const { data: statusChanges } = await supabase
        .from("order_status_history")
        .select("*")
        .in("order_id", orderIds)
        .eq("changed_by", user.id);

      const today = new Date().toISOString().split('T')[0];
      const processedToday = statusChanges?.filter(s => s.changed_at.startsWith(today)).length || 0;

      const { data: qcItems } = await supabase
        .from("qc_checklist_items")
        .select("*")
        .eq("completed_by", user.id)
        .eq("is_completed", true);

      const { data: uploads } = await supabase
        .from("order_attachments")
        .select("*")
        .eq("uploaded_by", user.id);

      return {
        processedToday: processedToday,
        totalQC: qcItems?.length || 0,
        totalUploads: uploads?.length || 0,
      };
    },
    enabled: !!user?.id && userRole === "lab_staff",
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!user?.id || !earnedAchievements) return;

    const earnedIds = new Set(earnedAchievements);
    const progressChecks: ProgressCheck[] = [];

    // Doctor progress checks
    if (userRole === "doctor" && doctorProgress) {
      progressChecks.push(
        {
          id: "five_orders",
          current: doctorProgress.totalOrders,
          required: 5,
          name: "Getting Started",
          description: "Submit 5 orders",
          icon: Trophy,
        },
        {
          id: "ten_orders",
          current: doctorProgress.totalOrders,
          required: 10,
          name: "Professional",
          description: "Complete 10 orders",
          icon: Trophy,
        },
        {
          id: "twenty_five_orders",
          current: doctorProgress.totalOrders,
          required: 25,
          name: "Expert",
          description: "Complete 25 orders",
          icon: Trophy,
        },
        {
          id: "feedback_flow",
          current: doctorProgress.totalNotes,
          required: 5,
          name: "Feedback Flow",
          description: "Send 5 notes to the lab",
          icon: MessageSquare,
        },
        {
          id: "urgent_master",
          current: doctorProgress.urgentOrders,
          required: 5,
          name: "Urgent Master",
          description: "Complete 5 urgent orders",
          icon: Target,
        }
      );
    }

    // Lab progress checks
    if (userRole === "lab_staff" && labProgress) {
      progressChecks.push(
        {
          id: "data_dynamo",
          current: labProgress.processedToday,
          required: 10,
          name: "Data Dynamo",
          description: "Process 10 results in one day",
          icon: Trophy,
        },
        {
          id: "precision_pointer",
          current: labProgress.totalQC,
          required: 5,
          name: "Precision Pointer",
          description: "Complete 5 quality checks",
          icon: Trophy,
        },
        {
          id: "paperless_pro",
          current: labProgress.totalUploads,
          required: 25,
          name: "Paperless Pro",
          description: "Upload 25 digital records",
          icon: Trophy,
        }
      );
    }

    // Check each progress threshold
    progressChecks.forEach(check => {
      if (earnedIds.has(check.id)) return;

      const remaining = check.required - check.current;
      const progress = (check.current / check.required) * 100;

      // Show notification when close to completion (1-3 remaining or 75%+ progress)
      if ((remaining > 0 && remaining <= 3) || (progress >= 75 && progress < 100)) {
        const notificationKey = `${check.id}_${remaining}`;

        if (!notifiedProgressRef.current.has(notificationKey)) {
          notifiedProgressRef.current.add(notificationKey);

          const Icon = check.icon;
          
          toast.info(
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Almost there! 🎯</p>
                <p className="text-xs text-muted-foreground">
                  {remaining === 1 
                    ? `Just 1 more to unlock "${check.name}"!`
                    : `Only ${remaining} more to unlock "${check.name}"!`
                  }
                </p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>,
            {
              duration: 6000,
            }
          );
        }
      }
    });
  }, [doctorProgress, labProgress, userRole, earnedAchievements, user?.id]);

  return null;
}
