import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { headers } from "next/headers";
import { cache } from "react";

const serverAuthClient = createAuthClient({
  baseURL: process.env.API_URL,
  plugins: [organizationClient()],
});

export const getSession = cache(async () => {
  const { data } = await serverAuthClient.getSession({
    fetchOptions: { headers: await headers() },
  });
  return data;
});

export const getOrganizations = cache(async () => {
  const { data } = await serverAuthClient.organization.list({
    fetchOptions: { headers: await headers() },
  });
  return data ?? [];
});

export const getHomePath = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const organizations = await getOrganizations();
  const active =
    organizations.find(
      (organization) => organization.id === session.session.activeOrganizationId
    ) ?? organizations[0];

  return active ? `/${active.slug}/dashboard` : "/onboarding";
});
