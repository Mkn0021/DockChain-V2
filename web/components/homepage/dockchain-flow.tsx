"use client";

import { cn } from "cn";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

export type BuiltInIcon = "issue" | "store" | "connect" | "verify" | "manage";

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  icon: BuiltInIcon | ReactNode;
}

export interface DockChainFlowProps {
  steps: FlowStep[];
  breakpoint?: number;
  className?: string;
}

const svgProps = {
  "aria-hidden": true,
  height: "100%",
  viewBox: "0 0 64 64",
  width: "100%",
} as const;

const icons: Record<BuiltInIcon, ReactNode> = {
  connect: (
    <svg {...svgProps}>
      <circle className="fill-primary" cx="16" cy="14" r="7" />
      <rect className="fill-foreground" height="3" width="4" x="14" y="13" />
      <path
        className="stroke-(--flow-tint)"
        d="M26 14h10m0 0l-4-4m4 4l-4 4"
        fill="none"
        strokeWidth="3"
      />
      <path className="fill-primary" d="M48 5l9 9-9 9-9-9z" />
      <path
        className="stroke-(--flow-tint)"
        d="M48 26v10m0 0l-4-4m4 4l4-4"
        fill="none"
        strokeWidth="3"
      />
      <path
        className="stroke-(--flow-tint)"
        d="M16 26v10m0-10l-4 4m4-4l4 4"
        fill="none"
        strokeWidth="3"
      />
      <rect className="fill-primary" height="14" width="14" x="9" y="40" />
      <rect className="fill-foreground" height="4" width="4" x="14" y="40" />
      <circle className="fill-primary" cx="48" cy="47" r="7" />
    </svg>
  ),
  issue: (
    <svg {...svgProps}>
      <rect className="fill-(--flow-tint)" height="6" width="8" x="22" y="8" />
      <rect className="fill-primary" height="40" width="30" x="14" y="13" />
      <rect className="fill-foreground" height="3" width="12" x="23" y="15" />
      <circle className="fill-(--flow-tint)" cx="29" cy="28" r="4.5" />
      <path className="fill-(--flow-tint)" d="M20 44c0-5 4-8 9-8s9 3 9 8z" />
      <circle className="fill-(--flow-tint)" cx="45" cy="46" r="10" />
      <path
        className="stroke-foreground"
        d="M39.5 46.5l4 4 8-9"
        fill="none"
        strokeWidth="3"
      />
    </svg>
  ),
  manage: (
    <svg {...svgProps}>
      <circle className="fill-foreground" cx="42" cy="14" r="9" />
      <circle className="fill-primary" cx="35" cy="21" r="9" />
      <rect className="fill-foreground" height="18" width="5" x="6" y="36" />
      <path
        className="fill-(--flow-tint)"
        d="M14 40h20l8 4 12-6c3-1 5 2 3 4L42 54H14z"
      />
      <rect
        className="fill-(--flow-tint)"
        height="6"
        width="22"
        x="14"
        y="40"
      />
    </svg>
  ),
  store: (
    <svg {...svgProps}>
      <rect className="fill-foreground" height="44" width="26" x="22" y="10" />
      <rect
        className="fill-(--flow-tint)"
        height="14"
        width="26"
        x="12"
        y="26"
      />
      <rect className="fill-background" height="2.5" width="8" x="15" y="29" />
      <rect className="fill-background" height="2.5" width="6" x="15" y="34" />
      <circle className="fill-background" cx="31" cy="31" r="2.6" />
      <path
        className="fill-background"
        d="M26.5 39c0-3 2-4.5 4.5-4.5s4.5 1.5 4.5 4.5z"
      />
    </svg>
  ),
  verify: (
    <svg {...svgProps}>
      <circle className="fill-(--flow-tint)" cx="29" cy="29" r="20" />
      <path
        className="fill-primary"
        d="M6 29c6-9 14-13 23-13s17 4 23 13c-6 9-14 13-23 13S12 38 6 29z"
      />
      <circle className="fill-background" cx="29" cy="29" r="9" />
      <circle className="fill-foreground" cx="29" cy="29" r="4.5" />
      <path className="stroke-primary" d="M44 44l13 13" strokeWidth="7" />
    </svg>
  ),
};

const renderIcon = (icon: FlowStep["icon"]): ReactNode =>
  typeof icon === "string" ? (icons[icon as BuiltInIcon] ?? null) : icon;

const delay = (i: number): CSSProperties => ({
  transitionDelay: `${i * 110}ms`,
});

const CIRCLE = 112;
const DROP = 170;
const HEIGHT = DROP + CIRCLE + 190;
const colX = (i: number, count: number) => ((i + 0.5) / count) * 100;
const cy = (i: number) => (i % 2 === 0 ? CIRCLE / 2 : DROP + CIRCLE / 2);

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

const useMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
};

interface CircleProps {
  icon: FlowStep["icon"];
  compact?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

const Circle = ({ icon, compact = false, style, children }: CircleProps) => (
  <div
    className={cn(
      "relative z-10 grid shrink-0 place-items-center rounded-full border border-border/70 bg-background ring-(--flow-soft) transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30 motion-reduce:transition-none",
      compact ? "size-18 ring-6" : "ring-8 group-hover:ring-10"
    )}
    style={style}
  >
    <div className="size-[46%]">{renderIcon(icon)}</div>
    {children}
  </div>
);

export const DockChainFlow = ({
  steps,
  breakpoint = 900,
  className,
}: DockChainFlowProps) => {
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`);
  const mounted = useMounted();
  const count = steps.length;

  const revealClass = mounted
    ? "translate-y-0 opacity-100"
    : "translate-y-4 opacity-0";

  const links = steps.slice(0, -1);

  return (
    <section
      aria-label="DockChain document flow"
      className={cn(
        "mx-auto box-border w-full max-w-300 p-4",
        "[--flow-halo:color-mix(in_oklab,var(--color-primary)_6%,var(--color-background))]",
        "[--flow-soft:color-mix(in_oklab,var(--color-primary)_12%,var(--color-background))]",
        "[--flow-tint:color-mix(in_oklab,var(--color-primary)_50%,var(--color-background))]",
        className
      )}
    >
      {isDesktop ? (
        <ol
          className="relative m-0 w-full list-none p-0"
          style={{ height: HEIGHT }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
            preserveAspectRatio="none"
            viewBox={`0 0 100 ${HEIGHT}`}
          >
            <defs>
              {links.map((step, i) => (
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id={`dockchain-flow-${step.id}`}
                  key={step.id}
                  x1={colX(i, count)}
                  x2={colX(i + 1, count)}
                  y1={cy(i)}
                  y2={cy(i + 1)}
                >
                  <stop
                    offset="0.1"
                    style={{ stopColor: "var(--color-border)" }}
                  />
                  <stop
                    offset="1"
                    style={{ stopColor: "var(--color-primary)" }}
                  />
                </linearGradient>
              ))}
            </defs>
            {links.map((step, i) => (
              <g key={step.id}>
                <line
                  stroke={`url(#dockchain-flow-${step.id})`}
                  strokeWidth={38}
                  vectorEffect="non-scaling-stroke"
                  x1={colX(i, count)}
                  x2={colX(i + 1, count)}
                  y1={cy(i)}
                  y2={cy(i + 1)}
                />
                <line
                  className="stroke-background/55"
                  strokeWidth={3}
                  vectorEffect="non-scaling-stroke"
                  x1={colX(i, count)}
                  x2={colX(i + 1, count)}
                  y1={cy(i)}
                  y2={cy(i + 1)}
                />
              </g>
            ))}
          </svg>

          {steps.map((step, i) => (
            <li
              className={cn(
                "group absolute flex w-[19%] -translate-x-1/2 flex-col items-center text-center transition-all duration-700 ease-out motion-reduce:transition-none",
                revealClass
              )}
              key={step.id}
              style={{
                left: `${colX(i, count)}%`,
                top: i % 2 === 0 ? 0 : DROP,
                ...delay(i),
              }}
            >
              <Circle
                icon={step.icon}
                style={{ height: CIRCLE, width: CIRCLE }}
              />
              <h3 className="mt-4.5 text-xl font-bold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-57.5 text-base text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {steps.map((step, i) => (
            <li
              className={cn(
                "group relative grid grid-cols-[72px_1fr] gap-x-5 pb-10 transition-all duration-700 ease-out last:pb-0 motion-reduce:transition-none",
                revealClass
              )}
              key={step.id}
              style={delay(i)}
            >
              {i < count - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-18 bottom-0 left-9 w-3.5 -translate-x-1/2 rounded-sm bg-linear-to-b from-border to-primary"
                >
                  <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-background/55" />
                </span>
              )}

              <Circle compact icon={step.icon}>
                <span className="absolute -top-1 -right-1 grid size-5.5 place-items-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </Circle>

              <div className="pt-1.5">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
