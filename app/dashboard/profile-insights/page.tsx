"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileGapCard } from "@/components/profile-gap-card";
import { ATSScoreDisplay } from "@/components/ats-score-display";
import { ResumeSelector } from "@/components/resume-selector";
import { Sparkles, FileSearch, History, RefreshCw, CheckCircle, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { ProfileGap } from "@/lib/ai/profile-analyzer";
import { ATSAnalysis } from "@/lib/ai/ats-analyzer";

interface Resume {
  label: string;
  url: string;
  uploadedAt: string;
}

export default function ProfileInsightsPage() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProfileGap[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<{ score: number; analysis: ATSAnalysis } | null>(null);
  const [atsHistory, setAtsHistory] = useState<any[]>([]);

  useEffect(() => {
    // Don't auto-load suggestions to save API calls
    // loadSuggestions(); 
    loadResumes();
    loadATSHistory();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/profile-suggestions");
      if (!res.ok) throw new Error("Failed to load suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const loadResumes = async () => {
    try {
      const res = await fetch("/api/student/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const profile = await res.json();
      
      // The API returns the profile directly
      const resumeList = Array.isArray(profile.resumes) ? profile.resumes : [];
      
      console.log("Loaded profile:", profile);
      console.log("Loaded resumes:", resumeList);
      
      setResumes(resumeList);
      if (resumeList.length > 0) {
        setSelectedResume(resumeList[0]);
      }
    } catch (error: any) {
      console.error("Failed to load resumes:", error);
      toast.error("Failed to load resumes");
    }
  };

  const loadATSHistory = async () => {
    try {
      const res = await fetch("/api/student/ats-scan");
      if (!res.ok) return;
      const data = await res.json();
      setAtsHistory(data.history || []);
    } catch (error) {
      console.error("Failed to load ATS history:", error);
    }
  };

  const refreshSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/profile-suggestions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      toast.success("Suggestions refreshed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh suggestions");
    } finally {
      setLoading(false);
    }
  };

  const analyzeResume = async () => {
    if (!selectedResume) {
      toast.error("Please select a resume");
      return;
    }

    setAtsLoading(true);
    setAtsResult(null);

    try {
      const res = await fetch("/api/student/ats-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeUrl: selectedResume.url,
          resumeLabel: selectedResume.label,
          jobDescription: jobDescription.trim() || undefined
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to analyze resume");
      }

      const data = await res.json();
      setAtsResult({
        score: parseInt(data.scan.score),
        analysis: data.scan.analysis
      });
      
      loadATSHistory(); // Refresh history
      toast.success("Resume analyzed successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setAtsLoading(false);
    }
  };

  const viewHistoricalScan = (scan: any) => {
    setAtsResult({
      score: parseInt(scan.score),
      analysis: scan.analysis
    });
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Profile Insights</h1>
        <p className="text-muted-foreground">
          AI-powered suggestions and resume analysis to boost your job prospects
        </p>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="ats">
            <FileSearch className="w-4 h-4 mr-2" />
            Resume ATS Score
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Scan History
          </TabsTrigger>
        </TabsList>

        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 && !loading ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile Gap Analysis</CardTitle>
                <CardDescription>
                  Get AI-powered insights to improve your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center space-y-4">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Analyze Your Profile?</h3>
                  <p className="text-muted-foreground mb-6">
                    Our AI will analyze your profile and provide personalized recommendations
                  </p>
                  <Button onClick={loadSuggestions} size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profile Gap Analysis</CardTitle>
                      <CardDescription>
                        AI-powered insights to improve your profile
                      </CardDescription>
                    </div>
                    <Button onClick={refreshSuggestions} disabled={loading} size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {suggestions.map((gap, idx) => (
                    <ProfileGapCard
                      key={idx}
                      gap={gap}
                      onActionClick={() => {
                        window.location.href = "/dashboard/profile/edit";
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ATS Score Tab */}
        <TabsContent value="ats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <ResumeSelector
                resumes={resumes}
                selectedResume={selectedResume}
                onSelect={setSelectedResume}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Job Description (Optional)</CardTitle>
                  <CardDescription>
                    Paste a job description to get targeted keyword analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste job description here for targeted analysis..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </CardContent>
              </Card>

              <Button
                onClick={analyzeResume}
                disabled={atsLoading || !selectedResume}
                className="w-full"
                size="lg"
              >
                {atsLoading ? "Analyzing..." : "Analyze Resume"}
              </Button>
            </div>

            <div className="lg:col-span-2">
              {atsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : atsResult ? (
                <ATSScoreDisplay score={atsResult.score} analysis={atsResult.analysis} />
              ) : (
                <Card>
                  <CardContent className="py-24 text-center">
                    <FileSearch className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground">
                      Select a resume and click "Analyze Resume" to get your ATS score
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {atsHistory.length > 0 ? (
            atsHistory.map((scan) => (
              <Card key={scan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{scan.resumeLabel}</CardTitle>
                      <CardDescription>
                        {new Date(scan.createdAt).toLocaleString()}
                        {scan.jobDescription && " • With Job Description"}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{scan.score}</div>
                      <div className="text-sm text-muted-foreground">Score</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Job Description */}
                  {scan.jobDescription && (
                    <div>
                      <h4 className="font-semibold mb-2">Job Description Used:</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {scan.jobDescription}
                      </p>
                    </div>
                  )}

                  {/* Full Analysis */}
                  {scan.analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      {scan.analysis.strengths && scan.analysis.strengths.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Strengths
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {scan.analysis.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="text-muted-foreground">{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weaknesses */}
                      {scan.analysis.weaknesses && scan.analysis.weaknesses.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Areas for Improvement
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {scan.analysis.weaknesses.map((weakness: string, idx: number) => (
                              <li key={idx} className="text-muted-foreground">{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keywords */}
                  <div className="space-y-3">
                    {scan.matchedKeywords && scan.matchedKeywords.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Matched Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                          {scan.matchedKeywords.map((keyword: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md text-xs">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scan.missingKeywords && scan.missingKeywords.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Suggested Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                          {scan.missingKeywords.map((keyword: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md text-xs">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {scan.suggestions && scan.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Suggestions
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {scan.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-muted-foreground">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No scan history yet. Analyze your first resume to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

