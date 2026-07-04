import { generateStructuredResponse } from "./llm-provider";
import { db } from "@/db/drizzle";
import { students, companies, jobs, applications, user } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface Suggestion {
  type: "insight" | "action" | "recommendation";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export async function generateStudentSuggestions(studentId: string): Promise<Suggestion[]> {
  try {
    // Get student data
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId)
    });

    if (!student) return [];

    // Get student's applications
    const studentApplications = await db.query.applications.findMany({
      where: eq(applications.studentId, studentId),
      with: {
        job: true
      }
    });

    // Get all active jobs
    const activeJobs = await db.query.jobs.findMany({
      where: eq(jobs.status, "active")
    });

    // Calculate metrics
    const totalApplications = studentApplications.length;
    const selectedApplications = studentApplications.filter(a => a.status === "selected").length;
    const successRate = totalApplications > 0 ? (selectedApplications / totalApplications) * 100 : 0;

    // Check eligibility for active jobs
    const eligibleJobs = activeJobs.filter(job => {
      const cgpaCutoff = parseFloat(job.cgpaCutoff || "0");
      const studentCgpa = parseFloat(student.cgpa || "0");
      
      const meetsGPA = studentCgpa >= cgpaCutoff;
      const meetsCourse = !job.eligibleCourses || 
        (job.eligibleCourses as string[]).includes(student.course || "");
      const meetsDegree = !job.eligibleDegrees || 
        (job.eligibleDegrees as string[]).includes(student.degree || "");

      return meetsGPA && meetsCourse && meetsDegree;
    });

    const appliedJobIds = new Set(studentApplications.map(a => a.jobId));
    const unappliedEligibleJobs = eligibleJobs.filter(j => !appliedJobIds.has(j.id));

    const suggestions: Suggestion[] = [];

    // Suggestion 1: Unapplied eligible jobs
    if (unappliedEligibleJobs.length > 0) {
      suggestions.push({
        type: "action",
        title: `${unappliedEligibleJobs.length} new jobs match your profile`,
        description: `You're eligible for ${unappliedEligibleJobs.length} jobs that you haven't applied to yet. Consider reviewing and applying to increase your chances.`,
        priority: "high"
      });
    }

    // Suggestion 2: Application success rate
    if (totalApplications >= 5) {
      if (successRate < 10) {
        suggestions.push({
          type: "insight",
          title: "Low selection rate detected",
          description: `Your current selection rate is ${successRate.toFixed(1)}%. Consider tailoring your applications to better match job requirements and highlighting relevant skills.`,
          priority: "high"
        });
      } else if (successRate > 30) {
        suggestions.push({
          type: "insight",
          title: "Great job! Above average success rate",
          description: `Your selection rate of ${successRate.toFixed(1)}% is above average. Keep up the excellent work!`,
          priority: "low"
        });
      }
    }

    // Suggestion 3: Profile completeness
    const hasSkills = student.skills && (student.skills as any[]).length > 0;
    const hasCertifications = student.certifications && (student.certifications as any[]).length > 0;
    const hasExperience = student.experience && (student.experience as any[]).length > 0;
    const hasResume = student.resumes && (student.resumes as any[]).length > 0;

    if (!hasSkills || !hasResume) {
      suggestions.push({
        type: "action",
        title: "Complete your profile",
        description: "Profiles with skills and resumes get 3x more attention from recruiters. Add these to stand out!",
        priority: "high"
      });
    }

    // Suggestion 4: CGPA improvement
    const studentCgpa = parseFloat(student.cgpa || "0");
    const higherCgpaJobs = activeJobs.filter(job => {
      const cgpaCutoff = parseFloat(job.cgpaCutoff || "0");
      return cgpaCutoff > studentCgpa && cgpaCutoff <= studentCgpa + 0.5;
    });

    if (higherCgpaJobs.length > 0) {
      suggestions.push({
        type: "insight",
        title: `${higherCgpaJobs.length} jobs just out of reach`,
        description: `Improving your CGPA by 0.5 points could make you eligible for ${higherCgpaJobs.length} more opportunities.`,
        priority: "medium"
      });
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions

  } catch (error) {
    console.error("Error generating student suggestions:", error);
    return [];
  }
}

export async function generateCompanySuggestions(companyId: string): Promise<Suggestion[]> {
  try {
    // Get company's jobs
    const companyJobs = await db.query.jobs.findMany({
      where: eq(jobs.companyId, companyId)
    });

    if (companyJobs.length === 0) {
      return [{
        type: "action",
        title: "Post your first job",
        description: "Start hiring by posting your first job listing. It only takes a few minutes!",
        priority: "high"
      }];
    }

    // Get applications for company's jobs
    const jobIds = companyJobs.map(j => j.id);
    const companyApplications = await db.query.applications.findMany({
      where: sql`${applications.jobId} = ANY(${jobIds})`
    });

    const suggestions: Suggestion[] = [];

    // Calculate average applications per job
    const avgApplications = companyApplications.length / companyJobs.length;

    if (avgApplications < 5) {
      suggestions.push({
        type: "recommendation",
        title: "Low application rates detected",
        description: "Your jobs are getting fewer applications than average. Consider adjusting CGPA requirements or adding more benefits to attract candidates.",
        priority: "high"
      });
    }

    // Check for jobs with very high CGPA requirements
    const highCgpaJobs = companyJobs.filter(job => parseFloat(job.cgpaCutoff || "0") > 8.5);
    
    if (highCgpaJobs.length > 0) {
      const highCgpaAppCount = companyApplications.filter(app => 
        highCgpaJobs.some(job => job.id === app.jobId)
      ).length;

      if (highCgpaAppCount / highCgpaJobs.length < 3) {
        suggestions.push({
          type: "recommendation",
          title: "High CGPA cutoffs limiting applicant pool",
          description: `${highCgpaJobs.length} of your jobs have CGPA >8.5. Lowering to 7.5-8.0 could increase your applicant pool by 40%.`,
          priority: "medium"
        });
      }
    }

    // Check hiring funnel efficiency
    const totalApps = companyApplications.length;
    const selectedApps = companyApplications.filter(a => a.status === "selected").length;
    const interviewApps = companyApplications.filter(a => a.status === "interview").length;

    if (totalApps > 10 && selectedApps === 0) {
      suggestions.push({
        type: "insight",
        title: "Update application statuses",
        description: `You have ${totalApps} applications but no selections yet. Keep applicants engaged by updating their status as you progress through hiring.`,
        priority: "medium"
      });
    }

    // Job posting frequency
    const recentJobs = companyJobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return jobDate > thirtyDaysAgo;
    });

    if (recentJobs.length === 0 && companyJobs.length > 0) {
      suggestions.push({
        type: "action",
        title: "Post new opportunities",
        description: "You haven't posted any jobs in the last 30 days. Regular postings help maintain visibility with students.",
        priority: "low"
      });
    }

    return suggestions.slice(0, 5);

  } catch (error) {
    console.error("Error generating company suggestions:", error);
    return [];
  }
}

export async function generateAdminSuggestions(): Promise<Suggestion[]> {
  try {
    const suggestions: Suggestion[] = [];

    // Get platform statistics
    const allStudents = await db.query.students.findMany({
      with: { user: true }
    });
    const allCompanies = await db.query.companies.findMany({
      with: { user: true }
    });
    
    // Filter out admin users from students and companies
    const totalStudents = allStudents.filter(s => s.user.role !== "admin");
    const totalCompanies = allCompanies.filter(c => c.user.role !== "admin");
    
    const totalJobs = await db.query.jobs.findMany();
    const totalApplications = await db.query.applications.findMany();

    // Check for pending approvals (also filter admins)
    const pendingStudents = totalStudents.filter(s => s.status === "pending");
    const pendingCompanies = totalCompanies.filter(c => c.status === "pending");

    if (pendingStudents.length > 0 || pendingCompanies.length > 0) {
      suggestions.push({
        type: "action",
        title: `${pendingStudents.length + pendingCompanies.length} pending approvals`,
        description: `${pendingStudents.length} students and ${pendingCompanies.length} companies are waiting for approval. Review them to keep users engaged.`,
        priority: "high"
      });
    }

    // Platform engagement
    const activeJobs = totalJobs.filter(j => j.status === "active");
    const recentApplications = totalApplications.filter(app => {
      const appDate = new Date(app.appliedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return appDate > sevenDaysAgo;
    });

    if (activeJobs.length === 0 && totalJobs.length > 0) {
      suggestions.push({
        type: "insight",
        title: "No active jobs on platform",
        description: "All jobs are currently inactive. Consider reaching out to companies to post new opportunities.",
        priority: "high"
      });
    }

    // Application-to-job ratio
    if (activeJobs.length > 0) {
      const appsPerJob = totalApplications.length / totalJobs.length;
      
      if (appsPerJob < 3) {
        suggestions.push({
          type: "insight",
          title: "Low application rates",
          description: `Average ${appsPerJob.toFixed(1)} applications per job. Consider promoting the platform to students to increase engagement.`,
          priority: "medium"
        });
      }
    }

    // Recent activity
    suggestions.push({
      type: "insight",
      title: "Platform activity this week",
      description: `${recentApplications.length} new applications in the last 7 days. ${totalStudents.length} total students, ${activeJobs.length} active jobs.`,
      priority: "low"
    });

    return suggestions.slice(0, 5);

  } catch (error) {
    console.error("Error generating admin suggestions:", error);
    return [];
  }
}

