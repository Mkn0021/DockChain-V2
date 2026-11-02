"use client";

import { usePathname, useRouter } from "next/navigation";

import { useOrg } from "./org-provider";
import { MENU_ITEMS } from "./menu-config";
import { MenuItem } from "./menu-item";
import Logo from "../_ui/logo";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const isActivePath = (pathname: string, slug: string, itemPath: string) => {
  const stripped = pathname.startsWith(`/${slug}`)
    ? pathname.slice(slug.length + 1)
    : pathname;

  if (stripped === itemPath) {
    return true;
  }

  const siblings = MENU_ITEMS.map((i) => i.path).filter(
    (p) => p !== itemPath && stripped.startsWith(`${p}/`)
  );

  if (siblings.some((p) => p.length >= itemPath.length)) {
    return false;
  }

  return stripped.startsWith(`${itemPath}/`);
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { organization } = useOrg();

  const navigate = (path: string) => {
    router.push(`/${organization.slug}${path}`);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 xl:w-72 bg-muted lg:bg-muted/30 border border-border transform transition-transform duration-300 ease-in-out lg:transform-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } shrink-0`}
      >
        <nav
          aria-label="Main navigation"
          className="h-full max-h-full w-[90%] mx-auto flex flex-col"
        >
          <div className="w-full h-44 flex flex-col items-center justify-center gap-2">
            <Logo className="text-primary" />
            <span className="text-sm text-background bg-primary truncate max-w-full px-4 rounded-2xl">
              {organization.name}
            </span>
          </div>

          <ul className="flex flex-col">
            {MENU_ITEMS.map((item) => (
              <li key={item.id}>
                <MenuItem
                  icon={item.icon}
                  label={item.label}
                  isActive={isActivePath(
                    pathname,
                    organization.slug,
                    item.path
                  )}
                  onClick={() => navigate(item.path)}
                  className="rounded-full"
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
