"use client";

import { cn } from "cn";
import Link from "next/link";

import type { ComponentProps, ReactNode } from "react";
import type { IconType } from "react-icons";

interface OwnProps {
  icon: IconType;
  label: string;
  isActive?: boolean;
  className?: string;
  trailing?: ReactNode;
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
    ...rest
  } = props;

  const classes = cn(
    "flex w-full items-center gap-4 rounded-md px-6 py-4 text-left font-medium transition-all duration-150",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-foreground/80 hover:bg-muted hover:text-foreground",
    className
  );

  const content = (
    <>
      <Icon className="size-5 shrink-0" />
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
