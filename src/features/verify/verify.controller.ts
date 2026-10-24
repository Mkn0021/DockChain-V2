import { Elysia } from "elysia";

import { redis } from "../../redis";
import { ErrorResponse } from "../../shared/models";
import {
  IssuerParamsSchema,
  IssuerResponseSchema,
  RegistryResponseSchema,
  VerifyBundleBodySchema,
  VerifyBundleResponseSchema,
  VerifyLeafParamsSchema,
  VerifyLeafQuerySchema,
  VerifyResponseSchema,
} from "./verify.model";
import { VerifyService } from "./verify.service";

const CACHE_TTL_SECONDS = 30;

const cacheKey = (leaf: string) => `verify:leaf:${leaf.toLowerCase()}`;

export const verifyController = new Elysia()
  .get(
    "/verify/:leaf",
    async ({ params, query, set }) => {
      const live = query.live === true;

      if (!live) {
        const cached = await redis.get(cacheKey(params.leaf));
        if (cached) {
          set.headers["x-cache"] = "hit";
          return JSON.parse(cached);
        }
      }

      const result = await VerifyService.byLeaf(params.leaf, live);

      if (!live) {
        await redis.setex(
          cacheKey(params.leaf),
          CACHE_TTL_SECONDS,
          JSON.stringify(result)
        );
      }

      return result;
    },
    {
      detail: {
        description:
          "Verifies a document by leaf. Reads indexed state by default, or the chain directly with ?live=true.",
        summary: "Verify a document by leaf",
        tags: ["Public Verify"],
      },
      params: VerifyLeafParamsSchema,
      query: VerifyLeafQuerySchema,
      response: {
        200: VerifyResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .post("/verify/bundle", ({ body }) => VerifyService.byBundle(body.bundle), {
    body: VerifyBundleBodySchema,
    detail: {
      description:
        "Verifies a proof bundle without touching the database. Rebuilds the leaf, verifies the Merkle proof, and reads anchor, revocation, and compromise cutoff live from the chain. Never logs or stores the bundle contents.",
      summary: "Verify a proof bundle",
      tags: ["Public Verify"],
    },
    response: {
      200: VerifyBundleResponseSchema,
      422: ErrorResponse,
    },
  })

  .get(
    "/issuers/:address",
    ({ params }) => VerifyService.issuerByAddress(params.address),
    {
      detail: {
        description:
          "Returns organization name, label, domain, and verification state for a registered issuer wallet.",
        summary: "Get issuer metadata",
        tags: ["Public Verify"],
      },
      params: IssuerParamsSchema,
      response: {
        200: IssuerResponseSchema,
        404: ErrorResponse,
      },
    }
  )

  .get("/registry", () => VerifyService.registry(), {
    detail: {
      description:
        "Returns the active registry deployment for the current chain.",
      summary: "Get registry deployment",
      tags: ["Public Verify"],
    },
    response: {
      200: RegistryResponseSchema,
      404: ErrorResponse,
    },
  });
