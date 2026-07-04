"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Users, Award, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { 
  RadialBarChart, 
  RadialBar, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { PeerComparison } from "@/lib/analytics/peer-comparison";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PeerComparisonPage() {
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<PeerComparison | null>(null);

  useEffect(() => {
    loadComparison();
  }, []);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/peer-comparison");
      if (!res.ok) throw new Error("Failed to load comparison");
      const data = await res.json();
      setComparison(data.comparison);
    } catch (error: any) {
      toast.error(error.message || "Failed to load peer comparison");
    } finally {
      setLoading(false);
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "text-green-600 dark:text-green-400";
    if (percentile >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 75) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    if (percentile >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  };

  const getTrendIcon = (yourValue: number, average: number) => {
    if (yourValue > average) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (yourValue < average) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Unable to load peer comparison data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if there are no peers (only the user exists)
  const noPeers = comparison.cgpa.total === 1 && comparison.cgpa.average === 0;

  // Prepare chart data
  const cgpaData = [
    {
      name: "Your CGPA",
      value: comparison.cgpa.yourCgpa,
      fill: "#0088FE"
    },
    {
      name: "Average CGPA",
      value: comparison.cgpa.average,
      fill: "#00C49F"
    }
  ];

  const applicationsData = [
    { name: "You", applications: comparison.applications.yourCount },
    { name: "Peers Avg", applications: comparison.applications.average }
  ];

  const successRateData = [
    { name: "You", rate: comparison.successRate.yourRate },
    { name: "Peers Avg", rate: comparison.successRate.average }
  ];

  const skillsChartData = comparison.skills.topSkills.slice(0, 8);

  const percentileData = [
    {
      name: "CGPA",
      percentile: comparison.cgpa.percentile,
      fill: "#0088FE"
    },
    {
      name: "Applications",
      percentile: comparison.applications.percentile,
      fill: "#00C49F"
    },
    {
      name: "Success Rate",
      percentile: comparison.successRate.percentile,
      fill: "#FFBB28"
    },
    {
      name: "Profile",
      percentile: comparison.profileCompleteness.percentile,
      fill: "#FF8042"
    }
  ];

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Peer Comparison</h1>
        <p className="text-muted-foreground">
          See how you stack up against other students
        </p>
      </div>

      {/* No Peers Warning */}
      {noPeers && (
        <Card className="mb-6 border-yellow-500 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-800 dark:text-yellow-200">No Peers Available</CardTitle>
            </div>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              You're currently the only approved student in the system. The data shown below represents your individual metrics. 
              Once more students join and get approved, you'll be able to see meaningful peer comparisons!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>CGPA Percentile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className={`text-3xl font-bold truncate ${getPercentileColor(comparison.cgpa.percentile)}`}>
                  {comparison.cgpa.percentile}th
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Rank {comparison.cgpa.rank} of {comparison.cgpa.total}
                </p>
              </div>
              <Award className="w-8 h-8 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Application Activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-bold truncate">{comparison.applications.yourCount}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Avg: {comparison.applications.average}
                </p>
              </div>
              <div className="flex-shrink-0">
                {getTrendIcon(comparison.applications.yourCount, comparison.applications.average)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Success Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-bold truncate">{comparison.successRate.yourRate}%</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Avg: {comparison.successRate.average}%
                </p>
              </div>
              <div className="flex-shrink-0">
                {getTrendIcon(comparison.successRate.yourRate, comparison.successRate.average)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Profile Completeness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-bold truncate">{comparison.profileCompleteness.yourScore}%</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Avg: {comparison.profileCompleteness.average}%
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CGPA Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>CGPA Comparison</CardTitle>
            <CardDescription>Your CGPA vs. peer average</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cgpaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge className={getPercentileBadge(comparison.cgpa.percentile)}>
                {comparison.cgpa.percentile}th Percentile
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Overall Percentile Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>Percentile scores across metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={percentileData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="percentile" radius={[8, 8, 0, 0]}>
                  {percentileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Applications Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Application Activity</CardTitle>
            <CardDescription>Number of job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={applicationsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Success Rate Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
            <CardDescription>Application to selection ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Skills in Market */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Skills Among Peers</CardTitle>
            <CardDescription>Most common skills in the job market</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillsChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="skill" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884D8" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                You have {comparison.skills.yourCount} skills listed (Peer avg: {comparison.skills.average})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

