"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { 
  ChevronRight, 
  LayoutDashboard, 
  User, 
  Briefcase, 
  FileText, 
  Calendar, 
  KanbanSquare, 
  TrendingUp, 
  Users,
  Building2,
  ClipboardList
} from "lucide-react";
import { useQueryState } from "nuqs";

// Map menu titles to their corresponding icons
const getIconForTitle = (title: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    "Dashboard": <LayoutDashboard />,
    "Profile": <User />,
    "Jobs": <Briefcase />,
    "Applications": <FileText />,
    "Interview Calendar": <Calendar />,
    "Kanban Board": <KanbanSquare />,
    "Profile Insights": <TrendingUp />,
    "Peer Comparison": <Users />,
    "Students": <Users />,
    "Companies": <Building2 />,
    "Admin": <ClipboardList />,
  };
  
  return iconMap[title] || <LayoutDashboard />;
};

interface SidebarDataProps {
  data: {
    navMain: {
      title: string;
      items: { title: string; url: string }[];
    }[];
  };
}

export function SidebarData({ data }: SidebarDataProps) {
  const [search] = useQueryState("search", { defaultValue: "" });

  const filteredData = data.navMain.filter((item) => {
    const notebookMatches = item.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const noteMatches = item.items.some((note) =>
      note.title.toLowerCase().includes(search.toLowerCase())
    );

    return notebookMatches || noteMatches;
  });

  return (
    <>
      {filteredData.map((item) => (
        <Collapsible
          key={item.title}
          id={`collapsible-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          title={item.title}
          defaultOpen
          className="group/collapsible"
        >
          <SidebarGroup>
            <SidebarGroupLabel
              asChild
              className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
            >
              <CollapsibleTrigger>
                {item.title}{" "}
                {item.items.length > 0 && (
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {item.items.map((subItem) => (
                    <SidebarMenuItem key={subItem.title}>
                      <SidebarMenuButton asChild>
                        <a href={subItem.url}>
                          {getIconForTitle(subItem.title)}
                          {subItem.title}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
