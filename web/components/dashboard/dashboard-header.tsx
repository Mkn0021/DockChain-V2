"use client";

import { usePathname } from "next/navigation";

import { getPageInfo } from "@/lib/dashboard/get-page-info";

import { SectionHeader, SectionSubheader } from "../_ui/section";
import { HamburgerMenu } from "./hamburger-menu";
import { ProfileContainer } from "./profile-container";
import { useOrg } from "./org-provider";

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
  const { title, subtitle } = getPageInfo(pathname, organization.slug);

  return (
    <header className="flex h-44 w-full items-center justify-between px-6 md:px-12 lg:px-20">
      <div className="flex items-center gap-4">
        <HamburgerMenu open={sidebarOpen} onToggle={onToggleSidebar} />
        <div className="flex flex-col">
          <SectionHeader className="mb-px">{title}</SectionHeader>
          {subtitle && (
            <SectionSubheader className="">{subtitle}</SectionSubheader>
          )}
        </div>
      </div>
      <ProfileContainer />
    </header>
  );
}
