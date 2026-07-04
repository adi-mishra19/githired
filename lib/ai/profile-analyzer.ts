import { generateStructuredResponse } from "./llm-provider";
import { db } from "@/db/drizzle";
import { students, jobs, applications } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ProfileGap {
  category: "projects" | "skills" | "certifications" | "experience" | "education";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionItems: string[];
}

export async function analyzeProfileGaps(studentId: string): Promise<ProfileGap[]> {
  try {
    // Get student data
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId)
    });

    if (!student) {
      throw new Error("Student not found");
    }

    // Get market insights from active jobs
    const activeJobs = await db.query.jobs.findMany({
      where: eq(jobs.status, "active"),
      limit: 50
    });

    // Get student's applications
    const studentApplications = await db.query.applications.findMany({
      where: eq(applications.studentId, studentId)
    });

    // Build context for AI
    const studentProfile = {
      cgpa: student.cgpa || "Not provided",
      degree: student.degree || "Not provided",
      course: student.course || "Not provided",
      skills: (student.skills || []).length,
      skillsList: student.skills || [],
      projects: ((student.projects as any[]) || []).length,
      certifications: ((student.certifications as any[]) || []).length,
      experience: ((student.experience as any[]) || []).length,
      totalApplications: studentApplications.length,
      hasResume: !!(student.resumes && (student.resumes as any[]).length > 0)
    };

    // Extract market insights
    const topSkillsInMarket = extractTopSkills(activeJobs);
    const averageRequirements = calculateAverageRequirements(activeJobs);

    const prompt = `You are a career advisor analyzing a student's profile to identify gaps and provide actionable recommendations.

STUDENT PROFILE:
- CGPA: ${studentProfile.cgpa}
- Degree: ${studentProfile.degree}
- Course: ${studentProfile.course}
- Skills: ${studentProfile.skills} skills listed (${studentProfile.skillsList.slice(0, 10).join(", ")})
- Projects: ${studentProfile.projects} projects
- Certifications: ${studentProfile.certifications} certifications
- Work Experience: ${studentProfile.experience} entries
- Total Applications: ${studentProfile.totalApplications}
- Resume Uploaded: ${studentProfile.hasResume ? "Yes" : "No"}

MARKET INSIGHTS:
- Top skills in demand: ${topSkillsInMarket.join(", ")}
- Average skills expected: ${averageRequirements.skills}
- Average projects expected: ${averageRequirements.projects}
- Active job opportunities: ${activeJobs.length}

TASK:
Analyze this student's profile and identify 3-5 key gaps or areas for improvement. For each gap:
1. Categorize it (projects, skills, certifications, experience, or education)
2. Provide a clear, encouraging title
3. Explain why this is important for their career
4. Give 2-4 specific, actionable steps they can take

Prioritize gaps that will have the most impact on their job prospects. Be specific and practical.`;

    const schema = `{
  "gaps": [
    {
      "category": "projects" | "skills" | "certifications" | "experience" | "education",
      "title": "string (encouraging and specific)",
      "description": "string (why this matters for their career)",
      "priority": "high" | "medium" | "low",
      "actionItems": ["string (specific actionable step)", ...]
    }
  ]
}`;

    const response = await generateStructuredResponse<{ gaps: ProfileGap[] }>(prompt, schema);
    return response.gaps || [];
  } catch (error: any) {
    console.error("Profile gap analysis error:", error);
    throw new Error("Failed to analyze profile gaps: " + error.message);
  }
}

function extractTopSkills(jobs: any[]): string[] {
  const skillCount: Record<string, number> = {};
  
  jobs.forEach(job => {
    const jobSkills = (job.skills as string[]) || [];
    jobSkills.forEach(skill => {
      if (typeof skill === 'string') {
        skillCount[skill] = (skillCount[skill] || 0) + 1;
      }
    });
  });

  return Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);
}

function calculateAverageRequirements(jobs: any[]): { skills: number; projects: number } {
  if (jobs.length === 0) {
    return { skills: 5, projects: 2 };
  }

  const totalSkills = jobs.reduce((sum, job) => {
    return sum + ((job.skills as any[]) || []).length;
  }, 0);

  return {
    skills: Math.round(totalSkills / jobs.length) || 5,
    projects: 2 // Typical expectation
  };
}

