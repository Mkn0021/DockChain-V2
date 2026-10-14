import type {
  InvitationCreateType,
  MemberRoleUpdateType,
  OrganizationCreateType,
  OrganizationUpdateType,
} from "./organization.model";

import { auth } from "../../auth";
import { isOrganizationMember } from "../../auth/organization-access";
import { AppError, isPgUniqueViolation } from "../../shared/errors";

export const OrganizationService = {
  async cancelInvitation(
    headers: Headers,
    organizationId: string,
    invitationId: string
  ) {
    let invitations: { id: string }[] = [];
    try {
      invitations = await auth.api.listInvitations({
        headers,
        query: { organizationId },
      });
    } catch {
      throw AppError.notFound("Invitation not found");
    }

    if (!invitations.some((invitation) => invitation.id === invitationId)) {
      throw AppError.notFound("Invitation not found");
    }

    try {
      return await auth.api.cancelInvitation({
        body: { invitationId },
        headers,
      });
    } catch {
      throw AppError.notFound("Invitation not found");
    }
  },

  async create(headers: Headers, data: OrganizationCreateType) {
    try {
      return await auth.api.createOrganization({
        body: {
          name: data.name,
          slug: data.slug,
        },
        headers,
      });
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw AppError.conflict(
          "An organization with this slug already exists"
        );
      }
      throw error;
    }
  },

  async createInvitation(
    headers: Headers,
    organizationId: string,
    data: InvitationCreateType
  ) {
    try {
      return await auth.api.createInvitation({
        body: {
          email: data.email,
          organizationId,
          role: data.role,
        },
        headers,
      });
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async delete(headers: Headers, organizationId: string) {
    try {
      return await auth.api.deleteOrganization({
        body: { organizationId },
        headers,
      });
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async getFullOrganization(headers: Headers, organizationId: string) {
    const member = await isOrganizationMember(headers, organizationId);
    if (!member) {
      throw AppError.notFound("Organization not found");
    }

    try {
      return await auth.api.getFullOrganization({
        headers,
        query: { organizationId },
      });
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async leave(headers: Headers, organizationId: string) {
    try {
      return await auth.api.leaveOrganization({
        body: { organizationId },
        headers,
      });
    } catch {
      throw AppError.forbidden("You cannot leave this organization");
    }
  },

  list(headers: Headers) {
    return auth.api.listOrganizations({ headers });
  },

  async listInvitations(headers: Headers, organizationId: string) {
    try {
      return await auth.api.listInvitations({
        headers,
        query: { organizationId },
      });
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async listMembers(
    headers: Headers,
    organizationId: string,
    limit = 50,
    offset = 0
  ) {
    const member = await isOrganizationMember(headers, organizationId);
    if (!member) {
      throw AppError.notFound("Organization not found");
    }

    try {
      return await auth.api.listMembers({
        headers,
        query: { limit, offset, organizationId },
      });
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async removeMember(
    headers: Headers,
    organizationId: string,
    memberIdOrEmail: string
  ) {
    try {
      return await auth.api.removeMember({
        body: { memberIdOrEmail, organizationId },
        headers,
      });
    } catch {
      throw AppError.notFound("Member not found");
    }
  },

  async setActive(headers: Headers, organizationId: string | null) {
    try {
      return await auth.api.setActiveOrganization({
        body: { organizationId },
        headers,
      });
    } catch {
      throw AppError.forbidden("You are not a member of this organization");
    }
  },

  async update(
    headers: Headers,
    organizationId: string,
    data: OrganizationUpdateType
  ) {
    try {
      return await auth.api.updateOrganization({
        body: {
          data,
          organizationId,
        },
        headers,
      });
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw AppError.conflict(
          "An organization with this slug already exists"
        );
      }
      throw AppError.notFound("Organization not found");
    }
  },

  async updateMemberRole(
    headers: Headers,
    organizationId: string,
    memberId: string,
    data: MemberRoleUpdateType
  ) {
    try {
      return await auth.api.updateMemberRole({
        body: {
          memberId,
          organizationId,
          role: data.role,
        },
        headers,
      });
    } catch {
      throw AppError.notFound("Member not found");
    }
  },
};
