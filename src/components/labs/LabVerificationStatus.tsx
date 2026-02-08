import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";
import { LabVerificationBadge } from "./LabVerificationBadge";

interface LabVerificationStatusProps {
  labId: string;
  showCard?: boolean;
}

export function LabVerificationStatus({ labId, showCard = true }: LabVerificationStatusProps) {
  const { data: lab, isLoading } = useQuery({
    queryKey: ['lab-verification-status', labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labs')
        .select(`
          id,
          name,
          is_verified,
          verified_at,
          completed_order_count,
          verification_risk_score,
          verification_status,
          last_risk_check_at
        `)
        .eq('id', labId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lab) return null;

  const completedCount = lab.completed_order_count || 0;
  const requiredOrders = 2;
  const progress = Math.min((completedCount / requiredOrders) * 100, 100);
  const verificationStatus = (lab.verification_status as 'pending' | 'verified' | 'at_risk' | 'revoked') || 'pending';
  const riskScore = lab.verification_risk_score || 0;

  const getStatusContent = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">Verified Lab</h3>
                <p className="text-sm text-muted-foreground">
                  Your lab has earned the verified badge
                </p>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Completed {completedCount} orders successfully</span>
              </div>
              {lab.verified_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Verified since {new Date(lab.verified_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {riskScore > 0 && riskScore < 30 && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Info className="h-4 w-4 mt-0.5" />
                <span>
                  Current risk score: {riskScore.toFixed(0)}/100. Keep delivering quality work to maintain your verified status.
                </span>
              </div>
            )}
          </div>
        );
        
      case 'at_risk':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 dark:text-orange-400">Verification At Risk</h3>
                <p className="text-sm text-muted-foreground">
                  Action needed to maintain your badge
                </p>
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Your risk score is {riskScore.toFixed(0)}/100
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                This may be due to:
              </p>
              <ul className="list-disc pl-5 text-sm text-orange-700 dark:text-orange-400 space-y-1">
                <li>Recent billing disputes from doctors</li>
                <li>Missed delivery deadlines (SLA violations)</li>
                <li>Lower than expected ratings</li>
              </ul>
              
              <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  To recover:
                </p>
                <ul className="list-disc pl-5 text-sm text-orange-700 dark:text-orange-400 space-y-1">
                  <li>Resolve any open disputes promptly</li>
                  <li>Meet all delivery deadlines</li>
                  <li>Focus on quality to improve ratings</li>
                </ul>
              </div>
            </div>
          </div>
        );
        
      case 'revoked':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Verification Revoked</h3>
                <p className="text-sm text-muted-foreground">
                  Your verified status has been removed
                </p>
              </div>
            </div>
            
            <div className="bg-destructive/5 p-4 rounded-lg space-y-3">
              <p className="text-sm text-destructive">
                Risk score: {riskScore.toFixed(0)}/100 (threshold: 50)
              </p>
              <p className="text-sm text-muted-foreground">
                Verification was revoked due to accumulated issues. To regain verification:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Resolve all pending disputes</li>
                <li>Complete orders on time for 90 days</li>
                <li>Maintain ratings above 3.5 stars</li>
                <li>Risk score must drop below 30</li>
              </ul>
            </div>
          </div>
        );
        
      default: // pending
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Pending Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Complete {requiredOrders - completedCount} more order(s) to get verified
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{completedCount}/{requiredOrders} orders</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">How to get verified:</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Complete at least 2 orders successfully</li>
                <li>Deliver on time without SLA violations</li>
                <li>Receive positive feedback from doctors</li>
              </ul>
            </div>
            
            <div className="bg-primary/5 p-4 rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Benefits of Verification
              </h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-1">
                <li>Verified badge visible to all doctors</li>
                <li>Priority placement in lab listings</li>
                <li>Higher trust from new doctors</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Verification Status</h3>
        <LabVerificationBadge 
          isVerified={lab.is_verified || false}
          verificationStatus={verificationStatus}
          completedOrderCount={completedCount}
        />
      </div>
      {getStatusContent()}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Lab Verification
        </CardTitle>
        <CardDescription>
          Earn trust by maintaining quality standards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
