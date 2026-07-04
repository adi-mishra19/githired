import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { analyzeProfileGaps } from "@/lib/ai/profile-analyzer";
import { db } from "@/db/drizzle";
import { students, profileSuggestions } from "@/db/schema";
import { eq } from "drizzle-orm";

// Check if suggestions are recent (less than 24 hours old)
function isRecent(lastGenerated: Date): boolean {
  const now = new Date();
  const hoursSinceGeneration = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);
  return hoursSinceGeneration < 24;
}

export async function GET() {
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

    // Check cache (refresh if older than 24 hours)
    const cached = await db.query.profileSuggestions.findFirst({
      where: eq(profileSuggestions.studentId, student.id)
    });

    if (cached && isRecent(cached.lastGenerated)) {
      return NextResponse.json({
        suggestions: cached.suggestions,
        fromCache: true,
        lastGenerated: cached.lastGenerated
      });
    }

    // Generate new suggestions
    const gaps = await analyzeProfileGaps(student.id);

    // Save to cache
    await db
      .insert(profileSuggestions)
      .values({
        studentId: student.id,
        suggestions: gaps as any,
        lastGenerated: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: profileSuggestions.studentId,
        set: { 
          suggestions: gaps as any, 
          lastGenerated: new Date(),
          updatedAt: new Date()
        }
      });

    return NextResponse.json({
      suggestions: gaps,
      fromCache: false,
      lastGenerated: new Date()
    });
  } catch (error: any) {
    console.error("Profile suggestions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate profile suggestions" },
      { status: 500 }
    );
  }
}

// Force refresh suggestions
export async function POST() {
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

    // Generate new suggestions (force refresh)
    const gaps = await analyzeProfileGaps(student.id);

    // Update cache
    await db
      .insert(profileSuggestions)
      .values({
        studentId: student.id,
        suggestions: gaps as any,
        lastGenerated: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: profileSuggestions.studentId,
        set: { 
          suggestions: gaps as any, 
          lastGenerated: new Date(),
          updatedAt: new Date()
        }
      });

    return NextResponse.json({
      suggestions: gaps,
      refreshed: true,
      lastGenerated: new Date()
    });
  } catch (error: any) {
    console.error("Profile suggestions refresh error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh profile suggestions" },
      { status: 500 }
    );
  }
}

