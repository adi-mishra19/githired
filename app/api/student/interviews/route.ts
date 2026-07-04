import { NextResponse } from "next/server";
import { getStudentInterviews } from "@/server/interviews";

export async function GET() {
  try {
    const interviews = await getStudentInterviews();
    return NextResponse.json(interviews);
  } catch (error: any) {
    console.error("Error fetching student interviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}

