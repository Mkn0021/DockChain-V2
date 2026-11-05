import type { paths } from "@/types/api";

export type ResponseOf<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  responses: {
    200: { content: { "application/json": infer R } };
  };
}
  ? R
  : never;

export type RequestBodyOf<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : never;
