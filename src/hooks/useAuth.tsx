import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { parseAuthError, AUTH_MESSAGES, AuthErrorCode } from "@/lib/authValidation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; errorCode?: AuthErrorCode }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any; errorCode?: AuthErrorCode }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Parse and handle auth errors consistently
        const { message } = parseAuthError(error);
        toast.error(message);
        return { error, errorCode: parseAuthError(error).code };
      }

      // Check if email confirmation is disabled (auto-confirm enabled)
      if (data?.user && data.session) {
        toast.success(AUTH_MESSAGES.SIGN_IN_SUCCESS);
      } else {
        toast.success(AUTH_MESSAGES.SIGN_UP_SUCCESS);
      }
      
      return { error: null };
    } catch (error: any) {
      const { message } = parseAuthError(error);
      toast.error(message);
      return { error, errorCode: parseAuthError(error).code };
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Use secure login edge function with account lockout protection
      const { data, error } = await supabase.functions.invoke('secure-login', {
        body: { email, password }
      });

      if (error || data?.error) {
        const { message, code } = parseAuthError(data?.error || error?.message || 'Login failed');
        toast.error(message);
        return { error: error || new Error(message), errorCode: code };
      }

      // Set the session from the edge function response
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        // Handle session persistence based on remember me preference
        if (!rememberMe) {
          // For sessions that shouldn't persist, store a flag
          // This will be used to clear session on browser close
          sessionStorage.setItem('lablink_session_temporary', 'true');
          
          // Set up an event listener to clear session when window closes
          window.addEventListener('beforeunload', () => {
            if (sessionStorage.getItem('lablink_session_temporary') === 'true') {
              supabase.auth.signOut();
            }
          });
        } else {
          // Clear temporary session flag if remember me is enabled
          sessionStorage.removeItem('lablink_session_temporary');
        }
        
        toast.success(AUTH_MESSAGES.SIGN_IN_SUCCESS);
        navigate("/");
        return { error: null };
      }

      toast.error(AUTH_MESSAGES.SERVER_ERROR);
      return { error: new Error("No session returned"), errorCode: AuthErrorCode.SERVER_ERROR };
    } catch (error: any) {
      console.error('Sign in error:', error);
      const { message, code } = parseAuthError(error);
      toast.error(message);
      return { error, errorCode: code };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        const { message } = parseAuthError(error);
        toast.error(message);
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      const { message } = parseAuthError(error);
      toast.error(message);
      return { error };
    }
  };


  const signOut = async () => {
    // Clear temporary session flag
    sessionStorage.removeItem('lablink_session_temporary');
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast.success(AUTH_MESSAGES.SIGN_OUT_SUCCESS);
    navigate("/auth");
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Password reset email sent!");
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Password updated successfully!");
    navigate("/");
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
