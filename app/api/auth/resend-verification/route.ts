import { auth } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import VerificationEmail from "@/components/emails/verification-email";
import { headers } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if email is already verified
    if (session.user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate a new verification token and URL
    // Better Auth doesn't expose the token generation directly, 
    // so we'll use the sendVerificationEmail method
    try {
      // Call Better Auth's email verification endpoint
      const baseUrl = getAppBaseUrl();
      
      // Generate verification token using Better Auth
      const response = await fetch(`${baseUrl}/api/auth/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(await headers()),
        },
        body: JSON.stringify({
          email: session.user.email,
          callbackURL: `${baseUrl}/select-role`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger verification email");
      }

      return NextResponse.json(
        { 
          success: true, 
          message: "Verification email sent successfully" 
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      return NextResponse.json(
        { error: "Failed to send verification email: " + error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

