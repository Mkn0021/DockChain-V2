export const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-amber-500",
] as const;

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.codePointAt(i) ?? 0;
    hash = Math.trunc((hash << 5) - hash + code);
  }
  return hash;
};

export const getInitialsAndColor = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const hash = Math.abs(hashString(initials || name || "?"));
  const colorClass = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return { initials: initials || "?", colorClass };
};
