"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { applications, jobs, students, companies, Application, InsertApplication } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Resend } from "resend";
import ApplicationStatusUpdateEmail, { getStatusMessage } from "@/components/emails/application-status-update";
import { getAppBaseUrl } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

async function checkStudentAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const student = await db.query.students.findFirst({
    where: eq(students.userId, session.user.id),
  });

  if (!student) {
    throw new Error("Student profile not found");
  }

  return { session, student };
}

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

export async function applyToJob(
  jobId: string,
  coverLetter?: string,
  resumeUrl?: string,
  resumeLabel?: string
) {
  const { student } = await checkStudentAuth();

  // Check if student is approved
  if (student.status !== "approved") {
    throw new Error("Your profile must be approved before applying to jobs");
  }

  // Check if job exists and is active
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job) {
    throw new Error("Job not found");
  }

  if (job.status !== "active") {
    throw new Error("This job is no longer accepting applications");
  }

  // Check if deadline has passed
  if (job.deadline) {
    const now = new Date();
    const deadline = new Date(job.deadline);
    if (now > deadline) {
      throw new Error("Application deadline has passed");
    }
  }

  // Check eligibility
  const eligibilityCheck = await checkEligibility(job, student);
  if (!eligibilityCheck.eligible) {
    throw new Error(`Not eligible: ${eligibilityCheck.reason}`);
  }

  // Check if already applied
  const existingApplication = await db.query.applications.findFirst({
    where: and(
      eq(applications.jobId, jobId),
      eq(applications.studentId, student.id)
    ),
  });

  if (existingApplication) {
    throw new Error("You have already applied to this job");
  }

  // Create application with snapshot of student data
  const [application] = await db
    .insert(applications)
    .values({
      jobId,
      studentId: student.id,
      studentCgpa: student.cgpa,
      studentCourse: student.course,
      studentDegree: student.degree,
      coverLetter,
      resumeUrl: resumeUrl || student.resumeUrl || (student.resumes as any)?.[0]?.url,
      resumeLabel: resumeLabel || "Default Resume",
      status: "pending",
    })
    .returning();

  // Update job analytics
  const currentAnalytics = job.analytics as any;
  await db
    .update(jobs)
    .set({
      analytics: {
        ...currentAnalytics,
        applications: (currentAnalytics?.applications || 0) + 1,
      },
    })
    .where(eq(jobs.id, jobId));

  // Update student analytics
  const studentAnalytics = student.analytics as any;
  await db
    .update(students)
    .set({
      analytics: {
        ...studentAnalytics,
        applications: (studentAnalytics?.applications || 0) + 1,
      },
      updatedAt: new Date(),
    })
    .where(eq(students.id, student.id));

  return application;
}

async function checkEligibility(job: any, student: any) {
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

export async function getJobApplications(jobId: string) {
  const { company } = await checkCompanyAuth();

  // Verify job belongs to this company
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job || job.companyId !== company.id) {
    throw new Error("Job not found or unauthorized");
  }

  // Get all applications for this job with student details
  const jobApplications = await db
    .select({
      application: applications,
      student: students,
    })
    .from(applications)
    .innerJoin(students, eq(applications.studentId, students.id))
    .where(eq(applications.jobId, jobId))
    .orderBy(desc(applications.appliedAt));

  // Rank applications by CGPA and skills match
  const rankedApplications = jobApplications
    .map((app) => {
      const cgpa = parseFloat(app.application.studentCgpa || "0");
      
      // Calculate skills match percentage
      const jobSkills = job.skills || [];
      const studentSkills = app.student.skills || [];
      let skillsMatch = 0;
      
      if (jobSkills.length > 0 && studentSkills.length > 0) {
        // Normalize skills for better matching
        const normalizeSkill = (skill: string) => 
          skill.toLowerCase().trim().replace(/[.\-\s]/g, '');
        
        const normalizedJobSkills = jobSkills.map(normalizeSkill);
        const normalizedStudentSkills = studentSkills.map(normalizeSkill);
        
        // Count matches with bidirectional fuzzy matching
        const matchingSkills = jobSkills.filter((jobSkill: string, index: number) => {
          const normalizedJobSkill = normalizedJobSkills[index];
          
          return studentSkills.some((studentSkill: string, sIndex: number) => {
            const normalizedStudentSkill = normalizedStudentSkills[sIndex];
            
            // Bidirectional substring matching (handles JS/JavaScript, React/ReactJS, etc.)
            return normalizedJobSkill.includes(normalizedStudentSkill) || 
                   normalizedStudentSkill.includes(normalizedJobSkill);
          });
        });
        
        skillsMatch = (matchingSkills.length / jobSkills.length) * 100;
      }

      return {
        ...app,
        ranking: {
          cgpa,
          skillsMatch,
          score: cgpa * 10 + skillsMatch, // Combined score
        },
      };
    })
    .sort((a, b) => b.ranking.score - a.ranking.score);

  return rankedApplications;
}

export async function getStudentApplications() {
  const { student } = await checkStudentAuth();

  const studentApplications = await db
    .select({
      application: applications,
      job: jobs,
      company: companies,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(applications.studentId, student.id))
    .orderBy(desc(applications.appliedAt));

  return studentApplications;
}

export async function getAllApplications() {
  await checkAdmin();

  const allApplications = await db
    .select({
      application: applications,
      job: jobs,
      student: students,
      company: companies,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(students, eq(applications.studentId, students.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .orderBy(desc(applications.appliedAt));

  return allApplications;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "pending" | "oa" | "interview" | "selected" | "rejected"
) {
  const { company } = await checkCompanyAuth();

  // Get application with job and student details
  const applicationData = await db
    .select({
      application: applications,
      job: jobs,
      student: students,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(students, eq(applications.studentId, students.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!applicationData || applicationData.length === 0) {
    throw new Error("Application not found");
  }

  // Verify job belongs to this company
  if (applicationData[0].job.companyId !== company.id) {
    throw new Error("Unauthorized");
  }

  const currentStatus = applicationData[0].application.status;
  
  const [updatedApplication] = await db
    .update(applications)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning();

  // Send email notification to student if status changed and is not pending
  if (status !== currentStatus && status !== "pending") {
    try {
      const student = applicationData[0].student;
      const job = applicationData[0].job;
      const statusInfo = getStatusMessage(status);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "GitHired <githired@bhavesh-budharaju.in>",
        to: [student.email],
        subject: `${statusInfo.subject} - ${job.title} at ${company.name}`,
        react: ApplicationStatusUpdateEmail({
          studentName: student.email.split("@")[0], // Use email prefix as fallback
          jobTitle: job.title,
          companyName: company.name,
          status,
          jobUrl: `${getAppBaseUrl()}/dashboard/applications`,
        }),
      });

      console.log(`✅ Status update email sent to ${student.email} for job ${job.title} - Status: ${status}`);
    } catch (error) {
      console.error("Failed to send status update email:", error);
      // Don't throw - status was already updated successfully
    }
  }

  return updatedApplication;
}

export async function checkIfApplied(jobId: string) {
  const { student } = await checkStudentAuth();

  const application = await db.query.applications.findFirst({
    where: and(
      eq(applications.jobId, jobId),
      eq(applications.studentId, student.id)
    ),
  });

  return !!application;
}

