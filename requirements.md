# requirements.md – Project Requirements

## Project Overview

Combined time & project management SaaS for a professional software company (~200–500 developers).  
Goal: Replace/improve upon Toggl Track + Toggl Focus + Toggl Work with better skill/talent tracking, GDPR compliance, and enterprise RBAC.

Target users: Developers, Team Leads / Managers, Admins / HR, Finance (expenses).

## Functional Requirements

### 1. Authentication & User Management
- Microsoft Entra ID SSO (OAuth2 + OIDC) with PKCE
- Microsoft Authenticator MFA (enforced via Entra policies)
- User profile (name, email, department, hire/termination date)
- Self-service consent management (GDPR: time tracking, analytics, expense processing)
- Admin bulk import / offboarding / role assignment

### 2. RBAC & Permissions
- Roles: admin, manager, developer, guest
- Fine-grained permissions (own / department / all scope)
  Examples: read:own_time, write:project_tasks, admin:users, read:department_reports
- Enforced on every API endpoint and frontend view

### 3. Time Tracking (Toggl Track style)
- Manual & auto timer (start/stop, description, project/task, tags/skills, billable)
- Travel hours, work hours, absence (holiday/sick)
- Calendar & timeline views
- Daily/weekly totals, goal progress

### 4. Tasks & Planning (Toggl Focus style)
- Kanban board, list, calendar, timeline views
- Task: priority, due date, estimated duration, assignee, billable
- Focus / Pomodoro sessions linked to tasks
- Real-time workload visibility (per person / team)

### 5. Projects
- Project overview (progress, budget/hours, profitability, team)
- Required skills definition
- Assign employees & track skill usage per project/task

### 6. Expenses (Toggl Work style)
- Upload receipt, amount, category, date, project/task link
- Auto-fill simulation from metadata
- Approval workflow (pending → approved/rejected)
- Invoice linking & reporting

### 7. Skill / Talent Management
- Global skill catalog
- Employee has_skill (proficiency, years)
- Project / task uses_skill
- Track actual usage via time logs
- Reports: skill coverage, proficiency growth

### 8. Reports & Analytics
- Personal productivity, team workload, profitability
- Skill usage heat-map
- GDPR data export / erasure APIs
- Custom report builder (filters, visualizations)

### 9. Non-Functional Requirements
- GDPR compliant (consent, minimization, pseudonymization, audit logs, right to erasure)
- Scalable to 500+ concurrent users
- Sub-second response for timers & dashboards (Dragonfly cache)
- Offline hints for timer (sync on reconnect)
- EU-hosted in production (data residency)
- Audit trail for all data access/modification

## Out of Scope (for MVP)
- Mobile app (web responsive only)
- In-app chat / comments
- Advanced AI auto-categorization of expenses
- Payment / invoicing generation

Priorities: 1 = Must-have for MVP, 2 = Should-have, 3 = Nice-to-have
