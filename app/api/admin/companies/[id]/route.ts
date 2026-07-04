import { NextRequest, NextResponse } from "next/server";
import { getCompanyById } from "@/server/companies";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await getCompanyById(id);
    
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch company" },
      { status: error.message === "Unauthorized" || error.message === "Admin access required" ? 401 : 500 }
    );
  }
}

