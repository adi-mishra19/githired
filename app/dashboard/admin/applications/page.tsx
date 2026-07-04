"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Building2, Award, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await fetch("/api/admin/applications");
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        label: "Pending",
      },
      reviewed: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        label: "Reviewed",
      },
      shortlisted: {
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
        label: "Shortlisted",
      },
      rejected: {
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        label: "Rejected",
      },
      selected: {
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        label: "Selected",
      },
      oa: {
        color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
        label: "Online Assessment",
      },
      interview: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        label: "Interview",
      },
    };

    const badge = badges[status] || {
      color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };

    return <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>;
  };

  const filteredApplications = applications.filter((appData) => {
    const searchLower = search.toLowerCase();
    return (
      appData.student.email.toLowerCase().includes(searchLower) ||
      appData.job.title.toLowerCase().includes(searchLower) ||
      appData.company.name.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.application.status === "pending").length,
    reviewed: applications.filter((a) => a.application.status === "reviewed").length,
    shortlisted: applications.filter((a) => a.application.status === "shortlisted").length,
    interview: applications.filter((a) => a.application.status === "interview").length,
    selected: applications.filter((a) => a.application.status === "selected").length,
    rejected: applications.filter((a) => a.application.status === "rejected").length,
  };

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
        <h1 className="text-3xl font-bold">All Applications</h1>
        <p className="text-muted-foreground">Overview of all job applications across the platform</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.reviewed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shortlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.shortlisted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.interview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.selected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by student email, job title, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Applications Found</CardTitle>
            <CardDescription>
              {search ? "Try a different search term" : "No applications have been submitted yet"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApplications.map((appData) => {
            const application = appData.application;
            const job = appData.job;
            const student = appData.student;
            const company = appData.company;

            return (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{student.email}</CardTitle>
                        {getStatusBadge(application.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{job.title}</span>
                          <span className="text-muted-foreground">at</span>
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{company.name}</span>
                        </div>

                        <CardDescription className="text-sm">
                          Applied on {new Date(application.appliedAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>CGPA: {application.studentCgpa || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {application.studentDegree || "N/A"} - {application.studentCourse || "N/A"}
                      </span>
                    </div>
                    {student.phone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span> {student.phone}
                      </div>
                    )}
                    {student.srn && (
                      <div>
                        <span className="text-muted-foreground">SRN:</span> {student.srn}
                      </div>
                    )}
                  </div>

                  {application.coverLetter && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold mb-1">Cover Letter:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {application.coverLetter}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground">Job Type:</span>{" "}
                      <span className="font-medium">{job.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      <span className="font-medium">{job.location}</span>
                    </div>
                    {job.salary && (
                      <div>
                        <span className="text-muted-foreground">Salary:</span>{" "}
                        <span className="font-medium">{job.salary}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

