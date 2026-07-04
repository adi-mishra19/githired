import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { analyzeResumeATS } from "@/lib/ai/ats-analyzer";
import { db } from "@/db/drizzle";
import { atsScans, students } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeUrl, resumeLabel, jobDescription } = body;

    if (!resumeUrl) {
      return NextResponse.json(
        { error: "Resume URL is required" },
        { status: 400 }
      );
    }

    // Get student profile
    const student = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id)
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Analyze resume with Gemini
    const analysis = await analyzeResumeATS(resumeUrl, jobDescription);

    // Save to database
    const [scan] = await db
      .insert(atsScans)
      .values({
        studentId: student.id,
        resumeUrl,
        resumeLabel: resumeLabel || "Resume",
        score: analysis.score.toString(),
        analysis: analysis as any,
        jobDescription: jobDescription || null,
        matchedKeywords: analysis.keywordMatches,
        missingKeywords: analysis.missingKeywords,
        suggestions: analysis.suggestions as any,
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        score: scan.score,
        analysis: scan.analysis,
        createdAt: scan.createdAt
      }
    });
  } catch (error: any) {
    console.error("ATS scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze resume" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student profile
    const student = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id)
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Get scan history
    const history = await db.query.atsScans.findMany({
      where: eq(atsScans.studentId, student.id),
      orderBy: [desc(atsScans.createdAt)],
      limit: 20
    });

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error: any) {
    console.error("ATS history error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ATS scan history" },
      { status: 500 }
    );
  }
}

// Delete a specific scan
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get("id");

    if (!scanId) {
      return NextResponse.json(
        { error: "Scan ID is required" },
        { status: 400 }
      );
    }

    // Get student profile
    const student = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id)
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Delete the scan (only if it belongs to this student)
    await db
      .delete(atsScans)
      .where(eq(atsScans.id, scanId));

    return NextResponse.json({
      success: true,
      message: "Scan deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete scan" },
      { status: 500 }
    );
  }
}

