"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { NAV_MAP, type NavKey } from "./menu-config";
import { DashboardHeader } from "./dashboard-header";
import { Sidebar } from "./sidebar";
import { useOrg } from "./org-provider";

interface DashboardShellProps {
  children: ReactNode;
}

const getMode = (pathname: string, slug: string): NavKey =>
  pathname.startsWith(`/${slug}/settings`) ? "settings" : "app";

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { organization } = useOrg();

  const mode = getMode(pathname, organization.slug);
  const items = NAV_MAP[mode];
  const navLabel =
    mode === "settings" ? "Settings navigation" : "Main navigation";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={items}
        label={navLabel}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <div className="w-full flex-1 overflow-auto px-6 md:px-12 lg:px-20">
          {children}
        </div>
      </div>
    </div>
  );
}
