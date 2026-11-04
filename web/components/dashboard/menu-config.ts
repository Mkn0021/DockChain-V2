import type { IconType } from "react-icons";
import {
  FaBuilding,
  FaChartPie,
  FaCode,
  FaCog,
  FaFileAlt,
  FaFileSignature,
  FaHistory,
  FaLayerGroup,
  FaQuestionCircle,
  FaSatelliteDish,
  FaServer,
  FaUsers,
  FaUserPlus,
  FaWallet,
} from "react-icons/fa";

export interface NavItem {
  id: string;
  label: string;
  icon: IconType;
  path: string;
  subtitle?: string;
  drillTo?: NavKey;
}

export interface PanelConfig {
  items: NavItem[];
  label: string;
  backLabel: string;
  match: (pathname: string, slug: string) => boolean;
}

export type NavKey = "app" | "settings";

export const APP_MENU_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaChartPie,
    path: "/dashboard",
    subtitle: "Overview of your organization",
  },
  {
    id: "templates",
    label: "Templates",
    icon: FaFileAlt,
    path: "/templates",
    subtitle: "Create and manage document templates",
  },
  {
    id: "issue-document",
    label: "Issue Document",
    icon: FaFileSignature,
    path: "/documents/new",
    subtitle: "Create a new document",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FaFileAlt,
    path: "/documents",
    subtitle: "Documents issued by your organization",
  },
  {
    id: "batches",
    label: "Batches",
    icon: FaLayerGroup,
    path: "/batches",
    subtitle: "Sealed batches awaiting signature",
  },
  {
    id: "wallets",
    label: "Wallets",
    icon: FaWallet,
    path: "/wallets",
    subtitle: "Issuer wallets registered to this organization",
  },
  {
    id: "settings",
    label: "Settings",
    icon: FaCog,
    path: "/settings",
    drillTo: "settings",
    subtitle: "Organization preferences",
  },
  {
    id: "help",
    label: "Help & Support",
    icon: FaQuestionCircle,
    path: "/help",
    subtitle: "Guides and contact",
  },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    label: "General",
    icon: FaBuilding,
    path: "/settings/general",
    subtitle: "Manage your organization's name and URL",
  },
  {
    id: "members",
    label: "Members",
    icon: FaUsers,
    path: "/settings/members",
    subtitle: "Manage who has access to this organization",
  },
  {
    id: "invitations",
    label: "Invitations",
    icon: FaUserPlus,
    path: "/settings/invitations",
    subtitle: "Pending invitations to this organization",
  },
  {
    id: "issuing",
    label: "Issuing",
    icon: FaCog,
    path: "/settings/issuing",
    subtitle: "Batch, signing and data defaults",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: FaSatelliteDish,
    path: "/settings/webhooks",
    subtitle: "Deliver events to external services",
  },
  {
    id: "api-keys",
    label: "API keys",
    icon: FaCode,
    path: "/settings/api-keys",
    subtitle: "Create and revoke API keys",
  },
  {
    id: "audit-log",
    label: "Audit log",
    icon: FaHistory,
    path: "/settings/audit-log",
    subtitle: "Full history of actions taken",
  },
  {
    id: "system",
    label: "System",
    icon: FaServer,
    path: "/settings/system",
    subtitle: "Platform health and status",
  },
];

export const PANEL_KEYS: NavKey[] = ["app", "settings"];

export const PANELS: Record<NavKey, PanelConfig> = {
  app: {
    items: APP_MENU_ITEMS,
    label: "Main navigation",
    backLabel: "",
    match: () => false,
  },
  settings: {
    items: SETTINGS_NAV_ITEMS,
    label: "Settings navigation",
    backLabel: "Settings",
    match: (pathname, slug) => pathname.startsWith(`/${slug}/settings`),
  },
};

export const getPanelFromPath = (pathname: string, slug: string): NavKey => {
  const keys: NavKey[] = ["app", "settings"];
  for (const key of keys) {
    if (PANELS[key].match(pathname, slug)) {
      return key;
    }
  }
  return "app";
};
