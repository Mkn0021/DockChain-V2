export const toDate = (
  value: string | Date | null | undefined
): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};

export const toIso = (
  value: Date | string | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
};

export const toUnixSeconds = (
  value: Date | string | null | undefined
): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Math.floor(date.getTime() / 1000);
};

export const fromUnixSeconds = (seconds: number): Date | null =>
  seconds === 0 ? null : new Date(seconds * 1000);
