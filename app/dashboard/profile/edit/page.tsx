"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, Save, Loader2, Plus, Trash2, CheckCircle } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/student/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }

    if (!label || label.trim() === "") {
      toast.error("Please provide a label for this resume");
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL
      const res = await fetch("/api/student/resume/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey } = await res.json();

      // Upload file to DO Spaces
      let uploadRes;
      try {
        uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
      } catch (fetchError: any) {
        console.error("Fetch error:", fetchError);
        throw new Error(
          "Failed to upload to storage. This is likely a CORS configuration issue. " +
          "Please ensure CORS is configured on your AWS S3 bucket. " +
          "See AWS_S3_SETUP.md for instructions."
        );
      }

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Upload error:", errorText);
        throw new Error(`Upload failed with status ${uploadRes.status}: ${errorText}`);
      }

      // Get public URL (remove query parameters)
      const publicUrl = uploadUrl.split("?")[0];

      // Add to resumes array
      const currentResumes = profile.resumes || [];
      const newResume = {
        label: label.trim(),
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      const updatedResumes = [...currentResumes, newResume];

      // Save to database immediately
      const saveRes = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          resumes: updatedResumes,
          resumeUrl: publicUrl, // Keep for backward compatibility
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || "Failed to save resume to profile");
      }

      setProfile({ 
        ...profile, 
        resumes: updatedResumes,
        resumeUrl: publicUrl,
        newResumeLabel: "" // Clear the label input
      });
      
      toast.success("Resume uploaded and saved successfully!");
      
      // Reset the file input
      e.target.value = "";
    } catch (error: any) {
      console.error("Resume upload error:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async (index: number) => {
    try {
      const res = await fetch(`/api/student/resume?index=${index}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete resume");
      }

      const data = await res.json();
      
      setProfile({ ...profile, resumes: data.resumes });
      toast.success("Resume deleted successfully!");
    } catch (error: any) {
      console.error("Resume deletion error:", error);
      toast.error(error.message || "Failed to delete resume");
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!profile.srn || profile.srn.trim() === "") {
      toast.error("SRN is required");
      return;
    }

    if (!profile.phone || profile.phone.trim() === "") {
      toast.error("Phone number is required");
      return;
    }

    if (profile.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    setSaving(true);
    try {
      // Clean up the profile data - remove any undefined/null values and ensure proper types
      const cleanProfile = {
        ...profile,
        // Ensure arrays are proper arrays (not undefined)
        skills: profile.skills || [],
        preferredLocations: profile.preferredLocations || [],
        education: profile.education || [],
        experience: profile.experience || [],
        projects: profile.projects || [],
        certifications: profile.certifications || [],
        achievements: profile.achievements || [],
        otherPlatforms: profile.otherPlatforms || {},
        analytics: profile.analytics || {},
      };

      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanProfile),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Error updating profile");
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (field: string) => {
    setProfile({
      ...profile,
      [field]: [...(profile[field] || []), {}],
    });
  };

  const removeItem = (field: string, index: number) => {
    const items = [...(profile[field] || [])];
    items.splice(index, 1);
    setProfile({ ...profile, [field]: items });
  };

  const updateItem = (field: string, index: number, key: string, value: any) => {
    const items = [...(profile[field] || [])];
    items[index] = { ...items[index], [key]: value };
    setProfile({ ...profile, [field]: items });
  };

  const addSkill = () => {
    const skills = profile?.skills || [];
    setProfile({ ...profile, skills: [...skills, ""] });
  };

  const removeSkill = (index: number) => {
    const skills = [...(profile?.skills || [])];
    skills.splice(index, 1);
    setProfile({ ...profile, skills });
  };

  const updateSkill = (index: number, value: string) => {
    const skills = [...(profile?.skills || [])];
    skills[index] = value;
    setProfile({ ...profile, skills });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your student profile information</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="srn">
                SRN (Student Registration Number) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="srn"
                value={profile.srn || ""}
                onChange={(e) => setProfile({ ...profile, srn: e.target.value })}
                placeholder="PESxUGxxCSxxx"
                required
                disabled={profile.srnValid}
                className={!profile.srn ? "border-red-300" : profile.srnValid ? "bg-muted cursor-not-allowed" : ""}
              />
              {profile.srnValid ? (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  SRN Verified by Admin (Cannot be changed)
                </p>
              ) : profile.srn ? (
                <p className="text-xs text-yellow-600 mt-1">⚠️ Pending admin verification</p>
              ) : (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              )}
              {!profile.srnValid && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Enter ONLY your own SRN. False information will result in rejection.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                  setProfile({ ...profile, phone: value });
                }}
                placeholder="10 digits (e.g., 6363xxxxx4)"
                maxLength={10}
                required
                className={!profile.phone || profile.phone.length !== 10 ? "border-red-300" : ""}
              />
              {!profile.phone ? (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              ) : profile.phone.length !== 10 ? (
                <p className="text-xs text-yellow-600 mt-1">⚠️ Must be 10 digits</p>
              ) : (
                <p className="text-xs text-green-600 mt-1">✓ Valid</p>
              )}
            </div>
          </div>

          {/* Academic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="cgpa">
                CGPA <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={profile.cgpa || ""}
                onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                placeholder="e.g., 8.5"
                required
                className={!profile.cgpa ? "border-red-300" : ""}
              />
              {!profile.cgpa && (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              )}
            </div>
            <div>
              <Label htmlFor="degree">
                Degree <span className="text-red-500">*</span>
              </Label>
              <select
                id="degree"
                value={profile.degree || ""}
                onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!profile.degree ? "border-red-300" : ""}`}
                required
              >
                <option value="">Select Degree</option>
                <option value="BTech">BTech</option>
                <option value="MTech">MTech</option>
                <option value="MCA">MCA</option>
              </select>
              {!profile.degree && (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              )}
            </div>
            <div>
              <Label htmlFor="course">
                Course <span className="text-red-500">*</span>
              </Label>
              <select
                id="course"
                value={profile.course || ""}
                onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!profile.course ? "border-red-300" : ""}`}
                required
              >
                <option value="">Select Course</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="AIML">AIML</option>
              </select>
              {!profile.course && (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={profile.headline || ""}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              placeholder="Full Stack Developer | Machine Learning Enthusiast"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Brief introduction about yourself"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="aboutMe">About Me</Label>
            <textarea
              id="aboutMe"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={profile.aboutMe || ""}
              onChange={(e) => setProfile({ ...profile, aboutMe: e.target.value })}
              placeholder="Detailed information about your background, interests, and goals"
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="Bangalore, India"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume */}
      <Card>
        <CardHeader>
          <CardTitle>Resumes</CardTitle>
          <CardDescription>
            Upload multiple resume variants (up to 3) for different roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Resumes */}
          {profile.resumes && profile.resumes.length > 0 && (
            <div className="space-y-2">
              {profile.resumes.map((resume: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{resume.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={resume.url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteResume(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload New Resume */}
          {(!profile.resumes || profile.resumes.length < 3) && (
            <div className="space-y-2">
              <Label htmlFor="resumeLabel">Resume Label</Label>
              <Input
                id="resumeLabel"
                placeholder="e.g., Software Engineer, Data Analyst, Frontend Developer"
                value={profile.newResumeLabel || ""}
                onChange={(e) =>
                  setProfile({ ...profile, newResumeLabel: e.target.value })
                }
              />
              <div>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleResumeUpload(e, profile.newResumeLabel || "")}
                  disabled={uploading}
                  id="resume"
                  className="hidden"
                />
                <Button asChild variant="outline" disabled={uploading}>
                  <label htmlFor="resume" className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Upload Resume"}
                  </label>
                </Button>
              </div>
            </div>
          )}

          {profile.resumes && profile.resumes.length >= 3 && (
            <p className="text-sm text-muted-foreground">
              Maximum 3 resumes allowed. Delete one to upload a new variant.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Education</CardTitle>
            <Button onClick={() => addItem('education')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profile.education || []).map((edu: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => removeItem('education', index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Degree (e.g., B.Tech in CSE)"
                    value={edu.degree || ""}
                    onChange={(e) => updateItem('education', index, 'degree', e.target.value)}
                  />
                  <Input
                    placeholder="Institution"
                    value={edu.institution || ""}
                    onChange={(e) => updateItem('education', index, 'institution', e.target.value)}
                  />
                  <Input
                    placeholder="Start Date (e.g., 2020)"
                    value={edu.startDate || ""}
                    onChange={(e) => updateItem('education', index, 'startDate', e.target.value)}
                  />
                  <Input
                    placeholder="End Date (e.g., 2024)"
                    value={edu.endDate || ""}
                    onChange={(e) => updateItem('education', index, 'endDate', e.target.value)}
                  />
                  <Input
                    placeholder="CGPA (e.g., 8.5)"
                    value={edu.cgpa || ""}
                    onChange={(e) => updateItem('education', index, 'cgpa', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Experience</CardTitle>
            <Button onClick={() => addItem('experience')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profile.experience || []).map((exp: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => removeItem('experience', index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Company"
                    value={exp.company || ""}
                    onChange={(e) => updateItem('experience', index, 'company', e.target.value)}
                  />
                  <Input
                    placeholder="Role"
                    value={exp.role || ""}
                    onChange={(e) => updateItem('experience', index, 'role', e.target.value)}
                  />
                  <Input
                    placeholder="Start Date"
                    value={exp.startDate || ""}
                    onChange={(e) => updateItem('experience', index, 'startDate', e.target.value)}
                  />
                  <Input
                    placeholder="End Date"
                    value={exp.endDate || ""}
                    onChange={(e) => updateItem('experience', index, 'endDate', e.target.value)}
                  />
                  <Input
                    placeholder="Type (e.g., Internship, Full-time)"
                    value={exp.type || ""}
                    onChange={(e) => updateItem('experience', index, 'type', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Projects</CardTitle>
            <Button onClick={() => addItem('projects')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profile.projects || []).map((project: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => removeItem('projects', index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="Project Name"
                    value={project.name || ""}
                    onChange={(e) => updateItem('projects', index, 'name', e.target.value)}
                  />
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Description"
                    value={project.description || ""}
                    onChange={(e) => updateItem('projects', index, 'description', e.target.value)}
                    rows={3}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Technologies (e.g., React, Node.js)"
                      value={project.technologies || ""}
                      onChange={(e) => updateItem('projects', index, 'technologies', e.target.value)}
                    />
                    <Input
                      placeholder="Project URL"
                      value={project.url || ""}
                      onChange={(e) => updateItem('projects', index, 'url', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Certifications</CardTitle>
            <Button onClick={() => addItem('certifications')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profile.certifications || []).map((cert: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => removeItem('certifications', index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Certification Name"
                    value={cert.name || ""}
                    onChange={(e) => updateItem('certifications', index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Issuer"
                    value={cert.issuer || ""}
                    onChange={(e) => updateItem('certifications', index, 'issuer', e.target.value)}
                  />
                  <Input
                    placeholder="Issue Date"
                    value={cert.issueDate || ""}
                    onChange={(e) => updateItem('certifications', index, 'issueDate', e.target.value)}
                  />
                  <Input
                    placeholder="Certificate URL"
                    value={cert.url || ""}
                    onChange={(e) => updateItem('certifications', index, 'url', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Skills</CardTitle>
            <Button onClick={addSkill} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(profile.skills || []).map((skill: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={skill}
                  onChange={(e) => updateSkill(index, e.target.value)}
                  placeholder="e.g., React, Python, AWS"
                />
                <Button
                  onClick={() => removeSkill(index)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                value={profile.githubUrl || ""}
                onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                placeholder="https://github.com/username"
              />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={profile.linkedinUrl || ""}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio</Label>
              <Input
                id="portfolio"
                value={profile.portfolioUrl || ""}
                onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                placeholder="https://yourportfolio.com"
              />
            </div>
            <div>
              <Label htmlFor="leetcode">LeetCode</Label>
              <Input
                id="leetcode"
                value={profile.leetcodeUrl || ""}
                onChange={(e) => setProfile({ ...profile, leetcodeUrl: e.target.value })}
                placeholder="https://leetcode.com/username"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placement Status - Read Only */}
      {(profile.placedIntern || profile.placedFte) && (
        <Card className="bg-green-50 dark:bg-green-950/50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">🎉 Placement Status</CardTitle>
            <CardDescription>Congratulations on your placement!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.placedIntern && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Placed for Internship</span>
              </div>
            )}
            {profile.placedFte && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Placed for Full-Time</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

