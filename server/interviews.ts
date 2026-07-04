"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { interviews, applications, students, jobs, companies } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import type { InsertInterview } from "@/db/schema";

// ===== STUDENT ACTIONS =====

export async function getStudentInterviews() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get student profile
  const student = await db.query.students.findFirst({
    where: eq(students.userId, session.user.id),
  });

  if (!student) throw new Error("Student profile not found");

  // Get all interviews for this student's applications
  const studentInterviews = await db
    .select({
      interview: interviews,
      application: applications,
      job: jobs,
      company: companies,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(applications.studentId, student.id))
    .orderBy(interviews.scheduledAt);

  return studentInterviews;
}

export async function getUpcomingInterviews() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get student profile
  const student = await db.query.students.findFirst({
    where: eq(students.userId, session.user.id),
  });

  if (!student) throw new Error("Student profile not found");

  const now = new Date();

  // Get upcoming interviews
  const upcomingInterviews = await db
    .select({
      interview: interviews,
      application: applications,
      job: jobs,
      company: companies,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(
      and(
        eq(applications.studentId, student.id),
        gte(interviews.scheduledAt, now),
        eq(interviews.status, "scheduled")
      )
    )
    .orderBy(interviews.scheduledAt)
    .limit(10);

  return upcomingInterviews;
}

// ===== COMPANY ACTIONS =====

export async function getCompanyInterviews(jobId?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get company profile
  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) throw new Error("Company profile not found");

  let query = db
    .select({
      interview: interviews,
      application: applications,
      job: jobs,
      student: students,
    })
    .from(interviews)
    .innerJoin(applications, eq(interviews.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(students, eq(applications.studentId, students.id))
    .where(eq(jobs.companyId, company.id))
    .orderBy(desc(interviews.scheduledAt));

  if (jobId) {
    query = db
      .select({
        interview: interviews,
        application: applications,
        job: jobs,
        student: students,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(students, eq(applications.studentId, students.id))
      .where(and(eq(jobs.companyId, company.id), eq(jobs.id, jobId)))
      .orderBy(desc(interviews.scheduledAt));
  }

  return await query;
}

export async function scheduleInterview(data: {
  applicationId: string;
  round: string;
  scheduledAt: Date | string;
  duration?: string;
  location?: string;
  meetingLink?: string;
  interviewers?: string[];
  notes?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get company profile
  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) throw new Error("Company profile not found");

  // Verify the application belongs to this company
  const application = await db.query.applications.findFirst({
    where: eq(applications.id, data.applicationId),
    with: {
      job: true,
    },
  });

  if (!application || application.job.companyId !== company.id) {
    throw new Error("Application not found or unauthorized");
  }

  // Convert scheduledAt to Date if it's a string
  const scheduledAtDate = typeof data.scheduledAt === 'string' 
    ? new Date(data.scheduledAt) 
    : data.scheduledAt;

  // Create interview
  const [interview] = await db
    .insert(interviews)
    .values({
      applicationId: data.applicationId,
      round: data.round,
      scheduledAt: scheduledAtDate,
      duration: data.duration,
      location: data.location,
      meetingLink: data.meetingLink,
      interviewers: data.interviewers || [],
      notes: data.notes,
      status: "scheduled",
    })
    .returning();

  // Update application status based on round
  let newStatus: string;
  
  switch (data.round) {
    case "oa":
      newStatus = "oa";
      break;
    case "round_1":
      newStatus = "interview_round_1";
      break;
    case "round_2":
      newStatus = "interview_round_2";
      break;
    case "round_3":
      newStatus = "interview_round_3";
      break;
    default:
      console.error(`Invalid interview round: ${data.round}`);
      throw new Error(`Invalid interview round: ${data.round}. Valid options are: oa, round_1, round_2, round_3`);
  }

  await db
    .update(applications)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(applications.id, data.applicationId));

  return interview;
}

export async function updateInterview(
  interviewId: string,
  data: Partial<InsertInterview>
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get company profile
  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) throw new Error("Company profile not found");

  // Verify the interview belongs to this company
  const interview = await db.query.interviews.findFirst({
    where: eq(interviews.id, interviewId),
    with: {
      application: {
        with: {
          job: true,
        },
      },
    },
  });

  if (!interview || interview.application.job.companyId !== company.id) {
    throw new Error("Interview not found or unauthorized");
  }

  // Update interview
  const [updated] = await db
    .update(interviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(interviews.id, interviewId))
    .returning();

  return updated;
}

export async function updateInterviewResult(
  interviewId: string,
  result: "passed" | "failed" | "pending",
  feedback?: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get company profile
  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) throw new Error("Company profile not found");

  // Verify the interview belongs to this company
  const interview = await db.query.interviews.findFirst({
    where: eq(interviews.id, interviewId),
    with: {
      application: {
        with: {
          job: true,
        },
      },
    },
  });

  if (!interview || interview.application.job.companyId !== company.id) {
    throw new Error("Interview not found or unauthorized");
  }

  // Update interview result
  await db
    .update(interviews)
    .set({
      result,
      feedback,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(interviews.id, interviewId));

  // If failed, update application status to rejected
  if (result === "failed") {
    await db
      .update(applications)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(applications.id, interview.applicationId));
  }

  return { success: true };
}

export async function deleteInterview(interviewId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  // Get company profile
  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) throw new Error("Company profile not found");

  // Verify the interview belongs to this company
  const interview = await db.query.interviews.findFirst({
    where: eq(interviews.id, interviewId),
    with: {
      application: {
        with: {
          job: true,
        },
      },
    },
  });

  if (!interview || interview.application.job.companyId !== company.id) {
    throw new Error("Interview not found or unauthorized");
  }

  await db.delete(interviews).where(eq(interviews.id, interviewId));

  return { success: true };
}

