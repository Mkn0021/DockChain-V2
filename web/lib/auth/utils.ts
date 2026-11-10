export const safeRedirect = (value: string | null | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : null;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 40);

export class AuthError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists.",
};

interface BetterAuthError {
  code?: string;
  message?: string;
}

export const toAuthError = (error: BetterAuthError) =>
  new AuthError(
    (error.code && MESSAGES[error.code]) ||
      error.message ||
      "Something went wrong. Please try again.",
    error.code
  );
