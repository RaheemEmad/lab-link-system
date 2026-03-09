import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const MFASetup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const { data: factors, isLoading } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const activeFactor = factors?.totp?.find((f) => f.status === "verified");
  const hasActiveMFA = !!activeFactor;

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "LabLink Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
    } catch (err: any) {
      toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !verifyCode) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast({ title: "2FA enabled", description: "Two-factor authentication is now active on your account." });
      setQrCode(null);
      setFactorId(null);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async () => {
    if (!activeFactor) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactor.id });
      if (error) throw error;
      toast({ title: "2FA disabled", description: "Two-factor authentication has been removed." });
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (err: any) {
      toast({ title: "Failed to disable 2FA", description: err.message, variant: "destructive" });
    } finally {
      setUnenrolling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="mt-1">
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          {hasActiveMFA ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Enabled
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" /> Disabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading MFA status...
          </div>
        ) : hasActiveMFA ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <Smartphone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Authenticator app connected</p>
                <p className="text-xs text-muted-foreground">
                  Your account is protected with TOTP authentication
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Disable 2FA
            </Button>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter 6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
              />
              <Button onClick={handleVerify} disabled={verifyCode.length !== 6 || verifying}>
                {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Verify
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setQrCode(null); setFactorId(null); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use an authenticator app to generate one-time codes for an additional layer of security when signing in.
            </p>
            <Button onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
