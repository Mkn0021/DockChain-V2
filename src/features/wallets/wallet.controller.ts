import { Elysia } from "elysia";

import { ErrorResponse } from "../../shared/models";
import { authPlugin, permissionPlugin } from "../../shared/plugins";
import {
  OrganizationParamsSchema,
  WalletChallengeResponseSchema,
  WalletChallengeSchema,
  WalletCreateSchema,
  WalletIdParamsSchema,
  WalletListResponseSchema,
  WalletSelectSchema,
  WalletVerifyDomainResponseSchema,
} from "./wallet.model";
import { WalletService } from "./wallet.service";

export const walletController = new Elysia({
  prefix: "/organizations/:organizationId/wallets",
})
  .use(authPlugin)
  .use(permissionPlugin)

  .post(
    "/challenge",
    ({ params, body }) =>
      WalletService.createChallenge(params.organizationId, body),
    {
      auth: true,
      body: WalletChallengeSchema,
      detail: {
        description: "Returns a SIWE message to be signed by the wallet.",
        summary: "Start wallet ownership challenge",
        tags: ["Wallets"],
      },
      params: OrganizationParamsSchema,
      permission: { wallet: ["create"] },
      response: {
        200: WalletChallengeResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .post(
    "/",
    ({ params, body, user }) =>
      WalletService.register(params.organizationId, user.id, body),
    {
      auth: true,
      body: WalletCreateSchema,
      detail: {
        description:
          "Registers a wallet after verifying its signed challenge. No private key is ever sent to the server.",
        summary: "Register an issuer wallet",
        tags: ["Wallets"],
      },
      params: OrganizationParamsSchema,
      permission: { wallet: ["create"] },
      response: {
        200: WalletSelectSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        409: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .get("/", ({ params }) => WalletService.list(params.organizationId), {
    auth: true,
    detail: { summary: "List issuer wallets", tags: ["Wallets"] },
    params: OrganizationParamsSchema,
    permission: { wallet: ["read"] },
    response: {
      200: WalletListResponseSchema,
      401: ErrorResponse,
      403: ErrorResponse,
    },
  })

  .get(
    "/:walletId",
    ({ params }) =>
      WalletService.getById(params.organizationId, params.walletId),
    {
      auth: true,
      detail: { summary: "Get an issuer wallet", tags: ["Wallets"] },
      params: WalletIdParamsSchema,
      permission: { wallet: ["read"] },
      response: {
        200: WalletSelectSchema,
        404: ErrorResponse,
      },
    }
  )

  .post(
    "/:walletId/verify-domain",
    ({ params }) =>
      WalletService.verifyDomain(params.organizationId, params.walletId),
    {
      auth: true,
      detail: {
        description:
          "Looks up a TXT record at _dockchain.<domain> to bind the wallet's domain to its chain and address.",
        summary: "Verify wallet domain ownership",
        tags: ["Wallets"],
      },
      params: WalletIdParamsSchema,
      permission: { wallet: ["update"] },
      response: {
        200: WalletVerifyDomainResponseSchema,
        401: ErrorResponse,
        403: ErrorResponse,
        404: ErrorResponse,
        422: ErrorResponse,
      },
    }
  )

  .delete(
    "/:walletId",
    ({ params }) =>
      WalletService.delete(params.organizationId, params.walletId),
    {
      auth: true,
      detail: {
        description:
          "Hard-deletes a wallet when it is not referenced by any document; disables it otherwise.",
        summary: "Delete or disable an issuer wallet",
        tags: ["Wallets"],
      },
      params: WalletIdParamsSchema,
      permission: { wallet: ["delete"] },
      response: {
        200: WalletSelectSchema,
        404: ErrorResponse,
      },
    }
  );
