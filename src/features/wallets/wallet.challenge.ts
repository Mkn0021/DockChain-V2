import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import {
  generateSiweNonce,
  parseSiweMessage,
  verifySiweMessage,
} from "viem/siwe";

import { env } from "../../config";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const buildChallengeMessage = (input: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  issuedAt: Date;
  expirationTime: Date;
}) =>
  `${input.domain} wants you to sign in with your Ethereum account:
${input.address}

Register this wallet as an issuer for your DockChain organization.

URI: ${env.APP_PUBLIC_URL}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${input.issuedAt.toISOString()}
Expiration Time: ${input.expirationTime.toISOString()}`;

export const createChallenge = (input: {
  address: string;
  chainId: number;
}) => {
  const nonce = generateSiweNonce();
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);

  const message = buildChallengeMessage({
    address: input.address,
    chainId: input.chainId,
    domain: new URL(env.APP_PUBLIC_URL).host,
    expirationTime,
    issuedAt,
    nonce,
  });

  return { expirationTime, message, nonce };
};

export const verifyChallenge = async (input: {
  address: string;
  chainId: number;
  message: string;
  signature: `0x${string}`;
  expectedNonce: string;
}) => {
  const parsed = parseSiweMessage(input.message);
  if (!parsed.address) {
    throw new Error("Message has no address");
  }
  if (parsed.address.toLowerCase() !== input.address.toLowerCase()) {
    throw new Error("Message address does not match");
  }
  if (parsed.chainId !== input.chainId) {
    throw new Error("Message chainId does not match");
  }
  if (parsed.nonce !== input.expectedNonce) {
    throw new Error("Message nonce does not match");
  }
  if (parsed.expirationTime && parsed.expirationTime.getTime() < Date.now()) {
    throw new Error("Challenge expired");
  }

  const valid = await verifySiweMessage(client, {
    address: input.address as `0x${string}`,
    message: input.message,
    signature: input.signature,
  });

  if (!valid) {
    throw new Error("Signature verification failed");
  }
};
