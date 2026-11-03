import {
  FaUser,
  FaCog,
  FaBell,
  FaSignOutAlt,
  FaCopy,
  FaDownload,
  FaCheck,
  FaHome,
  FaUpload,
  FaPaperPlane,
  FaCheckCircle,
  FaUserCog,
  FaQuestionCircle,
} from "react-icons/fa";

import { MenuItem } from "@/components/dashboard/MenuItem";

export const PROFILE_MENU_ITEMS = (
  setIsOpen: (isOpen: boolean) => void
): MenuItem[] => [
  {
    icon: FaUser,
    label: "View Profile",
    action: () => {
      console.log("View Profile clicked");
      setIsOpen(false);
    },
  },
  {
    icon: FaCog,
    label: "Account Settings",
    action: () => {
      console.log("Settings clicked");
      setIsOpen(false);
    },
  },
  {
    icon: FaBell,
    label: "Notifications",
    action: () => {
      console.log("Notifications clicked");
      setIsOpen(false);
    },
  },
];

export const LOGOUT_BUTTON = {
  icon: FaSignOutAlt,
  label: "Log Out",
};

export const DASHBOARD_ROUTES = {
  dashboard: {
    path: "/dashboard",
    title: "Dashboard",
    icon: FaHome,
  },
  uploadTemplate: {
    path: "/dashboard/upload-template",
    title: "Upload Template",
    icon: FaUpload,
  },
  issueDocument: {
    path: "/dashboard/issue-document",
    title: "Issue Document",
    icon: FaPaperPlane,
  },
  issuedDocuments: {
    path: "/dashboard/issued-documents",
    title: "Issued Documents",
    icon: FaCheckCircle,
  },
  userManagement: {
    path: "/dashboard/user-management",
    title: "User Management",
    icon: FaUserCog,
  },
  helpSupport: {
    path: "/dashboard/help-support",
    title: "Help & Support",
    icon: FaQuestionCircle,
  },
} as const;

export const SIDEBAR_ITEMS = (
  navigateToRoute: (route: string) => void
): MenuItem[] =>
  Object.entries(DASHBOARD_ROUTES).map(([id, route]) => ({
    id,
    label: route.title,
    icon: route.icon,
    action: () => navigateToRoute(route.path),
  }));

export const DASHBOARD_PAGE_PATH = Object.values(DASHBOARD_ROUTES).reduce(
  (acc, route) => {
    acc[route.path] = { title: route.title };
    return acc;
  },
  {} as Record<string, { title: string }>
);

// Data for Issue Document Steps
export const DOCUMENT_ISSUING_INSTRACTIONS = [
  "Review the rendered document before issuing.",
  "To edit any value, go to the previous step and update the fields.",
];

export const DOCUMENT_ACTION_BUTTONS = [
  { key: "copy", Icon: FaCopy, title: "Copy URL" },
  { key: "download", Icon: FaDownload, title: "Download" },
  { key: "finish", Icon: FaCheck, title: "Finish" },
];

// Data for Upload Template Page
export const UPLOAD_TEMPLATE = {
  title: "Upload SVG Template",
  inputLabels: {
    title: "Template Title",
    description: "Description (Optional)",
  },
  alerts: {
    noFile: "Please upload an SVG file with Title before deploying.",
    noFields: "No required fields (e.g., {{field_name}}) found in SVG",
    deploySuccess: "Template deployed successfully to blockchain!",
    deployError: (error: string) => `Deployment failed: ${error}`,
  },
  fileTypes: {
    svg: "image/svg+xml",
  },
};

export const DEPLOYMENT_INSTRUCTIONS = [
  "Use {{field name}} for required fields or variables",
  "Once deployed, templates can be used to issue documents with dynamic data",
];
