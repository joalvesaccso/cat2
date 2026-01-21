# implementation_standards.md – Coding & Architecture Standards

## General Principles

- TypeScript strict mode (no any, no implicit any)
- Prefer composition over inheritance
- Parse, don’t validate (use Elysia `t` / zod for runtime + type inference)
- Functional style preferred (immutability, pure functions)
- Small files & components (< 200–300 LOC)
- Single source of truth: Elysia schemas → Eden types → frontend

## Backend (ElysiaJS + Bun)

- Every route uses `t` schema for body/query/params/response
- Use `.derive()` for auth & RBAC middleware
- Group routes logically (`/auth`, `/users`, `/projects`, `/time`, `/expenses`, `/admin`)
- Use DragonflyDB for:
  - Sessions / JWT cache
  - RBAC decisions (TTL 1h)
  - Aggregates (workload, totals) – invalidate on write
- ArangoDB:
  - Use graph traversals for relations (max depth 3)
  - Collections: users, roles, projects, tasks, time_logs, expenses, focus_sessions, skills, audit_logs, consents
  - AQL queries in separate files or tagged literals

## Frontend (SolidJS + Vite)

- Use signals & stores (solid-js/store)
- TanStack Query (@tanstack/solid-query) for data fetching
- Eden treaty<App> for all API calls → full type safety
- Component composition: extract hooks/composables
- Tailwind + daisyUI / shadcn-solid for UI
- Protected routes via layout / guard components
- Floating / persistent timer component

## Folder Structure (suggested)
backend/
├── src/
│   ├── auth.ts
│   ├── routes/
│   ├── db/               # arangojs helpers + schemas
│   └── index.ts
frontend/
├── src/
│   ├── lib/
│   │   └── api.ts        # eden treaty
│   ├── components/
│   ├── pages/
│   └── composables/
## Testing

- Vitest: unit + component tests
- Playwright: critical E2E (login, timer, expense approval)
- Aim for >80% coverage on business logic & auth

## Linting & Formatting

- ESLint flat config + typescript-eslint
- Prettier
- stylelint (if using CSS-in-JS)
- Husky + lint-staged

## Commits & PRs

- Conventional Commits
- Small PRs with clear description + screenshots (UI changes)
- Require at least one approval + passing CI

When suggesting or generating code, strictly follow these standards unless explicitly told otherwise.
