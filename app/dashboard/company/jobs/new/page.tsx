"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const COURSES = ["CSE", "ECE", "EEE", "AIML", "Mechanical", "Civil", "Other"];
const DEGREES = ["BTech", "MTech", "MCA", "MBA", "BCA", "MSc"];
const COMMON_SKILLS = [
  "JavaScript", "Python", "Java", "C++", "React", "Node.js", "TypeScript",
  "SQL", "MongoDB", "AWS", "Docker", "Git", "Machine Learning", "Data Science",
  "UI/UX", "Project Management", "Communication", "Problem Solving"
];

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "full-time",
    location: "",
    cgpaCutoff: "",
    salary: "",
    deadline: "",
    eligibleCourses: [] as string[],
    eligibleDegrees: [] as string[],
    skills: [] as string[],
    benefits: [] as string[],
  });

  const [skillInput, setSkillInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Job description is required");
      return;
    }
    if (!formData.location.trim()) {
      toast.error("Location is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/company/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Convert deadline to ISO string if provided
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create job");
      }

      toast.success("Job posted successfully!");
      router.push("/dashboard/company/jobs");
    } catch (error: any) {
      toast.error(error.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (course: string) => {
    setFormData(prev => ({
      ...prev,
      eligibleCourses: prev.eligibleCourses.includes(course)
        ? prev.eligibleCourses.filter(c => c !== course)
        : [...prev.eligibleCourses, course]
    }));
  };

  const toggleDegree = (degree: string) => {
    setFormData(prev => ({
      ...prev,
      eligibleDegrees: prev.eligibleDegrees.includes(degree)
        ? prev.eligibleDegrees.filter(d => d !== degree)
        : [...prev.eligibleDegrees, degree]
    }));
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const addCustomSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput("");
    }
  };

  const addBenefit = () => {
    if (benefitInput.trim() && !formData.benefits.includes(benefitInput.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, benefitInput.trim()]
      }));
      setBenefitInput("");
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit)
    }));
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/company/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8" />
            Post a New Job
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details to post a job opening
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Provide information about the position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Software Engineer"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Job Type *</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="full-time">Full-Time</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, and requirements..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={8}
                required
              />
            </div>

            {/* Location & Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Bangalore, India"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary/Package</Label>
                <Input
                  id="salary"
                  placeholder="e.g., 10-12 LPA"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                />
              </div>
            </div>

            {/* CGPA & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cgpa">Minimum CGPA</Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g., 7.0"
                  value={formData.cgpaCutoff}
                  onChange={(e) => setFormData(prev => ({ ...prev, cgpaCutoff: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            {/* Eligible Courses */}
            <div className="space-y-2">
              <Label>Eligible Courses</Label>
              <p className="text-xs text-muted-foreground">Select all applicable courses (leave empty for all)</p>
              <div className="flex flex-wrap gap-2">
                {COURSES.map(course => (
                  <Button
                    key={course}
                    type="button"
                    variant={formData.eligibleCourses.includes(course) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCourse(course)}
                  >
                    {course}
                  </Button>
                ))}
              </div>
            </div>

            {/* Eligible Degrees */}
            <div className="space-y-2">
              <Label>Eligible Degrees</Label>
              <p className="text-xs text-muted-foreground">Select all applicable degrees (leave empty for all)</p>
              <div className="flex flex-wrap gap-2">
                {DEGREES.map(degree => (
                  <Button
                    key={degree}
                    type="button"
                    variant={formData.eligibleDegrees.includes(degree) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDegree(degree)}
                  >
                    {degree}
                  </Button>
                ))}
              </div>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <Label>Required Skills</Label>
              <p className="text-xs text-muted-foreground">Select common skills or add custom ones</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_SKILLS.map(skill => (
                  <Button
                    key={skill}
                    type="button"
                    variant={formData.skills.includes(skill) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom skill..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                />
                <Button type="button" onClick={addCustomSkill}>Add</Button>
              </div>
              {formData.skills.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {formData.skills.join(", ")}
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label>Benefits & Perks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Health Insurance, Remote Work..."
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" onClick={addBenefit}>Add</Button>
              </div>
              {formData.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.benefits.map(benefit => (
                    <span
                      key={benefit}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-sm"
                    >
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(benefit)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  "Post Job"
                )}
              </Button>
              <Link href="/dashboard/company/jobs" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
