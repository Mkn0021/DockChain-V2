export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", details?: unknown): AppError {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(message = "Not found"): AppError {
    return new AppError(message, 404, "NOT_FOUND");
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, "CONFLICT", details);
  }

  static validation(
    message = "Validation failed",
    details?: unknown
  ): AppError {
    return new AppError(message, 422, "VALIDATION_ERROR", details);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, 500, "INTERNAL_ERROR");
  }
}
