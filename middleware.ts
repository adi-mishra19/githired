import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user, students, companies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function middleware(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user details
    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const pathname = request.nextUrl.pathname;

    // Check if email is verified (skip for OAuth users who auto-verify)
    if (!currentUser.emailVerified && !pathname.startsWith("/verify-email")) {
        return NextResponse.redirect(new URL("/verify-email", request.url));
    }

    // ==== ADMIN ROLE (check first - admins don't need profiles) ====
    if (currentUser.role === "admin") {
        // Admin can access /dashboard/admin
        if (pathname.startsWith("/dashboard/admin")) {
            return NextResponse.next();
        }
        // Redirect admin from ANY other dashboard route to admin dashboard
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }

    // Check if user has a profile (for OAuth users who haven't selected role yet)
    let studentProfile = null;
    let companyProfile = null;
    
    try {
        studentProfile = await db.query.students.findFirst({
            where: eq(students.userId, session.user.id),
        });
    } catch (error) {
        console.error("Error fetching student profile:", error);
    }
    
    try {
        companyProfile = await db.query.companies.findFirst({
            where: eq(companies.userId, session.user.id),
        });
    } catch (error) {
        // Companies table might not exist yet - ignore error
        console.error("Error fetching company profile (table might not exist yet):", error);
    }

    // If user has no profile and not already on select-role page, redirect there
    if (!studentProfile && !companyProfile) {
        if (!pathname.startsWith("/select-role")) {
            return NextResponse.redirect(new URL("/select-role", request.url));
        }
        // Allow access to select-role page
        return NextResponse.next();
    }

    // Block non-admins from accessing admin routes
    if (pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ==== COMPANY ROLE ====
    if (currentUser.role === "company") {
        // Company profile already fetched above, just verify it exists
        if (!companyProfile) {
            return NextResponse.redirect(new URL("/select-role", request.url));
        }

        // Redirect companies from student routes to company routes
        if (pathname.startsWith("/dashboard/profile") && !pathname.startsWith("/dashboard/company")) {
            return NextResponse.redirect(new URL("/dashboard/company", request.url));
        }
        if (pathname === "/dashboard/pending" || pathname.startsWith("/dashboard/pending")) {
            return NextResponse.redirect(new URL("/dashboard/company/pending", request.url));
        }
        if (pathname === "/dashboard/jobs") {
            return NextResponse.redirect(new URL("/dashboard/company/jobs", request.url));
        }

        // Handle different company statuses
        if (companyProfile.status === "banned") {
            // Banned companies can only see pending page
            if (!pathname.startsWith("/dashboard/company/pending")) {
                return NextResponse.redirect(new URL("/dashboard/company/pending", request.url));
            }
            return NextResponse.next();
        }

        if (companyProfile.status === "rejected" || companyProfile.status === "pending") {
            // Pending/rejected companies can access pending page and profile edit
            if (pathname.startsWith("/dashboard/company/pending") || pathname.startsWith("/dashboard/company/profile/edit")) {
                return NextResponse.next();
            }
            return NextResponse.redirect(new URL("/dashboard/company/pending", request.url));
        }

        // Approved companies
        if (companyProfile.status === "approved") {
            // Don't let approved companies access pending page
            if (pathname.startsWith("/dashboard/company/pending")) {
                return NextResponse.redirect(new URL("/dashboard/company", request.url));
            }
            // Allow access to company routes
            if (pathname.startsWith("/dashboard/company") || pathname === "/dashboard") {
                return NextResponse.next();
            }
        }

        return NextResponse.next();
    }

    // ==== STUDENT ROLE ====
    // Redirect students from company routes to student routes
    if (pathname.startsWith("/dashboard/company")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Student profile already fetched above, just verify it exists
    if (!studentProfile) {
        return NextResponse.redirect(new URL("/select-role", request.url));
    }

    // Handle different student statuses
    if (studentProfile.status === "banned") {
        // Banned students can only see pending page
        if (!pathname.startsWith("/dashboard/pending")) {
            return NextResponse.redirect(new URL("/dashboard/pending", request.url));
        }
        return NextResponse.next();
    }

    if (studentProfile.status === "rejected" || studentProfile.status === "pending") {
        // Pending/rejected students can access pending page and profile edit
        if (pathname.startsWith("/dashboard/pending") || pathname.startsWith("/dashboard/profile/edit")) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/dashboard/pending", request.url));
    }

    // Approved students
    if (studentProfile.status === "approved") {
        // Don't let approved students access pending page
        if (pathname.startsWith("/dashboard/pending")) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/select-role", "/verify-email"],
};
