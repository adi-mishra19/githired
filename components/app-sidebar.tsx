import * as React from "react";

import { AIAssistantModal } from "@/components/ai-assistant-modal";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { SidebarData } from "./sidebar-data";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SidebarFooterContent } from "./sidebar-footer";

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  let userRole = "student";
  if (session?.user?.id) {
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });
    userRole = currentUser?.role || "student";
  }

  // Define navigation based on user role
  let navMain;
  if (userRole === "admin") {
    navMain = [
      {
        title: "Admin",
        url: "/dashboard/admin",
        items: [
          { title: "Dashboard", url: "/dashboard/admin" },
          { title: "Students", url: "/dashboard/admin/students" },
          { title: "Companies", url: "/dashboard/admin/companies" },
          { title: "Jobs", url: "/dashboard/admin/jobs" },
          { title: "Applications", url: "/dashboard/admin/applications" },
        ],
      },
    ];
  } else if (userRole === "company") {
    navMain = [
      {
        title: "Company",
        url: "/dashboard/company",
        items: [
          { title: "Dashboard", url: "/dashboard/company" },
          { title: "Profile", url: "/dashboard/company/profile/edit" },
          { title: "Jobs", url: "/dashboard/company/jobs" },
        ],
      },
    ];
  } else {
    // Student
    navMain = [
      {
        title: "Student",
        url: "/dashboard",
        items: [
          { title: "Dashboard", url: "/dashboard" },
          { title: "Profile", url: "/dashboard/profile/edit" },
          { title: "Jobs", url: "/dashboard/jobs" },
          { title: "Applications", url: "/dashboard/applications" },
          { title: "Interview Calendar", url: "/dashboard/calendar" },
          { title: "Kanban Board", url: "/dashboard/kanban" },
          { title: "Profile Insights", url: "/dashboard/profile-insights" },
          { title: "Peer Comparison", url: "/dashboard/peer-comparison" },
        ],
      },
    ];
  }

  const data = {
    versions: ["1.0.0"],
    navMain,
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 pl-2">
          <Image src="/noteforge-logo.png" alt="GitHired Logo" width={32} height={32} className="rounded-lg" />
          <h2>
            {userRole === "admin" ? "GitHired Admin" : 
             userRole === "company" ? "GitHired Company" : 
             "GitHired"}
          </h2>
        </Link>

        <div className="px-2 py-2">
          <AIAssistantModal />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarData data={data} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarFooterContent 
          userName={session?.user?.name} 
          userEmail={session?.user?.email}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
