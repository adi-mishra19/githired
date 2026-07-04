"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { students, companies, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const signInUser = async (email: string, password: string) => {
    try {
        await auth.api.signInEmail({
            body: {
                email,
                password
            },
        });

        return { success: true, message: "Signed in successfully" };
    } catch (error) {
        const e = error as Error;
        return { success: false, message: e.message || "Failed to sign in" };
    }
};

export const signUpUser = async (
    email: string, 
    password: string, 
    name: string
) => {
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
        });

        // Don't create profile yet - user will select role on /select-role page
        // This makes email/password signup consistent with OAuth flow

        return { success: true, message: "Signed up successfully. Please check your email for verification." };
    } catch (error) {
        const e = error as Error;
        return { success: false, message: e.message || "Failed to sign up" };
    }
};