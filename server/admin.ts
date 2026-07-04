"use server";

import { db } from "@/db/drizzle";
import { students, companies, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";

// Check if user is admin
async function checkAdmin() {
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

  return session;
}

// ===== STUDENT MANAGEMENT =====

export async function getAllStudents(status?: string) {
  await checkAdmin();
  
  // Fetch all students with their user data
  const allStudents = await (status
    ? db.query.students.findMany({
        where: eq(students.status, status),
        with: { user: true },
        orderBy: [desc(students.createdAt)],
      })
    : db.query.students.findMany({
        with: { user: true },
        orderBy: [desc(students.createdAt)],
      }));

  // Filter out users who have admin role
  return allStudents.filter(student => student.user.role !== "admin");
}

export async function approveStudent(studentId: string) {
  await checkAdmin();

  await db.update(students)
    .set({ 
      status: "approved", 
      srnValid: true, // Auto-verify SRN when approving student
      updatedAt: new Date() 
    })
    .where(eq(students.id, studentId));

  return { success: true };
}

export async function rejectStudent(studentId: string, note?: string) {
  await checkAdmin();

  await db.update(students)
    .set({ 
      status: "rejected", 
      adminNote: note || null,
      updatedAt: new Date() 
    })
    .where(eq(students.id, studentId));

  return { success: true };
}

export async function banStudent(studentId: string, note?: string) {
  await checkAdmin();

  await db.update(students)
    .set({ 
      status: "banned", 
      adminNote: note || null,
      updatedAt: new Date() 
    })
    .where(eq(students.id, studentId));

  return { success: true };
}

export async function unbanStudent(studentId: string) {
  await checkAdmin();

  await db.update(students)
    .set({ status: "approved", adminNote: null, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  return { success: true };
}

export async function unrejectStudent(studentId: string) {
  await checkAdmin();

  await db.update(students)
    .set({ status: "pending", adminNote: null, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  return { success: true };
}

export async function verifySRN(studentId: string, srn: string) {
  await checkAdmin();

  await db.update(students)
    .set({ srnValid: true, srn, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  return { success: true };
}

// ===== COMPANY MANAGEMENT =====

export async function getAllCompanies(status?: string) {
  await checkAdmin();
  
  // Fetch all companies with their user data
  const allCompanies = await (status
    ? db.query.companies.findMany({
        where: eq(companies.status, status),
        with: { user: true },
        orderBy: [desc(companies.createdAt)],
      })
    : db.query.companies.findMany({
        with: { user: true },
        orderBy: [desc(companies.createdAt)],
      }));

  // Filter out users who have admin role
  return allCompanies.filter(company => company.user.role !== "admin");
}

export async function approveCompany(companyId: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      status: "approved", 
      verified: true, 
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

export async function rejectCompany(companyId: string, note?: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      status: "rejected", 
      verified: false,
      adminNote: note || null,
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

export async function banCompany(companyId: string, note?: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      status: "banned", 
      verified: false,
      adminNote: note || null,
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

export async function unbanCompany(companyId: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      status: "approved", 
      verified: true,
      adminNote: null, 
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

export async function unrejectCompany(companyId: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      status: "pending", 
      verified: false,
      adminNote: null, 
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

export async function verifyCompany(companyId: string) {
  await checkAdmin();

  await db.update(companies)
    .set({ 
      verified: true, 
      status: "approved",
      updatedAt: new Date() 
    })
    .where(eq(companies.id, companyId));

  return { success: true };
}

// ===== BULK OPERATIONS =====

export async function bulkApproveStudents(studentIds: string[]) {
  await checkAdmin();

  if (!studentIds || studentIds.length === 0) {
    throw new Error("No student IDs provided");
  }

  const results = await Promise.allSettled(
    studentIds.map(id => approveStudent(id))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: studentIds.length,
    successful,
    failed
  };
}

export async function bulkRejectStudents(studentIds: string[], note?: string) {
  await checkAdmin();

  if (!studentIds || studentIds.length === 0) {
    throw new Error("No student IDs provided");
  }

  const results = await Promise.allSettled(
    studentIds.map(id => rejectStudent(id, note))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: studentIds.length,
    successful,
    failed
  };
}

export async function bulkBanStudents(studentIds: string[], note?: string) {
  await checkAdmin();

  if (!studentIds || studentIds.length === 0) {
    throw new Error("No student IDs provided");
  }

  const results = await Promise.allSettled(
    studentIds.map(id => banStudent(id, note))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: studentIds.length,
    successful,
    failed
  };
}

export async function bulkApproveCompanies(companyIds: string[]) {
  await checkAdmin();

  if (!companyIds || companyIds.length === 0) {
    throw new Error("No company IDs provided");
  }

  const results = await Promise.allSettled(
    companyIds.map(id => approveCompany(id))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: companyIds.length,
    successful,
    failed
  };
}

export async function bulkRejectCompanies(companyIds: string[], note?: string) {
  await checkAdmin();

  if (!companyIds || companyIds.length === 0) {
    throw new Error("No company IDs provided");
  }

  const results = await Promise.allSettled(
    companyIds.map(id => rejectCompany(id, note))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: companyIds.length,
    successful,
    failed
  };
}

export async function bulkBanCompanies(companyIds: string[], note?: string) {
  await checkAdmin();

  if (!companyIds || companyIds.length === 0) {
    throw new Error("No company IDs provided");
  }

  const results = await Promise.allSettled(
    companyIds.map(id => banCompany(id, note))
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return { 
    success: true, 
    processed: companyIds.length,
    successful,
    failed
  };
}
