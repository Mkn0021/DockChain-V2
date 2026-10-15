import { AppError } from "../../shared/errors";
import { lookupDockchainRecords, type TxtResolver } from "./wallet.dns";

const HOSTNAME_REGEX =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const normalizeDomain = (raw: string): string => {
  const lower = raw.trim().toLowerCase();
  if (!HOSTNAME_REGEX.test(lower)) {
    throw AppError.validation("Invalid hostname");
  }
  return lower;
};

export const verifyDomainOwnership = async (input: {
  domain: string;
  chainId: string;
  walletAddress: string;
  resolver?: TxtResolver;
}): Promise<string[]> => {
  const records = await lookupDockchainRecords(input.domain, input.resolver);

  const matching = records.filter((r) => r.chain === input.chainId);
  const address = input.walletAddress.toLowerCase();

  const matched = matching.some((r) => r.addresses.includes(address));
  const foundRecords = records.map(
    (r) => `chain=${r.chain}; addr=${r.addresses.join(",")}`
  );

  if (!matched) {
    throw AppError.validation(
      `No matching TXT record found at _dockchain.${input.domain}. Found: ${
        foundRecords.length > 0 ? foundRecords.join(" | ") : "none"
      }`
    );
  }

  return foundRecords;
};
