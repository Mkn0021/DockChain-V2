interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

const getPgError = (error: unknown): PgError | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error) {
    return error as PgError;
  }

  return "cause" in error ? getPgError(error.cause) : undefined;
};

export const isPgUniqueViolation = (error: unknown): boolean =>
  getPgError(error)?.code === "23505";

export const isPgForeignKeyViolation = (error: unknown): boolean =>
  getPgError(error)?.code === "23503";

export const isPgNotNullViolation = (error: unknown): boolean =>
  getPgError(error)?.code === "23502";

export const getPgConstraint = (error: unknown): string | undefined =>
  getPgError(error)?.constraint;
