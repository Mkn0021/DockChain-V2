import { promises as dns } from "node:dns";

export type TxtResolver = (hostname: string) => Promise<string[][]>;

export const defaultTxtResolver: TxtResolver = (hostname) =>
  dns.resolveTxt(hostname);

const RECORD_PREFIX = "v=1";

export interface ParsedDockchainRecord {
  chain: string;
  addresses: string[];
}

export const parseDockchainRecord = (
  raw: string
): ParsedDockchainRecord | null => {
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
): Promise<ParsedDockchainRecord[]> => {
  const hostname = `_dockchain.${domain}`;
  let records: string[][];

  try {
    records = await resolver(hostname);
  } catch {
    return [];
  }

  const parsed: ParsedDockchainRecord[] = [];
  for (const record of records) {
    const joined = record.join("");
    const result = parseDockchainRecord(joined);
    if (result) {
      parsed.push(result);
    }
  }
  return parsed;
};

export const verifyIssuerDomain = async (input: {
  domain: string;
  chainId: number;
  issuerAddress: string;
  resolver?: TxtResolver;
}): Promise<boolean> => {
  const records = await lookupDockchainRecords(input.domain, input.resolver);
  const matching = records.filter((r) => r.chain === String(input.chainId));
  const address = input.issuerAddress.toLowerCase();
  return matching.some((r) => r.addresses.includes(address));
};
