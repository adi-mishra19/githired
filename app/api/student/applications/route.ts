import { NextResponse } from "next/server";
import { getStudentApplications } from "@/server/applications";

export async function GET() {
  try {
    const applications = await getStudentApplications();
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching student applications:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch applications";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

