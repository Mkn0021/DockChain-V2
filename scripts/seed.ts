import { hashPassword } from "better-auth/crypto";

import {
  accounts,
  db,
  invitations,
  issuerWallets,
  members,
  organizationSettings,
  organizations,
  templateVersions,
  templates,
  users,
} from "../src/db";

const ORG_ID = "seed-org-0001";
const ORG_SLUG = "seed-org";
const PASSWORD = "password123";

const WALLET_ID = "seed-wallet-0001";
const WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const WALLET_CHAIN_ID = "31337";

const people = [
  {
    email: "alice@example.com",
    id: "u-owner",
    name: "Alice Owner",
    role: "owner" as const,
  },
  {
    email: "bob@example.com",
    id: "u-admin",
    name: "Bob Admin",
    role: "admin" as const,
  },
  {
    email: "carol@example.com",
    id: "u-issuer",
    name: "Carol Issuer",
    role: "issuer" as const,
  },
  {
    email: "dave@example.com",
    id: "u-viewer",
    name: "Dave Viewer",
    role: "viewer" as const,
  },
];

function buildCertificateLayout(header: string, subtitle: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <rect width="800" height="560" fill="#ffffff"/>
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="400" y="100" text-anchor="middle" font-family="serif" font-size="36" fill="#111827">${header}</text>
  <text x="400" y="220" text-anchor="middle" font-family="serif" font-size="28" fill="#111827">{{recipient_name}}</text>
  <text x="400" y="280" text-anchor="middle" font-family="serif" font-size="18" fill="#4b5563">${subtitle}</text>
  <text x="400" y="330" text-anchor="middle" font-family="serif" font-size="24" fill="#111827">{{course_name}}</text>
  <text x="400" y="460" text-anchor="middle" font-family="serif" font-size="16" fill="#6b7280">Issued on {{issue_date}}</text>
</svg>`;
}

const BASE_FIELDS = [
  {
    key: "recipient_name",
    label: "Recipient name",
    required: true,
    type: "text" as const,
  },
  {
    key: "course_name",
    label: "Course name",
    required: true,
    type: "text" as const,
  },
  {
    key: "issue_date",
    label: "Issue date",
    required: true,
    type: "date" as const,
  },
];

const SEED_TEMPLATES = [
  {
    id: "seed-tpl-0001",
    versionId: "seed-tplv-0001",
    name: "Certificate of Completion",
    description: "A classic certificate for course or training completion.",
    header: "Certificate of Completion",
    subtitle: "has successfully completed",
  },
  {
    id: "seed-tpl-0002",
    versionId: "seed-tplv-0002",
    name: "Certificate of Achievement",
    description: "Awarded for outstanding performance in a program.",
    header: "Certificate of Achievement",
    subtitle: "has demonstrated excellence in",
  },
  {
    id: "seed-tpl-0003",
    versionId: "seed-tplv-0003",
    name: "Certificate of Excellence",
    description: "Recognizes exceptional results in a course or project.",
    header: "Certificate of Excellence",
    subtitle: "is recognized for excellence in",
  },
  {
    id: "seed-tpl-0004",
    versionId: "seed-tplv-0004",
    name: "Certificate of Participation",
    description: "Confirms attendance and participation in a program.",
    header: "Certificate of Participation",
    subtitle: "has participated in",
  },
  {
    id: "seed-tpl-0005",
    versionId: "seed-tplv-0005",
    name: "Certificate of Training",
    description: "Issued upon successful completion of a training module.",
    header: "Certificate of Training",
    subtitle: "has completed the training on",
  },
];

function log(step: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.log(`[seed] ${step}`, detail);
  } else {
    console.log(`[seed] ${step}`);
  }
}

async function seed() {
  const now = new Date();
  log("starting", { orgId: ORG_ID, orgSlug: ORG_SLUG });

  const hash = await hashPassword(PASSWORD);
  log("password hashed");

  for (const p of people) {
    const insertedUser = await db
      .insert(users)
      .values({
        createdAt: now,
        email: p.email,
        emailVerified: true,
        id: p.id,
        name: p.name,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    log("user upserted", { email: p.email, inserted: insertedUser.length > 0 });

    await db
      .insert(accounts)
      .values({
        accountId: p.id,
        createdAt: now,
        id: `acc-${p.id}`,
        password: hash,
        providerId: "credential",
        updatedAt: now,
        userId: p.id,
      })
      .onConflictDoNothing();
  }

  await db
    .insert(organizations)
    .values({
      createdAt: now,
      id: ORG_ID,
      name: "Seed Organization",
      slug: ORG_SLUG,
    })
    .onConflictDoNothing();
  log("organization upserted", { orgId: ORG_ID });

  for (const p of people) {
    await db
      .insert(members)
      .values({
        createdAt: now,
        id: `m-${p.id}`,
        organizationId: ORG_ID,
        role: p.role,
        userId: p.id,
      })
      .onConflictDoNothing();
  }
  log("members upserted", { count: people.length });

  await db
    .insert(invitations)
    .values([
      {
        createdAt: now,
        email: "pending1@example.com",
        expiresAt: new Date(now.getTime() + 7 * 864e5),
        id: "inv-1",
        inviterId: "u-owner",
        organizationId: ORG_ID,
        role: "issuer",
        status: "pending",
      },
      {
        createdAt: now,
        email: "pending2@example.com",
        expiresAt: new Date(now.getTime() + 7 * 864e5),
        id: "inv-2",
        inviterId: "u-owner",
        organizationId: ORG_ID,
        role: "viewer",
        status: "pending",
      },
    ])
    .onConflictDoNothing();
  log("invitations upserted", { count: 2 });

  for (const tpl of SEED_TEMPLATES) {
    const layout = buildCertificateLayout(tpl.header, tpl.subtitle);

    await db
      .insert(templates)
      .values({
        archivedAt: null,
        createdAt: now,
        createdBy: "u-owner",
        description: tpl.description,
        id: tpl.id,
        name: tpl.name,
        organizationId: ORG_ID,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          archivedAt: null,
          description: tpl.description,
          name: tpl.name,
          updatedAt: now,
        },
        target: templates.id,
      });

    await db
      .insert(templateVersions)
      .values({
        createdAt: now,
        createdBy: "u-owner",
        fieldSchema: { fields: BASE_FIELDS },
        id: tpl.versionId,
        layout,
        publishedAt: now,
        schemaHash: `seed-schema-hash-${tpl.versionId}`,
        status: "published",
        templateId: tpl.id,
        updatedAt: now,
        version: 1,
      })
      .onConflictDoUpdate({
        set: {
          fieldSchema: { fields: BASE_FIELDS },
          layout,
          publishedAt: now,
          schemaHash: `seed-schema-hash-${tpl.versionId}`,
          status: "published",
          updatedAt: now,
        },
        target: templateVersions.id,
      });

    log("template upserted", {
      fields: BASE_FIELDS.map((f) => f.key),
      templateId: tpl.id,
      versionId: tpl.versionId,
    });
  }

  await db
    .insert(issuerWallets)
    .values({
      address: WALLET_ADDRESS,
      chainId: WALLET_CHAIN_ID,
      compromisedFrom: null,
      createdAt: now,
      createdBy: "u-owner",
      domain: null,
      domainVerifiedAt: null,
      id: WALLET_ID,
      label: "Seed Wallet",
      organizationId: ORG_ID,
      status: "active",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        address: WALLET_ADDRESS,
        chainId: WALLET_CHAIN_ID,
        label: "Seed Wallet",
        status: "active",
        updatedAt: now,
      },
      target: issuerWallets.id,
    });
  log("wallet upserted", {
    address: WALLET_ADDRESS,
    chainId: WALLET_CHAIN_ID,
    status: "active",
    walletId: WALLET_ID,
  });

  await db
    .insert(organizationSettings)
    .values({
      autoSeal: false,
      batchWindowMinutes: 60,
      createdAt: now,
      dataAvailability: "offchain_only",
      defaultExpiryDays: null,
      defaultWalletId: WALLET_ID,
      organizationId: ORG_ID,
      requireVerifiedDomain: false,
      updatedAt: now,
      updatedBy: "u-owner",
    })
    .onConflictDoUpdate({
      set: {
        defaultWalletId: WALLET_ID,
        requireVerifiedDomain: false,
        updatedAt: now,
      },
      target: organizationSettings.organizationId,
    });
  log("organization settings upserted", {
    defaultWalletId: WALLET_ID,
    requireVerifiedDomain: false,
  });

  const walletsCount = await db
    .select({ id: issuerWallets.id })
    .from(issuerWallets);
  const settingsRows = await db
    .select({
      defaultWalletId: organizationSettings.defaultWalletId,
      organizationId: organizationSettings.organizationId,
    })
    .from(organizationSettings);

  log("verification", {
    settings: settingsRows,
    wallets: walletsCount,
  });

  console.log(
    `\nSeeded. Sign in at /login with alice@example.com / ${PASSWORD}\n`
  );
}

seed()
  .then(async () => {
    await db.$client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[seed] failed:", error);
    await db.$client.end().catch(() => {});
    process.exit(1);
  });
