"use client";

import { FaChevronRight } from "react-icons/fa";

import { MenuItem } from "./menu-item";
import type { NavItem, NavKey } from "./menu-config";

interface SidebarPanelProps {
  items: NavItem[];
  pathname: string;
  slug: string;
  onNavigate: (path: string) => void;
  onDrill: (key: NavKey) => void;
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

export function SidebarPanel({
  items,
  pathname,
  slug,
  onNavigate,
  onDrill,
}: SidebarPanelProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const { drillTo } = item;
        if (drillTo) {
          return (
            <li key={item.id}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                isActive={isActivePath(pathname, slug, item.path, items)}
                onClick={() => {
                  onNavigate(item.path);
                  onDrill(drillTo);
                }}
                trailing={
                  <FaChevronRight className="size-4 shrink-0 text-foreground/70" />
                }
              />
            </li>
          );
        }

        return (
          <li key={item.id}>
            <MenuItem
              as="link"
              href={`/${slug}${item.path}`}
              icon={item.icon}
              label={item.label}
              isActive={isActivePath(pathname, slug, item.path, items)}
              onClick={() => onNavigate(item.path)}
            />
          </li>
        );
      })}
    </ul>
  );
}
