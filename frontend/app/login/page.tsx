"use client";

import { ArrowRight, AlertCircle, Lock, Mail, MailOpen } from "lucide-react";
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
  "h-12 rounded-[10px] border-[1.5px] border-border bg-white pl-11 text-base text-navy-800 placeholder:text-muted-foreground focus-visible:border-teal-500 focus-visible:ring-4 focus-visible:ring-teal-50";

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
      heading="Sign in"
      description="Use the email your company invited you with."
      dividerLabel="NEW TO TECHNOV?"
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
          <Label htmlFor="email" className="text-sm font-semibold text-navy-800">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
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
          <Label htmlFor="password" className="text-sm font-semibold text-navy-800">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
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
            className="size-5 border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label htmlFor="remember" className="text-[15px] font-normal text-navy-800">
            Remember me
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-navy-600"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="flex gap-3 rounded-xl bg-navy-50 p-4 text-sm leading-relaxed text-navy-600">
        <MailOpen className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          <b>Got an invitation email?</b> Open the link in it to set up your account. Sign-up is by
          invitation only.
        </p>
      </div>
    </AuthShell>
  );
}
