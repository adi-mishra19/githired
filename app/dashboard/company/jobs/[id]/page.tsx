"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Edit, Eye, Users, Mail, Phone, FileText, Award, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplicationStatusBadge, APPLICATION_STATUSES } from "@/lib/helpers";
import { ScheduleInterviewModal } from "@/components/schedule-interview-modal";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
      loadApplications();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const res = await fetch(`/api/company/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      } else {
        toast.error("Failed to load job details");
      }
    } catch (error) {
      toast.error("Error loading job");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/toggle-status`, {
        method: "POST",
      });

      if (res.ok) {
        const updatedJob = await res.json();
        setJob(updatedJob);
        toast.success(`Job ${updatedJob.status === "active" ? "activated" : "stopped"} successfully`);
      } else {
        toast.error("Failed to toggle job status");
      }
    } catch (error) {
      toast.error("Error toggling status");
    } finally {
      setToggling(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/company/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("Application status updated");
        loadApplications(); // Reload applications
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Error updating status");
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
            <CardDescription>The requested job posting could not be found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const avgCgpa = applications.length > 0
    ? (applications.reduce((sum, app) => sum + (parseFloat(app.application.studentCgpa || "0")), 0) / applications.length).toFixed(2)
    : "N/A";

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/company/jobs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="text-muted-foreground mt-1">
              {job.type} • {job.location}
              {job.salary && ` • ₹${job.salary}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/company/jobs/${jobId}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            onClick={handleToggleStatus}
            disabled={toggling}
            variant={job.status === "active" ? "destructive" : "default"}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {job.status === "active" ? "Stop Applications" : "Activate Job"}
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(job.analytics as any)?.views || 0}</div>
            <p className="text-xs text-muted-foreground">Job impressions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">Candidates applied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CGPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCgpa}</div>
            <p className="text-xs text-muted-foreground">Of applicants</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{job.description}</p>
          </div>

          {job.aboutRole && (
            <div>
              <h3 className="font-semibold mb-2">About the Role</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: convertTiptapToHtml(job.aboutRole),
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.cgpaCutoff && (
              <div>
                <h3 className="font-semibold mb-2">Minimum CGPA</h3>
                <p className="text-muted-foreground">{job.cgpaCutoff}</p>
              </div>
            )}

            {job.eligibleCourses && job.eligibleCourses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Eligible Courses</h3>
                <div className="flex flex-wrap gap-2">
                  {job.eligibleCourses.map((course: string) => (
                    <span
                      key={course}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.eligibleDegrees && job.eligibleDegrees.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Eligible Degrees</h3>
                <div className="flex flex-wrap gap-2">
                  {job.eligibleDegrees.map((degree: string) => (
                    <span
                      key={degree}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                    >
                      {degree}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.benefits && job.benefits.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Benefits</h3>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map((benefit: string) => (
                  <span
                    key={benefit}
                    className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.jdUrl && (
            <div>
              <h3 className="font-semibold mb-2">Job Description (PDF)</h3>
              <a
                href={job.jdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View JD Document
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Applications ({applications.length})</CardTitle>
          <CardDescription>
            Ranked by CGPA and skills match
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app, index) => (
                <div
                  key={app.application.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">#{index + 1}</span>
                        <div>
                          <p className="font-semibold">{app.student.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Applied on {new Date(app.application.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-muted-foreground" />
                          <span>CGPA: {app.application.studentCgpa || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {app.application.studentDegree || "N/A"} - {app.application.studentCourse || "N/A"}
                          </span>
                        </div>
                        {app.student.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{app.student.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Skills Match:</span>
                          <span className="font-semibold">{Math.round(app.ranking.skillsMatch)}%</span>
                        </div>
                      </div>

                      {app.application.coverLetter && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-semibold mb-1">Cover Letter:</p>
                          <p className="text-sm text-muted-foreground">{app.application.coverLetter}</p>
                        </div>
                      )}

                      <div className="flex gap-4 pt-2">
                        {app.application.resumeUrl && (
                          <a
                            href={app.application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            {app.application.resumeLabel || "View Resume"}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 space-y-2">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <select
                        value={app.application.status}
                        onChange={(e) => handleStatusChange(app.application.id, e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <ScheduleInterviewModal
                        applicationId={app.application.id}
                        studentName={app.student.email}
                        onScheduled={loadApplications}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function convertTiptapToHtml(content: any): string {
  if (!content || !content.content) return "";
  
  let html = "";
  content.content.forEach((node: any) => {
    if (node.type === "paragraph") {
      html += "<p>";
      if (node.content) {
        node.content.forEach((textNode: any) => {
          let text = textNode.text || "";
          if (textNode.marks) {
            textNode.marks.forEach((mark: any) => {
              if (mark.type === "bold") text = `<strong>${text}</strong>`;
              if (mark.type === "italic") text = `<em>${text}</em>`;
            });
          }
          html += text;
        });
      }
      html += "</p>";
    } else if (node.type === "heading") {
      const level = node.attrs?.level || 2;
      html += `<h${level}>`;
      if (node.content) {
        node.content.forEach((textNode: any) => {
          html += textNode.text || "";
        });
      }
      html += `</h${level}>`;
    } else if (node.type === "bulletList") {
      html += "<ul>";
      if (node.content) {
        node.content.forEach((item: any) => {
          html += "<li>";
          if (item.content) {
            item.content.forEach((p: any) => {
              if (p.content) {
                p.content.forEach((textNode: any) => {
                  html += textNode.text || "";
                });
              }
            });
          }
          html += "</li>";
        });
      }
      html += "</ul>";
    } else if (node.type === "orderedList") {
      html += "<ol>";
      if (node.content) {
        node.content.forEach((item: any) => {
          html += "<li>";
          if (item.content) {
            item.content.forEach((p: any) => {
              if (p.content) {
                p.content.forEach((textNode: any) => {
                  html += textNode.text || "";
                });
              }
            });
          }
          html += "</li>";
        });
      }
      html += "</ol>";
    }
  });
  
  return html;
}

