import { expect } from "bun:test";

import { app } from "../../src/app";
import { auth } from "../../src/auth";

let userCounter = 0;

export type TestUser = {
  id: string;
  email: string;
  cookie: string;
};

export async function createTestUser(prefix = "user"): Promise<TestUser> {
  userCounter += 1;
  const email = `${prefix}-${Date.now()}-${userCounter}@test.local`;
  const password = "test-password-1234";

  const signUp = await auth.api.signUpEmail({
    body: { email, password, name: prefix },
  });

  if (!signUp?.user) throw new Error("Failed to create test user");

  const signIn = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });

  const setCookie = signIn.headers.get("set-cookie");
  if (!setCookie) throw new Error("No session cookie returned");

  return {
    cookie: setCookie.split(";")[0]!,
    email,
    id: signUp.user.id,
  };
}

export type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
  user?: TestUser;
};

export async function request(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = new URL(`http://localhost${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(options.headers ?? {});
  if (options.user) headers.set("cookie", options.user.cookie);

  const isFormData = options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers.set("content-type", "application/json");
  }

  return app.handle(
    new Request(url.toString(), {
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      headers,
      method,
    })
  );
}

export async function json<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function makeSlug(name: string): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function createOrganization(
  user: TestUser,
  name: string
): Promise<{ id: string; name: string; slug: string }> {
  const response = await request("POST", "/organizations", {
    user,
    body: { name, slug: makeSlug(name) },
  });

  expect(response.status).toBe(200);
  return json<{ id: string; name: string; slug: string }>(response);
}
