import { createAuthClient } from "better-auth/react"
import { getAppBaseUrl } from "@/lib/utils"

export const authClient = createAuthClient({
    baseURL: getAppBaseUrl(),
    fetchOptions: {
        credentials: "include", // Important for session cookies
    },
})

export const { signIn, signUp, signOut, useSession } = authClient