"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Plus, Eye, Users, MapPin, Clock, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadJobs();
    loadProfile();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await fetch("/api/company/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      } else {
        toast.error("Failed to load jobs");
      }
    } catch (error) {
      toast.error("Error loading jobs");
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/company/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Stopped</span>;
  };

  const getTypeBadge = (type: string) => {
    if (type === "internship") {
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Internship</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Full-Time</span>;
  };

  const totalApplications = jobs.reduce((sum, job) => sum + ((job.analytics as any)?.applications || 0), 0);
  const totalViews = jobs.reduce((sum, job) => sum + ((job.analytics as any)?.views || 0), 0);
  const activeJobs = jobs.filter(j => j.status === "active").length;

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8" />
            Job Postings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company's job postings
          </p>
        </div>
        {profile?.verified && profile?.status === "approved" ? (
          <Link href="/dashboard/company/jobs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Post a Job
            </Button>
          </Link>
        ) : (
          <Button disabled className="opacity-50 cursor-not-allowed">
            <Plus className="w-4 h-4 mr-2" />
            Post a Job
          </Button>
        )}
      </div>

      {/* Company Not Verified Warning */}
      {(!profile?.verified || profile?.status !== "approved") && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-400 text-lg">
              Company Not Verified
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-500">
              Your company must be verified and approved before you can post jobs. 
              Please wait for admin approval or contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Analytics Cards */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeJobs} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">
                Across all jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews}</div>
              <p className="text-xs text-muted-foreground">
                Job impressions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Applications</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobs.length > 0 ? Math.round(totalApplications / jobs.length) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Per job posting
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">No Jobs Posted Yet</CardTitle>
            <CardDescription className="text-base">
              Start posting jobs to attract talented candidates
            </CardDescription>
          </CardHeader>
          {profile?.verified && profile?.status === "approved" && (
            <CardContent className="text-center">
              <Link href="/dashboard/company/jobs/new">
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </Link>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      {getStatusBadge(job.status)}
                      {getTypeBadge(job.type)}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Link href={`/dashboard/company/jobs/${job.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {job.description}
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>{(job.analytics as any)?.views || 0} views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{(job.analytics as any)?.applications || 0} applications</span>
                  </div>
                  {job.cgpaCutoff && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Min CGPA: {job.cgpaCutoff}</span>
                    </div>
                  )}
                  {job.eligibleCourses && job.eligibleCourses.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Courses: {job.eligibleCourses.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
