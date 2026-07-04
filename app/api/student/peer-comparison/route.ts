import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generatePeerComparison } from "@/lib/analytics/peer-comparison";
import { db } from "@/db/drizzle";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Generate peer comparison
    const comparison = await generatePeerComparison(student.id);

    return NextResponse.json({
      success: true,
      comparison,
      generatedAt: new Date()
    });
  } catch (error: any) {
    console.error("Peer comparison error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate peer comparison" },
      { status: 500 }
    );
  }
}

