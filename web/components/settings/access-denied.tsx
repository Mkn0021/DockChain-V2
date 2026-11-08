import { ShieldAlert } from "lucide-react";

const HEADER_HEIGHT = "11rem";
const BOTTOM_MARGIN = "2.5rem";

export function AccessDenied() {
  return (
    <div
      style={{
        minHeight: `calc(100vh - ${HEADER_HEIGHT} - ${BOTTOM_MARGIN})`,
      }}
      className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed px-6 text-center md:px-12 lg:px-20"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">You don&apos;t have access</p>
        <p className="text-sm text-muted-foreground">
          Ask an organization owner or admin if you need access to this page.
        </p>
      </div>
    </div>
  );
}
