export interface VerifyLinkParams {
  chainId: number;
  registry: `0x${string}`;
  issuer: `0x${string}`;
  leaf: `0x${string}`;
  holderKey: string;
  appUrl: string;
}

export const buildVerifyLink = ({
  chainId,
  registry,
  issuer,
  leaf,
  holderKey,
  appUrl,
}: VerifyLinkParams): string => {
  const params = new URLSearchParams({
    c: String(chainId),
    i: issuer,
    l: leaf,
    r: registry,
  });
  return `${appUrl}/verify?${params.toString()}#k=${encodeURIComponent(holderKey)}`;
};

export interface VerifyLinkQuery {
  chainId?: number;
  registry?: `0x${string}`;
  issuer?: `0x${string}`;
  leaf?: `0x${string}`;
  holderKey?: string;
}

export const parseVerifyLink = (
  searchParams: URLSearchParams,
  hash: string
): VerifyLinkQuery => {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const fragmentParams = new URLSearchParams(fragment);

  return {
    chainId: searchParams.get("c") ? Number(searchParams.get("c")) : undefined,
    holderKey: fragmentParams.get("k") ?? undefined,
    issuer: (searchParams.get("i") as `0x${string}`) ?? undefined,
    leaf: (searchParams.get("l") as `0x${string}`) ?? undefined,
    registry: (searchParams.get("r") as `0x${string}`) ?? undefined,
  };
};
