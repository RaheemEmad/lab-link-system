import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "loading" | "request" | "set-new" | "request-sent" | "done";

const ResetPassword = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Detect whether the user landed here via a recovery link.
  useEffect(() => {
    let isRecovery = false;

    // Supabase puts ?type=recovery in either the hash or query string.
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      isRecovery = true;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecovery = true;
        setMode("set-new");
      }
    });

    // Initial decision after a tick so onAuthStateChange can fire
    const timer = setTimeout(async () => {
      if (isRecovery) {
        setMode("set-new");
      } else {
        // No recovery context — show the request form
        setMode("request");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await resetPassword(email);
    if (!error) setMode("request-sent");
    setIsLoading(false);
  };

  const handleSetNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);
    if (!error) {
      setMode("done");
      // Sign out so the user must sign in with the new password
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth", { replace: true }), 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {mode === "set-new" ? "Set a new password" : "Reset password"}
            </CardTitle>
            <CardDescription>
              {mode === "set-new"
                ? "Choose a strong new password to finish resetting your account."
                : mode === "request-sent"
                ? "Check your email for a reset link"
                : mode === "done"
                ? "Your password was updated."
                : "Enter your email address and we'll send you a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "loading" && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {mode === "request" && (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Link to="/auth">
                  <Button variant="ghost" className="w-full" type="button">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </form>
            )}

            {mode === "request-sent" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-lg">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <p className="text-center text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>.
                  Open the email and click the link to set a new password.
                </p>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            )}

            {mode === "set-new" && (
              <form onSubmit={handleSetNew} className="space-y-4">
                <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg">
                  <KeyRound className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  After updating, you'll be signed out and redirected to sign in with your new password.
                </p>
              </form>
            )}

            {mode === "done" && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="text-muted-foreground">
                  Password updated. Redirecting you to sign in…
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <LandingFooter />
    </div>
  );
};

export default ResetPassword;
