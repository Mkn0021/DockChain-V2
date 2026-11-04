import {
  APP_MENU_ITEMS,
  SETTINGS_NAV_ITEMS,
  type NavItem,
} from "@/components/dashboard/menu-config";

const ALL_ITEMS: NavItem[] = [...APP_MENU_ITEMS, ...SETTINGS_NAV_ITEMS];

interface PageInfo {
  title: string;
  subtitle?: string;
}

export const getPageInfo = (pathname: string, slug: string): PageInfo => {
  const stripped = pathname.startsWith(`/${slug}`)
    ? pathname.slice(slug.length + 1)
    : pathname;

  const matches = ALL_ITEMS.filter(
    (item) => stripped === item.path || stripped.startsWith(`${item.path}/`)
  );

  if (matches.length === 0) {
    return { title: "Dashboard" };
  }

  const [first] = matches;
  let longest = first;
  for (const item of matches) {
    if (item.path.length > longest.path.length) {
      longest = item;
    }
  }

  return { subtitle: longest.subtitle, title: longest.label };
};
