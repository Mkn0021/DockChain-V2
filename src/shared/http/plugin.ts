import { Elysia } from "elysia";

import { AppError } from "../errors";
import { mapError } from "./map-error";

export const httpPlugin = new Elysia({ name: "plugin.http" })
  .onError(({ code, error, path, request, set }) => {
    if (code === "NOT_FOUND" && !(error instanceof Error)) {
      return;
    }

    const mapped = mapError(error, String(code));

    // Log unexpected errors once, at the boundary
    if (mapped.status >= 500) {
      const isKnown = error instanceof AppError;
      if (!isKnown) {
        console.error("[http] unhandled error", {
          code,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
          method: request.method,
          path,
        });
      }
    }

    set.status = mapped.status;
    return mapped.body;
  })
  .as("global");
