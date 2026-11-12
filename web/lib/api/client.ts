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
  const isFormData = init.body instanceof FormData;
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !isFormData) {
    headers.set("content-type", "application/json");
  }

  const requestBody =
    init.body === undefined || isFormData
      ? (init.body as BodyInit | undefined)
      : JSON.stringify(init.body);

  const response = await fetch(`/backend${path}`, {
    ...init,
    body: requestBody,
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
