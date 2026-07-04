import { NextRequest, NextResponse } from "next/server";
import { approveCompany } from "@/server/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await approveCompany(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to approve company" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500 }
    );
  }
}

