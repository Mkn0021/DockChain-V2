import type {
  InvitationCreateType,
  MemberRoleUpdateType,
  OrganizationCreateType,
  OrganizationUpdateType,
} from "./organization.model";

import { auth } from "../../auth";
import { isOrganizationMember } from "../../auth/organization-access";
import { AppError, isPgUniqueViolation } from "../../shared/errors";

const normalizeOrganization = <
  T extends { logo?: string | null; metadata?: unknown },
>(
  organization: T
) => ({
  ...organization,
  logo: organization.logo ?? null,
  metadata:
    organization.metadata === null || organization.metadata === undefined
      ? null
      : String(organization.metadata),
});

const normalizeMember = <T extends { user?: { image?: string | null } }>(
  member: T
) => ({
  ...member,
  ...(member.user
    ? { user: { ...member.user, image: member.user.image ?? null } }
    : {}),
});

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
      const result = await auth.api.cancelInvitation({
        body: { invitationId },
        headers,
      });
      if (!result) {
        throw AppError.notFound("Invitation not found");
      }
      return result;
    } catch {
      throw AppError.notFound("Invitation not found");
    }
  },

  async create(headers: Headers, data: OrganizationCreateType) {
    try {
      const organization = await auth.api.createOrganization({
        body: {
          name: data.name,
          slug: data.slug,
        },
        headers,
      });
      if (!organization) {
        throw AppError.notFound("Organization not found");
      }
      return normalizeOrganization(organization);
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
      const result = await auth.api.createInvitation({
        body: {
          email: data.email,
          organizationId,
          role: data.role ?? "viewer",
        },
        headers,
      });
      if (!result) {
        throw AppError.notFound("Organization not found");
      }
      return result;
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async delete(headers: Headers, organizationId: string) {
    try {
      const result = await auth.api.deleteOrganization({
        body: { organizationId },
        headers,
      });
      if (!result) {
        throw AppError.notFound("Organization not found");
      }
      return normalizeOrganization(result);
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
      const organization = await auth.api.getFullOrganization({
        headers,
        query: { organizationId },
      });
      if (!organization) {
        throw AppError.notFound("Organization not found");
      }
      return {
        ...normalizeOrganization(organization),
        invitations: organization.invitations,
        members: organization.members.map(normalizeMember),
      };
    } catch {
      throw AppError.notFound("Organization not found");
    }
  },

  async leave(headers: Headers, organizationId: string) {
    try {
      const result = await auth.api.leaveOrganization({
        body: { organizationId },
        headers,
      });
      if (!result) {
        throw AppError.forbidden("You cannot leave this organization");
      }
      return result;
    } catch {
      throw AppError.forbidden("You cannot leave this organization");
    }
  },

  async list(headers: Headers) {
    const organizations = await auth.api.listOrganizations({ headers });
    if (!organizations) {
      throw AppError.notFound("Organizations not found");
    }
    return organizations.map(normalizeOrganization);
  },

  async listInvitations(headers: Headers, organizationId: string) {
    try {
      const result = await auth.api.listInvitations({
        headers,
        query: { organizationId },
      });
      if (!result) {
        throw AppError.notFound("Organization not found");
      }
      return result;
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
      const result = await auth.api.listMembers({
        headers,
        query: { limit, offset, organizationId },
      });
      if (!result) {
        throw AppError.notFound("Organization not found");
      }
      return { ...result, members: result.members.map(normalizeMember) };
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
      const result = await auth.api.removeMember({
        body: { memberIdOrEmail, organizationId },
        headers,
      });
      if (!result) {
        throw AppError.notFound("Member not found");
      }
      return { member: normalizeMember(result.member) };
    } catch {
      throw AppError.notFound("Member not found");
    }
  },

  async setActive(headers: Headers, organizationId: string | null) {
    try {
      const organization = await auth.api.setActiveOrganization({
        body: { organizationId },
        headers,
      });
      return organization ? normalizeOrganization(organization) : null;
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
      const organization = await auth.api.updateOrganization({
        body: {
          data,
          organizationId,
        },
        headers,
      });
      if (!organization) {
        throw AppError.notFound("Organization not found");
      }
      return normalizeOrganization(organization);
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
      const member = await auth.api.updateMemberRole({
        body: {
          memberId,
          organizationId,
          role: data.role,
        },
        headers,
      });
      if (!member) {
        throw AppError.notFound("Member not found");
      }
      return { member: normalizeMember(member) };
    } catch {
      throw AppError.notFound("Member not found");
    }
  },
};
