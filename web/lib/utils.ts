export { cn } from "cn";

export function formatDate(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toLocaleDateString();
  }
  return "—";
}
