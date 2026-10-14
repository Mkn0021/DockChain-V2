import { and, count, desc, eq, isNull, max, sql } from "drizzle-orm";

import type {
  TemplateCreateType,
  TemplateUpdateType,
  TemplateVersionCreateType,
  TemplateVersionUpdateType,
} from "./template.model";

import { db } from "../../db";
import { templateVersions, templates } from "../../db/schema/template.schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";

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
    throw new NotFoundError("Template not found");
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
    throw new NotFoundError("Template version not found");
  }

  return version;
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
      throw new NotFoundError("Template not found");
    }

    return template;
  },

  create(organizationId: string, createdBy: string, data: TemplateCreateType) {
    return db.transaction(async (tx) => {
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
          compilerVersion: data.compilerVersion,
          contractName: data.contractName,
          createdBy,
          sourceCode: data.sourceCode,
          templateId: template.id,
          version: 1,
        })
        .returning();

      return {
        ...template,
        versions: [version],
      };
    });
  },

  async createVersion(
    organizationId: string,
    templateId: string,
    createdBy: string,
    data: TemplateVersionCreateType
  ) {
    await requireTemplate(organizationId, templateId);

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
          compilerVersion: data.compilerVersion,
          contractName: data.contractName,
          createdBy,
          sourceCode: data.sourceCode,
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

    return {
      ...template,
      versions,
    };
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
      meta: {
        limit,
        offset,
        total: Number(total),
      },
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

  async publishVersion(
    organizationId: string,
    templateId: string,
    versionId: string
  ) {
    await requireTemplate(organizationId, templateId);

    const version = await requireTemplateVersion(templateId, versionId);

    if (version.status !== "draft") {
      throw new ConflictError("Only draft versions can be published");
    }

    if (!version.sourceCode.trim()) {
      throw new ValidationError("Cannot publish a version with empty source");
    }

    return db.transaction(async (tx) => {
      const [published] = await tx
        .update(templateVersions)
        .set({
          publishedAt: new Date(),
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
        throw new ConflictError("The version could not be published");
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
      throw new NotFoundError("Template not found");
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
      throw new ConflictError("Published versions cannot be modified");
    }

    const [updated] = await db
      .update(templateVersions)
      .set({
        ...data,
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
      throw new ConflictError("The version is no longer editable");
    }

    return updated;
  },
};
