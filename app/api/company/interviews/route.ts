import { NextRequest, NextResponse } from "next/server";
import { scheduleInterview, getCompanyInterviews } from "@/server/interviews";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const interview = await scheduleInterview(body);
    return NextResponse.json(interview);
  } catch (error: any) {
    console.error("Error scheduling interview:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule interview" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || undefined;
    
    const interviews = await getCompanyInterviews(jobId);
    return NextResponse.json(interviews);
  } catch (error: any) {
    console.error("Error fetching company interviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}

