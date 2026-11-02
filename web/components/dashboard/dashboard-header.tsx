"use client";

import { usePathname } from "next/navigation";

import { getPageTitle } from "@/lib/dashboard/get-page-title";

import { HamburgerMenu } from "./hamburger-menu";
import { ProfileContainer } from "./profile-container";
import { useOrg } from "./org-provider";
import { SectionHeader } from "../_ui/section";

interface DashboardHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function DashboardHeader({
  sidebarOpen,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const { organization } = useOrg();
  const title = getPageTitle(pathname, organization.slug);

  return (
    <header className="flex h-44 w-full items-center justify-between px-6 md:px-12 lg:px-20">
      <div className="flex items-center gap-4">
        <HamburgerMenu open={sidebarOpen} onToggle={onToggleSidebar} />
        <SectionHeader className="mb-px">{title}</SectionHeader>
      </div>
      <ProfileContainer />
    </header>
  );
}
