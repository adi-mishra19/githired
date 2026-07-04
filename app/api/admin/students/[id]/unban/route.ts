import { NextRequest, NextResponse } from "next/server";
import { unbanStudent } from "@/server/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await unbanStudent(id);
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to unban student" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

