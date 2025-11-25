import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Chrome, Check, Eye, EyeOff, AlertCircle } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { toast } from "sonner";
import { WelcomeModal } from "@/components/auth/WelcomeModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  getUserIP, 
  checkOAuthRateLimit, 
  logOAuthAttempt, 
  isEmailVerified,
  formatRetryTime 
} from "@/lib/oauthSecurity";

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;

const Auth = () => {
  const { user, signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [userIP, setUserIP] = useState<string | null>(null);
  const hasCheckedAuth = useRef(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Handle OAuth errors from URL
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');

    if (error) {
      let friendlyMessage = "Google Sign-In failed. Please try again.";
      
      if (errorDescription?.includes("Unable to exchange external code") || error === "server_error") {
        friendlyMessage = "Google authentication is not properly configured. Please use email/password to sign in or contact support.";
        setOauthError(friendlyMessage);
      } else if (error === "access_denied") {
        friendlyMessage = "Access denied. You cancelled the Google sign-in.";
      }
      
      toast.error(friendlyMessage, { duration: 6000 });
      
      // Clear URL parameters
      window.history.replaceState({}, '', '/auth');
    }
  }, [searchParams]);

  // Get user's IP address on mount
  useEffect(() => {
    getUserIP().then(setUserIP);
  }, []);

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
    },
  });

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const signUpPassword = signUpForm.watch("password");
  const signUpConfirmPassword = signUpForm.watch("confirmPassword");
  const signInEmail = signInForm.watch("email");

  // Check onboarding and role status when user changes
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user || hasCheckedAuth.current) return;
      
      hasCheckedAuth.current = true;

      // Set a timeout to redirect to onboarding if stuck loading (10 seconds)
      const loadingTimeout = setTimeout(() => {
        console.warn('Role check timeout - redirecting to onboarding');
        toast.info("Setting up your account...");
        navigate("/onboarding");
      }, 10000);

      try {
        setIsLoading(true);

        // Check email verification
        if (!isEmailVerified(user)) {
          clearTimeout(loadingTimeout);
          toast.error("Email not verified. Please check your email for verification link.");
          await supabase.auth.signOut();
          hasCheckedAuth.current = false;
          setIsLoading(false);
          return;
        }

        // Log successful OAuth attempt if this was an OAuth login and we have IP
        if (user.app_metadata?.provider === 'google' && userIP && user.email) {
          await logOAuthAttempt(user.email, true, userIP);
        }

        // Get user's name for welcome modal
        const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        setWelcomeUserName(userName);

        // First check if profile exists (registered user)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        // If no profile exists, this is a new user from Google OAuth
        // They need to sign up properly first
        if (!profile && !profileError) {
          clearTimeout(loadingTimeout);
          toast.error("Email not registered. Please sign up first.");
          
          // Log failed OAuth attempt
          if (userIP && user.email) {
            await logOAuthAttempt(user.email, false, userIP);
          }
          
          await supabase.auth.signOut();
          setTab("signup");
          hasCheckedAuth.current = false;
          setIsLoading(false);
          return;
        }

        // Check if user has a role assigned
        const { data: userRole, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        // Clear timeout since we got a response
        clearTimeout(loadingTimeout);

        // If role fetch failed or no role exists, redirect to onboarding
        if (roleError || !userRole) {
          console.log('No role found, redirecting to onboarding');
          toast.info("Complete your account setup");
          navigate("/onboarding");
          return;
        }

        // If role exists but onboarding not completed
        if (!profile?.onboarding_completed) {
          navigate("/onboarding");
          return;
        }

        // User has role and completed onboarding, show welcome modal then redirect
        clearTimeout(loadingTimeout);
        setShowWelcomeModal(true);
        setIsLoading(false);
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error checking user status:', error);
        // On error, redirect to onboarding to allow user to complete setup
        toast.info("Setting up your account...");
        navigate("/onboarding");
        hasCheckedAuth.current = false;
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [user, navigate, userIP]);

  const handleSignUp = async (values: SignUpValues) => {
    setIsLoading(true);
    const { error } = await signUp(values.email, values.password, values.fullName);
    setIsLoading(false);
    
    if (!error) {
      setSignUpEmail(values.email);
      setShowEmailConfirmation(true);
    }
  };

  const handleSignIn = async (values: SignInValues) => {
    setIsLoading(true);
    const { error } = await signIn(values.email, values.password);
    setIsLoading(false);
    
    // Navigation is handled by the useEffect hook above
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      // Check rate limiting if we have user's IP (optional security layer)
      if (userIP) {
        const rateLimit = await checkOAuthRateLimit(userIP);
        
        if (rateLimit.isLocked) {
          const retryTime = formatRetryTime(rateLimit.retryAfterSeconds || 0);
          toast.error(
            `Too many failed attempts. Please try again in ${retryTime}.`,
            { duration: 5000 }
          );
          setIsGoogleLoading(false);
          return;
        }
      }

      const { error } = await signInWithGoogle();
      
      if (error) {
        toast.error("Failed to sign in with Google. Please try again.");
        setIsGoogleLoading(false);
      }
      // Don't set loading to false on success as user will be redirected
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error("Unable to connect to Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleWelcomeModalClose = async () => {
    setShowWelcomeModal(false);
    
    // Get user role to determine where to redirect
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (userRole?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  if (showEmailConfirmation) {
    return (
      <>
        <WelcomeModal 
          isOpen={showWelcomeModal} 
          userName={welcomeUserName}
          onClose={handleWelcomeModalClose}
        />
        
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 sm:p-6">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl">Check Your Email</CardTitle>
              <CardDescription className="text-sm mt-2">
                We've sent a confirmation email to <strong>{signUpEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              <div className="text-center text-muted-foreground text-sm">
                <p>Click the link in the email to verify your account.</p>
                <p className="mt-2">Once verified, you can sign in to your account.</p>
              </div>
              <Button 
                onClick={() => setShowEmailConfirmation(false)} 
                variant="outline" 
                className="w-full"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
        <LandingFooter />
      </div>
      </>
    );
  }

  return (
    <>
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        userName={welcomeUserName}
        onClose={handleWelcomeModalClose}
      />
      
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl">Welcome to LabLink</CardTitle>
          <CardDescription className="text-sm">Sign in to track orders or create your account</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {oauthError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Google Sign-In Issue</AlertTitle>
              <AlertDescription className="text-sm">
                {oauthError}
                <br />
                <span className="text-xs mt-1 block">Use email/password sign-in below to continue.</span>
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="email" placeholder="doctor@example.com" {...field} />
                            {signInEmail && z.string().email().safeParse(signInEmail).success && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link to="/reset-password" className="text-xs text-primary hover:underline">
                            Forgot Password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </Button>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="email" placeholder="doctor@example.com" {...field} />
                            {field.value && z.string().email().safeParse(field.value).success && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <PasswordStrengthIndicator password={signUpPassword || ""} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              {signUpConfirmPassword && signUpPassword && signUpPassword === signUpConfirmPassword && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      <LandingFooter />
      </div>
    </>
  );
};

export default Auth;
