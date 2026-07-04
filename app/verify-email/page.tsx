"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent! Check your inbox.");
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast.error("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Check Your Inbox
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Click the verification link in the email we sent you to activate your account.
                The link will expire in 24 hours.
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">What to do next:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link</li>
                <li>Return here and log in</li>
                <li>Choose your role (Student or Company)</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleLogout}
            >
              Back to Login
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            <p>Didn't receive the email?</p>
            <p>Check your spam folder or click "Resend"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

