import { NextRequest, NextResponse } from "next/server";
import { applyToJob } from "@/server/applications";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { coverLetter, resumeUrl, resumeLabel } = await request.json();
    const application = await applyToJob(id, coverLetter, resumeUrl, resumeLabel);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("Error applying to job:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to apply to job";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("approved") ? 403 : 
               errorMessage.includes("already applied") ? 400 : 500 }
    );
  }
}

