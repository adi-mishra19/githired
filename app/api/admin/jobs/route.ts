import { NextResponse } from "next/server";
import { getAllJobs } from "@/server/jobs";

export async function GET() {
  try {
    const jobs = await getAllJobs();
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

