import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getStudentProfile, isAdmin } from "@/server/students";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User, FileText, CheckCircle, AlertCircle, Edit, BarChart3 } from "lucide-react";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  // Check if user is admin
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (currentUser?.role === "admin") {
    redirect("/dashboard/admin");
  }

  // Get student profile
  const profile = await getStudentProfile();

  if (!profile) {
    redirect("/dashboard/profile/setup");
  }

  // If not approved, redirect to pending page
  if (profile.status !== "approved") {
    redirect("/dashboard/pending");
  }

  const analytics = profile.analytics as any || { profileViews: 0, applications: 0 };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name}!</h1>
        <p className="text-muted-foreground">Here's your student portal overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.profileViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Companies viewing your profile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.applications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Job applications submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Approved</div>
            <p className="text-xs text-muted-foreground">
              Your profile is live
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>Complete your profile to increase visibility and job matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="font-bold text-lg">
                {Math.round(calculateProfileCompletion(profile))}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  calculateProfileCompletion(profile) >= 80 
                    ? 'bg-green-500' 
                    : calculateProfileCompletion(profile) >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}
                style={{ width: `${calculateProfileCompletion(profile)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {calculateProfileCompletion(profile) >= 80 
                ? '✨ Excellent! Your profile is highly attractive to recruiters'
                : calculateProfileCompletion(profile) >= 50 
                ? '👍 Good progress! Complete more sections to stand out'
                : '🚀 Get started! A complete profile gets 3x more views'}
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Completion by Category</h4>
            
            {/* Basic Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Basic Info (20 pts)</span>
                <span className="font-medium">{calculateCategoryScore(profile, 'basic')}/20</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  {profile.phone ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>Phone (5)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.cgpa ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>CGPA (5)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.degree ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>Degree (5)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.course ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>Course (5)</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Skills (15 pts)</span>
                <span className="font-medium">{calculateCategoryScore(profile, 'skills')}/15</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {profile.skills && (profile.skills as any[]).length >= 10 ? (
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : profile.skills && (profile.skills as any[]).length >= 5 ? (
                  <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                )}
                <span>
                  {profile.skills ? (profile.skills as any[]).length : 0} skills 
                  (target: 5+, excellent: 10+)
                </span>
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Projects (15 pts)</span>
                <span className="font-medium">{calculateCategoryScore(profile, 'projects')}/15</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {profile.projects && (profile.projects as any[]).length >= 3 ? (
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : profile.projects && (profile.projects as any[]).length >= 2 ? (
                  <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                )}
                <span>
                  {profile.projects ? (profile.projects as any[]).length : 0} projects 
                  (target: 2+, excellent: 3+)
                </span>
              </div>
            </div>

            {/* Experience & Certifications */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">Experience (15 pts)</span>
                  <span className="font-medium text-xs">{calculateCategoryScore(profile, 'experience')}/15</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.experience && (profile.experience as any[]).length >= 2 ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : profile.experience && (profile.experience as any[]).length > 0 ? (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span>{profile.experience ? (profile.experience as any[]).length : 0} entries</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">Certs (10 pts)</span>
                  <span className="font-medium text-xs">{calculateCategoryScore(profile, 'certifications')}/10</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.certifications && (profile.certifications as any[]).length >= 2 ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : profile.certifications && (profile.certifications as any[]).length > 0 ? (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span>{profile.certifications ? (profile.certifications as any[]).length : 0} certs</span>
                </div>
              </div>
            </div>

            {/* Resume & Profile Links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Resume & Links (25 pts)</span>
                <span className="font-medium">{calculateCategoryScore(profile, 'extras')}/25</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  {(profile.resumes && (profile.resumes as any[]).length > 0) || profile.resumeUrl ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span>Resume (10)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.githubUrl ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>GitHub (3)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.linkedinUrl ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>LinkedIn (4)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {profile.portfolioUrl ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>Portfolio (3)</span>
                </div>
                <div className="flex items-center gap-2 text-xs col-span-2">
                  {profile.bio || profile.aboutMe ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <span>Bio/About Me (5)</span>
                </div>
              </div>
            </div>
          </div>

          <Button asChild className="w-full mt-4">
            <Link href="/dashboard/profile/edit">
              <Edit className="w-4 h-4 mr-2" />
              Complete Your Profile
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild variant="outline" className="h-auto py-6">
            <Link href="/dashboard/profile/edit" className="flex flex-col items-center gap-2">
              <User className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">Update Profile</div>
                <div className="text-xs text-muted-foreground">Edit your information</div>
              </div>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-6">
            <Link href="/dashboard/jobs" className="flex flex-col items-center gap-2">
              <FileText className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold">Browse Jobs</div>
                <div className="text-xs text-muted-foreground">Find opportunities</div>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Placement Status */}
      {(profile.placedIntern || profile.placedFte) && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">
              🎉 Congratulations on Your Placement!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.placedIntern && (
              <p className="text-sm">✓ Placed for Internship</p>
            )}
            {profile.placedFte && (
              <p className="text-sm">✓ Placed for Full-Time Employment</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function calculateProfileCompletion(profile: any): number {
  let score = 0;
  const maxScore = 100;

  // Basic info (20 points)
  if (profile.phone) score += 5;
  if (profile.cgpa) score += 5;
  if (profile.degree) score += 5;
  if (profile.course) score += 5;

  // Skills (15 points)
  const skills = (profile.skills as any[]) || [];
  if (skills.length > 0) score += 5;
  if (skills.length >= 5) score += 5;
  if (skills.length >= 10) score += 5;

  // Projects (15 points)
  const projects = (profile.projects as any[]) || [];
  if (projects.length > 0) score += 5;
  if (projects.length >= 2) score += 5;
  if (projects.length >= 3) score += 5;

  // Experience (15 points)
  const experience = (profile.experience as any[]) || [];
  if (experience.length > 0) score += 5;
  if (experience.length >= 2) score += 10;

  // Certifications (10 points)
  const certifications = (profile.certifications as any[]) || [];
  if (certifications.length > 0) score += 5;
  if (certifications.length >= 2) score += 5;

  // Resume (10 points)
  const resumes = (profile.resumes as any[]) || [];
  if (resumes.length > 0 || profile.resumeUrl) score += 10;

  // Profile links (10 points)
  if (profile.githubUrl) score += 3;
  if (profile.linkedinUrl) score += 4;
  if (profile.portfolioUrl) score += 3;

  // Bio/About (5 points)
  if (profile.bio || profile.aboutMe) score += 5;

  return Math.min(score, maxScore);
}

function calculateCategoryScore(profile: any, category: string): number {
  switch (category) {
    case 'basic':
      let basicScore = 0;
      if (profile.phone) basicScore += 5;
      if (profile.cgpa) basicScore += 5;
      if (profile.degree) basicScore += 5;
      if (profile.course) basicScore += 5;
      return basicScore;
    
    case 'skills':
      const skills = (profile.skills as any[]) || [];
      let skillScore = 0;
      if (skills.length > 0) skillScore += 5;
      if (skills.length >= 5) skillScore += 5;
      if (skills.length >= 10) skillScore += 5;
      return skillScore;
    
    case 'projects':
      const projects = (profile.projects as any[]) || [];
      let projectScore = 0;
      if (projects.length > 0) projectScore += 5;
      if (projects.length >= 2) projectScore += 5;
      if (projects.length >= 3) projectScore += 5;
      return projectScore;
    
    case 'experience':
      const experience = (profile.experience as any[]) || [];
      let expScore = 0;
      if (experience.length > 0) expScore += 5;
      if (experience.length >= 2) expScore += 10;
      return expScore;
    
    case 'certifications':
      const certifications = (profile.certifications as any[]) || [];
      let certScore = 0;
      if (certifications.length > 0) certScore += 5;
      if (certifications.length >= 2) certScore += 5;
      return certScore;
    
    case 'extras':
      let extraScore = 0;
      const resumes = (profile.resumes as any[]) || [];
      if (resumes.length > 0 || profile.resumeUrl) extraScore += 10;
      if (profile.githubUrl) extraScore += 3;
      if (profile.linkedinUrl) extraScore += 4;
      if (profile.portfolioUrl) extraScore += 3;
      if (profile.bio || profile.aboutMe) extraScore += 5;
      return extraScore;
    
    default:
      return 0;
  }
}
