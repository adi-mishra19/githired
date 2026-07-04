import { NextRequest, NextResponse } from "next/server";
import { createJob, getCompanyJobs } from "@/server/jobs";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const job = await createJob(data);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("verified") ? 403 : 500 }
    );
  }
}

export async function GET() {
  try {
    const jobs = await getCompanyJobs();
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

