"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

import { getPageInfo } from "@/lib/dashboard/get-page-info";

import { SectionHeader } from "../ui/section";

import { HamburgerMenu } from "./hamburger-menu";
import { useOrg } from "./org-provider";
import { ProfileContainer } from "./profile-container";

interface DashboardHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const titleVariants = {
  enter: { filter: "blur(6px)", opacity: 0, y: 6 },
  center: { filter: "blur(0px)", opacity: 1, y: 0 },
  exit: { filter: "blur(4px)", opacity: 0, y: -4 },
};

const titleTransition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function DashboardHeader({
  sidebarOpen,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const { organization } = useOrg();
  const { title, subtitle } = getPageInfo(pathname, organization.slug);

  return (
    <header className="flex h-40 w-full items-center justify-between px-6 md:px-12 lg:px-20">
      <div className="flex items-center gap-4">
        <HamburgerMenu open={sidebarOpen} onToggle={onToggleSidebar} />
        <div className="relative flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={titleVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={titleTransition}
              style={{ willChange: "filter, opacity, transform" }}
            >
              <SectionHeader className="mb-px">{title}</SectionHeader>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ProfileContainer />
    </header>
  );
}
