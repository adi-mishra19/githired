import { NextRequest, NextResponse } from "next/server";
import { getStudentProfile, updateStudentProfile } from "@/server/students";

export async function GET() {
  try {
    const profile = await getStudentProfile();
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const profile = await updateStudentProfile(data);
    return NextResponse.json(profile);
  } catch (error: any) {
    if (error.message === "SRN format invalid") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message === "SRN already exists") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

