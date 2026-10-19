import { promises as dns } from "node:dns";

const PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const isPrivateIp = (ip: string): boolean =>
  PRIVATE_RANGES.some((range) => range.test(ip));

export const assertUrlIsPublic = async (url: string): Promise<void> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use https");
  }

  const { hostname } = parsed;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error("Webhook URL cannot target localhost");
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error(
          `Webhook URL resolves to a private address: ${record.address}`
        );
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Webhook URL")) {
      throw error;
    }
    throw new Error(
      `Could not resolve webhook hostname: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
      { cause: error }
    );
  }
};
