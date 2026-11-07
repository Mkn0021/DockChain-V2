import { cn } from "cn";

export function Separator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-border mask-r-from-80% mask-l-from-80%",
        className
      )}
    />
  );
}
