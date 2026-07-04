"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Calendar } from "lucide-react";

interface Resume {
  label: string;
  url: string;
  uploadedAt: string;
}

interface ResumeSelectorProps {
  resumes: Resume[];
  selectedResume: Resume | null;
  onSelect: (resume: Resume) => void;
}

export function ResumeSelector({ resumes, selectedResume, onSelect }: ResumeSelectorProps) {
  console.log("ResumeSelector received resumes:", resumes);
  
  if (!resumes || resumes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No Resumes Found</CardTitle>
          <CardDescription>
            Please upload a resume in your profile to use the ATS analyzer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/dashboard/profile/edit">
              Go to Profile
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select Resume</CardTitle>
        <CardDescription>Choose which resume to analyze</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {resumes.map((resume, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                selectedResume?.url === resume.url
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onSelect(resume)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{resume.label}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={resume.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

