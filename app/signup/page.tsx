import { SignupForm } from "@/components/forms/signup-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Page() {
  // Check if user is already logged in
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (session?.user) {
    // Get user's role to redirect to appropriate dashboard
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (currentUser) {
      // Redirect based on role
      if (currentUser.role === "admin") {
        redirect("/dashboard/admin");
      } else if (currentUser.role === "company") {
        redirect("/dashboard/company");
      } else {
        redirect("/dashboard");
      }
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
