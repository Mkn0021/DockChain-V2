import type {
  InvitationCreateType,
  MemberRoleUpdateType,
  OrganizationCreateType,
  OrganizationUpdateType,
} from "./organization.model";

import { auth } from "../../auth";

export const OrganizationService = {
  cancelInvitation(headers: Headers, invitationId: string) {
    return auth.api.cancelInvitation({
      body: {
        invitationId,
      },
      headers,
    });
  },

  create(headers: Headers, data: OrganizationCreateType) {
    return auth.api.createOrganization({
      body: {
        name: data.name,
        slug: data.slug,
      },
      headers,
    });
  },

  createInvitation(
    headers: Headers,
    organizationId: string,
    data: InvitationCreateType
  ) {
    return auth.api.createInvitation({
      body: {
        email: data.email,
        organizationId,
        role: data.role,
      },
      headers,
    });
  },

  delete(headers: Headers, organizationId: string) {
    return auth.api.deleteOrganization({
      body: {
        organizationId,
      },
      headers,
    });
  },

  getFullOrganization(headers: Headers, organizationId: string) {
    return auth.api.getFullOrganization({
      headers,
      query: {
        organizationId,
      },
    });
  },

  leave(headers: Headers, organizationId: string) {
    return auth.api.leaveOrganization({
      body: {
        organizationId,
      },
      headers,
    });
  },

  list(headers: Headers) {
    return auth.api.listOrganizations({
      headers,
    });
  },

  listInvitations(headers: Headers, organizationId: string) {
    return auth.api.listInvitations({
      headers,
      query: {
        organizationId,
      },
    });
  },

  listMembers(
    headers: Headers,
    organizationId: string,
    limit = 50,
    offset = 0
  ) {
    return auth.api.listMembers({
      headers,
      query: {
        limit,
        offset,
        organizationId,
      },
    });
  },

  removeMember(
    headers: Headers,
    organizationId: string,
    memberIdOrEmail: string
  ) {
    return auth.api.removeMember({
      body: {
        memberIdOrEmail,
        organizationId,
      },
      headers,
    });
  },

  setActive(headers: Headers, organizationId: string | null) {
    return auth.api.setActiveOrganization({
      body: {
        organizationId,
      },
      headers,
    });
  },

  update(
    headers: Headers,
    organizationId: string,
    data: OrganizationUpdateType
  ) {
    return auth.api.updateOrganization({
      body: {
        data: {
          ...data,
          logo: data.logo ?? undefined,
        },
        organizationId,
      },
      headers,
    });
  },

  updateMemberRole(
    headers: Headers,
    organizationId: string,
    memberId: string,
    data: MemberRoleUpdateType
  ) {
    return auth.api.updateMemberRole({
      body: {
        memberId,
        organizationId,
        role: data.role,
      },
      headers,
    });
  },
};
