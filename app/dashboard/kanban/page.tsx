"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, MapPin, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplicationStatusBadge } from "@/lib/helpers";

interface ApplicationColumn {
  status: string;
  title: string;
  applications: any[];
}

export default function KanbanPage() {
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

  const columns: ApplicationColumn[] = [
    {
      status: "pending",
      title: "Pending",
      applications: applications.filter((app) => app.application.status === "pending"),
    },
    {
      status: "oa",
      title: "OA Sent",
      applications: applications.filter((app) => app.application.status === "oa"),
    },
    {
      status: "interview",
      title: "Interview",
      applications: applications.filter((app) => app.application.status === "interview"),
    },
    {
      status: "selected",
      title: "Selected",
      applications: applications.filter((app) => app.application.status === "selected"),
    },
    {
      status: "rejected",
      title: "Rejected",
      applications: applications.filter((app) => app.application.status === "rejected"),
    },
  ];

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Application Tracker</h1>
        <p className="text-muted-foreground">
          Track the status of your job applications
        </p>
      </div>

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
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {columns.map((column) => {
              const badge = getApplicationStatusBadge(column.status);
              return (
                <Card key={column.status}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {column.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{column.applications.length}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {columns.map((column) => {
              const badge = getApplicationStatusBadge(column.status);
              return (
                <div key={column.status} className="space-y-3">
                  <div className={`font-semibold text-sm px-3 py-2 rounded ${badge.color}`}>
                    {column.title} ({column.applications.length})
                  </div>

                  <div className="space-y-3 min-h-[400px]">
                    {column.applications.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No applications
                      </div>
                    ) : (
                      column.applications.map((appData) => {
                        const application = appData.application;
                        const job = appData.job;
                        const company = appData.company;

                        return (
                          <Card
                            key={application.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="p-4">
                              <div className="space-y-2">
                                <CardTitle className="text-sm leading-tight">
                                  {job.title}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="w-3 h-3" />
                                  <span>{company.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{job.location}</span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="space-y-2 text-xs">
                                <div className="text-muted-foreground">
                                  Applied: {new Date(application.appliedAt).toLocaleDateString()}
                                </div>
                                {application.resumeLabel && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                    <span>{application.resumeLabel}</span>
                                  </div>
                                )}
                                {job.salary && (
                                  <div className="font-semibold">₹{job.salary}</div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

