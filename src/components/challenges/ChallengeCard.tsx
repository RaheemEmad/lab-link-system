import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Zap, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  challenge_id: string;
  challenge_type: "daily" | "weekly" | "monthly";
  progress: number;
  target: number;
  completed: boolean;
  expires_at: string;
  completed_at?: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
}

const CHALLENGE_INFO: Record<string, { name: string; description: string; icon: any }> = {
  // Doctor daily
  daily_submit_orders: {
    name: "Daily Submission",
    description: "Submit 3 orders today",
    icon: Target,
  },
  daily_add_notes: {
    name: "Stay Connected",
    description: "Add 2 notes today",
    icon: Zap,
  },
  
  // Doctor weekly
  weekly_complete_orders: {
    name: "Weekly Goal",
    description: "Complete 10 orders this week",
    icon: Trophy,
  },
  weekly_fast_approvals: {
    name: "Quick Decisions",
    description: "Approve 5 designs within 24h",
    icon: Clock,
  },
  
  // Doctor monthly
  monthly_complete_orders: {
    name: "Monthly Master",
    description: "Complete 50 orders this month",
    icon: Trophy,
  },
  monthly_ontime_rate: {
    name: "Consistency King",
    description: "Maintain 90% on-time rate",
    icon: Target,
  },
  
  // Lab daily
  daily_process_orders: {
    name: "Daily Production",
    description: "Process 5 orders today",
    icon: Target,
  },
  daily_qc_checks: {
    name: "Quality First",
    description: "Complete 3 QC checks today",
    icon: Zap,
  },
  
  // Lab weekly
  weekly_process_orders: {
    name: "Weekly Production",
    description: "Process 25 orders this week",
    icon: Trophy,
  },
  weekly_upload_files: {
    name: "Digital Records",
    description: "Upload 10 files this week",
    icon: Clock,
  },
  
  // Lab monthly
  monthly_process_orders: {
    name: "Production Champion",
    description: "Process 100 orders this month",
    icon: Trophy,
  },
  monthly_qc_checks: {
    name: "Quality Champion",
    description: "Complete 50 QC checks this month",
    icon: Target,
  },
};

const CHALLENGE_COLORS = {
  daily: {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-600 dark:text-blue-400",
  },
  weekly: {
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400",
  },
  monthly: {
    gradient: "from-amber-500 to-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-600 dark:text-amber-400",
  },
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const info = CHALLENGE_INFO[challenge.challenge_id];
  const colors = CHALLENGE_COLORS[challenge.challenge_type];
  const Icon = info?.icon || Target;
  
  const progressPercentage = (challenge.progress / challenge.target) * 100;
  const isExpired = new Date(challenge.expires_at) < new Date();
  const timeLeft = getTimeLeft(challenge.expires_at);

  if (!info) return null;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        challenge.completed 
          ? "border-2 border-green-500 shadow-lg" 
          : isExpired
          ? "opacity-50 grayscale"
          : "hover:shadow-md",
        colors.border
      )}
    >
      {/* Background gradient for completed */}
      {challenge.completed && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
      )}
      
      {/* Challenge type badge */}
      <div className="absolute top-2 right-2">
        <Badge variant="outline" className={cn("capitalize", colors.text)}>
          {challenge.challenge_type}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            challenge.completed 
              ? "bg-gradient-to-br from-green-500 to-emerald-600" 
              : `bg-gradient-to-br ${colors.gradient}`,
            "shadow-lg"
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{info.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {info.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {challenge.progress} / {challenge.target}
            </span>
            <span className={cn(
              "font-semibold",
              challenge.completed ? "text-green-600" : colors.text
            )}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={progressPercentage} 
              className={cn("h-3", challenge.completed && "bg-green-100")}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
          {challenge.completed && (
            <Badge className="bg-green-600 hover:bg-green-700">
              ✓ Completed
            </Badge>
          )}
          {isExpired && !challenge.completed && (
            <Badge variant="destructive">
              Expired
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeLeft(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff < 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
}
