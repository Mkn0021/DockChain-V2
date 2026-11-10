export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  code?: string;
  message?: string;
}

type ApiInit = Omit<RequestInit, "body"> & { body?: unknown };

export const apiFetch = async <T>(
  path: string,
  init: ApiInit = {}
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`/backend${path}`, {
    ...init,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "include",
    headers,
  });

  const data = (await response.json().catch(() => null)) as
    | (T & ErrorBody)
    | null;

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? response.statusText,
      response.status,
      data?.code
    );
  }

  return data as T;
};
