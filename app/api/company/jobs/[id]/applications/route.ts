import { NextRequest, NextResponse } from "next/server";
import { getJobApplications } from "@/server/applications";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applications = await getJobApplications(id);
    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching job applications:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch applications";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("not found") ? 403 : 500 }
    );
  }
}

