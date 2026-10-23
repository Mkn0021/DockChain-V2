import { Elysia } from "elysia";

import { HealthResponse } from "./health.model";
import { HealthService } from "./health.service";

export const healthController = new Elysia({ prefix: "/health" }).get(
  "/",
  () => HealthService.check(),
  {
    detail: {
      description: "Returns the health status of the API and chain",
      summary: "Health check",
      tags: ["Health"],
    },
    response: HealthResponse,
  }
);
