"use client";

import { FaBars } from "react-icons/fa";

interface HamburgerMenuProps {
  open: boolean;
  onToggle: () => void;
}

export function HamburgerMenu({ open, onToggle }: HamburgerMenuProps) {
  return (
    <button
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="lg:hidden"
      onClick={onToggle}
    >
      <FaBars className="size-8" />
    </button>
  );
}
