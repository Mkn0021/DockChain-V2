import { Section, SectionHeader } from "../_ui/section";
import { DockChainFlow } from "./dockchain-flow";

const DEFAULT_STEPS = [
  {
    description:
      "Issuers upload documents that are hashed and anchored on-chain as tamper-proof records",
    icon: "issue",
    id: "issue",
    title: "Issue",
  },
  {
    description:
      "Files are kept in secure S3-compatible storage while ownership and metadata stay in sync",
    icon: "store",
    id: "store",
    title: "Store",
  },
  {
    description:
      "Connect your organization with trusted issuers and verifiers through authenticated API access",
    icon: "connect",
    id: "connect",
    title: "Connect",
  },
  {
    description:
      "Anyone with access can instantly verify a document's authenticity against its on-chain hash",
    icon: "verify",
    id: "verify",
    title: "Verify",
  },
  {
    description:
      "Track, share and revoke documents from one place with a complete audit trail",
    icon: "manage",
    id: "manage",
    title: "Manage",
  },
];

export function LifecycleSection() {
  return (
    <Section className="pb-0">
      <SectionHeader>Lifecycle of a document</SectionHeader>
      <DockChainFlow steps={DEFAULT_STEPS} />
    </Section>
  );
}
