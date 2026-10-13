# DockChain V2

A blockchain-based document management and verification system.

DockChain enables document issuance, management, and verification using
a backend API and blockchain integration.

> **Status:** Under active development.

## Tech Stack

- **Runtime:** Bun
- **Backend:** Elysia
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** Better Auth
- **Background Jobs:** BullMQ and Redis
- **File Storage:** S3-compatible storage
- **API Documentation:** OpenAPI
- **Testing:** Bun Test
- **Code Quality:** TypeScript, Ultracite
- **Infrastructure:** Docker Compose

## Prerequisites

- Bun
- Docker and Docker Compose
- Git

## Getting Started

Clone the repository:

\`\`\`bash
git clone https://github.com/Mkn0021/dockchain-v2.git
cd dockchain-v2
bun install
\`\`\`

Start PostgreSQL and Redis:

\`\`\`bash
bun run docker:up
\`\`\`

Configure the environment:

\`\`\`bash
cp .env.example .env
\`\`\`

Set the required environment variables in `.env`, using the local
database and Redis credentials configured in `docker-compose.local.yml`.

Start the development server:

\`\`\`bash
bun run dev
\`\`\`

The API runs on the configured port, defaulting to `3000`.

OpenAPI documentation is available at `/openapi`.

## Development Commands

| Command               | Purpose                      |
| --------------------- | ---------------------------- |
| `bun run dev`         | Start development server     |
| `bun run build`       | Build the application        |
| `bun run start`       | Start the application        |
| `bun run typecheck`   | Run TypeScript checks        |
| `bun run lint`        | Check code quality           |
| `bun run format`      | Format code                  |
| `bun test`            | Run tests                    |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate`  | Apply migrations             |
| `bun run db:studio`   | Open Drizzle Studio          |
| `bun run docker:up`   | Start local dependencies     |
| `bun run docker:down` | Stop local dependencies      |

## Project Structure

\`\`\`text
src/
├── auth/
├── config/
├── db/
│ └── schema/
├── email/
├── features/
├── queues/
├── redis/
├── s3/
└── shared/

tests/
\`\`\`

Application features belong under `src/features/`.
Database schemas belong under `src/db/schema/`.
Tests belong in the root `tests/` directory.

## Development Workflow

- Keep changes focused on one feature per branch.
- Add tests for new behavior and regression fixes.
- Use database migrations for schema changes.
- Run typecheck, lint, and tests before merging.
- Merge completed feature branches into `main` after review.

## License

See [LICENSE](LICENSE).
