/**
 * Login Page
 *
 * Email/password login and signup form. MVP implementation — no OAuth providers yet.
 *
 * Design decisions:
 *  - Single component with mode toggle (login / signup) to keep it simple
 *  - Inline validation using Zod + react-hook-form
 *  - Error messages from Supabase displayed inline
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "./useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(1, "Full name is required").max(200),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setServerError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) setServerError(error);
  };

  const handleSignup = async (data: SignupFormData) => {
    setServerError(null);
    const { error } = await signUp(data.email, data.password, data.fullName);
    if (error) setServerError(error);
    else {
      // Supabase sends a confirmation email — show a message.
      setServerError("Check your email to confirm your account.");
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-land-bg">
      <div className="w-full max-w-md p-8 glass-panel rounded-xl">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-land-text tracking-tight">
            Grounded
          </h1>
          <p className="mt-1 text-land-muted text-sm">
            {mode === "login" ? "Sign in to your workspace" : "Create your account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-6 p-1 bg-land-surface rounded-lg">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "login"
                ? "bg-land-accent text-white"
                : "text-land-muted hover:text-land-text"
            }`}
            onClick={() => { setMode("login"); setServerError(null); }}
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "signup"
                ? "bg-land-accent text-white"
                : "text-land-muted hover:text-land-text"
            }`}
            onClick={() => { setMode("signup"); setServerError(null); }}
          >
            Sign up
          </button>
        </div>

        {/* Login form */}
        {mode === "login" && (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <FormField
              label="Email"
              type="email"
              placeholder="you@company.com"
              error={loginForm.formState.errors.email?.message}
              {...loginForm.register("email")}
            />
            <FormField
              label="Password"
              type="password"
              placeholder="••••••••"
              error={loginForm.formState.errors.password?.message}
              {...loginForm.register("password")}
            />
            {serverError && (
              <p className="text-sm text-red-400">{serverError}</p>
            )}
            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full py-2.5 bg-land-accent hover:bg-land-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {/* Signup form */}
        {mode === "signup" && (
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <FormField
              label="Full name"
              type="text"
              placeholder="Alex Smith"
              error={signupForm.formState.errors.fullName?.message}
              {...signupForm.register("fullName")}
            />
            <FormField
              label="Email"
              type="email"
              placeholder="you@company.com"
              error={signupForm.formState.errors.email?.message}
              {...signupForm.register("email")}
            />
            <FormField
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={signupForm.formState.errors.password?.message}
              {...signupForm.register("password")}
            />
            <FormField
              label="Confirm password"
              type="password"
              placeholder="Repeat password"
              error={signupForm.formState.errors.confirmPassword?.message}
              {...signupForm.register("confirmPassword")}
            />
            {serverError && (
              <p className={`text-sm ${serverError.includes("Check your email") ? "text-green-400" : "text-red-400"}`}>
                {serverError}
              </p>
            )}
            <button
              type="submit"
              disabled={signupForm.formState.isSubmitting}
              className="w-full py-2.5 bg-land-accent hover:bg-land-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signupForm.formState.isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Internal helper component ────────────────────────────────────────────────
// Kept here rather than in ui/ because it's only used in LoginPage.
// If needed elsewhere, extract to src/components/ui/FormField.tsx.

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-land-text mb-1.5">
        {label}
      </label>
      <input
        ref={ref}
        className={`w-full px-3 py-2.5 bg-land-surface border rounded-lg text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50 transition-colors ${
          error ? "border-red-400" : "border-white/10 focus:border-land-accent/50"
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
);
FormField.displayName = "FormField";
