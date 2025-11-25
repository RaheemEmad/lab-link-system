// Unified authentication validation utilities
// Single source of truth for email validation and auth checks

import { z } from "zod";

// Standard email validation schema
export const emailSchema = z.string().trim().email("Invalid email address").max(255);

// Standardized auth error codes
export enum AuthErrorCode {
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_EXISTS = "USER_EXISTS",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  UNAUTHORIZED = "UNAUTHORIZED",
  SERVER_ERROR = "SERVER_ERROR",
}

// Standardized auth response type
export interface AuthResponse {
  success: boolean;
  errorCode?: AuthErrorCode;
  message?: string;
  data?: any;
}

// Validate email format (client-side only)
export function validateEmailFormat(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

// Parse auth errors into standardized format
export function parseAuthError(error: any): { code: AuthErrorCode; message: string } {
  const errorMessage = error?.message || error?.error || String(error);
  
  // Map common error messages to error codes
  if (errorMessage.toLowerCase().includes("not found") || 
      errorMessage.toLowerCase().includes("not registered")) {
    return {
      code: AuthErrorCode.USER_NOT_FOUND,
      message: "This email is not registered. Please create an account first."
    };
  }
  
  if (errorMessage.toLowerCase().includes("already registered") || 
      errorMessage.toLowerCase().includes("already exists")) {
    return {
      code: AuthErrorCode.USER_EXISTS,
      message: "This email is already registered. Please sign in instead."
    };
  }
  
  if (errorMessage.toLowerCase().includes("invalid email")) {
    return {
      code: AuthErrorCode.INVALID_EMAIL,
      message: "Please enter a valid email address."
    };
  }
  
  if (errorMessage.toLowerCase().includes("password") && 
      errorMessage.toLowerCase().includes("invalid")) {
    return {
      code: AuthErrorCode.INVALID_PASSWORD,
      message: "Invalid email or password."
    };
  }
  
  if (errorMessage.toLowerCase().includes("locked") || 
      errorMessage.toLowerCase().includes("lockout")) {
    return {
      code: AuthErrorCode.ACCOUNT_LOCKED,
      message: "Account temporarily locked. Please try again later or contact support."
    };
  }
  
  // Default to server error
  return {
    code: AuthErrorCode.SERVER_ERROR,
    message: errorMessage || "An unexpected error occurred. Please try again."
  };
}

// User-friendly error messages
export const AUTH_MESSAGES = {
  SIGN_IN_SUCCESS: "Welcome back!",
  SIGN_UP_SUCCESS: "Account created successfully! Please check your email to verify.",
  SIGN_OUT_SUCCESS: "Signed out successfully",
  PASSWORD_RESET_SENT: "Password reset email sent! Check your inbox.",
  PASSWORD_UPDATED: "Password updated successfully!",
  EMAIL_VERIFICATION_REQUIRED: "Please verify your email address to continue.",
  ONBOARDING_REQUIRED: "Complete your profile to get started.",
  SERVER_ERROR: "An unexpected error occurred. Please try again.",
} as const;
