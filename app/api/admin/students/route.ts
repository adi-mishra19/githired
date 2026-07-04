import { NextRequest, NextResponse } from "next/server";
import { getAllStudents } from "@/server/admin";
import { db } from "@/db/drizzle";
import { students, user } from "@/db/schema";
import { eq, count, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const action = searchParams.get("action");

    // Check admin access
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If requesting stats
    if (action === "stats") {
      // Get all students with user data to filter out admins
      const allStudents = await db.query.students.findMany({
        with: { user: true },
      });

      // Filter out admin users
      const nonAdminStudents = allStudents.filter(s => s.user.role !== "admin");

      // Calculate stats from filtered list
      const stats = {
        total: nonAdminStudents.length,
        pending: nonAdminStudents.filter(s => s.status === "pending").length,
        approved: nonAdminStudents.filter(s => s.status === "approved").length,
        rejected: nonAdminStudents.filter(s => s.status === "rejected").length,
        banned: nonAdminStudents.filter(s => s.status === "banned").length,
      };

      return NextResponse.json(stats);
    }

    // Get all students
    const allStudents = await getAllStudents(status === "all" ? undefined : status);
    
    // Return in paginated format (simplified - no actual pagination for now)
    return NextResponse.json({
      items: allStudents,
      nextCursor: null,
      hasMore: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

