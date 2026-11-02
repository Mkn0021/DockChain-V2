"use client";

import { useState, type ReactNode } from "react";

import { DashboardHeader } from "./dashboard-header";
import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
