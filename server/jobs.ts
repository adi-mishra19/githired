"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { jobs, companies, students, Job, InsertJob } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/utils";
import NewJobNotificationEmail from "@/components/emails/new-job-notification";

const resend = new Resend(process.env.RESEND_API_KEY);

async function checkCompanyAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.user.id),
  });

  if (!company) {
    throw new Error("Company profile not found");
  }

  return { session, company };
}

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required");
  }

  return session;
}

export async function createJob(data: InsertJob) {
  const { company } = await checkCompanyAuth();

  // Only verified companies can post jobs
  if (!company.verified || company.status !== "approved") {
    throw new Error("Only verified companies can post jobs");
  }

  // Convert deadline from ISO string to Date if provided
  const deadline = data.deadline 
    ? (typeof data.deadline === 'string' ? new Date(data.deadline) : data.deadline)
    : null;

  // Create the job
  const [job] = await db
    .insert(jobs)
    .values({
      ...data,
      deadline,
      companyId: company.id,
    })
    .returning();

  // Get eligible students and send email notifications
  try {
    const eligibleStudents = await db.query.students.findMany({
      where: and(
        eq(students.status, "approved"),
        // Filter by CGPA and course
      ),
    });

    // Filter eligible students based on criteria
    const filteredStudents = eligibleStudents.filter((student) => {
      // Check CGPA cutoff
      if (data.cgpaCutoff && student.cgpa) {
        const studentCgpa = parseFloat(student.cgpa);
        const cutoff = parseFloat(data.cgpaCutoff);
        if (isNaN(studentCgpa) || studentCgpa < cutoff) {
          return false;
        }
      }

      // Check course eligibility
      if (data.eligibleCourses && data.eligibleCourses.length > 0 && student.course) {
        if (!data.eligibleCourses.includes(student.course)) {
          return false;
        }
      }

      // Check degree eligibility
      if (data.eligibleDegrees && data.eligibleDegrees.length > 0 && student.degree) {
        if (!data.eligibleDegrees.includes(student.degree)) {
          return false;
        }
      }

      return true;
    });

    // Send emails to eligible students (in batches to avoid rate limits)
    const emailPromises = filteredStudents.map(async (student) => {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "GitHired <githired@bhavesh-budharaju.in>",
          to: [student.email],
          subject: `New Job Opportunity: ${data.title} at ${company.name}`,
          react: NewJobNotificationEmail({
            studentName: student.email.split("@")[0], // Use email prefix as fallback
            jobTitle: data.title,
            companyName: company.name,
            jobType: data.type,
            location: data.location,
            salary: data.salary || "Not specified",
            jobUrl: `${getAppBaseUrl()}/dashboard/jobs`,
          }),
        });
      } catch (error) {
        console.error(`Failed to send email to ${student.email}:`, error);
        // Don't throw - continue with other emails
      }
    });

    await Promise.all(emailPromises);
    console.log(`✅ Sent job notifications to ${filteredStudents.length} eligible students`);
  } catch (error) {
    console.error("Error sending job notifications:", error);
    // Don't throw - job is already created
  }

  // Update company analytics
  await db
    .update(companies)
    .set({
      analytics: {
        ...(company.analytics as any),
        jobPosts: ((company.analytics as any)?.jobPosts || 0) + 1,
      },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, company.id));

  return job;
}

export async function updateJob(jobId: string, data: Partial<InsertJob>) {
  const { company } = await checkCompanyAuth();

  // Verify job belongs to this company
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job || job.companyId !== company.id) {
    throw new Error("Job not found or unauthorized");
  }

  // Convert deadline from ISO string to Date if provided
  const deadline = data.deadline 
    ? (typeof data.deadline === 'string' ? new Date(data.deadline) : data.deadline)
    : undefined;

  const [updatedJob] = await db
    .update(jobs)
    .set({
      ...data,
      ...(deadline !== undefined && { deadline }),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updatedJob;
}

export async function deleteJob(jobId: string) {
  const { company } = await checkCompanyAuth();

  // Verify job belongs to this company
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job || job.companyId !== company.id) {
    throw new Error("Job not found or unauthorized");
  }

  await db.delete(jobs).where(eq(jobs.id, jobId));

  return { success: true };
}

export async function toggleJobStatus(jobId: string) {
  const { company } = await checkCompanyAuth();

  // Verify job belongs to this company
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job || job.companyId !== company.id) {
    throw new Error("Job not found or unauthorized");
  }

  const newStatus = job.status === "active" ? "stopped" : "active";

  const [updatedJob] = await db
    .update(jobs)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updatedJob;
}

export async function getCompanyJobs() {
  const { company } = await checkCompanyAuth();

  const companyJobs = await db.query.jobs.findMany({
    where: eq(jobs.companyId, company.id),
    orderBy: [desc(jobs.createdAt)],
  });

  return companyJobs;
}

export async function getActiveJobs() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Get all active jobs with company info
  const activeJobs = await db
    .select({
      job: jobs,
      company: companies,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(
      eq(jobs.status, "active"),
      eq(companies.verified, true),
      eq(companies.status, "approved")
    ))
    .orderBy(desc(jobs.createdAt));

  return activeJobs;
}

export async function getAllJobs() {
  await checkAdmin();

  const allJobs = await db
    .select({
      job: jobs,
      company: companies,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .orderBy(desc(jobs.createdAt));

  return allJobs;
}

export async function getJobById(jobId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const jobData = await db
    .select({
      job: jobs,
      company: companies,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!jobData || jobData.length === 0) {
    throw new Error("Job not found");
  }

  // Increment view count
  const currentAnalytics = jobData[0].job.analytics as any;
  await db
    .update(jobs)
    .set({
      analytics: {
        ...currentAnalytics,
        views: (currentAnalytics?.views || 0) + 1,
      },
    })
    .where(eq(jobs.id, jobId));

  return jobData[0];
}

export async function checkJobEligibility(jobId: string, studentId: string) {
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });

  if (!job || !student) {
    return { eligible: false, reason: "Job or student not found" };
  }

  // Check CGPA cutoff
  if (job.cgpaCutoff && student.cgpa) {
    const studentCgpa = parseFloat(student.cgpa);
    const cutoff = parseFloat(job.cgpaCutoff);
    if (!isNaN(studentCgpa) && !isNaN(cutoff) && studentCgpa < cutoff) {
      return { eligible: false, reason: `CGPA below cutoff (${cutoff})` };
    }
  }

  // Check course eligibility
  if (job.eligibleCourses && job.eligibleCourses.length > 0 && student.course) {
    if (!job.eligibleCourses.includes(student.course)) {
      return { eligible: false, reason: `Course ${student.course} not eligible` };
    }
  }

  // Check degree eligibility
  if (job.eligibleDegrees && job.eligibleDegrees.length > 0 && student.degree) {
    if (!job.eligibleDegrees.includes(student.degree)) {
      return { eligible: false, reason: `Degree ${student.degree} not eligible` };
    }
  }

  return { eligible: true, reason: null };
}

