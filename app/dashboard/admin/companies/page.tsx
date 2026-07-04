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
  Building2,
  BadgeCheck,
  AlertCircle,
  ShieldBan,
} from "lucide-react";

type Company = {
  id: string;
  userId: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  location: string | null;
  about: string | null;
  industry: string | null;
  size: string | null;
  contactEmail: string;
  contactPhone: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  foundedYear: string | null;
  specialties: string[] | null;
  benefits: any;
  culture: string | null;
  techStack: string[] | null;
  officeLocations: any;
  verified: boolean;
  status: string;
  adminNote: string | null;
  analytics: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [banReason, setBanReason] = useState("");

  // Read filter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilter = params.get("filter");
    if (urlFilter && ["all", "pending", "approved", "rejected", "banned"].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [filter]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/companies${filter !== "all" ? `?status=${filter}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      } else {
        toast.error("Failed to load companies");
      }
    } catch (error) {
      toast.error("Error loading companies");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Company approved and verified successfully");
        loadCompanies();
      } else {
        toast.error("Failed to approve company");
      }
    } catch (error) {
      toast.error("Error approving company");
    }
  };

  const handleReject = async (companyId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (res.ok) {
        toast.success("Company rejected");
        setRejectionReason("");
        loadCompanies();
      } else {
        toast.error("Failed to reject company");
      }
    } catch (error) {
      toast.error("Error rejecting company");
    }
  };

  const handleBan = async (companyId: string) => {
    if (!banReason.trim()) {
      toast.error("Please provide a reason for ban");
      return;
    }

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason }),
      });

      if (res.ok) {
        toast.success("Company banned");
        setBanReason("");
        loadCompanies();
      } else {
        toast.error("Failed to ban company");
      }
    } catch (error) {
      toast.error("Error banning company");
    }
  };

  const handleUnban = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/unban`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Company unbanned");
        loadCompanies();
      } else {
        toast.error("Failed to unban company");
      }
    } catch (error) {
      toast.error("Error unbanning company");
    }
  };

  const handleUnreject = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/unreject`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Company moved back to pending for review");
        loadCompanies();
      } else {
        toast.error("Failed to unreject company");
      }
    } catch (error) {
      toast.error("Error unrejecting company");
    }
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (status === "banned") {
      return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Banned</span>;
    }
    if (status === "rejected") {
      return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</span>;
    }
    if (status === "approved" && verified) {
      return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
        <BadgeCheck className="w-3 h-3" />
        Verified
      </span>;
    }
    if (status === "approved") {
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Approved</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
  };

  // Calculate stats
  const stats = {
    total: companies.length,
    pending: companies.filter(c => c.status === "pending").length,
    verified: companies.filter(c => c.verified && c.status === "approved").length,
    rejected: companies.filter(c => c.status === "rejected").length,
    banned: companies.filter(c => c.status === "banned").length,
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          Company Management
        </h1>
        <p className="text-muted-foreground">Manage company profiles and verification</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <BadgeCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned</CardTitle>
            <ShieldBan className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.banned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Companies
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

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {companies.length} compan{companies.length !== 1 ? "ies" : "y"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        {getStatusBadge(company.status, company.verified)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {company.contactEmail}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {company.industry && (
                          <div>
                            <span className="text-muted-foreground">Industry:</span> {company.industry}
                          </div>
                        )}
                        {company.location && (
                          <div>
                            <span className="text-muted-foreground">Location:</span> {company.location}
                          </div>
                        )}
                        {company.size && (
                          <div>
                            <span className="text-muted-foreground">Size:</span> {company.size} employees
                          </div>
                        )}
                        {company.websiteUrl && (
                          <div>
                            <span className="text-muted-foreground">Website:</span>{" "}
                            <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {company.websiteUrl}
                            </a>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Registered:</span>{" "}
                          {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {company.adminNote && (
                        <div className="text-xs bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-2 rounded">
                          <strong>Admin Note:</strong> {company.adminNote}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      {/* View Full Profile Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{company.name}</DialogTitle>
                            <DialogDescription>{company.contactEmail}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium">Status:</span>{" "}
                                <span className={`capitalize ${
                                  company.status === "approved" ? "text-green-600" :
                                  company.status === "pending" ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {company.status}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Verified:</span>{" "}
                                {company.verified ? "✓ Yes" : "✗ No"}
                              </div>
                              <div>
                                <span className="font-medium">Industry:</span> {company.industry || "Not provided"}
                              </div>
                              <div>
                                <span className="font-medium">Size:</span> {company.size || "Not provided"}
                              </div>
                              <div>
                                <span className="font-medium">Location:</span> {company.location || "Not provided"}
                              </div>
                              <div>
                                <span className="font-medium">Founded:</span> {company.foundedYear || "Not provided"}
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium">Website:</span>{" "}
                                {company.websiteUrl ? (
                                  <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {company.websiteUrl}
                                  </a>
                                ) : "Not provided"}
                              </div>
                            </div>

                            {/* About */}
                            {company.about && (
                              <div>
                                <h4 className="font-semibold mb-2">About</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.about}</p>
                              </div>
                            )}

                            {/* Tech Stack */}
                            {company.techStack && company.techStack.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Tech Stack</h4>
                                <div className="flex flex-wrap gap-2">
                                  {company.techStack.map((tech: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Specialties */}
                            {company.specialties && company.specialties.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Specialties</h4>
                                <div className="flex flex-wrap gap-2">
                                  {company.specialties.map((specialty: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contact Info */}
                            <div>
                              <h4 className="font-semibold mb-2">Contact Information</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Email:</span> {company.contactEmail}
                                </div>
                                {company.contactPhone && (
                                  <div>
                                    <span className="text-muted-foreground">Phone:</span> {company.contactPhone}
                                  </div>
                                )}
                                {company.linkedinUrl && (
                                  <div>
                                    <span className="text-muted-foreground">LinkedIn:</span>{" "}
                                    <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      View
                                    </a>
                                  </div>
                                )}
                                {company.twitterUrl && (
                                  <div>
                                    <span className="text-muted-foreground">Twitter:</span>{" "}
                                    <a href={company.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      View
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {company.status === "pending" && (
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
                                <AlertDialogTitle>Approve Company</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to approve and verify this company?
                                  They will gain full access to the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApprove(company.id)}>
                                  Approve & Verify
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
                                <AlertDialogTitle>Reject Company</AlertDialogTitle>
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
                                  onClick={() => handleReject(company.id)}
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {company.status !== "banned" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Ban className="w-4 h-4 mr-2" />
                              Ban
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ban Company</AlertDialogTitle>
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
                              <AlertDialogAction onClick={() => handleBan(company.id)}>
                                Ban
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {company.status === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnreject(company.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Unreject
                        </Button>
                      )}

                      {company.status === "banned" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnban(company.id)}
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Unban
                        </Button>
                      )}
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

