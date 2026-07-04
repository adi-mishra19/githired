import { NextRequest, NextResponse } from "next/server";
import { updateJob, deleteJob, getJobById } from "@/server/jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJobById(id);
    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch job";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("not found") ? 404 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const job = await updateJob(id, data);
    return NextResponse.json(job);
  } catch (error) {
    console.error("Error updating job:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update job";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("not found") ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete job";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes("Unauthorized") || errorMessage.includes("not found") ? 403 : 500 }
    );
  }
}

