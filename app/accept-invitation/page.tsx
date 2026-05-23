"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Lock, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "@/services/invitation.service";

const fieldClassName =
  "h-12 rounded-xl border-white/15 bg-black/20 pl-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary/60 focus-visible:ring-primary/25";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const invitationToken = useMemo(
    () => (searchParams.get("token") ?? "").trim(),
    [searchParams]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptedUserEmail, setAcceptedUserEmail] = useState<string | null>(null);

  const hasToken = invitationToken.length > 0;
  const isAccepted = Boolean(acceptedUserEmail);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const formElement = event.currentTarget;

    if (!hasToken) {
      setSubmitError("Invitation token is missing from the link.");
      toast.error("Invitation token is missing from this link.");
      return;
    }

    const formData = new FormData(formElement);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (firstName.length < 2) {
      setSubmitError("First name must be at least 2 characters.");
      toast.error("First name must be at least 2 characters.");
      return;
    }

    if (lastName.length < 2) {
      setSubmitError("Last name must be at least 2 characters.");
      toast.error("Last name must be at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Password and confirmation do not match.");
      toast.error("Password and confirmation do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await acceptInvitation({
        token: invitationToken,
        firstName,
        lastName,
        password,
      });

      setAcceptedUserEmail(result.user.email);
      formElement.reset();
      toast.success("Invitation completed successfully. You can now sign in.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete invitation right now. Please try again.";

      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      heading="Complete your invitation"
      description="Set your profile details and password to activate your account."
      dividerLabel=""
      footerPrompt=""
      footerActionLabel=""
      footerActionHref="/login"
      backHref="/login"
    >
      {!hasToken ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Invalid invitation link</AlertTitle>
          <AlertDescription>
            This invitation link is missing its token. Please request a new invitation from your
            administrator.
          </AlertDescription>
        </Alert>
      ) : null}

      {submitError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Invitation setup failed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {isAccepted ? (
        <div className="space-y-5">
          <Alert>
            <CheckCircle2 className="size-4 text-emerald-400" />
            <AlertTitle>Account created successfully</AlertTitle>
            <AlertDescription>
              Your account for <strong>{acceptedUserEmail}</strong> is now active. You can continue
              to sign in.
            </AlertDescription>
          </Alert>

          <Button
            asChild
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-secondary font-semibold text-primary-foreground transition-all hover:from-primary/90 hover:to-secondary/90"
          >
            <Link href="/login">
              Go to sign in
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm text-zinc-200">
              First name
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="First name"
                className={fieldClassName}
                autoComplete="given-name"
                minLength={2}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm text-zinc-200">
              Last name
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Last name"
                className={fieldClassName}
                autoComplete="family-name"
                minLength={2}
                required
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
                placeholder="Create a password"
                className={fieldClassName}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-zinc-200">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                className={fieldClassName}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !hasToken}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary to-secondary font-semibold text-primary-foreground transition-all hover:from-primary/90 hover:to-secondary/90"
          >
            {isSubmitting ? "Setting up account..." : "Complete account setup"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          heading="Complete your invitation"
          description="Loading invitation details..."
          dividerLabel=""
          footerPrompt=""
          footerActionLabel=""
          footerActionHref="/login"
          backHref="/login"
        >
          <div className="space-y-4">
            <div className="h-12 rounded-xl border border-white/10 bg-white/5" />
            <div className="h-12 rounded-xl border border-white/10 bg-white/5" />
            <div className="h-12 rounded-xl border border-white/10 bg-white/5" />
          </div>
        </AuthShell>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}