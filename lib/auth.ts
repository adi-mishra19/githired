import PasswordResetEmail from "@/components/emails/reset-email";
import VerificationEmail from "@/components/emails/verification-email";
import { db } from "@/db/drizzle";
import { schema, students } from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { getAppBaseUrl } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const appBaseUrl = getAppBaseUrl();

export const auth = betterAuth({
    baseURL: appBaseUrl,
    trustedOrigins: [appBaseUrl],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
        },
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'GitHired <githired@bhavesh-budharaju.in>',
                    to: [user.email],
                    subject: 'Verify your email address',
                    react: VerificationEmail({ userName: user.name, verificationUrl: url }),
                });
                console.log(`✅ Verification email sent to ${user.email}`);
            } catch (error) {
                console.error(`❌ Failed to send verification email to ${user.email}:`, error);
                throw error;
            }
        },
        sendOnSignUp: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'GitHired <githired@bhavesh-budharaju.in>',
                    to: [user.email],
                    subject: 'Reset your password',
                    react: PasswordResetEmail({ userName: user.name, resetUrl: url, requestTime: new Date().toLocaleString() }),
                });
                console.log(`✅ Password reset email sent to ${user.email}`);
            } catch (error) {
                console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
                throw error;
            }
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    plugins: [nextCookies()],
    // Removed onAfterSignUp - profile creation now handled via /select-role page
    // This prevents automatic student profile creation for OAuth users
});