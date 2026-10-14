import { afterAll } from "bun:test";

import { closeDb } from "../src/db";
import { closeRedis } from "../src/redis";

afterAll(async () => {
  await closeDb();
  await closeRedis();
});
