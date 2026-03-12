# bulk-query

`bulk-query` is a Next.js app for breaking large documents into semantic chunks and processing each chunk with an Anthropic model. Users can sign in, save projects to Postgres via Prisma, store their own Anthropic API key in the browser, and run chunking or processing through the app's API routes.

Guest mode is also available from the auth screen. Guest sessions stay in the browser and save projects to localStorage instead of the database.

## Stack

- Next.js 14 App Router
- React 18
- NextAuth credentials auth
- Prisma with Neon/Postgres
- Tailwind CSS
- Vitest for unit tests

## Running locally

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Environment

Set at least:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=replace-me
NEXTAUTH_URL=http://localhost:3000
```

`DIRECT_URL` is used by Prisma migrations and can usually match `DATABASE_URL` in local development.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test -- --run
```

## Project layout

- `app/`: pages, API routes, and client components
- `components/ui/`: shared UI primitives
- `lib/`: auth, Prisma, schemas, and utility helpers
- `prisma/`: database schema
- `tests/unit/`: unit coverage for schemas and utilities

## Notes

- Anthropic API keys are kept in browser `localStorage` and forwarded to the server per request.
- If no API key is present, chunking and processing fall back to local mock logic for development.
- Saved projects require authentication and a working database connection.
