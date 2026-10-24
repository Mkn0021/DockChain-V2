import { and, count, desc, eq, isNull, max, sql } from "drizzle-orm";

import type {
  FieldSchemaType,
  TemplateCreateType,
  TemplatePreviewType,
  TemplateUpdateType,
  TemplateVersionCreateType,
  TemplateVersionUpdateType,
} from "./template.model";

import { db } from "../../db";
import { templateVersions, templates } from "../../db/schema/template.schema";
import { AppError, isPgUniqueViolation } from "../../shared/errors";
import { AssetService } from "../assets/asset.service";
import { extractFields } from "./template.extract";
import { computeSchemaHash } from "./template.hash";
import {
  collectAssetReferences,
  renderLayout,
  sanitizeLayout,
  validateLayoutAgainstSchema,
} from "./template.layout";

const requireTemplate = async (
  organizationId: string,
  templateId: string,
  options?: { allowArchived: boolean }
) => {
  const conditions = [
    eq(templates.id, templateId),
    eq(templates.organizationId, organizationId),
  ];

  if (!options?.allowArchived) {
    conditions.push(isNull(templates.archivedAt));
  }

  const [template] = await db
    .select()
    .from(templates)
    .where(and(...conditions))
    .limit(1);

  if (!template) {
    throw AppError.notFound("Template not found");
  }

  return template;
};

const requireTemplateVersion = async (
  templateId: string,
  versionId: string
) => {
  const [version] = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.id, versionId),
        eq(templateVersions.templateId, templateId)
      )
    )
    .limit(1);

  if (!version) {
    throw AppError.notFound("Template version not found");
  }

  return version;
};

const resolveFieldSchema = (
  layout: string,
  explicit: FieldSchemaType | undefined = undefined
): FieldSchemaType => {
  if (explicit) {
    return explicit;
  }
  return { fields: extractFields(layout) };
};

const prepareLayout = async (
  organizationId: string,
  rawLayout: string,
  explicitFieldSchema: FieldSchemaType | undefined
): Promise<{ layout: string; fieldSchema: FieldSchemaType }> => {
  const layout = sanitizeLayout(rawLayout);
  const fieldSchema = resolveFieldSchema(layout, explicitFieldSchema);

  validateLayoutAgainstSchema(layout, fieldSchema);
  await AssetService.assertAssetsBelongToOrg(
    organizationId,
    collectAssetReferences(layout)
  );

  return { fieldSchema, layout };
};

export const TemplateService = {
  async archive(organizationId: string, templateId: string) {
    await requireTemplate(organizationId, templateId);

    const now = new Date();

    const [template] = await db
      .update(templates)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.organizationId, organizationId),
          isNull(templates.archivedAt)
        )
      )
      .returning();

    if (!template) {
      throw AppError.notFound("Template not found");
    }

    return template;
  },

  async create(
    organizationId: string,
    createdBy: string,
    data: TemplateCreateType
  ) {
    const { layout, fieldSchema } = await prepareLayout(
      organizationId,
      data.layout,
      data.fieldSchema
    );

    try {
      return await db.transaction(async (tx) => {
        const [template] = await tx
          .insert(templates)
          .values({
            createdBy,
            description: data.description ?? null,
            name: data.name,
            organizationId,
          })
          .returning();

        const [version] = await tx
          .insert(templateVersions)
          .values({
            createdBy,
            fieldSchema,
            layout,
            templateId: template.id,
            version: 1,
          })
          .returning();

        return { ...template, versions: [version] };
      });
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw AppError.conflict(
          "A template with this name already exists in the organization"
        );
      }
      throw error;
    }
  },

  async createVersion(
    organizationId: string,
    templateId: string,
    createdBy: string,
    data: TemplateVersionCreateType
  ) {
    await requireTemplate(organizationId, templateId);

    const { layout, fieldSchema } = await prepareLayout(
      organizationId,
      data.layout,
      data.fieldSchema
    );

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM ${templates} WHERE ${templates.id} = ${templateId} FOR UPDATE`
      );

      const [result] = await tx
        .select({ highestVersion: max(templateVersions.version) })
        .from(templateVersions)
        .where(eq(templateVersions.templateId, templateId));

      const nextVersion = Number(result?.highestVersion ?? 0) + 1;

      const [version] = await tx
        .insert(templateVersions)
        .values({
          createdBy,
          fieldSchema,
          layout,
          templateId,
          version: nextVersion,
        })
        .returning();

      await tx
        .update(templates)
        .set({ updatedAt: new Date() })
        .where(eq(templates.id, templateId));

      return version;
    });
  },

  async getById(organizationId: string, templateId: string) {
    const template = await requireTemplate(organizationId, templateId, {
      allowArchived: true,
    });

    const versions = await db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.templateId, templateId))
      .orderBy(desc(templateVersions.version));

    return { ...template, versions };
  },

  async list(organizationId: string, limit: number, offset: number) {
    const where = and(
      eq(templates.organizationId, organizationId),
      isNull(templates.archivedAt)
    );

    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(templates)
        .where(where)
        .orderBy(desc(templates.updatedAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(templates).where(where),
    ]);

    return {
      data,
      meta: { limit, offset, total: Number(total) },
    };
  },

  async listVersions(organizationId: string, templateId: string) {
    await requireTemplate(organizationId, templateId, {
      allowArchived: true,
    });

    return db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.templateId, templateId))
      .orderBy(desc(templateVersions.version));
  },

  async preview(
    organizationId: string,
    templateId: string,
    versionId: string,
    data: TemplatePreviewType
  ) {
    await requireTemplate(organizationId, templateId, {
      allowArchived: true,
    });

    const version = await requireTemplateVersion(templateId, versionId);

    const schema = version.fieldSchema;
    const missing: string[] = [];

    for (const field of schema.fields) {
      if (!field.required) {
        continue;
      }
      const value = data.data[field.key];
      if (value === undefined || value === null || value === "") {
        missing.push(field.key);
      }
    }

    if (missing.length > 0) {
      throw AppError.validation(
        `Missing required values: ${missing.join(", ")}`
      );
    }

    const svg = renderLayout(version.layout, data.data);
    return { svg };
  },

  async publishVersion(
    organizationId: string,
    templateId: string,
    versionId: string
  ) {
    await requireTemplate(organizationId, templateId);

    const version = await requireTemplateVersion(templateId, versionId);

    if (version.status !== "draft") {
      throw AppError.conflict("Only draft versions can be published");
    }

    const schemaHash = await computeSchemaHash(
      version.fieldSchema,
      version.layout
    );

    return db.transaction(async (tx) => {
      const [published] = await tx
        .update(templateVersions)
        .set({
          publishedAt: new Date(),
          schemaHash,
          status: "published",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(templateVersions.id, versionId),
            eq(templateVersions.templateId, templateId),
            eq(templateVersions.status, "draft")
          )
        )
        .returning();

      if (!published) {
        throw AppError.conflict("The version could not be published");
      }

      await tx
        .update(templates)
        .set({ updatedAt: new Date() })
        .where(eq(templates.id, templateId));

      return published;
    });
  },

  async update(
    organizationId: string,
    templateId: string,
    data: TemplateUpdateType
  ) {
    await requireTemplate(organizationId, templateId);

    const [template] = await db
      .update(templates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.organizationId, organizationId),
          isNull(templates.archivedAt)
        )
      )
      .returning();

    if (!template) {
      throw AppError.notFound("Template not found");
    }

    return template;
  },

  async updateDraftVersion(
    organizationId: string,
    templateId: string,
    versionId: string,
    data: TemplateVersionUpdateType
  ) {
    await requireTemplate(organizationId, templateId);

    const version = await requireTemplateVersion(templateId, versionId);

    if (version.status !== "draft") {
      throw AppError.conflict("Published versions cannot be modified");
    }

    const nextLayout = data.layout
      ? sanitizeLayout(data.layout)
      : version.layout;

    let nextFieldSchema: FieldSchemaType;
    if (data.fieldSchema) {
      nextFieldSchema = data.fieldSchema;
    } else if (data.layout) {
      nextFieldSchema = resolveFieldSchema(nextLayout);
    } else {
      nextFieldSchema = version.fieldSchema;
    }

    validateLayoutAgainstSchema(nextLayout, nextFieldSchema);
    await AssetService.assertAssetsBelongToOrg(
      organizationId,
      collectAssetReferences(nextLayout)
    );

    const [updated] = await db
      .update(templateVersions)
      .set({
        ...data,
        fieldSchema: nextFieldSchema,
        layout: nextLayout,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(templateVersions.id, versionId),
          eq(templateVersions.templateId, templateId),
          eq(templateVersions.status, "draft")
        )
      )
      .returning();

    if (!updated) {
      throw AppError.conflict("The version is no longer editable");
    }

    return updated;
  },
};
