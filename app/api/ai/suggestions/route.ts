import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { students, companies, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateStudentSuggestions,
  generateCompanySuggestions,
  generateAdminSuggestions
} from "@/lib/ai/suggestions";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch role from database
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const role = currentUser.role as "student" | "company" | "admin";
    let suggestions: any[] = [];

    if (role === "student") {
      const student = await db.query.students.findFirst({
        where: eq(students.userId, session.user.id)
      });

      if (student) {
        suggestions = await generateStudentSuggestions(student.id);
      }
    } else if (role === "company") {
      const company = await db.query.companies.findFirst({
        where: eq(companies.userId, session.user.id)
      });

      if (company) {
        suggestions = await generateCompanySuggestions(company.id);
      }
    } else if (role === "admin") {
      suggestions = await generateAdminSuggestions();
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("Suggestions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

