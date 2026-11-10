import { authClient } from "@/lib/auth/client";

export const resolvePostAuthPath = async (redirectTo: string | null) => {
  if (redirectTo) {
    return redirectTo;
  }

  const [session, organizations] = await Promise.all([
    authClient.getSession({ query: { disableCookieCache: true } }),
    authClient.organization.list(),
  ]);

  const list = organizations.data ?? [];
  const active =
    list.find(
      (organization) =>
        organization.id === session.data?.session.activeOrganizationId
    ) ?? list[0];

  return active ? `/${active.slug}/dashboard` : "/onboarding";
};
