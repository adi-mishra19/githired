// Script to create student profiles for existing users who don't have one
import { db } from "@/db/drizzle";
import { user, students } from "@/db/schema";
import { notInArray, sql } from "drizzle-orm";

async function createMissingProfiles() {
  try {
    // Find all users who don't have a student profile
    const usersWithoutProfiles = await db
      .select()
      .from(user)
      .where(
        sql`${user.id} NOT IN (SELECT user_id FROM students)`
      );

    console.log(`Found ${usersWithoutProfiles.length} users without profiles`);

    // Create profiles for each user
    for (const u of usersWithoutProfiles) {
      if (u.role !== 'admin') {
        await db.insert(students).values({
          userId: u.id,
          email: u.email,
          status: "pending",
        });
        console.log(`Created profile for user: ${u.email}`);
      } else {
        console.log(`Skipped admin user: ${u.email}`);
      }
    }

    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

createMissingProfiles();

