"use client";

import { ArrowRight, AlertCircle, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearStoredAuth,
  getCurrentUser,
  getStoredToken,
  loginUser,
  setStoredAuth,
} from "@/services/auth.service";

const fieldClassName =
  "h-12 rounded-xl border-white/15 bg-black/20 pl-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary/60 focus-visible:ring-primary/25";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      return;
    }

    getCurrentUser(existingToken)
      .then(() => {
        router.replace("/dashboard");
      })
      .catch(() => {
        clearStoredAuth();
      });
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setSubmitError("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await loginUser({ email, password });

      setStoredAuth(data);
      router.replace("/dashboard");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to login. Please try again.";

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      heading="Welcome"
      description="Enter your credentials to sign in to your account"
      dividerLabel="NEW TO SUPPORTLY AI?"
      footerPrompt="Don't have an account?"
      footerActionLabel="Sign up"
      footerActionHref="/signup"
      backHref="/"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {submitError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-zinc-200">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              className={fieldClassName}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-zinc-200">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              className={fieldClassName}
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="remember"
            className="border-white/15 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label htmlFor="remember" className="text-sm text-zinc-300 font-normal">
            Remember me
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-secondary font-semibold text-primary-foreground transition-all hover:from-primary/90 hover:to-secondary/90"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
