import { NextRequest, NextResponse } from "next/server";
import { getActiveJobs } from "@/server/jobs";

export async function GET() {
  try {
    const jobs = await getActiveJobs();
    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error("Error fetching active jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

