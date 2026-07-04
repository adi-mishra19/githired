import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCompanyProfile } from "@/server/companies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, CheckCircle2, Clock, Edit, XCircle } from "lucide-react";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function CompanyPendingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  // Fetch fresh user role from database (session might be stale)
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!currentUser || currentUser.role !== "company") {
    redirect("/login");
  }

  const profile = await getCompanyProfile();

  // If verified, redirect to dashboard
  if (profile.verified && profile.status === "approved") {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Status Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          {profile.status === "pending" && <Clock className="w-10 h-10 text-primary" />}
          {profile.status === "rejected" && <XCircle className="w-10 h-10 text-destructive" />}
          {profile.status === "banned" && <XCircle className="w-10 h-10 text-destructive" />}
        </div>

        {/* Status Title */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {profile.status === "pending" && "Verification Pending"}
            {profile.status === "rejected" && "Profile Rejected"}
            {profile.status === "banned" && "Account Suspended"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {profile.status === "pending" && "Your company profile is under review"}
            {profile.status === "rejected" && "Your profile needs attention"}
            {profile.status === "banned" && "Your account has been suspended"}
          </p>
        </div>

        {/* Status Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {profile.name}
            </CardTitle>
            <CardDescription>Company Profile Status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.status === "pending" && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    ⏳ Under Review
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    Our admin team is reviewing your company profile. This typically takes 1-2 business days.
                    You'll receive an email notification once your profile is verified.
                  </p>
                </div>

                <div className="text-left space-y-2">
                  <h4 className="font-semibold">What happens next?</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                      <span>Admin reviews your company details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                      <span>Verification of company authenticity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                      <span>Email notification upon approval</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                      <span>Full access to post jobs and find talent</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {profile.status === "rejected" && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                    ❌ Profile Rejected
                  </h3>
                  {profile.adminNote && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                        Admin Note:
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-500">
                        {profile.adminNote}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-red-800 dark:text-red-400">
                    Please update your profile with accurate information and contact support if you need assistance.
                  </p>
                </div>

                <Button asChild className="w-full">
                  <Link href="/dashboard/company/profile/edit">
                    <Edit className="w-4 h-4 mr-2" />
                    Update Profile
                  </Link>
                </Button>
              </div>
            )}

            {profile.status === "banned" && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  ⛔ Account Suspended
                </h3>
                {profile.adminNote && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                      Reason:
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-500">
                      {profile.adminNote}
                    </p>
                  </div>
                )}
                <p className="text-sm text-red-800 dark:text-red-400">
                  Your account has been suspended. Please contact support to resolve this issue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          {profile.status === "pending" && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/company/profile/edit">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          )}
          
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              View Dashboard
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground">
          <p>Need help? Contact us at support@githired.com</p>
        </div>
      </div>
    </div>
  );
}

