import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    // Validate file type (only PDFs for resumes)
    if (!fileType.includes("pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed for resumes" },
        { status: 400 }
      );
    }

    const { url, key } = await generatePresignedUploadUrl(
      fileName,
      fileType,
      session.user.id
    );

    return NextResponse.json({ uploadUrl: url, fileKey: key });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

