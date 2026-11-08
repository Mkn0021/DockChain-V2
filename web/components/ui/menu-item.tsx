"use client";

import { cn } from "cn";
import Link from "next/link";

import type { ComponentProps, ReactNode } from "react";
import type { IconType } from "react-icons";

interface OwnProps {
  icon?: IconType;
  label: string;
  isActive?: boolean;
  className?: string;
  trailing?: ReactNode;
  size?: "default" | "sm";
}

type ButtonProps = OwnProps &
  Omit<ComponentProps<"button">, keyof OwnProps> & {
    as?: "button";
  };

type LinkProps = OwnProps &
  Omit<ComponentProps<typeof Link>, keyof OwnProps> & {
    as: "link";
  };

type MenuItemProps = ButtonProps | LinkProps;

export function MenuItem(props: MenuItemProps) {
  const {
    icon: Icon,
    label,
    isActive,
    className,
    trailing,
    as,
    size = "default",
    ...rest
  } = props;

  const classes = cn(
    "flex w-full items-center rounded-md text-left font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "gap-2 px-3 py-2 text-sm" : "gap-4 px-6 py-4 text-base",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-foreground/80 hover:bg-muted hover:text-foreground",
    className
  );

  const content = (
    <>
      {Icon ? (
        <Icon
          className={size === "sm" ? "size-4 shrink-0" : "size-5 shrink-0"}
        />
      ) : null}
      <span className="flex-1">{label}</span>
      {trailing}
    </>
  );

  if (as === "link") {
    return (
      <Link
        {...(rest as ComponentProps<typeof Link>)}
        title={label}
        aria-current={isActive ? "page" : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      {...(rest as ComponentProps<"button">)}
      title={label}
      aria-current={isActive ? "page" : undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
