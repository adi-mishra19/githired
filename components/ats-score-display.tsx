"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { ATSAnalysis } from "@/lib/ai/ats-analyzer";

interface ATSScoreDisplayProps {
  score: number;
  analysis: ATSAnalysis;
}

export function ATSScoreDisplay({ score, analysis }: ATSScoreDisplayProps) {
  // Provide default values to prevent undefined errors
  const safeAnalysis = {
    score: score || 0,
    strengths: analysis?.strengths || [],
    weaknesses: analysis?.weaknesses || [],
    keywordMatches: analysis?.keywordMatches || [],
    missingKeywords: analysis?.missingKeywords || [],
    suggestions: analysis?.suggestions || [],
    formatting: {
      score: analysis?.formatting?.score || 0,
      issues: analysis?.formatting?.issues || []
    },
    content: {
      score: analysis?.content?.score || 0,
      issues: analysis?.content?.issues || []
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    if (score >= 60) return { label: "Good", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" };
    if (score >= 40) return { label: "Fair", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" };
    return { label: "Needs Improvement", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
  };

  const scoreLabel = getScoreLabel(score);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>ATS Compatibility Score</CardTitle>
          <CardDescription>How well your resume performs with Applicant Tracking Systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge className={`mt-2 ${scoreLabel.color}`}>{scoreLabel.label}</Badge>
            </div>
            <div className="text-right">
              <TrendingUp className={`w-12 h-12 ${getScoreColor(score)}`} />
            </div>
          </div>
          <Progress value={score} className="h-3" />
        </CardContent>
      </Card>

      {/* Detailed Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatting Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{safeAnalysis.formatting.score}</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <Progress value={safeAnalysis.formatting.score} className="h-2" />
              {safeAnalysis.formatting.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {safeAnalysis.formatting.issues.slice(0, 3).map((issue, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{safeAnalysis.content.score}</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <Progress value={safeAnalysis.content.score} className="h-2" />
              {safeAnalysis.content.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {safeAnalysis.content.issues.slice(0, 3).map((issue, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {safeAnalysis.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {safeAnalysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matched Keywords</CardTitle>
            <CardDescription>Keywords found in your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {safeAnalysis.keywordMatches.length > 0 ? (
                safeAnalysis.keywordMatches.map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="bg-green-50 dark:bg-green-950">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No specific keywords identified</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missing Keywords</CardTitle>
            <CardDescription>Keywords you should consider adding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {safeAnalysis.missingKeywords.length > 0 ? (
                safeAnalysis.missingKeywords.map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="bg-red-50 dark:bg-red-950">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No missing keywords identified</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Improvement Suggestions</CardTitle>
          <CardDescription>Actionable steps to enhance your resume</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {safeAnalysis.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm flex items-start gap-3">
                <span className="font-bold text-primary">{idx + 1}.</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

