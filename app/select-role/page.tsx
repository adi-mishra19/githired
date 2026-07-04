"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"student" | "company" | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    // Check if user already has a profile
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      // Check if student profile exists
      const studentRes = await fetch("/api/student/profile");
      if (studentRes.ok) {
        // Student profile exists, redirect to student dashboard
        router.push("/dashboard");
        return;
      }

      // Check if company profile exists
      const companyRes = await fetch("/api/company/profile");
      if (companyRes.ok) {
        // Company profile exists, redirect to company dashboard
        router.push("/dashboard/company");
        return;
      }

      // Check response status - 404 means no profile (good)
      // Any other error might be a real issue
      if (studentRes.status !== 404 && studentRes.status !== 500) {
        console.warn("Unexpected student profile response:", studentRes.status);
      }
      if (companyRes.status !== 404 && companyRes.status !== 500) {
        console.warn("Unexpected company profile response:", companyRes.status);
      }

      // No profile exists, show role selection
      setCheckingProfile(false);
    } catch (error) {
      console.error("Error checking profile:", error);
      setCheckingProfile(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      toast.error("Please select your role");
      return;
    }

    setLoading(true);
    try {
      // Create profile based on selected role
      const res = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res.ok) {
        toast.success("Profile created successfully!");
        // Force a hard refresh to update the session and middleware
        window.location.href = selectedRole === "student" ? "/dashboard" : "/dashboard/company";
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create profile");
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to Githired!</CardTitle>
          <CardDescription className="text-center">
            Please select your role to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Option */}
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-4 rounded-lg border-2 p-6 transition-all hover:shadow-md",
                selectedRole === "student"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-muted hover:border-primary/50"
              )}
              onClick={() => setSelectedRole("student")}
            >
              <div className={cn(
                "rounded-full p-4",
                selectedRole === "student" ? "bg-primary/10" : "bg-muted"
              )}>
                <GraduationCap className="h-12 w-12" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-xl font-semibold">Student</div>
                <div className="text-sm text-muted-foreground">
                  I'm looking for job opportunities and internships
                </div>
              </div>
            </button>

            {/* Company Option */}
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-4 rounded-lg border-2 p-6 transition-all hover:shadow-md",
                selectedRole === "company"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-muted hover:border-primary/50"
              )}
              onClick={() => setSelectedRole("company")}
            >
              <div className={cn(
                "rounded-full p-4",
                selectedRole === "company" ? "bg-primary/10" : "bg-muted"
              )}>
                <Building2 className="h-12 w-12" />
              </div>
              <div className="text-center space-y-2">
                <div className="text-xl font-semibold">Company</div>
                <div className="text-sm text-muted-foreground">
                  I'm hiring talented students for my company
                </div>
              </div>
            </button>
          </div>

          {selectedRole && (
            <div className="text-center text-sm text-muted-foreground">
              You selected: <span className="font-semibold">
                {selectedRole === "student" ? "Student" : "Company"}
              </span>
            </div>
          )}

          <Button 
            onClick={handleContinue} 
            disabled={!selectedRole || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating profile...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

