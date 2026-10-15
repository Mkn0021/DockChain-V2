import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { FieldSchemaJson } from "../../features/templates/template.types";

import { timestamp } from "../utils";
import { organizations, users } from "./auth.schema";

export const templateVersionStatus = pgEnum("template_version_status", [
  "draft",
  "published",
]);

export const templates = pgTable(
  "templates",
  {
    archivedAt: timestamp("archived_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    description: text("description"),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text("name").notNull(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    index("templates_organization_id_idx").on(table.organizationId),
    index("templates_archived_at_idx").on(table.archivedAt),
    uniqueIndex("templates_organization_name_uidx").on(
      table.organizationId,
      table.name
    ),
  ]
);

export const templateVersions = pgTable(
  "template_versions",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),

    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    fieldSchema: jsonb("field_schema").$type<FieldSchemaJson>().notNull(),

    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    layout: text("layout").notNull(),

    publishedAt: timestamp("published_at"),

    schemaHash: text("schema_hash"),

    status: templateVersionStatus("status").default("draft").notNull(),

    templateId: text("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),

    version: integer("version").notNull(),
  },
  (table) => [
    uniqueIndex("template_versions_template_version_uidx").on(
      table.templateId,
      table.version
    ),
    index("template_versions_template_id_idx").on(table.templateId),
    index("template_versions_status_idx").on(table.status),
  ]
);
