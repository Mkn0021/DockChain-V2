import type { IconType } from "react-icons";
import {
  FaChartPie,
  FaFileAlt,
  FaFileSignature,
  FaLayerGroup,
  FaWallet,
  FaCog,
  FaQuestionCircle,
} from "react-icons/fa";

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: IconType;
  path: string;
}

export const MENU_ITEMS: MenuItemConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: FaChartPie, path: "/dashboard" },
  { id: "templates", label: "Templates", icon: FaFileAlt, path: "/templates" },
  {
    id: "issue-document",
    label: "Issue Document",
    icon: FaFileSignature,
    path: "/documents/new",
  },
  { id: "documents", label: "Documents", icon: FaFileAlt, path: "/documents" },
  { id: "batches", label: "Batches", icon: FaLayerGroup, path: "/batches" },
  { id: "wallets", label: "Wallets", icon: FaWallet, path: "/wallets" },
  { id: "settings", label: "Settings", icon: FaCog, path: "/settings" },
  {
    id: "help",
    label: "Help & Support",
    icon: FaQuestionCircle,
    path: "/help",
  },
];
