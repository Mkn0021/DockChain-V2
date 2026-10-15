import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  OrganizationParamsSchema,
  TemplateCreateSchema,
  TemplateDetailsResponseSchema,
  TemplateIdParamsSchema,
  TemplateListQuerySchema,
  TemplateListResponseSchema,
  TemplatePreviewResponseSchema,
  TemplatePreviewSchema,
  TemplateSelectSchema,
  TemplateUpdateSchema,
  TemplateVersionCreateSchema,
  TemplateVersionParamsSchema,
  TemplateVersionsResponseSchema,
  TemplateVersionSelectSchema,
  TemplateVersionUpdateSchema,
} from "./template.model";
import { TemplateService } from "./template.service";

export const templateController = new Elysia({
  prefix: "/organizations/:organizationId/templates",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/",
    ({ body, params, user }) =>
      TemplateService.create(params.organizationId, user.id, body),
    {
      auth: true,
      body: TemplateCreateSchema,
      detail: {
        description: "Creates template metadata and its initial draft version.",
        summary: "Create a template",
        tags: ["Templates"],
      },
      params: OrganizationParamsSchema,
      permission: { template: ["create"] },
      response: {
        200: TemplateDetailsResponseSchema,
        400: ErrorResponse,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get(
    "/",
    ({ params, query }) =>
      TemplateService.list(params.organizationId, query.limit, query.offset),
    {
      auth: true,
      detail: {
        summary: "List templates",
        tags: ["Templates"],
      },
      params: OrganizationParamsSchema,
      permission: { template: ["read"] },
      query: TemplateListQuerySchema,
      response: {
        200: TemplateListResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
      },
    }
  )

  .get(
    "/:templateId",
    ({ params }) =>
      TemplateService.getById(params.organizationId, params.templateId),
    {
      auth: true,
      detail: {
        summary: "Get a template",
        tags: ["Templates"],
      },
      params: TemplateIdParamsSchema,
      permission: { template: ["read"] },
      response: {
        200: TemplateDetailsResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .patch(
    "/:templateId",
    ({ body, params }) =>
      TemplateService.update(params.organizationId, params.templateId, body),
    {
      auth: true,
      body: TemplateUpdateSchema,
      detail: {
        description: "Does not modify existing template-version layouts.",
        summary: "Update template metadata",
        tags: ["Templates"],
      },
      params: TemplateIdParamsSchema,
      permission: { template: ["update"] },
      response: {
        200: TemplateSelectSchema,
        404: ErrorResponse,
      },
    }
  )

  .post(
    "/:templateId/versions",
    ({ body, params, user }) =>
      TemplateService.createVersion(
        params.organizationId,
        params.templateId,
        user.id,
        body
      ),
    {
      auth: true,
      body: TemplateVersionCreateSchema,
      detail: {
        summary: "Create a template version",
        tags: ["Templates"],
      },
      params: TemplateIdParamsSchema,
      permission: { template: ["update"] },
      response: {
        200: TemplateVersionSelectSchema,
        404: ErrorResponse,
      },
    }
  )

  .get(
    "/:templateId/versions",
    ({ params }) =>
      TemplateService.listVersions(params.organizationId, params.templateId),
    {
      auth: true,
      detail: {
        summary: "List template versions",
        tags: ["Templates"],
      },
      params: TemplateIdParamsSchema,
      permission: { template: ["read"] },
      response: TemplateVersionsResponseSchema,
    }
  )

  .patch(
    "/:templateId/versions/:versionId",
    ({ body, params }) =>
      TemplateService.updateDraftVersion(
        params.organizationId,
        params.templateId,
        params.versionId,
        body
      ),
    {
      auth: true,
      body: TemplateVersionUpdateSchema,
      detail: {
        summary: "Update a draft template version",
        tags: ["Templates"],
      },
      params: TemplateVersionParamsSchema,
      permission: { template: ["update"] },
      response: {
        200: TemplateVersionSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  )

  .post(
    "/:templateId/versions/:versionId/publish",
    ({ params }) =>
      TemplateService.publishVersion(
        params.organizationId,
        params.templateId,
        params.versionId
      ),
    {
      auth: true,
      detail: {
        description:
          "Marks a draft version as published, computes its schema hash, and makes it immutable.",
        summary: "Publish a template version",
        tags: ["Templates"],
      },
      params: TemplateVersionParamsSchema,
      permission: { template: ["publish"] },
      response: {
        200: TemplateVersionSelectSchema,
        404: ErrorResponse,
        409: ErrorResponse,
      },
    }
  )

  .post(
    "/:templateId/versions/:versionId/preview",
    ({ body, params }) =>
      TemplateService.preview(
        params.organizationId,
        params.templateId,
        params.versionId,
        body
      ),
    {
      auth: true,
      body: TemplatePreviewSchema,
      detail: {
        description:
          "Renders the version's SVG layout with the provided values, XML-escaped.",
        summary: "Preview a template version",
        tags: ["Templates"],
      },
      params: TemplateVersionParamsSchema,
      permission: { template: ["read"] },
      response: {
        200: TemplatePreviewResponseSchema,
        404: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .delete(
    "/:templateId",
    ({ params }) =>
      TemplateService.archive(params.organizationId, params.templateId),
    {
      auth: true,
      detail: {
        description:
          "Archives a template without permanently deleting its history.",
        summary: "Archive a template",
        tags: ["Templates"],
      },
      params: TemplateIdParamsSchema,
      permission: { template: ["delete"] },
      response: {
        200: TemplateSelectSchema,
        404: ErrorResponse,
      },
    }
  );
