import { Elysia } from "elysia";

import {
  authPlugin,
  orgContextPlugin,
  permissionPlugin,
} from "../../shared/plugins";
import {
  InvitationCreateSchema,
  MemberIdParamsSchema,
  MemberRoleUpdateSchema,
  OrganizationCreateSchema,
  OrganizationIdParamsSchema,
  OrganizationListMembersQuerySchema,
  OrganizationInvitationParamsSchema,
  OrganizationUpdateSchema,
  SetActiveOrganizationSchema,
} from "./organization.model";
import { OrganizationService } from "./organization.service";

export const organizationController = new Elysia({
  prefix: "/organizations",
})
  .use(authPlugin)
  .use(orgContextPlugin)
  .use(permissionPlugin)

  .post(
    "/",
    ({ request, body }) => OrganizationService.create(request.headers, body),
    {
      auth: true,
      body: OrganizationCreateSchema,
      detail: {
        summary: "Create an organization",
        tags: ["Organizations"],
      },
    }
  )

  .get("/", ({ request }) => OrganizationService.list(request.headers), {
    auth: true,
    detail: {
      summary: "List organizations available to the current user",
      tags: ["Organizations"],
    },
  })

  .put(
    "/active",
    ({ request, body }) =>
      OrganizationService.setActive(request.headers, body.organizationId),
    {
      auth: true,
      body: SetActiveOrganizationSchema,
      detail: {
        summary: "Set or clear the active organization",
        tags: ["Organizations"],
      },
    }
  )

  .get(
    "/:organizationId",
    ({ request, params }) =>
      OrganizationService.getFullOrganization(
        request.headers,
        params.organizationId
      ),
    {
      auth: true,
      detail: {
        summary: "Get organization details and related information",
        tags: ["Organizations"],
      },
      orgContext: true,
      params: OrganizationIdParamsSchema,
    }
  )

  .patch(
    "/:organizationId",
    ({ request, params, body }) =>
      OrganizationService.update(request.headers, params.organizationId, body),
    {
      auth: true,
      body: OrganizationUpdateSchema,
      detail: {
        summary: "Update an organization",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
      permission: { organization: ["update"] },
    }
  )

  .delete(
    "/:organizationId",
    ({ request, params }) =>
      OrganizationService.delete(request.headers, params.organizationId),
    {
      auth: true,
      detail: {
        summary: "Delete an organization",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
      permission: { organization: ["delete"] },
    }
  )

  .get(
    "/:organizationId/members",
    ({ request, params, query }) =>
      OrganizationService.listMembers(
        request.headers,
        params.organizationId,
        query.limit,
        query.offset
      ),
    {
      auth: true,
      detail: {
        summary: "List organization members",
        tags: ["Organizations", "Members"],
      },
      orgContext: true,
      params: OrganizationIdParamsSchema,
      query: OrganizationListMembersQuerySchema,
    }
  )

  .patch(
    "/:organizationId/members/:memberId",
    ({ request, params, body }) =>
      OrganizationService.updateMemberRole(
        request.headers,
        params.organizationId,
        params.memberId,
        body
      ),
    {
      auth: true,
      body: MemberRoleUpdateSchema,
      detail: {
        summary: "Update an organization member's role",
        tags: ["Organizations", "Members"],
      },
      params: MemberIdParamsSchema,
      permission: { member: ["update"] },
    }
  )

  .delete(
    "/:organizationId/members/:memberId",
    ({ request, params }) =>
      OrganizationService.removeMember(
        request.headers,
        params.organizationId,
        params.memberId
      ),
    {
      auth: true,
      detail: {
        summary: "Remove a member from an organization",
        tags: ["Organizations", "Members"],
      },
      params: MemberIdParamsSchema,
      permission: { member: ["delete"] },
    }
  )

  .post(
    "/:organizationId/leave",
    ({ request, params }) =>
      OrganizationService.leave(request.headers, params.organizationId),
    {
      auth: true,
      detail: {
        summary: "Leave an organization",
        tags: ["Organizations"],
      },
      orgContext: true,
      params: OrganizationIdParamsSchema,
    }
  )

  .post(
    "/:organizationId/invitations",
    ({ request, params, body }) =>
      OrganizationService.createInvitation(
        request.headers,
        params.organizationId,
        body
      ),
    {
      auth: true,
      body: InvitationCreateSchema,
      detail: {
        summary: "Invite a user to an organization",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationIdParamsSchema,
      permission: { invitation: ["create"] },
    }
  )

  .get(
    "/:organizationId/invitations",
    ({ request, params }) =>
      OrganizationService.listInvitations(
        request.headers,
        params.organizationId
      ),
    {
      auth: true,
      detail: {
        summary: "List organization invitations",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationIdParamsSchema,
      permission: { invitation: ["create"] },
    }
  )

  .delete(
    "/:organizationId/invitations/:invitationId",
    ({ request, params }) =>
      OrganizationService.cancelInvitation(
        request.headers,
        params.organizationId,
        params.invitationId
      ),
    {
      auth: true,
      detail: {
        summary: "Cancel an organization invitation",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationInvitationParamsSchema,
      permission: { invitation: ["cancel"] },
    }
  );
