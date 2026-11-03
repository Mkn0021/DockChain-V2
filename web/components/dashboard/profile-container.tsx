"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaExchangeAlt, FaPlus, FaSignOutAlt } from "react-icons/fa";

import { cn } from "cn";
import { authClient } from "@/lib/auth-client";
import { getInitialsAndColor } from "@/utils/profile-utils";

import { Separator } from "../_ui/separator";
import { MenuItem } from "./menu-item";
import { useOrg } from "./org-provider";

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
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

function useProfileHandlers(close: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    close();
    await authClient.signOut();
    queryClient.clear();
    router.replace("/login");
  };

  const handleSwitchOrg = (slug: string) => {
    close();
    router.push(`/${slug}/dashboard`);
  };

  const handleCreateOrg = () => {
    close();
    router.push("/onboarding?new=1");
  };

  return { handleLogout, handleSwitchOrg, handleCreateOrg };
}

function useProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, organization, organizations } = useOrg();
  const { initials, colorClass } = getInitialsAndColor(user.name);

  const close = () => setIsOpen(false);
  const handleToggle = () => setIsOpen((open) => !open);

  useClickOutside(containerRef, isOpen, close);
  const { handleLogout, handleSwitchOrg, handleCreateOrg } =
    useProfileHandlers(close);

  return {
    isOpen,
    containerRef,
    user,
    organization,
    organizations,
    initials,
    colorClass,
    handleToggle,
    handleLogout,
    handleSwitchOrg,
    handleCreateOrg,
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

interface ProfileDropdownProps {
  name: string;
  email?: string | null;
  initials: string;
  colorClass: string;
  organizations: { id: string; name: string; slug: string }[];
  activeOrgId: string;
  onSwitchOrg: (slug: string) => void;
  onCreateOrg: () => void;
  onLogout: () => void;
}

function ProfileDropdown({
  name,
  email,
  initials,
  colorClass,
  organizations,
  activeOrgId,
  onSwitchOrg,
  onCreateOrg,
  onLogout,
}: ProfileDropdownProps) {
  return (
    <div
      role="menu"
      className="absolute top-full right-0 z-50 mt-4 w-80 rounded-3xl border border-border bg-background p-2 shadow-large"
    >
      <ProfileUserInfo
        name={name}
        email={email}
        initials={initials}
        colorClass={colorClass}
      />

      <Separator className="my-2" />

      <p className="px-2 py-2 text-xs font-medium text-foreground uppercase">
        Organizations
      </p>

      {organizations.map((org) => (
        <MenuItem
          key={org.id}
          icon={FaExchangeAlt}
          label={org.name}
          isActive={org.id === activeOrgId}
          onClick={() => onSwitchOrg(org.slug)}
        />
      ))}

      <MenuItem
        icon={FaPlus}
        label="Create organization"
        onClick={onCreateOrg}
      />

      <Separator className="my-2" />

      <MenuItem
        icon={FaSignOutAlt}
        label="Log Out"
        onClick={onLogout}
        className="rounded-t-none rounded-b-2xl text-red-600 hover:bg-red-50 hover:text-foreground"
      />
    </div>
  );
}

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

      {s.isOpen && (
        <ProfileDropdown
          name={s.user.name}
          email={s.user.email}
          initials={s.initials}
          colorClass={s.colorClass}
          organizations={s.organizations}
          activeOrgId={s.organization.id}
          onSwitchOrg={s.handleSwitchOrg}
          onCreateOrg={s.handleCreateOrg}
          onLogout={s.handleLogout}
        />
      )}
    </div>
  );
}
