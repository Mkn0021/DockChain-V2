import { cors } from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { serverTiming } from "@elysiajs/server-timing";
import { Elysia } from "elysia";
import { z } from "zod";

import { authOpenAPI } from "./auth";
import { syncRegistryDeployment } from "./chain/deployments";
import { env } from "./config";
import { apiKeyController } from "./features/apikeys/apikey.controller";
import { auditController } from "./features/audit/audit.controller";
import { batchController } from "./features/batches/batch.controller";
import { runBatchReconciler } from "./features/batches/batch.reconciler";
import { runBatchScheduler } from "./features/batches/batch.scheduler";
import { documentController } from "./features/documents/document.controller";
import { healthController } from "./features/health/health.controller";
import { organizationController } from "./features/organizations/organization.controller";
import { settingsController } from "./features/settings/settings.controller";
import { templateController } from "./features/templates/template.controller";
import { walletController } from "./features/wallets/wallet.controller";
import { webhookController } from "./features/webhooks/webhook.controller";
import { scheduleChainIndexer } from "./queues/queues/chain-indexer.queue";
import { httpPlugin } from "./shared/http";
import {
  authPlugin,
  bullBoardPlugin,
  dbPlugin,
  orgContextPlugin,
  permissionPlugin,
  redisPlugin,
  s3Plugin,
} from "./shared/plugins";

if (env.NODE_ENV !== "test") {
  await syncRegistryDeployment(env.CHAIN_ID, env.REGISTRY_ADDRESS);
  await scheduleChainIndexer();
}

export const app = new Elysia({
  serve: {
    idleTimeout: 30,
    maxRequestBodySize: 1024 * 1024 * 128,
  },
})
  .use(httpPlugin)
  .use(cors())
  .use(dbPlugin)
  .use(redisPlugin)
  .use(s3Plugin)
  .use(authPlugin)
  .use(bullBoardPlugin)
  .use(permissionPlugin)
  .use(orgContextPlugin)
  .use(
    cron({
      name: "batch-scheduler",
      pattern: "* * * * *",
      async run() {
        await runBatchScheduler();
      },
    })
  )
  .use(
    cron({
      name: "batch-reconciler",
      pattern: "* * * * *",
      async run() {
        await runBatchReconciler();
      },
    })
  )
  .use(
    openapi({
      documentation: {
        components: (await authOpenAPI.getComponents()) as never,
        info: {
          title: "Elysia API",
          version: "1.0.0",
        },
        paths: (await authOpenAPI.getPaths()) as never,
      },
      mapJsonSchema: {
        zod: z.toJSONSchema,
      },
    })
  )
  .use(opentelemetry())
  .use(serverTiming())
  .use(apiKeyController)
  .use(auditController)
  .use(batchController)
  .use(documentController)
  .use(healthController)
  .use(organizationController)
  .use(settingsController)
  .use(templateController)
  .use(walletController)
  .use(webhookController);
