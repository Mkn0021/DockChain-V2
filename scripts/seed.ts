import { hashPassword } from "better-auth/crypto";

import {
  accounts,
  db,
  invitations,
  members,
  organizations,
  users,
} from "../src/db";

const ORG_ID = "seed-org-0001";
const ORG_SLUG = "seed-org";
const PASSWORD = "password123";

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

async function seed() {
  const now = new Date();
  const hash = await hashPassword(PASSWORD);

  for (const p of people) {
    await db
      .insert(users)
      .values({
        createdAt: now,
        email: p.email,
        emailVerified: true,
        id: p.id,
        name: p.name,
        updatedAt: now,
      })
      .onConflictDoNothing();

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

  console.log(`Seeded. Sign in at /login with alice@example.com / ${PASSWORD}`);
}

seed()
  .then(async () => {
    await db.$client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await db.$client.end().catch(() => {});
    process.exit(1);
  });
