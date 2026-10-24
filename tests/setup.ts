import { afterAll } from "bun:test";

afterAll(async () => {
  const { closeDb } = await import("../src/db");
  const { closeRedis } = await import("../src/redis");
  await closeDb();
  await closeRedis();
});
