import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus } from "@/server/applications";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    
    if (!["pending", "oa", "interview", "selected", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    
    const application = await updateApplicationStatus(id, status);
    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

