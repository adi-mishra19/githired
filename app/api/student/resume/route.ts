import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

// DELETE - Remove a resume
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const index = searchParams.get("index");
    
    if (index === null) {
      return NextResponse.json(
        { error: "Resume index is required" },
        { status: 400 }
      );
    }

    // Get current student profile
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.userId, session.user.id))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    const resumeIndex = parseInt(index);
    const resumes = (student.resumes as any[]) || [];

    if (resumeIndex < 0 || resumeIndex >= resumes.length) {
      return NextResponse.json(
        { error: "Invalid resume index" },
        { status: 400 }
      );
    }

    const resumeToDelete = resumes[resumeIndex];

    // Extract the key from the URL
    try {
      const urlObj = new URL(resumeToDelete.url);
      // Extract key from URL path (handles both S3 and CloudFront URLs)
      const pathParts = urlObj.pathname.split('/');
      const key = pathParts.slice(1).join('/'); // Remove leading slash and join rest
      
      // Delete from AWS S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      
      await s3Client.send(deleteCommand);
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      // Continue anyway to remove from database
    }

    // Remove from array
    const updatedResumes = resumes.filter((_, i) => i !== resumeIndex);

    // Update database
    await db
      .update(students)
      .set({ 
        resumes: updatedResumes,
        updatedAt: new Date()
      })
      .where(eq(students.userId, session.user.id));

    return NextResponse.json({ 
      success: true,
      resumes: updatedResumes 
    });
  } catch (error: any) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete resume" },
      { status: 500 }
    );
  }
}

