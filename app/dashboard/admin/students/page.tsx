"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Ban,
  Unlock,
  Loader2,
  Filter,
  Eye,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  User,
} from "lucide-react";

type Student = {
  id: string;
  userId: string;
  srn: string | null;
  srnValid: boolean;
  email: string;
  phone: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resumeUrl: string | null;
  resumes: Array<{ label: string; url: string; uploadedAt: string }> | null;
  skills: string[] | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  leetcodeUrl: string | null;
  placedIntern: boolean;
  placedFte: boolean;
  user?: {
    name: string;
  };
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Read filter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilter = params.get("filter");
    if (urlFilter && ["all", "pending", "approved", "rejected", "banned"].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadStudents();
  }, [filter]);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/admin/students?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  const loadStudents = async (loadMore = false) => {
    setLoading(true);
    try {
      const url = `/api/admin/students?status=${filter}${loadMore && cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStudents(loadMore ? [...students, ...data.items] : data.items);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } else {
        toast.error("Failed to load students");
      }
    } catch (error) {
      toast.error("Error loading students");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Student approved successfully (SRN auto-verified)");
        loadStudents();
        loadStats();
      } else {
        toast.error("Failed to approve student");
      }
    } catch (error) {
      toast.error("Error approving student");
    }
  };

  const handleReject = async (studentId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const res = await fetch(`/api/admin/students/${studentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (res.ok) {
        toast.success("Student rejected");
        setRejectionReason("");
        loadStudents();
        loadStats();
      } else {
        toast.error("Failed to reject student");
      }
    } catch (error) {
      toast.error("Error rejecting student");
    }
  };

  const handleBan = async (studentId: string) => {
    if (!banReason.trim()) {
      toast.error("Please provide a reason for ban");
      return;
    }

    try {
      const res = await fetch(`/api/admin/students/${studentId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });

      if (res.ok) {
        toast.success("Student banned");
        setBanReason("");
        loadStudents();
        loadStats();
      } else {
        toast.error("Failed to ban student");
      }
    } catch (error) {
      toast.error("Error banning student");
    }
  };

  const handleUnban = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/unban`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Student unbanned");
        loadStudents();
        loadStats();
      } else {
        toast.error("Failed to unban student");
      }
    } catch (error) {
      toast.error("Error unbanning student");
    }
  };

  const handleUnreject = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/unreject`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Student moved back to pending for review");
        loadStudents();
        loadStats();
      } else {
        toast.error("Failed to unreject student");
      }
    } catch (error) {
      toast.error("Error unrejecting student");
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-8 h-8" />
          Student Management
        </h1>
        <p className="text-muted-foreground">Manage student profiles and approvals</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Loader2 className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned</CardTitle>
              <UserMinus className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{stats.banned}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "approved", "rejected", "banned"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                onClick={() => setFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            {students.length} student{students.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && students.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{student.user?.name || "No Name"}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            student.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : student.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : student.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {student.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {student.email}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {student.srn ? (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">SRN:</span>
                            <span className="font-medium">{student.srn}</span>
                            {student.srnValid ? (
                              <span className="flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-600 text-xs">
                                <XCircle className="w-3 h-3" />
                                Unverified
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-xs">No SRN provided</div>
                        )}
                        
                        {student.phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span> {student.phone}
                          </div>
                        )}
                        
                        <div>
                          <span className="text-muted-foreground">Registered:</span>{" "}
                          {new Date(student.createdAt).toLocaleDateString()}
                        </div>
                        
                        {((student.resumes && student.resumes.length > 0) || student.resumeUrl) && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-xs">
                              {student.resumes && student.resumes.length > 0 
                                ? `${student.resumes.length} resume${student.resumes.length > 1 ? 's' : ''} uploaded`
                                : 'Resume uploaded'}
                            </span>
                          </div>
                        )}
                      </div>

                      {student.adminNote && (
                        <div className="text-xs bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-2 rounded">
                          <strong>Admin Note:</strong> {student.adminNote}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      {/* View Full Profile Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <User className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Student Profile</DialogTitle>
                            <DialogDescription>{student.email}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium">SRN:</span>{" "}
                                {student.srn || "Not provided"}
                                {student.srn && (
                                  <span className={`ml-2 text-xs ${student.srnValid ? "text-green-600" : "text-yellow-600"}`}>
                                    ({student.srnValid ? "✓ Verified" : "⚠ Unverified"})
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="font-medium">Phone:</span> {student.phone || "Not provided"}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>{" "}
                                <span className={`capitalize ${
                                  student.status === "approved" ? "text-green-600" :
                                  student.status === "pending" ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {student.status}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Registered:</span>{" "}
                                {new Date(student.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Skills */}
                            {student.skills && student.skills.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {student.skills.map((skill: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Links */}
                            {(student.githubUrl || student.linkedinUrl || student.portfolioUrl || student.leetcodeUrl) && (
                              <div>
                                <h4 className="font-semibold mb-2">Links</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {student.githubUrl && (
                                    <div>
                                      <span className="text-muted-foreground">GitHub:</span>{" "}
                                      <a href={student.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View
                                      </a>
                                    </div>
                                  )}
                                  {student.linkedinUrl && (
                                    <div>
                                      <span className="text-muted-foreground">LinkedIn:</span>{" "}
                                      <a href={student.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View
                                      </a>
                                    </div>
                                  )}
                                  {student.portfolioUrl && (
                                    <div>
                                      <span className="text-muted-foreground">Portfolio:</span>{" "}
                                      <a href={student.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View
                                      </a>
                                    </div>
                                  )}
                                  {student.leetcodeUrl && (
                                    <div>
                                      <span className="text-muted-foreground">LeetCode:</span>{" "}
                                      <a href={student.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Resume(s) */}
                            {((student.resumes && student.resumes.length > 0) || student.resumeUrl) && (
                              <div>
                                <h4 className="font-semibold mb-2">Resume{student.resumes && student.resumes.length > 1 ? 's' : ''}</h4>
                                <div className="space-y-2">
                                  {student.resumes && student.resumes.length > 0 ? (
                                    student.resumes.map((resume, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{resume.label}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <Button asChild variant="outline" size="sm">
                                          <a href={resume.url} target="_blank" rel="noopener noreferrer">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                          </a>
                                        </Button>
                                      </div>
                                    ))
                                  ) : student.resumeUrl && (
                                    <Button asChild variant="outline" size="sm">
                                      <a href={student.resumeUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Resume
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Placement Status */}
                            {(student.placedIntern || student.placedFte) && (
                              <div>
                                <h4 className="font-semibold mb-2">Placement Status</h4>
                                <div className="space-y-1">
                                  {student.placedIntern && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <CheckCircle className="w-4 h-4" />
                                      Placed for Internship
                                    </div>
                                  )}
                                  {student.placedFte && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <CheckCircle className="w-4 h-4" />
                                      Placed for Full-Time
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {((student.resumes && student.resumes.length > 0) || student.resumeUrl) && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <a
                            href={(student.resumes && student.resumes.length > 0) ? student.resumes[0].url : student.resumeUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Resume{student.resumes && student.resumes.length > 1 ? 's' : ''}
                          </a>
                        </Button>
                      )}

                      {student.status === "pending" && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="default" size="sm">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <p>Are you sure you want to approve this student?</p>
                                  {student.srn && (
                                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                                      <p className="text-sm text-green-800 dark:text-green-200">
                                        ✓ SRN will be automatically verified upon approval
                                      </p>
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApprove(student.id)}>
                                  Approve & Verify SRN
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <div className="space-y-3">
                                    <p>Please provide a reason for rejection:</p>
                                    <Input
                                      placeholder="Reason for rejection"
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setRejectionReason("")}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReject(student.id)}
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {student.status !== "banned" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Ban className="w-4 h-4 mr-2" />
                              Ban
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ban Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                <div className="space-y-3">
                                  <p>Please provide a reason for banning:</p>
                                  <Input
                                    placeholder="Reason for ban"
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                  />
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setBanReason("")}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleBan(student.id)}>
                                Ban
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {student.status === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnreject(student.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Unreject
                        </Button>
                      )}

                      {student.status === "banned" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnban(student.id)}
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Unban
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => loadStudents(true)}
                    variant="outline"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

