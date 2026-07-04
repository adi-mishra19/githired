import { NextRequest, NextResponse } from "next/server";
import { verifySRN } from "@/server/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { valid } = await request.json();

    if (typeof valid !== "boolean") {
      return NextResponse.json(
        { error: "valid (boolean) is required" },
        { status: 400 }
      );
    }

    const student = await verifySRN(id, valid);
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to verify SRN" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500 }
    );
  }
}

