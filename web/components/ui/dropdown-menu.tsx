"use client";

import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

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

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownMenuContext =
  React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(
      "DropdownMenu components must be used within <DropdownMenu>"
    );
  }
  return ctx;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({
  children,
  open: controlled,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const isControlled = controlled !== undefined;
  const open = isControlled ? controlled : uncontrolled;

  const setOpen = React.useCallback(
    (next: React.SetStateAction<boolean>) => {
      const value = typeof next === "function" ? next(open) : next;
      if (!isControlled) {
        setUncontrolled(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange, open]
  );

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  return (
    <DropdownMenuContext.Provider
      value={{ open, setOpen, triggerRef, contentRef }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  className,
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef } = useDropdownMenu();

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        onClick?.(e);
        setOpen((v) => !v);
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onTransitionEnd"
> {
  align?: "start" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}

function DropdownMenuContent({
  align = "start",
  sideOffset = 4,
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef, contentRef } = useDropdownMenu();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen, triggerRef, contentRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          role="menu"
          variants={dropdownVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            transformOrigin: align === "end" ? "top right" : "top left",
            willChange: "transform, opacity",
            marginTop: sideOffset,
          }}
          className={cn(
            "absolute top-full z-50 rounded-3xl border border-border bg-background p-2 text-popover-foreground shadow-large outline-none",
            align === "end" ? "right-0" : "left-0",
            className
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DropdownMenuGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={className} {...props} />;
}

function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 py-2 text-xs font-medium text-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("-mx-1 my-2 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  dropdownVariants,
};
