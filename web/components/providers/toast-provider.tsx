"use client";

import { CircleCheck, CircleX, Info, type LucideIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 5000;

const TOAST_STYLES: Record<
  ToastType,
  {
    container: string;
    icon: string;
    iconComponent: LucideIcon;
    progressBg: string;
  }
> = {
  success: {
    container: "bg-green-50 text-green-700 border-green-200",
    icon: "text-green-600",
    iconComponent: CircleCheck,
    progressBg: "bg-green-500",
  },
  error: {
    container: "bg-red-50 text-red-700 border-red-200",
    icon: "text-red-600",
    iconComponent: CircleX,
    progressBg: "bg-red-500",
  },
  info: {
    container: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "text-blue-600",
    iconComponent: Info,
    progressBg: "bg-blue-500",
  },
};

function useToastTimer({
  paused,
  onExpire,
}: {
  paused: boolean;
  onExpire: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const startedAt = useRef<number>(Date.now());
  const remainingRef = useRef<number>(TOAST_DURATION);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      if (!paused) {
        const elapsed = Date.now() - startedAt.current;
        const remaining = Math.max(remainingRef.current - elapsed, 0);
        setProgress((remaining / TOAST_DURATION) * 100);
        if (remaining <= 0) {
          onExpire();
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [paused, onExpire]);

  return {
    progress,
    pause: () => {
      remainingRef.current = Math.max(
        remainingRef.current - (Date.now() - startedAt.current),
        0
      );
    },
    resume: () => {
      startedAt.current = Date.now();
    },
  };
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const styles = TOAST_STYLES[toast.type];
  const Icon = styles.iconComponent;

  const handleExpire = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  const timer = useToastTimer({ paused, onExpire: handleExpire });

  const handlePause = () => {
    timer.pause();
    setPaused(true);
  };

  const handleResume = () => {
    timer.resume();
    setPaused(false);
  };

  return (
    <div
      className={`relative flex items-center gap-3 overflow-hidden rounded-lg border bg-white px-6 py-4 font-satoshi text-base shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${styles.container}`}
      style={{ animation: "slide-in-right 300ms ease-out" }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      role="alert"
    >
      <Icon className={`size-8 shrink-0 ${styles.icon}`} strokeWidth={2} />
      <p className="min-w-0 flex-1 leading-tight whitespace-pre-line">
        {toast.message}
      </p>
      <button
        aria-label="Dismiss"
        className="text-2xl leading-none font-semibold opacity-60 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        ×
      </button>
      <div className="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-lg bg-gray-200">
        <div
          className={`h-full ${styles.progressBg}`}
          style={{ width: `${timer.progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const { detail } = event as CustomEvent<{
        message: string;
        type: ToastType;
      }>;
      if (detail?.message) {
        push(detail.message, detail.type);
      }
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, [push]);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {children}
      <div className="pointer-events-none fixed top-8 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("toast must be used within <ToastProvider>");
  }
  return ctx;
}

export function useToast() {
  return useToastContext();
}

const emit = (message: string, type: ToastType) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("app-toast", { detail: { message, type } })
  );
};

export const toast = {
  success: (message: string) => emit(message, "success"),
  error: (message: string) => emit(message, "error"),
  info: (message: string) => emit(message, "info"),
};
