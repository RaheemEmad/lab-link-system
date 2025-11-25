import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";
import { WelcomeModal } from "@/components/auth/WelcomeModal";
import { Check, Eye, EyeOff, AlertCircle, Mail } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

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
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const hasCheckedAuth = useRef(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
  const signUpEmail = signUpForm.watch("email");
  
  // Visual-only email format validation (no backend checks)
  const [signInEmailValid, setSignInEmailValid] = useState<boolean | null>(null);
  const [signUpEmailValid, setSignUpEmailValid] = useState<boolean | null>(null);
  
  // Debounced email format validation (visual feedback only)
  useEffect(() => {
    const validateEmail = (email: string, setter: (valid: boolean | null) => void) => {
      if (!email) {
        setter(null);
        return;
      }
      const isValidFormat = z.string().email().safeParse(email).success;
      setter(isValidFormat);
    };

    const signInTimer = setTimeout(() => validateEmail(signInEmail, setSignInEmailValid), 300);
    const signUpTimer = setTimeout(() => validateEmail(signUpEmail, setSignUpEmailValid), 300);
    
    return () => {
      clearTimeout(signInTimer);
      clearTimeout(signUpTimer);
    };
  }, [signInEmail, signUpEmail]);

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
        const emailVerified = user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
        if (!emailVerified) {
          clearTimeout(loadingTimeout);
          toast.error("Email not verified. Please check your email for verification link.");
          await supabase.auth.signOut();
          hasCheckedAuth.current = false;
          setIsLoading(false);
          return;
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

        // If no profile exists, this is an OAuth user without profile - redirect to onboarding
        if (!profile && !profileError) {
          clearTimeout(loadingTimeout);
          console.log('OAuth user without profile, redirecting to onboarding');
          toast.info("Complete your profile to get started");
          navigate("/onboarding");
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
  }, [user, navigate]);

  const handleSignUp = async (values: SignUpValues) => {
    setIsLoading(true);
    const { error, errorCode } = await signUp(values.email, values.password, values.fullName);
    setIsLoading(false);
    
    if (error) {
      // Switch to sign-in if user already exists
      if (errorCode === "USER_EXISTS") {
        setTab("signin");
        signInForm.setValue("email", values.email);
      }
      return;
    }
    
    // Success - show email confirmation
    setConfirmedEmail(values.email);
    setShowEmailConfirmation(true);
  };

  const handleSignIn = async (values: SignInValues) => {
    setIsLoading(true);
    const { error, errorCode } = await signIn(values.email, values.password);
    setIsLoading(false);
    
    // Switch to sign-up if user not found
    if (error && errorCode === "USER_NOT_FOUND") {
      setTab("signup");
      signUpForm.setValue("email", values.email);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await signInWithGoogle();
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
              We've sent a confirmation email to <strong>{confirmedEmail}</strong>
            </CardDescription>
          </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              <Alert className="border-accent bg-accent/10">
                <Mail className="h-4 w-4 text-accent" />
                <AlertDescription className="text-sm ml-2">
                  <strong>Email Verification Pending</strong>
                  <p className="mt-1">We've sent a confirmation link to verify your email address.</p>
                </AlertDescription>
              </Alert>
              
              <div className="text-center text-muted-foreground text-sm space-y-2">
                <p>Click the link in the email to verify your account.</p>
                <p>Once verified, you can sign in to your account.</p>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  Didn't receive the email? Check your spam folder.
                </p>
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
                            <Input 
                              type="email" 
                              placeholder="doctor@example.com" 
                              {...field}
                              className={
                                signInEmailValid === true ? "pr-10 border-green-500/50 focus:border-green-500" :
                                signInEmailValid === false ? "pr-10 border-red-500/50 focus:border-red-500" :
                                ""
                              }
                            />
                            {signInEmailValid === true && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                            )}
                            {signInEmailValid === false && signInEmail && (
                              <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </FormControl>
                        {signInEmailValid === false && signInEmail && (
                          <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                        )}
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

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                  >
                    <GoogleIcon />
                    <span className="ml-2">
                      {isGoogleLoading ? "Connecting..." : "Sign in with Google"}
                    </span>
                  </Button>
                </form>
              </Form>
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
                            <Input 
                              type="email" 
                              placeholder="doctor@example.com" 
                              {...field}
                              className={
                                signUpEmailValid === true ? "pr-10 border-green-500/50 focus:border-green-500" :
                                signUpEmailValid === false ? "pr-10 border-red-500/50 focus:border-red-500" :
                                ""
                              }
                            />
                            {signUpEmailValid === true && (
                              <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                            )}
                            {signUpEmailValid === false && field.value && (
                              <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </FormControl>
                        {signUpEmailValid === false && field.value && (
                          <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                        )}
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

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                  >
                    <GoogleIcon />
                    <span className="ml-2">
                      {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
                    </span>
                  </Button>
                </form>
              </Form>
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
