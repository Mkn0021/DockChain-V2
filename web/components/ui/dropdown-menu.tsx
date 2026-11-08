"use client";

import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";

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
      {children}
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
  side?: "bottom" | "top";
  sideOffset?: number;
  alignOffset?: number;
  matchTriggerWidth?: boolean;
  children: React.ReactNode;
}

function DropdownMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 4,
  alignOffset = 0,
  matchTriggerWidth = false,
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef, contentRef } = useDropdownMenu();

  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
    width: number | undefined;
    transformOrigin: string;
  } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger || !content) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 8;

    let resolvedSide: "top" | "bottom" = side;
    if (
      side === "bottom" &&
      triggerRect.bottom + sideOffset + contentRect.height >
        viewportHeight - margin
    ) {
      resolvedSide = "top";
    } else if (
      side === "top" &&
      triggerRect.top - sideOffset - contentRect.height < margin
    ) {
      resolvedSide = "bottom";
    }

    const top =
      resolvedSide === "bottom"
        ? triggerRect.bottom + sideOffset
        : triggerRect.top - sideOffset - contentRect.height;

    let left =
      align === "end"
        ? triggerRect.right - contentRect.width + alignOffset
        : triggerRect.left + alignOffset;

    if (left + contentRect.width > viewportWidth - margin) {
      left = viewportWidth - margin - contentRect.width;
    }
    if (left < margin) {
      left = margin;
    }

    const vertical = resolvedSide === "bottom" ? "top" : "bottom";
    const horizontal = align === "end" ? "right" : "left";
    const transformOrigin = `${vertical} ${horizontal}`;

    setPosition({
      top,
      left,
      width: matchTriggerWidth ? triggerRect.width : undefined,
      transformOrigin,
    });
  }, [
    align,
    alignOffset,
    contentRef,
    side,
    sideOffset,
    triggerRef,
    matchTriggerWidth,
  ]);

  React.useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

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

    const onScrollOrResize = () => updatePosition();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, setOpen, triggerRef, contentRef, updatePosition]);

  if (!mounted) {
    return null;
  }

  return createPortal(
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
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            width: position?.width,
            transformOrigin: position?.transformOrigin ?? "top left",
            willChange: "transform, opacity",
            visibility: position ? "visible" : "hidden",
          }}
          className={cn(
            "z-50 transform-gpu rounded-3xl border border-border bg-background p-2 text-popover-foreground shadow-large outline-none [&>*:last-child]:rounded-b-2xl",
            className
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
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
        "px-2 py-2 text-xs font-medium text-foreground/80 uppercase",
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
      className={cn("mx-2 my-2 h-px bg-border", className)}
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
