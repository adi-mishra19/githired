"use server";

import { db } from "@/db/drizzle";
import { students, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc, gt } from "drizzle-orm";

// SRN validation function
function validateSRN(srn: string): boolean {
  // Example format: PES1UG20CS001 or similar patterns
  // Adjust regex based on your institution's SRN format
  const srnRegex = /^[A-Z]{3}\d[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/;
  return srnRegex.test(srn);
}

// Get current user's student profile (DOES NOT auto-create)
export async function getStudentProfile() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const profile = await db.query.students.findFirst({
    where: eq(students.userId, session.user.id),
  });

  // Return profile or throw error if not found
  if (!profile) {
    throw new Error("Student profile not found");
  }

  return profile;
}

// Create student profile (called after signup)
export async function createStudentProfile(data: {
  email: string;
  userId: string;
}) {
  const existingProfile = await db.query.students.findFirst({
    where: eq(students.userId, data.userId),
  });

  if (existingProfile) {
    throw new Error("Profile already exists");
  }

  const [profile] = await db.insert(students).values({
    userId: data.userId,
    email: data.email,
    status: "pending",
  }).returning();

  return profile;
}

// Update student profile
export async function updateStudentProfile(data: Partial<{
  srn: string;
  phone: string;
  location: string;
  preferredLocations: string[];
  bio: string;
  aboutMe: string;
  headline: string;
  education: any[];
  experience: any[];
  projects: any[];
  certifications: any[];
  achievements: any[];
  skills: string[];
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  leetcodeUrl: string;
  otherPlatforms: any;
  placedIntern: boolean;
  placedFte: boolean;
  resumeUrl: string;
  resumes: any[];
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const profile = await db.query.students.findFirst({
    where: eq(students.userId, session.user.id),
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  // Validate required fields
  if (data.phone !== undefined && (!data.phone || data.phone.trim() === "")) {
    throw new Error("Phone number is required");
  }

  if (data.phone && data.phone.length !== 10) {
    throw new Error("Phone number must be exactly 10 digits");
  }

  // If updating SRN, validate it
  if (data.srn !== undefined && data.srn !== profile.srn) {
    // Don't allow changing SRN if already verified
    if (profile.srnValid) {
      throw new Error("Cannot change SRN after verification. Contact admin if you need to update it.");
    }

    if (!validateSRN(data.srn)) {
      throw new Error("SRN format invalid. Expected format: PES1UG20CS001");
    }

    // Check if this SRN is already used by someone else
    const existing = await db.query.students.findFirst({
      where: eq(students.srn, data.srn),
    });

    if (existing && existing.id !== profile.id) {
      // Check if the existing SRN is verified
      if (existing.srnValid) {
        throw new Error("This SRN is already registered and verified. If this is your SRN, contact support.");
      }
      throw new Error("This SRN is already in use.");
    }

    // Set srnValid to false initially, admin will verify
    data = { ...data, srnValid: false } as any;
  }

  // Remove fields that shouldn't be updated directly (timestamps, id, userId, etc.)
  const { id, userId, createdAt, ...updateData } = data as any;

  const [updatedProfile] = await db.update(students)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(students.id, profile.id))
    .returning();

  return updatedProfile;
}

// Get student by ID (for admin view)
export async function getStudentById(studentId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (currentUser?.role !== "admin") {
    throw new Error("Admin access required");
  }

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
    with: {
      user: true,
    },
  });

  return student;
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
export async function incrementProfileViews(studentId: string) {
  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const analytics = student.analytics as any || { profileViews: 0, applications: 0 };
  analytics.profileViews = (analytics.profileViews || 0) + 1;

  await db.update(students)
    .set({
      analytics: analytics,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));
}
