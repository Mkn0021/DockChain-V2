import Link from "next/link";
import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled = false,
}) => {
  const baseClasses =
    "text-center px-6 py-4 text-base font-medium leading-6 transition-all duration-150 no-underline m-2";
  const hoverClasses =
    "hover:bg-primary-hover hover:text-white hover:-translate-y-1 dark:hover:bg-gray-50 dark:hover:text-zinc-900";
  const activeClasses =
    "active:outline-solid active:outline-primary active:outline-offset-[3px] active:outline-2";
  const variantClasses =
    variant === "primary"
      ? "bg-primary dark:bg-primary-dark text-white"
      : "border border-primary dark:border-white text-primary dark:text-white self-center";
  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed hover:transform-none"
    : "";

  const combinedClasses = [
    baseClasses,
    hoverClasses,
    activeClasses,
    variantClasses,
    disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
