import { NextResponse } from "next/server";
import { getAllApplications } from "@/server/applications";

export async function GET() {
  try {
    const applications = await getAllApplications();
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching all applications:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch applications";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

