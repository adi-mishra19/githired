import { NextRequest, NextResponse } from "next/server";
import { unrejectCompany } from "@/server/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await unrejectCompany(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to unreject company" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500 }
    );
  }
}

