"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Video, Users, Briefcase, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function CalendarPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      const res = await fetch("/api/student/interviews");
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      } else {
        toast.error("Failed to load interviews");
      }
    } catch (error) {
      toast.error("Error loading interviews");
    } finally {
      setLoading(false);
    }
  };

  const filterInterviews = () => {
    const now = new Date();
    
    switch (filter) {
      case "upcoming":
        return interviews.filter(
          (item) => new Date(item.interview.scheduledAt) >= now
        );
      case "past":
        return interviews.filter(
          (item) => new Date(item.interview.scheduledAt) < now
        );
      default:
        return interviews;
    }
  };

  const getRoundBadge = (round: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      oa: { label: "Online Assessment", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      round_1: { label: "Round 1", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      round_2: { label: "Round 2", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
      round_3: { label: "Round 3", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
      hr: { label: "HR Round", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    };
    const badge = badges[round] || { label: round, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      rescheduled: { label: "Rescheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    };
    const badge = badges[status] || { label: status, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
    return <Badge variant="outline" className={badge.color}>{badge.label}</Badge>;
  };

  const getResultBadge = (result: string | null) => {
    if (!result || result === "pending") return null;
    const badges: Record<string, { label: string; color: string }> = {
      passed: { label: "✓ Passed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-semibold" },
      failed: { label: "✗ Not Selected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-semibold" },
    };
    const badge = badges[result];
    return badge ? <Badge className={badge.color}>{badge.label}</Badge> : null;
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date();
  };

  const filteredInterviews = filterInterviews();
  const upcomingCount = interviews.filter((item) => isUpcoming(item.interview.scheduledAt)).length;

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          Interview Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your scheduled interviews and their outcomes
        </p>
      </div>

      {/* Stats */}
      {interviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interviews.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingCount}</div>
              <p className="text-xs text-muted-foreground">Scheduled ahead</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {interviews.filter((item) => item.interview.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Interviews done</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Interviews
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          onClick={() => setFilter("upcoming")}
        >
          Upcoming ({upcomingCount})
        </Button>
        <Button
          variant={filter === "past" ? "default" : "outline"}
          onClick={() => setFilter("past")}
        >
          Past ({interviews.length - upcomingCount})
        </Button>
      </div>

      {/* Interviews List */}
      {filteredInterviews.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {filter === "upcoming" ? "No Upcoming Interviews" : filter === "past" ? "No Past Interviews" : "No Interviews Scheduled"}
            </CardTitle>
            <CardDescription className="text-base">
              {filter === "upcoming"
                ? "Your scheduled interviews will appear here"
                : filter === "past"
                ? "Your past interviews will appear here"
                : "Apply to jobs to get interview opportunities"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((item) => {
            const { date, time } = formatDateTime(item.interview.scheduledAt);
            const upcoming = isUpcoming(item.interview.scheduledAt);
            
            return (
              <Card
                key={item.interview.id}
                className={`hover:shadow-md transition-shadow ${
                  upcoming && item.interview.status === "scheduled"
                    ? "border-l-4 border-l-primary"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Company & Job */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold">{item.company.name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{item.job.title}</span>
                      </div>

                      {/* Round & Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoundBadge(item.interview.round)}
                        {getStatusBadge(item.interview.status)}
                        {getResultBadge(item.interview.result)}
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          {date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          {time}
                          {item.interview.duration && ` (${item.interview.duration})`}
                        </span>
                      </div>

                      {/* Location */}
                      {item.interview.location && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>{item.interview.location}</span>
                        </div>
                      )}

                      {/* Meeting Link */}
                      {item.interview.meetingLink && (
                        <div className="flex items-center gap-1 text-sm">
                          <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <a
                            href={item.interview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Join Meeting <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {/* Interviewers */}
                      {item.interview.interviewers && item.interview.interviewers.length > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span>Interviewers: {item.interview.interviewers.join(", ")}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.interview.notes && (
                        <div className="text-sm p-3 bg-muted/50 rounded-md">
                          <p className="font-medium mb-1">Notes:</p>
                          <p className="text-muted-foreground">{item.interview.notes}</p>
                        </div>
                      )}

                      {/* Feedback (only if completed) */}
                      {item.interview.feedback && item.interview.status === "completed" && (
                        <div className="text-sm p-3 bg-muted/50 rounded-md border-l-2 border-primary">
                          <p className="font-medium mb-1">Feedback:</p>
                          <p className="text-muted-foreground">{item.interview.feedback}</p>
                        </div>
                      )}
                    </div>

                    {/* View Application Button */}
                    <Link href={`/dashboard/applications`}>
                      <Button variant="outline" size="sm">
                        View Application
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

