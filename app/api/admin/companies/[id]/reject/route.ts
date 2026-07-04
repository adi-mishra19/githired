import { NextRequest, NextResponse } from "next/server";
import { rejectCompany } from "@/server/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { note } = await request.json();
    await rejectCompany(id, note);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reject company" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500 }
    );
  }
}

