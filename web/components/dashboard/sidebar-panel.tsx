"use client";

import { motion } from "motion/react";
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

const listVariants = {
  enter: {},
  center: {
    transition: {
      delayChildren: 0.15,
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  enter: { opacity: 0, x: 12 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  },
};

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
    <motion.ul
      className="flex flex-col"
      variants={listVariants}
      initial="enter"
      animate="center"
    >
      {items.map((item) => {
        const { drillTo } = item;
        if (drillTo) {
          return (
            <motion.li key={item.id} variants={itemVariants}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                isActive={isActivePath(pathname, slug, item.path, items)}
                onClick={() => {
                  onNavigate(item.path);
                  onDrill(drillTo);
                }}
                trailing={<FaChevronRight className="size-3 shrink-0" />}
              />
            </motion.li>
          );
        }

        return (
          <motion.li key={item.id} variants={itemVariants}>
            <MenuItem
              as="link"
              href={`/${slug}${item.path}`}
              icon={item.icon}
              label={item.label}
              isActive={isActivePath(pathname, slug, item.path, items)}
              onClick={() => onNavigate(item.path)}
            />
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
