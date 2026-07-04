import { NextRequest, NextResponse } from "next/server";
import { getCompanyProfile, updateCompanyProfile } from "@/server/companies";

export async function GET() {
  try {
    const profile = await getCompanyProfile();
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
    const profile = await updateCompanyProfile(data);
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

