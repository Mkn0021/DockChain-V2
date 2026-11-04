"use client";

import { usePathname, useRouter } from "next/navigation";

import Logo from "../_ui/logo";
import { cn } from "@/lib/utils";

import type { NavItem } from "./menu-config";

import { MenuItem } from "./menu-item";
import { useOrg } from "./org-provider";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  label?: string;
}

const isActivePath = (
  pathname: string,
  slug: string,
  itemPath: string,
  items: NavItem[]
) => {
  const stripped = pathname.startsWith(`/${slug}`)
    ? pathname.slice(slug.length + 1)
    : pathname;

  if (stripped === itemPath) {
    return true;
  }

  const siblings = items
    .map((i) => i.path)
    .filter((p) => p !== itemPath && stripped.startsWith(`${p}/`));

  if (siblings.some((p) => p.length >= itemPath.length)) {
    return false;
  }

  return stripped.startsWith(`${itemPath}/`);
};

export function Sidebar({
  open,
  onClose,
  items,
  label = "Main navigation",
}: SidebarProps) {
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
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 transform border border-border bg-muted transition-transform duration-300 ease-in-out lg:static lg:transform-none lg:bg-muted/30 xl:w-72",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <nav
          aria-label={label}
          className="mx-auto flex h-full max-h-full w-[90%] flex-col"
        >
          <div className="flex h-44 w-full flex-col items-center justify-center gap-2">
            <Logo className="text-primary" />
            <span className="max-w-full truncate rounded-2xl bg-primary px-4 text-sm text-background">
              {organization.name}
            </span>
          </div>

          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <MenuItem
                  icon={item.icon}
                  label={item.label}
                  isActive={isActivePath(
                    pathname,
                    organization.slug,
                    item.path,
                    items
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
