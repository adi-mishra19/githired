"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, Trash2, CheckCircle, Upload } from "lucide-react";

export default function EditCompanyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/company/profile");
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

  const handleSave = async () => {
    // Validate required fields
    if (!profile.name || profile.name.trim() === "") {
      toast.error("Company name is required");
      return;
    }

    if (!profile.contactEmail || profile.contactEmail.trim() === "") {
      toast.error("Contact email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/company/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
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
      [field]: [...(profile[field] || []), ""],
    });
  };

  const removeItem = (field: string, index: number) => {
    const items = [...(profile[field] || [])];
    items.splice(index, 1);
    setProfile({ ...profile, [field]: items });
  };

  const updateItem = (field: string, index: number, value: any) => {
    const items = [...(profile[field] || [])];
    items[index] = value;
    setProfile({ ...profile, [field]: items });
  };

  const addOfficeLocation = () => {
    const locations = profile?.officeLocations || [];
    setProfile({ ...profile, officeLocations: [...locations, { city: "", country: "", address: "" }] });
  };

  const removeOfficeLocation = (index: number) => {
    const locations = [...(profile?.officeLocations || [])];
    locations.splice(index, 1);
    setProfile({ ...profile, officeLocations: locations });
  };

  const updateOfficeLocation = (index: number, key: string, value: string) => {
    const locations = [...(profile?.officeLocations || [])];
    locations[index] = { ...locations[index], [key]: value };
    setProfile({ ...profile, officeLocations: locations });
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
            <CardDescription>Unable to load your company profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Company Profile</h1>
          <p className="text-muted-foreground">Update your company information</p>
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
          <div>
            <Label htmlFor="name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Acme Inc."
              required
              className={!profile.name ? "border-red-300" : ""}
            />
            {!profile.name && (
              <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={profile.industry || ""}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                placeholder="Technology, Healthcare, etc."
              />
            </div>
            <div>
              <Label htmlFor="size">Company Size</Label>
              <select
                id="size"
                value={profile.size || ""}
                onChange={(e) => setProfile({ ...profile, size: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Headquarters Location</Label>
              <Input
                id="location"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
            <div>
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                value={profile.foundedYear || ""}
                onChange={(e) => setProfile({ ...profile, foundedYear: e.target.value })}
                placeholder="2020"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={profile.websiteUrl || ""}
              onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={profile.logoUrl || ""}
              onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Provide a URL to your company logo
            </p>
          </div>

          <div>
            <Label htmlFor="about">About Company</Label>
            <textarea
              id="about"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={profile.about || ""}
              onChange={(e) => setProfile({ ...profile, about: e.target.value })}
              placeholder="Brief description of your company, mission, and what you do..."
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="culture">Company Culture</Label>
            <textarea
              id="culture"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={profile.culture || ""}
              onChange={(e) => setProfile({ ...profile, culture: e.target.value })}
              placeholder="Describe your company culture, values, and work environment..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">
                Contact Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={profile.contactEmail || ""}
                onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                placeholder="contact@example.com"
                required
                className={!profile.contactEmail ? "border-red-300" : ""}
              />
              {!profile.contactEmail && (
                <p className="text-xs text-red-600 mt-1">⚠️ Required field</p>
              )}
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={profile.contactPhone || ""}
                onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={profile.linkedinUrl || ""}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
            <div>
              <Label htmlFor="twitterUrl">Twitter URL</Label>
              <Input
                id="twitterUrl"
                type="url"
                value={profile.twitterUrl || ""}
                onChange={(e) => setProfile({ ...profile, twitterUrl: e.target.value })}
                placeholder="https://twitter.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tech Stack</CardTitle>
            <Button onClick={() => addItem('techStack')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Technology
            </Button>
          </div>
          <CardDescription>Technologies used in your company</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(profile.techStack || []).map((tech: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={tech}
                  onChange={(e) => updateItem('techStack', index, e.target.value)}
                  placeholder="e.g., React, Python, AWS"
                />
                <Button
                  onClick={() => removeItem('techStack', index)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {(!profile.techStack || profile.techStack.length === 0) && (
              <p className="text-sm text-muted-foreground col-span-2">
                No technologies added yet. Click "Add Technology" to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Specialties</CardTitle>
            <Button onClick={() => addItem('specialties')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Specialty
            </Button>
          </div>
          <CardDescription>What your company specializes in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(profile.specialties || []).map((specialty: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={specialty}
                  onChange={(e) => updateItem('specialties', index, e.target.value)}
                  placeholder="e.g., Machine Learning, Web Development"
                />
                <Button
                  onClick={() => removeItem('specialties', index)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {(!profile.specialties || profile.specialties.length === 0) && (
              <p className="text-sm text-muted-foreground col-span-2">
                No specialties added yet. Click "Add Specialty" to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Benefits</CardTitle>
            <Button onClick={() => addItem('benefits')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Benefit
            </Button>
          </div>
          <CardDescription>Perks and benefits you offer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(profile.benefits || []).map((benefit: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={benefit}
                  onChange={(e) => updateItem('benefits', index, e.target.value)}
                  placeholder="e.g., Health Insurance, Remote Work, Stock Options"
                />
                <Button
                  onClick={() => removeItem('benefits', index)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {(!profile.benefits || profile.benefits.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No benefits added yet. Click "Add Benefit" to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Office Locations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Office Locations</CardTitle>
            <Button onClick={addOfficeLocation} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
          <CardDescription>Your company's office locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profile.officeLocations || []).map((location: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => removeOfficeLocation(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={location.city || ""}
                    onChange={(e) => updateOfficeLocation(index, 'city', e.target.value)}
                  />
                  <Input
                    placeholder="Country"
                    value={location.country || ""}
                    onChange={(e) => updateOfficeLocation(index, 'country', e.target.value)}
                  />
                  <Input
                    placeholder="Address"
                    value={location.address || ""}
                    onChange={(e) => updateOfficeLocation(index, 'address', e.target.value)}
                    className="md:col-span-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {(!profile.officeLocations || profile.officeLocations.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No office locations added yet. Click "Add Location" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verification Status - Read Only */}
      {(profile.verified || profile.status !== "pending") && (
        <Card className={
          profile.verified
            ? "bg-green-50 dark:bg-green-950/50 border-green-200"
            : "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200"
        }>
          <CardHeader>
            <CardTitle className={
              profile.verified
                ? "text-green-700 dark:text-green-400"
                : "text-yellow-700 dark:text-yellow-400"
            }>
              {profile.verified ? "✓ Verified Company" : "⏳ Verification Status"}
            </CardTitle>
            <CardDescription>
              {profile.verified
                ? "Your company has been verified by our admin team"
                : "Your profile is under review by our admin team"}
            </CardDescription>
          </CardHeader>
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

