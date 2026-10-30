"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import LoadingSpinner from "@/components/_ui/LoadingSpinner";
import { DASHBOARD_PAGE_PATH } from "@/data/dashboard.data";
import { authClient } from "@/lib/auth-client";
import type { DashboardPagePath } from "@/types/document.type";

import { HamburgerMenu } from "../../components/dashboard/HamburgerMenu";
import ProfileContainer from "../../components/dashboard/ProfileContainer";
import { Sidebar } from "../../components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center rounded-none bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen rounded-none bg-white">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="dark:bg-background-dark flex min-w-0 flex-1 flex-col bg-background">
        <div className="relative m-0 flex h-44 w-full items-center justify-between px-6 py-8 text-center shadow-none md:px-12 lg:px-20">
          <div className="flex items-center gap-4">
            <HamburgerMenu
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            <h2 className="m-0 p-0">
              {DASHBOARD_PAGE_PATH[pathname as DashboardPagePath]?.title ||
                "Dashboard"}
            </h2>
          </div>
          <ProfileContainer user={user} />
        </div>

        <div className="w-full flex-1 overflow-auto px-6 md:px-12 lg:px-20">
          {children}
        </div>
      </div>
    </div>
  );
}
