import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTemplatesByRole, getCategories } from "@/lib/ai/query-templates";

export async function GET(request: NextRequest) {
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
    const templates = getTemplatesByRole(role);
    const categories = getCategories(role);

    console.log("Templates API - User ID:", session.user.id);
    console.log("Templates API - Role:", role);
    console.log("Templates API - Templates count:", templates.length);
    console.log("Templates API - Categories:", categories);

    return NextResponse.json({
      templates,
      categories
    });
  } catch (error: any) {
    console.error("Templates API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

