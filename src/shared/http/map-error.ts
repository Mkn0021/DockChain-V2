import {
  AppError,
  isPgForeignKeyViolation,
  isPgUniqueViolation,
} from "../errors";
import { response, type ErrorResponseBody } from "./response";

export interface MappedError {
  status: number;
  body: ErrorResponseBody;
}

interface ErrorLike {
  message: string;
  status?: number | string;
  statusCode?: number;
}

const isErrorLike = (value: unknown): value is ErrorLike =>
  typeof value === "object" &&
  value !== null &&
  "message" in value &&
  typeof (value as { message: unknown }).message === "string";

const statusFromErrorLike = (error: ErrorLike): number | undefined => {
  if (typeof error.statusCode === "number") {
    return error.statusCode;
  }
  if (typeof error.status === "number") {
    return error.status;
  }

  if (typeof error.status === "string") {
    const map: Record<string, number> = {
      BAD_REQUEST: 400,
      CONFLICT: 409,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      UNPROCESSABLE_ENTITY: 422,
    };
    if (error.status in map) {
      return map[error.status];
    }
  }

  return undefined;
};

const statusFromMessage = (message: string): number | undefined => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already exists") ||
    normalized.includes("already in use") ||
    normalized.includes("duplicate")
  ) {
    return 409;
  }
  if (
    normalized.includes("not found") ||
    normalized.includes("does not exist")
  ) {
    return 404;
  }
  if (
    normalized.includes("not authorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("permission")
  ) {
    return 403;
  }
  if (
    normalized.includes("unauthorized") ||
    normalized.includes("not authenticated") ||
    normalized.includes("invalid api key")
  ) {
    return 401;
  }

  return undefined;
};

const codeFor = (status: number): string => {
  switch (status) {
    case 400: {
      return "BAD_REQUEST";
    }
    case 401: {
      return "UNAUTHORIZED";
    }
    case 403: {
      return "FORBIDDEN";
    }
    case 404: {
      return "NOT_FOUND";
    }
    case 409: {
      return "CONFLICT";
    }
    case 422: {
      return "VALIDATION_ERROR";
    }
    default: {
      return "ERROR";
    }
  }
};

export const mapError = (error: unknown, code?: string): MappedError => {
  // 1. Domain errors
  if (error instanceof AppError) {
    return {
      body: response.error(error.code, error.message, error.details),
      status: error.statusCode,
    };
  }

  // 2. Postgres unique violation — safety net for services that didn't catch it
  if (isPgUniqueViolation(error)) {
    return {
      body: response.error("CONFLICT", "Resource already exists"),
      status: 409,
    };
  }

  // 3. Postgres FK violation — referenced row missing
  if (isPgForeignKeyViolation(error)) {
    return {
      body: response.error("BAD_REQUEST", "Referenced resource does not exist"),
      status: 400,
    };
  }

  // 4. Elysia schema validation
  if (code === "VALIDATION") {
    const message =
      error instanceof Error ? error.message : "Validation failed";
    return {
      body: response.error("VALIDATION_ERROR", message),
      status: 422,
    };
  }

  // 5. Elysia route not found
  if (code === "NOT_FOUND") {
    return {
      body: response.error("NOT_FOUND", "Route not found"),
      status: 404,
    };
  }

  // 6. Elysia parse error
  if (code === "PARSE") {
    return {
      body: response.error("BAD_REQUEST", "Malformed request body"),
      status: 400,
    };
  }

  // 7. Plain-object errors thrown by libraries (Better Auth, etc.)
  if (isErrorLike(error) && !(error instanceof Error)) {
    const status =
      statusFromErrorLike(error) ?? statusFromMessage(error.message);
    if (status) {
      return {
        body: response.error(codeFor(status), error.message),
        status,
      };
    }
  }

  // 8. Native Error instances with recognizable messages
  if (error instanceof Error) {
    const status = statusFromMessage(error.message);
    if (status) {
      return {
        body: response.error(codeFor(status), error.message),
        status,
      };
    }
  }

  // 9. Anything else
  return {
    body: response.error("INTERNAL_ERROR", "Internal server error"),
    status: 500,
  };
};
