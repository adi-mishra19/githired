import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { students, companies, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || (role !== "student" && role !== "company")) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'student' or 'company'" },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const existingStudent = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id),
    });

    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.userId, session.user.id),
    });

    if (existingStudent || existingCompany) {
      return NextResponse.json(
        { error: "Profile already exists" },
        { status: 409 }
      );
    }

    // Update user role
    await db.update(user)
      .set({ role })
      .where(eq(user.id, session.user.id));

    // Create appropriate profile
    if (role === "student") {
      await db.insert(students).values({
        userId: session.user.id,
        email: session.user.email,
        status: "pending",
      });
    } else {
      await db.insert(companies).values({
        userId: session.user.id,
        contactEmail: session.user.email,
        name: session.user.name || "Company",
        status: "pending",
      });
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error("Error creating profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}

