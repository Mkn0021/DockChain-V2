"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

import { cn } from "@/lib/utils";

import Logo from "../_ui/logo";
import { Separator } from "../_ui/separator";
import {
  getPanelFromPath,
  PANEL_KEYS,
  PANELS,
  type NavKey,
} from "./menu-config";
import { MenuItem } from "./menu-item";
import { SidebarPanel } from "./sidebar-panel";
import { useOrg } from "./org-provider";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const panelTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
};

const getPanelX = (isActive: boolean, isRoot: boolean): number | string => {
  if (isActive) {
    return 0;
  }
  if (isRoot) {
    return "-100%";
  }
  return "100%";
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { organization } = useOrg();
  const [panel, setPanel] = useState<NavKey>("app");

  useEffect(() => {
    setPanel(getPanelFromPath(pathname, organization.slug));
  }, [pathname, organization.slug]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname, onClose]);

  const navigate = useCallback(
    (path: string) => {
      router.push(`/${organization.slug}${path}`);
    },
    [router, organization.slug]
  );

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 transform border border-border bg-muted transition-transform duration-300 ease-in-out lg:static lg:transform-none lg:bg-muted/30 xl:w-72",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mx-auto flex h-full max-h-full w-[90%] flex-col">
          <div className="flex h-44 w-full flex-col items-center justify-center gap-2">
            <Logo className="text-primary" />
            <span className="max-w-full truncate rounded-2xl bg-primary px-4 text-sm text-background">
              {organization.name}
            </span>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {PANEL_KEYS.map((panelKey) => (
              <SidebarPanelContent
                key={panelKey}
                panelKey={panelKey}
                activePanel={panel}
                pathname={pathname}
                slug={organization.slug}
                onNavigate={navigate}
                onDrill={setPanel}
              />
            ))}
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}

interface SidebarPanelContentProps {
  panelKey: NavKey;
  activePanel: NavKey;
  pathname: string;
  slug: string;
  onNavigate: (path: string) => void;
  onDrill: (key: NavKey) => void;
}

function SidebarPanelContent({
  panelKey,
  activePanel,
  pathname,
  slug,
  onNavigate,
  onDrill,
}: SidebarPanelContentProps) {
  const config = PANELS[panelKey];
  const isActive = activePanel === panelKey;
  const isRoot = panelKey === "app";
  const x = getPanelX(isActive, isRoot);

  return (
    <motion.div
      inert={!isActive}
      aria-hidden={!isActive}
      animate={{ x }}
      transition={panelTransition}
      className="absolute inset-0 flex flex-col"
    >
      <nav aria-label={config.label} className="flex-1">
        <SidebarPanel
          items={config.items}
          pathname={pathname}
          slug={slug}
          onNavigate={onNavigate}
          onDrill={onDrill}
        />
      </nav>

      {!isRoot && (
        <>
          <Separator />
          <MenuItem
            as="button"
            icon={FaArrowLeft}
            label="Back to dashboard"
            onClick={() => onNavigate("/dashboard")}
          />
        </>
      )}
    </motion.div>
  );
}
