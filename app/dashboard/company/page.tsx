import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCompanyProfile } from "@/server/companies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Edit, Eye, Briefcase } from "lucide-react";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function CompanyDashboardPage() {
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

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Company Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company profile and job postings
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/company/profile/edit">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>

      {/* Status Banner */}
      {!profile.verified && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-400">
              ⏳ Verification Pending
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-500">
              Your company profile is under review by our admin team. You'll be notified once verified.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {profile.status === "rejected" && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-400">
              ❌ Profile Rejected
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-500">
              {profile.adminNote || "Your profile was rejected. Please contact support for more information."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(profile.analytics as any)?.profileViews || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total profile views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Posts</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(profile.analytics as any)?.jobPosts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active job postings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(profile.analytics as any)?.applications || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total applications received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Your current company profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Company Name</h3>
              <p className="text-base">{profile.name || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
              <p className="text-base">{profile.industry || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
              <p className="text-base">{profile.location || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Company Size</h3>
              <p className="text-base">{profile.size || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
              <p className="text-base">
                {profile.websiteUrl ? (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {profile.websiteUrl}
                  </a>
                ) : (
                  "Not set"
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Contact Email</h3>
              <p className="text-base">{profile.contactEmail}</p>
            </div>
          </div>

          {profile.about && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">About</h3>
              <p className="text-base whitespace-pre-wrap">{profile.about}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" asChild className="h-auto p-4 justify-start">
            <Link href="/dashboard/company/profile/edit">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  <span className="font-semibold">Edit Profile</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Update your company information
                </span>
              </div>
            </Link>
          </Button>

          {profile.verified && profile.status === "approved" ? (
            <Button variant="outline" asChild className="h-auto p-4 justify-start">
              <Link href="/dashboard/company/jobs/new">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-semibold">Post a Job</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Create a new job posting
                  </span>
                </div>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled className="h-auto p-4 justify-start opacity-50 cursor-not-allowed">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-semibold">Post a Job</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Requires verification
                </span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

