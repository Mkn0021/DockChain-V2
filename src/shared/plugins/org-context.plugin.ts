import { Elysia } from "elysia";

export const orgContextPlugin = new Elysia({
  name: "plugin.org-context",
}).macro({
  orgContext: {
    resolve({ params, status }) {
      const { organizationId } = params as { organizationId?: string };

      if (!organizationId) {
        return status(400, { message: "organizationId is required" });
      }

      return { organizationId };
    },
  },
});
