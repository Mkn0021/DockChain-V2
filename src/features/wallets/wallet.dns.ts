import { promises as dns } from "node:dns";

export type TxtResolver = (hostname: string) => Promise<string[][]>;

export const defaultTxtResolver: TxtResolver = (hostname) =>
  dns.resolveTxt(hostname);

const RECORD_PREFIX = "v=1";

export interface ParsedRecord {
  chain: string;
  addresses: string[];
}

export const parseDockchainRecord = (raw: string): ParsedRecord | null => {
  const normalized = raw.replaceAll(/[\s"]+/g, " ").trim();
  if (!normalized.startsWith(RECORD_PREFIX)) {
    return null;
  }

  const parts = normalized.split(";").map((p) => p.trim());
  const fields: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    fields[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }

  const { chain } = fields;
  const { addr } = fields;
  if (!chain || !addr) {
    return null;
  }

  return {
    addresses: addr.split(",").map((a) => a.trim().toLowerCase()),
    chain,
  };
};

export const lookupDockchainRecords = async (
  domain: string,
  resolver: TxtResolver = defaultTxtResolver
): Promise<ParsedRecord[]> => {
  const hostname = `_dockchain.${domain}`;
  let records: string[][];

  try {
    records = await resolver(hostname);
  } catch {
    return [];
  }

  const parsed: ParsedRecord[] = [];
  for (const record of records) {
    const joined = record.join("");
    const result = parseDockchainRecord(joined);
    if (result) {
      parsed.push(result);
    }
  }
  return parsed;
};
