import { NextRequest, NextResponse } from "next/server";
import { getAllCompanies } from "@/server/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    
    const companies = await getAllCompanies(status);
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch companies" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500 }
    );
  }
}

