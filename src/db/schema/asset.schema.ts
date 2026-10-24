import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations, users } from "./auth.schema";

export const assets = pgTable(
  "assets",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    filename: text("filename").notNull(),

    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    mimeType: text("mime_type").notNull(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    s3Key: text("s3_key").notNull(),

    sha256: text("sha256").notNull(),

    size: integer("size").notNull(),
  },
  (table) => [
    index("assets_organization_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
);
