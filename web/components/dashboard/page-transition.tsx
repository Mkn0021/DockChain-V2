"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { getPanelFromPath, type NavKey } from "./menu-config";
import { useOrg } from "./org-provider";

interface PageTransitionProps {
  children: ReactNode;
}

type Direction = "forward" | "back" | "fade";

const PANEL_ORDER: Record<NavKey, number> = {
  app: 0,
  settings: 1,
};

const variants: Record<
  Direction,
  {
    enter: Record<string, number>;
    center: Record<string, number>;
    exit: Record<string, number>;
  }
> = {
  forward: {
    enter: { opacity: 0, x: 16 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  },
  back: {
    enter: { opacity: 0, x: -16 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
  },
  fade: {
    enter: { opacity: 0, y: 4 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  },
};

const getDirection = (prev: NavKey | null, current: NavKey): Direction => {
  if (prev === null || prev === current) {
    return "fade";
  }
  return PANEL_ORDER[current] > PANEL_ORDER[prev] ? "forward" : "back";
};

const transition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const { organization } = useOrg();
  const prevMode = useRef<NavKey | null>(null);

  const currentMode = getPanelFromPath(pathname, organization.slug);
  const direction = getDirection(prevMode.current, currentMode);

  prevMode.current = currentMode;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants[direction]}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
