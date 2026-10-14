import { timestamp as pgTimestamp } from "drizzle-orm/pg-core";

/**
 * Custom timestamp type that returns ISO 8601 formatted strings.
 * Converts postgres timestamp format to ISO format (e.g., "2025-06-22T16:13:37Z")
 */
export const timestamp = (
  name: string,
  config: { withTimezone?: boolean } = {}
) => pgTimestamp(name, { ...config, mode: "string" });
