import {
  BsShieldCheck,
  BsXCircle,
  BsExclamationTriangle,
} from "react-icons/bs";

import type { IconType } from "react-icons";

export const VERIFY_INSTRUCTIONS = [
  {
    key: "link",
    title: "Paste the verification link you received from the issuer.",
    details:
      "Paste the verification link you received from the issuer. This link will automatically extract the required information for verification.",
  },
  {
    key: "manual",
    title: "Enter the Template ID and Document Hash to verify your document.",
    details:
      "Enter the Template ID and Document Hash you received from the issuer to verify your document. Make sure both values are correct and copied exactly as provided.",
  },
];

export type StatusKey = "verified" | "invalid" | "notFound";

export const VERIFICATION_STATUS_MAP: Record<
  StatusKey,
  {
    icon: IconType;
    title: string;
    subtitle: string;
    iconColorClass: string;
    containerClass: string;
    textClass: string;
  }
> = {
  verified: {
    icon: BsShieldCheck,
    title: "Document Verified",
    subtitle: "This document is recorded and matches the blockchain record.",
    iconColorClass: "text-green-600",
    containerClass: "bg-green-50 border-green-200",
    textClass: "text-gray-900",
  },
  invalid: {
    icon: BsXCircle,
    title: "Document Invalid",
    subtitle:
      "The document was found but its integrity does not match the blockchain record.",
    iconColorClass: "text-red-600",
    containerClass: "bg-red-50 border-red-200",
    textClass: "text-gray-900",
  },
  notFound: {
    icon: BsExclamationTriangle,
    title: "Document Not Found",
    subtitle:
      "No matching record was found on the blockchain for the provided data.",
    iconColorClass: "text-orange-600",
    containerClass: "bg-orange-50 border-orange-200",
    textClass: "text-gray-900",
  },
};
