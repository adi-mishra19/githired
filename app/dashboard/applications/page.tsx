"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, MapPin, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplicationStatusBadge } from "@/lib/helpers";

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await fetch("/api/student/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      } else {
        toast.error("Failed to load applications");
      }
    } catch (error) {
      toast.error("Error loading applications");
    } finally {
      setLoading(false);
    }
  };


  const getJobTypeBadge = (type: string) => {
    if (type === "internship") {
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Internship</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Full-Time</span>;
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground">
          Track the status of your job applications
        </p>
      </div>

      {/* Summary Cards */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {applications.filter((a) => a.application.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">OA/Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {applications.filter((a) => a.application.status === "oa" || a.application.status === "interview").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {applications.filter((a) => a.application.status === "selected").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {applications.filter((a) => a.application.status === "rejected").length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Applications Yet</CardTitle>
            <CardDescription>
              You haven't applied to any jobs yet. Browse available positions and apply!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((appData) => {
            const application = appData.application;
            const job = appData.job;
            const company = appData.company;

            return (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded-full ${getApplicationStatusBadge(application.status).color}`}>
                          {getApplicationStatusBadge(application.status).label}
                        </span>
                        {getJobTypeBadge(job.type)}
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
                        {job.salary && (
                          <span className="font-semibold">₹{job.salary}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Applied on:</span>{" "}
                      <span className="font-medium">
                        {new Date(application.appliedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Your CGPA:</span>{" "}
                      <span className="font-medium">{application.studentCgpa || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Course:</span>{" "}
                      <span className="font-medium">
                        {application.studentDegree} - {application.studentCourse}
                      </span>
                    </div>
                    {job.status !== "active" && (
                      <div>
                        <span className="text-orange-600 text-xs">
                          ⚠️ This job is no longer accepting new applications
                        </span>
                      </div>
                    )}
                  </div>

                  {application.coverLetter && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold mb-1">Your Cover Letter:</p>
                      <p className="text-sm text-muted-foreground">{application.coverLetter}</p>
                    </div>
                  )}

                  {application.resumeUrl && (
                    <div className="pt-2">
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Resume Submitted
                      </a>
                    </div>
                  )}

                  {/* Status-specific messages */}
                  {application.status === "oa" && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        📝 Online assessment sent! Check your email for the assessment link.
                      </p>
                    </div>
                  )}

                  {application.status === "interview" && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded p-3">
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        🎤 Interview scheduled! The company will contact you with details.
                      </p>
                    </div>
                  )}

                  {application.status === "selected" && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        🎉 Congratulations! You've been selected for this role!
                      </p>
                    </div>
                  )}

                  {application.status === "rejected" && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Unfortunately, your application was not successful this time. 
                        Keep applying to other opportunities!
                      </p>
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

