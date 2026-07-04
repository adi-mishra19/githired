"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, DollarSign, Clock, Building2, CheckCircle, XCircle, Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Helper function to render Tiptap JSON content as HTML
const renderAboutRole = (aboutRole: any) => {
  if (!aboutRole) return null;
  
  try {
    // If it's a Tiptap JSON structure
    if (aboutRole.type === 'doc' && aboutRole.content) {
      return aboutRole.content.map((node: any, index: number) => {
        if (node.type === 'paragraph') {
          const text = node.content?.map((c: any) => c.text).join('') || '';
          return <p key={index} className="mb-2">{text}</p>;
        }
        if (node.type === 'heading') {
          const text = node.content?.map((c: any) => c.text).join('') || '';
          const level = node.attrs?.level || 1;
          const Tag = `h${level}` as keyof JSX.IntrinsicElements;
          return <Tag key={index} className="font-bold mt-3 mb-2">{text}</Tag>;
        }
        if (node.type === 'bulletList') {
          return (
            <ul key={index} className="list-disc list-inside mb-2 space-y-1">
              {node.content?.map((item: any, i: number) => {
                const text = item.content?.[0]?.content?.map((c: any) => c.text).join('') || '';
                return <li key={i}>{text}</li>;
              })}
            </ul>
          );
        }
        if (node.type === 'orderedList') {
          return (
            <ol key={index} className="list-decimal list-inside mb-2 space-y-1">
              {node.content?.map((item: any, i: number) => {
                const text = item.content?.[0]?.content?.map((c: any) => c.text).join('') || '';
                return <li key={i}>{text}</li>;
              })}
            </ol>
          );
        }
        return null;
      });
    }
    // If it's already a string, just display it
    if (typeof aboutRole === 'string') {
      return <p>{aboutRole}</p>;
    }
    return <p className="text-muted-foreground">Content format not recognized</p>;
  } catch (error) {
    console.error('Error rendering aboutRole:', error);
    return <p className="text-muted-foreground">Unable to display content</p>;
  }
};

export default function StudentJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [selectedResume, setSelectedResume] = useState<{ url: string; label: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "eligible" | "internship" | "full-time">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsRes, profileRes] = await Promise.all([
        fetch("/api/student/jobs"),
        fetch("/api/student/profile"),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data);
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setStudentProfile(profile);
      }
    } catch (error) {
      toast.error("Error loading jobs");
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = (job: any) => {
    if (!studentProfile) return { eligible: false, reason: "Profile not loaded" };

    // Check CGPA
    if (job.cgpaCutoff && studentProfile.cgpa) {
      const studentCgpa = parseFloat(studentProfile.cgpa);
      const cutoff = parseFloat(job.cgpaCutoff);
      if (!isNaN(studentCgpa) && !isNaN(cutoff) && studentCgpa < cutoff) {
        return { eligible: false, reason: `CGPA below ${cutoff}` };
      }
    }

    // Check course
    if (job.eligibleCourses && job.eligibleCourses.length > 0 && studentProfile.course) {
      if (!job.eligibleCourses.includes(studentProfile.course)) {
        return { eligible: false, reason: `Course ${studentProfile.course} not eligible` };
      }
    }

    // Check degree
    if (job.eligibleDegrees && job.eligibleDegrees.length > 0 && studentProfile.degree) {
      if (!job.eligibleDegrees.includes(studentProfile.degree)) {
        return { eligible: false, reason: `Degree ${studentProfile.degree} not eligible` };
      }
    }

    return { eligible: true, reason: null };
  };

  const handleApply = async () => {
    if (!selectedJob) return;

    // Default to first resume if none selected
    const resumeToUse = selectedResume || 
      (studentProfile.resumes?.length > 0 
        ? { url: studentProfile.resumes[0].url, label: studentProfile.resumes[0].label }
        : { url: studentProfile.resumeUrl, label: "Default Resume" });

    if (!resumeToUse?.url) {
      toast.error("Please upload a resume before applying");
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`/api/student/jobs/${selectedJob.job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverLetter: coverLetter.trim() || undefined,
          resumeUrl: resumeToUse.url,
          resumeLabel: resumeToUse.label,
        }),
      });

      if (res.ok) {
        toast.success("Application submitted successfully!");
        setSelectedJob(null);
        setCoverLetter("");
        setSelectedResume(null);
        loadData(); // Reload to update applied status
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to apply");
      }
    } catch (error) {
      toast.error("Error submitting application");
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter((jobData) => {
    if (filter === "eligible") {
      return checkEligibility(jobData.job).eligible;
    }
    if (filter === "internship") {
      return jobData.job.type === "internship";
    }
    if (filter === "full-time") {
      return jobData.job.type === "full-time";
    }
    return true;
  });

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!studentProfile || studentProfile.status !== "approved") {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-400">Profile Not Approved</CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-500">
              Your profile must be approved before you can view and apply for jobs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Opportunities</h1>
        <p className="text-muted-foreground">Browse and apply for available positions</p>
      </div>

      {/* Profile Completion Warning */}
      {(!studentProfile.cgpa || !studentProfile.degree || !studentProfile.course) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-400 text-lg">
              Complete Your Profile
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-500">
              Add your CGPA, degree, and course to see which jobs you're eligible for.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
        >
          All Jobs ({jobs.length})
        </Button>
        <Button
          variant={filter === "eligible" ? "default" : "outline"}
          onClick={() => setFilter("eligible")}
          size="sm"
        >
          Eligible for Me ({jobs.filter((j) => checkEligibility(j.job).eligible).length})
        </Button>
        <Button
          variant={filter === "internship" ? "default" : "outline"}
          onClick={() => setFilter("internship")}
          size="sm"
        >
          Internships
        </Button>
        <Button
          variant={filter === "full-time" ? "default" : "outline"}
          onClick={() => setFilter("full-time")}
          size="sm"
        >
          Full-Time
        </Button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
      <Card>
          <CardHeader className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Jobs Found</CardTitle>
            <CardDescription>
              {filter !== "all"
                ? "Try adjusting your filters"
                : "No job postings available at the moment. Check back later!"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((jobData) => {
            const job = jobData.job;
            const company = jobData.company;
            const eligibility = checkEligibility(job);

            return (
              <Card
                key={job.id}
                className={`hover:shadow-md transition-shadow ${
                  eligibility.eligible ? "border-l-4 border-l-green-500" : ""
                }`}
              >
        <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        {eligibility.eligible ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Eligible
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <XCircle className="w-3 h-3" />
                            Not Eligible
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {job.type === "internship" ? "Internship" : "Full-Time"}
                        </span>
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
                          <span className="flex items-center gap-1">
                            ₹ {job.salary}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
          </div>
        </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    
                    {/* About Role - Show preview or full content */}
                    {job.aboutRole && (
                      <div className="mt-2 p-3 border rounded-lg bg-muted/20">
                        <p className="text-xs font-semibold mb-2 text-muted-foreground">About the Role:</p>
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          {renderAboutRole(job.aboutRole)}
                        </div>
                      </div>
                    )}
                    
                    {/* Job Description PDF Link */}
                    {job.jdUrl && (
                      <a
                        href={job.jdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        View Full Job Description (PDF)
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {!eligibility.eligible && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Not eligible:</strong> {eligibility.reason}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {job.cgpaCutoff && (
                      <div>
                        <span className="text-muted-foreground">Min CGPA:</span>{" "}
                        <span className="font-semibold">{job.cgpaCutoff}</span>
                      </div>
                    )}
                    {job.eligibleCourses && job.eligibleCourses.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Courses:</span>{" "}
                        <span className="font-semibold">{job.eligibleCourses.join(", ")}</span>
                      </div>
                    )}
                    {job.eligibleDegrees && job.eligibleDegrees.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Degrees:</span>{" "}
                        <span className="font-semibold">{job.eligibleDegrees.join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.skills.slice(0, 5).map((skill: string) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="px-2 py-1 text-xs text-muted-foreground">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <Button
                      onClick={() => setSelectedJob(jobData)}
                      disabled={!eligibility.eligible}
                      className="w-full sm:w-auto"
                    >
                      {eligibility.eligible ? "Apply Now" : "Not Eligible"}
                    </Button>
                  </div>
        </CardContent>
      </Card>
            );
          })}
        </div>
      )}

      {/* Application Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.job.title}</DialogTitle>
            <DialogDescription>
              at {selectedJob?.company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Job Details Section */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h3 className="font-semibold text-sm">Job Details</h3>
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">{selectedJob?.job.description}</p>
                
                {/* About Role Rich Text Content */}
                {selectedJob?.job.aboutRole && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-medium mb-2">About the Role:</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderAboutRole(selectedJob.job.aboutRole)}
                    </div>
                  </div>
                )}
                
                {/* Job Description PDF Link */}
                {selectedJob?.job.jdUrl && (
                  <a
                    href={selectedJob.job.jdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline mt-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Full Job Description (PDF)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="resumeSelect">Select Resume *</Label>
              <select
                id="resumeSelect"
                value={selectedResume?.url || ""}
                onChange={(e) => {
                  const resume = studentProfile?.resumes?.find((r: any) => r.url === e.target.value);
                  if (resume) {
                    setSelectedResume({ url: resume.url, label: resume.label });
                  } else if (studentProfile?.resumeUrl) {
                    setSelectedResume({ url: studentProfile.resumeUrl, label: "Default Resume" });
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a resume</option>
                {studentProfile?.resumes && studentProfile.resumes.length > 0 ? (
                  studentProfile.resumes.map((resume: any, index: number) => (
                    <option key={index} value={resume.url}>
                      {resume.label || `Resume ${index + 1}`}
                    </option>
                  ))
                ) : studentProfile?.resumeUrl ? (
                  <option value={studentProfile.resumeUrl}>Default Resume</option>
                ) : null}
              </select>
              {(!studentProfile?.resumes || studentProfile.resumes.length === 0) && !studentProfile?.resumeUrl && (
                <p className="text-xs text-red-600 mt-1">Please upload a resume in your profile first</p>
              )}
            </div>

            <div>
              <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
              <textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the company why you're a great fit for this role..."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="bg-muted p-3 rounded">
              <p className="text-sm text-muted-foreground">
                Your profile information and selected resume will be shared with the company.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
