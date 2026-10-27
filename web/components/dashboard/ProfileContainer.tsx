"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";

import { LOGOUT_BUTTON, PROFILE_MENU_ITEMS } from "@/data/dashboard.data";
import ApiClient from "@/lib/api-client";
import { User } from "@/types/auth.type";
import { getInitialsAndColor } from "@/utils/profileUtils";

import { useAlert } from "../providers/AlertProvider";
import MenuItem from "./MenuItem";

interface ProfileContainerProps {
  user: User;
  className?: string;
}

const ProfileContainer: React.FC<ProfileContainerProps> = ({
  user,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showAlert } = useAlert();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && avatarRef.current) {
        const clickedOutsideDropdown = !dropdownRef.current.contains(
          event.target as Node
        );
        const clickedOutsideAvatar = !avatarRef.current.contains(
          event.target as Node
        );

        if (isOpen && clickedOutsideDropdown && clickedOutsideAvatar) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await ApiClient.post("/auth/logout");
      router.push("/");
    } catch (error) {
      showAlert(`Logout failed: ${error}`, "error");
      router.push("/login");
    }
  };

  const profileMenuItems = PROFILE_MENU_ITEMS(setIsOpen);

  return (
    <div className={`relative ${className}`}>
      {/* Profile Button */}
      <div className="relative">
        <div
          ref={avatarRef}
          onClick={toggleDropdown}
          className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold text-sm hover:scale-110 cursor-pointer transition-all duration-200 shadow-soft ${getInitialsAndColor(user.name).colorClass}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleDropdown();
            }
          }}
        >
          {getInitialsAndColor(user.name).initials}
        </div>
      </div>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-4 w-80 bg-background dark:bg-background-dark shadow-large border border-border dark:border-border-dark z-50 animate-fade-in duration-200"
        >
          <div className="w-72 mx-auto py-2">
            {/* User Info */}
            <div className="p-6 border-b border-border dark:border-border-dark rounded-none">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-medium text-lg ${getInitialsAndColor(user.name).colorClass}`}
                >
                  {getInitialsAndColor(user.name).initials}
                </div>
                <div className="flex flex-col self-start items-start">
                  <h4 className="m-0 whitespace-nowrap overflow-x-auto">
                    {user.name}
                  </h4>
                  {user.email && (
                    <p className="text-text-secondary dark:text-text-darkSecondary text-xs">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {profileMenuItems.map((item, index) => (
                <MenuItem key={index} item={item} variant="dropdown" />
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-border dark:border-border-dark py-2 rounded-none">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-6 py-4 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-150 border-none"
              >
                <LOGOUT_BUTTON.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{LOGOUT_BUTTON.label}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileContainer;
