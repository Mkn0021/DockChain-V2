"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FaExchangeAlt, FaPlus, FaSignOutAlt } from "react-icons/fa";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { getInitialsAndColor } from "@/utils/profile-utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MenuItem } from "../ui/menu-item";

import { useOrg } from "./org-provider";

function useProfileDropdown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, organization, organizations } = useOrg();
  const { initials, colorClass } = getInitialsAndColor(user.name);

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    router.replace("/login");
  };

  return {
    colorClass,
    handleLogout,
    initials,
    organization,
    organizations,
    user,
  };
}

interface ProfileAvatarProps {
  initials: string;
  colorClass: string;
}

function ProfileAvatar({ initials, colorClass }: ProfileAvatarProps) {
  return (
    <DropdownMenuTrigger
      aria-label="Profile menu"
      className={cn(
        "flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:scale-110",
        colorClass
      )}
    >
      {initials}
    </DropdownMenuTrigger>
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

export function ProfileContainer() {
  const s = useProfileDropdown();

  return (
    <DropdownMenu>
      <ProfileAvatar initials={s.initials} colorClass={s.colorClass} />

      <DropdownMenuContent align="end" sideOffset={16} className="w-80">
        <ProfileUserInfo
          name={s.user.name}
          email={s.user.email}
          initials={s.initials}
          colorClass={s.colorClass}
        />

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Organizations</DropdownMenuLabel>

        {s.organizations.map((org) => (
          <MenuItem
            key={org.id}
            as="link"
            href={`/${org.slug}/dashboard`}
            icon={FaExchangeAlt}
            label={org.name}
            isActive={org.id === s.organization.id}
          />
        ))}

        <MenuItem
          as="link"
          href="/onboarding?new=1"
          icon={FaPlus}
          label="Create organization"
        />

        <DropdownMenuSeparator />

        <MenuItem
          icon={FaSignOutAlt}
          label="Log Out"
          onClick={s.handleLogout}
          className="text-red-600"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
