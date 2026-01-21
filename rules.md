# rules.md – AI Coding Assistant Guidelines (GitHub Copilot & similar)

This file provides persistent context and hard rules for GitHub Copilot, Cursor, Continue.dev, and other AI coding assistants working in this repository.

## Core Principles (Always Obey)

1. **Security & GDPR First**  
   - Never suggest code that logs PII without explicit consent.  
   - All time tracking, focus sessions, expenses must respect user consents stored in ArangoDB.  
   - Use pseudonymization for aggregates/reports whenever possible.  
   - Prefer httpOnly cookies + JWT for auth tokens; never store sensitive data in localStorage.

2. **RBAC Enforcement**  
   - Every endpoint/route that reads or writes data **must** be protected with RBAC middleware.  
   - Use fine-grained permissions (e.g. `read:own_time`, `write:projects`, `admin:users`, `read:department_reports`).  
   - Check permissions via graph traversal in ArangoDB or cached decision in DragonflyDB.

3. **Type Safety End-to-End**  
   - Use Elysia `t` schemas for every route (body, params, query, response).  
   - Export app type and use Eden (`treaty<App>`) on frontend → **never** break type inference.  
   - Prefer discriminated unions for error responses (status-based).

4. **Performance & Scalability**  
   - Cache frequent reads (workload, aggregates, RBAC decisions) in DragonflyDB with 5–60 min TTL.  
   - Invalidate cache on writes (time log, task update, consent change).  
   - Use ArangoDB graph traversals efficiently (limit depth 1–3); avoid N+1 queries.

5. **Code Style & Structure**  
   - Follow Airbnb TypeScript style + Prettier + ESLint (see eslint.config.js when created).  
   - Prefer functional style, signals/stores in SolidJS, avoid classes unless modeling domain entities.  
   - Keep components small (< 200 LOC); extract logic to composables/hooks.

6. **Testing & Quality**  
   - Suggest unit tests for business logic (Vitest).  
   - Suggest integration/E2E for critical flows (Playwright).  
   - Never commit untested auth, RBAC, or financial logic (expenses, billable hours).

7. **Git & Commit Hygiene**  
   - Conventional commits: feat:, fix:, refactor:, chore:, docs:, test:  
   - Small, focused PRs (< 400 LOC ideal).  
   - Reference issues (#123) in commits.

8. **Never Do**  
   - Introduce new dependencies without strong justification.  
   - Bypass consent checks for time tracking or analytics.  
   - Suggest screenshots, keyloggers, or invasive monitoring.  
   - Hardcode secrets, connection strings, or Microsoft tenant IDs.

## Project Tech Context

- Backend: ElysiaJS (Bun), ArangoDB (graph + documents), DragonflyDB (cache/pub-sub)  
- Frontend: SolidJS + TypeScript + Vite + Tailwind + Eden (treaty)  
- Auth: Microsoft Entra ID (SSO + OIDC), Microsoft Authenticator MFA  
- Docker: ArangoDB CE + DragonflyDB for local/dev

When suggesting code, always align with these rules first — then with the files in `requirements.md` and `implementation_standards.md`.
