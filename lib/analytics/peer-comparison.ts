import { db } from "@/db/drizzle";
import { students, applications, user } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";

export interface PeerComparison {
  cgpa: {
    yourCgpa: number;
    average: number;
    percentile: number;
    rank: number;
    total: number;
  };
  applications: {
    yourCount: number;
    average: number;
    percentile: number;
  };
  successRate: {
    yourRate: number;
    average: number;
    percentile: number;
  };
  skills: {
    yourCount: number;
    average: number;
    topSkills: Array<{ skill: string; count: number }>;
  };
  profileCompleteness: {
    yourScore: number;
    average: number;
    percentile: number;
  };
}

export async function generatePeerComparison(studentId: string): Promise<PeerComparison> {
  try {
    // Get current student data
    const currentStudent = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      with: { user: true }
    });

    if (!currentStudent) {
      throw new Error("Student not found");
    }

    // Get all approved students (excluding admins)
    const allStudents = await db.query.students.findMany({
      where: and(
        eq(students.status, "approved"),
        ne(students.id, studentId)
      ),
      with: { user: true }
    });

    // Filter out admin users
    const peers = allStudents.filter(s => s.user.role !== "admin");

    // Calculate CGPA comparison
    const cgpaComparison = await calculateCGPAComparison(currentStudent, peers);

    // Calculate applications comparison
    const applicationsComparison = await calculateApplicationsComparison(studentId, peers);

    // Calculate success rate comparison
    const successRateComparison = await calculateSuccessRateComparison(studentId, peers);

    // Calculate skills comparison
    const skillsComparison = calculateSkillsComparison(currentStudent, peers);

    // Calculate profile completeness
    const completenessComparison = calculateProfileCompleteness(currentStudent, peers);

    return {
      cgpa: cgpaComparison,
      applications: applicationsComparison,
      successRate: successRateComparison,
      skills: skillsComparison,
      profileCompleteness: completenessComparison
    };
  } catch (error: any) {
    console.error("Peer comparison error:", error);
    throw new Error("Failed to generate peer comparison: " + error.message);
  }
}

async function calculateCGPAComparison(
  currentStudent: any,
  peers: any[]
): Promise<PeerComparison['cgpa']> {
  const yourCgpa = parseFloat(currentStudent.cgpa || "0");
  
  // Get valid CGPAs from peers (excluding the current student)
  const peerCGPAs = peers
    .map(s => parseFloat(s.cgpa || "0"))
    .filter(cgpa => cgpa > 0)
    .sort((a, b) => a - b);

  // Edge case: No peers to compare with
  if (peerCGPAs.length === 0) {
    return {
      yourCgpa,
      average: 0, // No peer data
      percentile: 100, // Top of the class by default (only student)
      rank: 1,
      total: 1
    };
  }

  const average = peerCGPAs.reduce((sum, cgpa) => sum + cgpa, 0) / peerCGPAs.length;
  
  // Calculate percentile: how many students you're better than
  const studentsBelow = peerCGPAs.filter(cgpa => cgpa < yourCgpa).length;
  const percentile = peerCGPAs.length > 0 
    ? (studentsBelow / peerCGPAs.length) * 100 
    : 100;
  
  // Rank among all students (including yourself)
  const allCGPAs = [...peerCGPAs, yourCgpa].sort((a, b) => b - a); // Sort descending for ranking
  const yourRank = allCGPAs.indexOf(yourCgpa) + 1;

  return {
    yourCgpa,
    average: Math.round(average * 100) / 100,
    percentile: Math.round(percentile),
    rank: yourRank,
    total: allCGPAs.length
  };
}

async function calculateApplicationsComparison(
  studentId: string,
  peers: any[]
): Promise<PeerComparison['applications']> {
  // Get current student's applications
  const yourApplications = await db.query.applications.findMany({
    where: eq(applications.studentId, studentId)
  });

  const yourCount = yourApplications.length;

  // Get application counts for all peers
  const peerCounts = await Promise.all(
    peers.map(async (peer) => {
      const apps = await db.query.applications.findMany({
        where: eq(applications.studentId, peer.id)
      });
      return apps.length;
    })
  );

  // Edge case: No peers
  if (peerCounts.length === 0) {
    return {
      yourCount,
      average: 0,
      percentile: 100
    };
  }

  const average = peerCounts.reduce((sum, count) => sum + count, 0) / peerCounts.length;
  const studentsBelow = peerCounts.filter(count => count < yourCount).length;
  const percentile = (studentsBelow / peerCounts.length) * 100;

  return {
    yourCount,
    average: Math.round(average * 10) / 10,
    percentile: Math.round(percentile)
  };
}

async function calculateSuccessRateComparison(
  studentId: string,
  peers: any[]
): Promise<PeerComparison['successRate']> {
  // Get current student's applications
  const yourApplications = await db.query.applications.findMany({
    where: eq(applications.studentId, studentId)
  });

  const yourTotal = yourApplications.length;
  const yourSelected = yourApplications.filter(app => app.status === "selected").length;
  const yourRate = yourTotal > 0 ? (yourSelected / yourTotal) * 100 : 0;

  // Get success rates for all peers
  const peerRates = await Promise.all(
    peers.map(async (peer) => {
      const apps = await db.query.applications.findMany({
        where: eq(applications.studentId, peer.id)
      });
      const total = apps.length;
      const selected = apps.filter(app => app.status === "selected").length;
      return total > 0 ? (selected / total) * 100 : 0;
    })
  );

  // Edge case: No peers
  if (peerRates.length === 0) {
    return {
      yourRate: Math.round(yourRate),
      average: 0,
      percentile: 100
    };
  }

  const average = peerRates.reduce((sum, rate) => sum + rate, 0) / peerRates.length;
  const studentsBelow = peerRates.filter(rate => rate < yourRate).length;
  const percentile = (studentsBelow / peerRates.length) * 100;

  return {
    yourRate: Math.round(yourRate),
    average: Math.round(average),
    percentile: Math.round(percentile)
  };
}

function calculateSkillsComparison(
  currentStudent: any,
  peers: any[]
): PeerComparison['skills'] {
  const yourSkills = currentStudent.skills || [];
  const yourCount = yourSkills.length;

  // Count skills across all peers
  const skillCounts: Record<string, number> = {};
  let totalSkillCount = 0;

  peers.forEach(peer => {
    const peerSkills = peer.skills || [];
    totalSkillCount += peerSkills.length;
    
    peerSkills.forEach((skill: string) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });

  const average = peers.length > 0 ? totalSkillCount / peers.length : yourCount;

  // Get top 10 skills
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  return {
    yourCount,
    average: Math.round(average * 10) / 10,
    topSkills
  };
}

function calculateProfileCompleteness(
  currentStudent: any,
  peers: any[]
): PeerComparison['profileCompleteness'] {
  const yourScore = calculateCompletenessScore(currentStudent);

  const peerScores = peers.map(peer => calculateCompletenessScore(peer));

  // Edge case: No peers
  if (peerScores.length === 0) {
    return {
      yourScore,
      average: 0,
      percentile: 100
    };
  }

  const average = peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length;
  const studentsBelow = peerScores.filter(score => score < yourScore).length;
  const percentile = (studentsBelow / peerScores.length) * 100;

  return {
    yourScore,
    average: Math.round(average),
    percentile: Math.round(percentile)
  };
}

function calculateCompletenessScore(student: any): number {
  let score = 0;
  const maxScore = 100;

  // Basic info (20 points)
  if (student.phone) score += 5;
  if (student.cgpa) score += 5;
  if (student.degree) score += 5;
  if (student.course) score += 5;

  // Skills (15 points)
  const skills = student.skills || [];
  if (skills.length > 0) score += 5;
  if (skills.length >= 5) score += 5;
  if (skills.length >= 10) score += 5;

  // Projects (15 points)
  const projects = (student.projects as any[]) || [];
  if (projects.length > 0) score += 5;
  if (projects.length >= 2) score += 5;
  if (projects.length >= 3) score += 5;

  // Experience (15 points)
  const experience = (student.experience as any[]) || [];
  if (experience.length > 0) score += 5;
  if (experience.length >= 2) score += 10;

  // Certifications (10 points)
  const certifications = (student.certifications as any[]) || [];
  if (certifications.length > 0) score += 5;
  if (certifications.length >= 2) score += 5;

  // Resume (10 points)
  const resumes = (student.resumes as any[]) || [];
  if (resumes.length > 0) score += 10;

  // Profile links (10 points)
  if (student.githubUrl) score += 3;
  if (student.linkedinUrl) score += 4;
  if (student.portfolioUrl) score += 3;

  // Bio/About (5 points)
  if (student.bio || student.aboutMe) score += 5;

  return Math.min(score, maxScore);
}

