"use server";

import { db } from "@/db/drizzle";
import { companies, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

// Get current user's company profile (DOES NOT auto-create)
export async function getCompanyProfile() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const profile = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  // Return profile or throw error if not found
  if (!profile) {
    throw new Error("Company profile not found");
  }

  return profile;
}

// Create company profile (called after signup)
export async function createCompanyProfile(data: {
  email: string;
  userId: string;
  name: string;
}) {
  const existingProfile = await db.query.companies.findFirst({
    where: eq(companies.userId, data.userId),
  });

  if (existingProfile) {
    throw new Error("Profile already exists");
  }

  const [profile] = await db.insert(companies).values({
    userId: data.userId,
    contactEmail: data.email,
    name: data.name,
    status: "pending",
  }).returning();

  return profile;
}

// Update company profile
export async function updateCompanyProfile(data: Partial<{
  name: string;
  logoUrl: string;
  websiteUrl: string;
  location: string;
  about: string;
  industry: string;
  size: string;
  contactEmail: string;
  contactPhone: string;
  linkedinUrl: string;
  twitterUrl: string;
  foundedYear: string;
  specialties: string[];
  benefits: any[];
  culture: string;
  techStack: string[];
  officeLocations: any[];
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const profile = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  // Validate required fields
  if (data.contactEmail !== undefined && (!data.contactEmail || data.contactEmail.trim() === "")) {
    throw new Error("Contact email is required");
  }

  if (data.contactPhone && data.contactPhone.length < 10) {
    throw new Error("Contact phone must be at least 10 digits");
  }

  // Remove fields that shouldn't be updated directly (timestamps, id, userId, etc.)
  const { id, userId, createdAt, ...updateData } = data as any;

  const [updatedProfile] = await db.update(companies)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, profile.id))
    .returning();

  return updatedProfile;
}

// Get company by ID (for admin view or public view)
export async function getCompanyById(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    with: {
      user: true,
    },
  });

  return company;
}

// Check if user has admin role
export async function isAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return false;
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return currentUser?.role === "admin";
}

// Increment profile view analytics
export async function incrementCompanyViews(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const analytics = company.analytics as any || { profileViews: 0, jobPosts: 0, applications: 0 };
  analytics.profileViews = (analytics.profileViews || 0) + 1;

  await db.update(companies)
    .set({
      analytics: analytics,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

