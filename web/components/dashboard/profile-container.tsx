"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaExchangeAlt, FaPlus, FaSignOutAlt } from "react-icons/fa";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { getInitialsAndColor } from "@/utils/profile-utils";

import { Separator } from "../_ui/separator";
import { MenuItem } from "./menu-item";
import { useOrg } from "./org-provider";

function useClickOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, enabled, onOutside]);
}

function useLogout(handleClose: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async () => {
    handleClose();
    await authClient.signOut();
    queryClient.clear();
    router.replace("/login");
  };
}

function useProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, organization, organizations } = useOrg();
  const { initials, colorClass } = getInitialsAndColor(user.name);

  const handleToggle = () => setIsOpen((v) => !v);
  const handleClose = () => setIsOpen(false);

  useClickOutside(containerRef, isOpen, handleClose);

  const handleLogout = useLogout(handleClose);

  return {
    colorClass,
    containerRef,
    handleClose,
    handleLogout,
    handleToggle,
    initials,
    isOpen,
    organization,
    organizations,
    user,
  };
}

interface ProfileAvatarProps {
  initials: string;
  colorClass: string;
  isOpen: boolean;
  onClick: () => void;
}

function ProfileAvatar({
  initials,
  colorClass,
  isOpen,
  onClick,
}: ProfileAvatarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      aria-label="Profile menu"
      className={cn(
        "flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:scale-110",
        colorClass
      )}
    >
      {initials}
    </button>
  );
}

interface ProfileUserInfoProps {
  name: string;
  email?: string | null;
  initials: string;
  colorClass: string;
}

function ProfileUserInfo({
  name,
  email,
  initials,
  colorClass,
}: ProfileUserInfoProps) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white",
            colorClass
          )}
        >
          {initials}
        </div>
        <div className="flex min-w-0 flex-col items-start">
          <h4 className="w-full truncate">{name}</h4>
          {email && (
            <p className="w-full truncate text-xs text-muted-foreground">
              {email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const dropdownVariants = {
  enter: {
    opacity: 0,
    scale: 0.96,
    y: -6,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const },
  },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -6,
    transition: { duration: 0.12, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export function ProfileContainer() {
  const s = useProfileDropdown();

  return (
    <div ref={s.containerRef} className="relative">
      <ProfileAvatar
        initials={s.initials}
        colorClass={s.colorClass}
        isOpen={s.isOpen}
        onClick={s.handleToggle}
      />

      <AnimatePresence>
        {s.isOpen && (
          <motion.div
            role="menu"
            variants={dropdownVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              transformOrigin: "top right",
              willChange: "transform, opacity",
            }}
            className="absolute top-full right-0 z-50 mt-4 w-80 rounded-3xl border border-border bg-background p-2 shadow-large"
          >
            <ProfileUserInfo
              name={s.user.name}
              email={s.user.email}
              initials={s.initials}
              colorClass={s.colorClass}
            />

            <Separator className="my-2" />

            <p className="px-2 py-2 text-xs font-medium text-foreground uppercase">
              Organizations
            </p>

            {s.organizations.map((org) => (
              <MenuItem
                key={org.id}
                as="link"
                href={`/${org.slug}/dashboard`}
                icon={FaExchangeAlt}
                label={org.name}
                isActive={org.id === s.organization.id}
                onClick={s.handleClose}
              />
            ))}

            <MenuItem
              as="link"
              href="/onboarding?new=1"
              icon={FaPlus}
              label="Create organization"
              onClick={s.handleClose}
            />

            <Separator className="my-2" />

            <MenuItem
              icon={FaSignOutAlt}
              label="Log Out"
              onClick={s.handleLogout}
              className="rounded-t-none rounded-b-2xl text-red-600 hover:bg-red-50 hover:text-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
