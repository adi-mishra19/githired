import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getStudentProfile } from "@/server/students";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, AlertCircle, XCircle } from "lucide-react";

export default async function PendingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const profile = await getStudentProfile();

  if (!profile) {
    redirect("/dashboard/profile/setup");
  }

  // If approved, redirect to dashboard
  if (profile.status === "approved") {
    redirect("/dashboard");
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      title: "Profile Under Review",
      description: "Your profile is currently being reviewed by our admin team",
      message: "Thank you for signing up! Your profile is currently under review. You'll receive an email notification once your profile has been approved. This usually takes 1-2 business days.",
      color: "text-yellow-500",
    },
    rejected: {
      icon: XCircle,
      title: "Profile Rejected",
      description: "Your profile was not approved",
      message: profile.adminNote || "Unfortunately, your profile did not meet our requirements. Please contact support for more information.",
      color: "text-red-500",
    },
    banned: {
      icon: AlertCircle,
      title: "Account Suspended",
      description: "Your account has been suspended",
      message: profile.adminNote || "Your account has been suspended. Please contact support if you believe this is an error.",
      color: "text-red-700",
    },
  };

  const config = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full ${config.color === "text-yellow-500" ? "bg-yellow-100 dark:bg-yellow-950" : config.color === "text-red-500" ? "bg-red-100 dark:bg-red-950" : "bg-red-100 dark:bg-red-950"}`}>
              <Icon className={`w-8 h-8 ${config.color}`} />
            </div>
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`rounded-lg p-4 ${config.color === "text-yellow-500" ? "bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800" : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800"}`}>
            <p className="text-sm text-center">{config.message}</p>
          </div>

          {profile.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">While you wait, you can:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Complete your profile with all required information
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Upload your resume in PDF format
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Add your education, projects and experience
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Provide your SRN (Student Registration Number)
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <Link href="/dashboard/profile/edit">Complete Your Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {profile.status === "rejected" && (
            <div className="flex justify-center gap-4 pt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/profile/edit">Update Profile</Link>
              </Button>
              <Button asChild>
                <a href="mailto:support@example.com">Contact Support</a>
              </Button>
            </div>
          )}

          {profile.status === "banned" && (
            <div className="flex justify-center pt-4">
              <Button asChild>
                <a href="mailto:support@example.com">Contact Support</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

