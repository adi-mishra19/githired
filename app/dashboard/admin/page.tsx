"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Building2,
  UserCheck,
  BadgeCheck,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";

type AdminStats = {
  students: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    banned: number;
  };
  companies: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    banned: number;
  };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load student stats
      const studentRes = await fetch("/api/admin/students?action=stats");
      const studentStats = studentRes.ok ? await studentRes.json() : null;

      // Load company stats
      const companyRes = await fetch("/api/admin/companies");
      const companies = companyRes.ok ? await companyRes.json() : [];
      
      const companyStats = {
        total: companies.length,
        pending: companies.filter((c: any) => c.status === "pending").length,
        verified: companies.filter((c: any) => c.verified && c.status === "approved").length,
        rejected: companies.filter((c: any) => c.status === "rejected").length,
        banned: companies.filter((c: any) => c.status === "banned").length,
      };

      setStats({
        students: studentStats || { total: 0, pending: 0, approved: 0, rejected: 0, banned: 0 },
        companies: companyStats,
      });
    } catch (error) {
      console.error("Failed to load stats", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of platform statistics and management
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.students.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered students
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.companies.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered companies
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {(stats?.students.pending || 0) + (stats?.companies.pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.students.pending || 0} students, {stats?.companies.pending || 0} companies
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(stats?.students.approved || 0) + (stats?.companies.verified || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved & verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Student Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Management
              </CardTitle>
              <CardDescription>Manage student profiles and approvals</CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/admin/students">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.students.total || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600">{stats?.students.pending || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{stats?.students.approved || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Approved</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">
                {(stats?.students.rejected || 0) + (stats?.students.banned || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rejected/Banned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Management
              </CardTitle>
              <CardDescription>Manage company profiles and verification</CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/admin/companies">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats?.companies.total || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600">{stats?.companies.pending || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Pending</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{stats?.companies.verified || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Verified</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">
                {(stats?.companies.rejected || 0) + (stats?.companies.banned || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rejected/Banned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link href="/dashboard/admin/students?filter=pending">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span className="font-semibold">Review Pending Students</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stats?.students.pending || 0} student{stats?.students.pending !== 1 ? 's' : ''} awaiting approval
                  </span>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 justify-start">
              <Link href="/dashboard/admin/companies?filter=pending">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" />
                    <span className="font-semibold">Review Pending Companies</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stats?.companies.pending || 0} compan{stats?.companies.pending !== 1 ? 'ies' : 'y'} awaiting verification
                  </span>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

