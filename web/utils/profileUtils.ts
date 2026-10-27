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

export interface InitialsAndColor {
  initials: string;
  colorClass: string;
}

export const getInitialsAndColor = (name: string): InitialsAndColor => {
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hash = initials
    .split("")
    .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colorClass = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return { initials, colorClass };
};
