"use client";

import { usePathname, useRouter } from "next/navigation";

import Logo from "@/components/_ui/Logo";
import { SIDEBAR_ITEMS, DASHBOARD_ROUTES } from "@/data/dashboard.data";

import MenuItem from "./MenuItem";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigateToRoute = (route: string) => {
    router.push(route);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const sidebarItems = SIDEBAR_ITEMS(navigateToRoute);

  return (
    <>
      {/* Sidebar - Fixed on mobile, static on desktop */}
      <div
        className={`
                fixed lg:static inset-y-0 left-0 z-50 rounded-none
                w-64 xl:w-72 bg-background-muted lg:bg-background-muted/30 border border-border
                transform transition-transform duration-300 ease-in-out lg:transform-none
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                lg:block flex-shrink-0
            `}
      >
        <nav className="h-full max-h-full w-[90%] mx-auto flex flex-col">
          <div className="w-full h-44 flex items-center justify-center">
            <Logo />
          </div>
          <div className="flex flex-col">
            {sidebarItems.map((item) => {
              const itemPath =
                DASHBOARD_ROUTES[item.id as keyof typeof DASHBOARD_ROUTES]
                  ?.path || "";
              return (
                <MenuItem
                  key={item.id}
                  item={item}
                  isActive={pathname === itemPath}
                  variant="sidebar"
                />
              );
            })}
          </div>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 rounded-none lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
