import { Elysia } from "elysia";

import { auth } from "../../auth";
import { hasOrganizationPermission } from "../../auth/organization-access";
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

  // --------------------------------------------------
  // CREATE ORGANIZATION
  // POST /organizations
  // --------------------------------------------------

  .post(
    "/",
    async ({ request, body, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.create(request.headers, body);
    },
    {
      body: OrganizationCreateSchema,
      detail: {
        summary: "Create an organization",
        tags: ["Organizations"],
      },
    }
  )

  // --------------------------------------------------
  // LIST USER'S ORGANIZATIONS
  // GET /organizations
  // --------------------------------------------------

  .get(
    "/",
    async ({ request, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.list(request.headers);
    },
    {
      detail: {
        summary: "List organizations available to the current user",
        tags: ["Organizations"],
      },
    }
  )

  // --------------------------------------------------
  // SET ACTIVE ORGANIZATION
  // PUT /organizations/active
  // --------------------------------------------------

  .put(
    "/active",
    async ({ request, body, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.setActive(
        request.headers,
        body.organizationId
      );
    },
    {
      body: SetActiveOrganizationSchema,
      detail: {
        summary: "Set or clear the active organization",
        tags: ["Organizations"],
      },
    }
  )

  // --------------------------------------------------
  // GET ORGANIZATION DETAILS
  // GET /organizations/:organizationId
  // --------------------------------------------------

  .get(
    "/:organizationId",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.getFullOrganization(
        request.headers,
        params.organizationId
      );
    },
    {
      detail: {
        summary: "Get organization details and related information",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // UPDATE ORGANIZATION
  // PATCH /organizations/:organizationId
  // --------------------------------------------------

  .patch(
    "/:organizationId",
    async ({ request, params, body, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          organization: ["update"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.update(
        request.headers,
        params.organizationId,
        body
      );
    },
    {
      body: OrganizationUpdateSchema,
      detail: {
        summary: "Update an organization",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // DELETE ORGANIZATION
  // DELETE /organizations/:organizationId
  // --------------------------------------------------

  .delete(
    "/:organizationId",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          organization: ["delete"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.delete(request.headers, params.organizationId);
    },
    {
      detail: {
        summary: "Delete an organization",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // LIST MEMBERS
  // GET /organizations/:organizationId/members
  // --------------------------------------------------

  .get(
    "/:organizationId/members",
    async ({ request, params, query, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.listMembers(
        request.headers,
        params.organizationId,
        query.limit,
        query.offset
      );
    },
    {
      detail: {
        summary: "List organization members",
        tags: ["Organizations", "Members"],
      },
      params: OrganizationIdParamsSchema,
      query: OrganizationListMembersQuerySchema,
    }
  )

  // --------------------------------------------------
  // UPDATE MEMBER ROLE
  // PATCH /organizations/:organizationId/members/:memberId
  // --------------------------------------------------

  .patch(
    "/:organizationId/members/:memberId",
    async ({ request, params, body, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          member: ["update"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.updateMemberRole(
        request.headers,
        params.organizationId,
        params.memberId,
        body
      );
    },
    {
      body: MemberRoleUpdateSchema,
      detail: {
        summary: "Update an organization member's role",
        tags: ["Organizations", "Members"],
      },
      params: MemberIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // REMOVE MEMBER
  // DELETE /organizations/:organizationId/members/:memberId
  // --------------------------------------------------

  .delete(
    "/:organizationId/members/:memberId",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          member: ["delete"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.removeMember(
        request.headers,
        params.organizationId,
        params.memberId
      );
    },
    {
      detail: {
        summary: "Remove a member from an organization",
        tags: ["Organizations", "Members"],
      },
      params: MemberIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // LEAVE ORGANIZATION
  // POST /organizations/:organizationId/leave
  // --------------------------------------------------

  .post(
    "/:organizationId/leave",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      return OrganizationService.leave(request.headers, params.organizationId);
    },
    {
      detail: {
        summary: "Leave an organization",
        tags: ["Organizations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // CREATE INVITATION
  // POST /organizations/:organizationId/invitations
  // --------------------------------------------------

  .post(
    "/:organizationId/invitations",
    async ({ request, params, body, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          invitation: ["create"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.createInvitation(
        request.headers,
        params.organizationId,
        body
      );
    },
    {
      body: InvitationCreateSchema,
      detail: {
        summary: "Invite a user to an organization",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // LIST INVITATIONS
  // GET /organizations/:organizationId/invitations
  // --------------------------------------------------

  .get(
    "/:organizationId/invitations",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          invitation: ["create"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.listInvitations(
        request.headers,
        params.organizationId
      );
    },
    {
      detail: {
        summary: "List organization invitations",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationIdParamsSchema,
    }
  )

  // --------------------------------------------------
  // CANCEL INVITATION
  // DELETE /organizations/:organizationId/invitations/:invitationId
  // --------------------------------------------------

  .delete(
    "/:organizationId/invitations/:invitationId",
    async ({ request, params, status }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return status(401, { message: "Unauthorized" });
      }

      const allowed = await hasOrganizationPermission(
        request.headers,
        params.organizationId,
        {
          invitation: ["cancel"],
        }
      );

      if (!allowed) {
        return status(403, { message: "Forbidden" });
      }

      return OrganizationService.cancelInvitation(
        request.headers,
        params.invitationId
      );
    },
    {
      detail: {
        summary: "Cancel an organization invitation",
        tags: ["Organizations", "Invitations"],
      },
      params: OrganizationInvitationParamsSchema,
    }
  );
