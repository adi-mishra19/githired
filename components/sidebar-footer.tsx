"use client";

import { User } from "lucide-react";
import { Logout } from "./logout";
import { ModeToggle } from "./mode-toggle";

export function SidebarFooterContent({ 
  userName, 
  userEmail 
}: { 
  userName?: string; 
  userEmail?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 px-1 py-1 min-w-0 flex-1">
          <User className="w-4 h-4 flex-shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{userName || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ModeToggle />
        </div>
      </div>
      <Logout />
    </div>
  );
}

