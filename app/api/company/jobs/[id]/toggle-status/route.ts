import { NextRequest, NextResponse } from "next/server";
import { toggleJobStatus } from "@/server/jobs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await toggleJobStatus(id);
    return NextResponse.json(job);
  } catch (error) {
    console.error("Error toggling job status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle job status";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("not found") ? 403 : 500 }
    );
  }
}

