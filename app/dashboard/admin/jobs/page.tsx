"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, MapPin, Eye, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await fetch("/api/admin/jobs");
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

  const filteredJobs = jobs.filter((jobData) => {
    const searchLower = search.toLowerCase();
    return (
      jobData.job.title.toLowerCase().includes(searchLower) ||
      jobData.company.name.toLowerCase().includes(searchLower) ||
      jobData.job.location.toLowerCase().includes(searchLower)
    );
  });

  const totalApplications = jobs.reduce((sum, j) => sum + ((j.job.analytics as any)?.applications || 0), 0);
  const totalViews = jobs.reduce((sum, j) => sum + ((j.job.analytics as any)?.views || 0), 0);
  const activeJobs = jobs.filter((j) => j.job.status === "active").length;

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
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Job Postings</h1>
        <p className="text-muted-foreground">Overview of all jobs posted by companies</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <p className="text-xs text-muted-foreground">{activeJobs} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">Across all jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-muted-foreground">Job impressions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.length > 0 ? Math.round(totalApplications / jobs.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per job</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by job title, company, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Jobs Found</CardTitle>
            <CardDescription>
              {search ? "Try a different search term" : "No jobs have been posted yet"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((jobData) => {
            const job = jobData.job;
            const company = jobData.company;

            return (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        {getStatusBadge(job.status)}
                        {getTypeBadge(job.type)}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{company.name}</span>
                        {company.verified && (
                          <span className="text-xs text-green-600">✓ Verified</span>
                        )}
                      </div>

                      <CardDescription className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        {job.salary && <span>{job.salary}</span>}
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>

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
                      <div>
                        <span className="text-muted-foreground">Min CGPA: {job.cgpaCutoff}</span>
                      </div>
                    )}
                  </div>

                  {(job.eligibleCourses?.length > 0 || job.eligibleDegrees?.length > 0) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {job.eligibleCourses?.map((course: string) => (
                        <span
                          key={course}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                        >
                          {course}
                        </span>
                      ))}
                      {job.eligibleDegrees?.map((degree: string) => (
                        <span
                          key={degree}
                          className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded text-xs"
                        >
                          {degree}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

