import { MENU_ITEMS } from "@/components/dashboard/menu-config";

export const getPageTitle = (pathname: string, slug: string): string => {
  const stripped = pathname.startsWith(`/${slug}`)
    ? pathname.slice(slug.length + 1)
    : pathname;

  const matches = MENU_ITEMS.filter(
    (item) => stripped === item.path || stripped.startsWith(`${item.path}/`)
  );

  if (matches.length === 0) {
    return "Dashboard";
  }

  const [first] = matches;
  let longest = first;
  for (const item of matches) {
    if (item.path.length > longest.path.length) {
      longest = item;
    }
  }

  return longest.label;
};
