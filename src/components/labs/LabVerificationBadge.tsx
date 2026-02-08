import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type VerificationStatus = 'pending' | 'verified' | 'at_risk' | 'revoked';

interface LabVerificationBadgeProps {
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  completedOrderCount?: number;
  showTooltip?: boolean;
  className?: string;
}

export function LabVerificationBadge({ 
  isVerified = false, 
  verificationStatus = 'pending',
  completedOrderCount = 0,
  showTooltip = true,
  className = ""
}: LabVerificationBadgeProps) {
  const getBadgeConfig = () => {
    if (verificationStatus === 'revoked') {
      return {
        icon: XCircle,
        label: 'Verification Revoked',
        variant: 'destructive' as const,
        tooltip: 'This lab has lost its verification status due to performance issues.',
        bgClass: 'bg-destructive/10 text-destructive border-destructive/20',
      };
    }
    
    if (verificationStatus === 'at_risk') {
      return {
        icon: AlertTriangle,
        label: 'At Risk',
        variant: 'outline' as const,
        tooltip: 'This lab\'s verification is at risk due to recent issues. Working to resolve.',
        bgClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
      };
    }
    
    if (isVerified || verificationStatus === 'verified') {
      return {
        icon: CheckCircle,
        label: 'Verified',
        variant: 'default' as const,
        tooltip: 'This lab has successfully completed 2+ orders and maintains high standards.',
        bgClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
      };
    }
    
    // Pending
    return {
      icon: Clock,
      label: `Pending (${completedOrderCount}/2)`,
      variant: 'secondary' as const,
      tooltip: `This lab needs to complete ${2 - completedOrderCount} more order(s) to earn verification.`,
      bgClass: 'bg-muted text-muted-foreground',
    };
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const badgeContent = (
    <Badge 
      variant={config.variant}
      className={`flex items-center gap-1 ${config.bgClass} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
