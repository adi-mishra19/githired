import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile already exists
    const existingProfile = await db.query.students.findFirst({
      where: eq(students.userId, session.user.id),
    });

    if (existingProfile) {
      return NextResponse.json({ 
        message: "Profile already exists",
        profile: existingProfile 
      });
    }

    // Create the profile
    const [newProfile] = await db.insert(students).values({
      userId: session.user.id,
      email: session.user.email,
      status: "pending",
    }).returning();

    return NextResponse.json({ 
      message: "Profile created successfully",
      profile: newProfile 
    });
  } catch (error: any) {
    console.error("Error fixing profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create profile" },
      { status: 500 }
    );
  }
}

