# Project Structure

Das Projekt ist jetzt in **Backend** und **Frontend** separiert:

```
cat2/
├── backend/                    # Elysia + Bun Backend (Port 3000)
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── db/                # ArangoDB + DragonflyDB setup
│   │   ├── middleware/        # Auth, RBAC
│   │   ├── routes/            # API routes (time, tasks, projects, expenses)
│   │   └── types/             # TypeScript domain types
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json
│
├── frontend/                   # SolidJS + Vite Frontend (Port 5173)
│   ├── src/
│   │   ├── App.tsx           # Root component
│   │   ├── index.tsx         # Solid render
│   │   ├── pages/            # Login, Dashboard
│   │   ├── components/       # Timer, TaskBoard, TimeLog
│   │   ├── context/          # AuthContext (global state)
│   │   └── lib/              # API helpers, Eden treaty
│   ├── index.html            # HTML entry
│   ├── package.json          # Frontend dependencies (vite, solid-js)
│   ├── tsconfig.json         # SolidJS config
│   └── vite.config.ts        # Vite config + API proxy to :3000
│
├── docker-compose.yml         # ArangoDB + DragonflyDB (shared)
├── package.json              # Root (for monorepo management)
└── [docs]                    # README, QUICK_START, etc.
```

## Running the Project

### Terminal 1: Backend
```bash
cd backend
bun install
bun run dev    # Runs on http://localhost:3000
```

### Terminal 2: Frontend
```bash
cd frontend
bun install
bun run dev    # Runs on http://localhost:5173
```

### Terminal 3: Docker (if needed)
```bash
docker compose up -d
bun run db:init  # Inside backend folder
```

## Architecture Benefits

✅ **Separation of Concerns**: Backend (TypeScript/Bun/Elysia) and Frontend (TypeScript/Node/Vite/SolidJS)  
✅ **Independent Deployments**: Deploy frontend to CDN, backend to cloud independently  
✅ **Type Safety**: Full TypeScript in both, Eden API client for type-safe API calls  
✅ **Scalable**: Each can be scaled independently  
✅ **Clear Dependencies**: Frontend only depends on Backend API, not vice versa  

## Scripts

### Backend
```bash
cd backend
bun run dev           # Watch mode
bun run db:init      # Initialize ArangoDB + indexes
bun run build        # Build for production
bun run lint         # ESLint
bun run format       # Prettier
```

### Frontend
```bash
cd frontend
bun run dev          # Dev server with HMR
bun run build        # Production build
bun run preview      # Preview build
bun run lint         # ESLint
bun run format       # Prettier
```

## Key Files

**Backend**
- `backend/src/index.ts` - Main server
- `backend/src/db/connection.ts` - ArangoDB + DragonflyDB
- `backend/src/middleware/auth.ts` - JWT authentication
- `backend/src/middleware/rbac.ts` - Role-based access control
- `backend/src/routes/*.ts` - API endpoints

**Frontend**
- `frontend/src/App.tsx` - Root component + routing
- `frontend/src/pages/Login.tsx` - Auth page
- `frontend/src/pages/Dashboard.tsx` - Main app
- `frontend/src/components/` - UI components (Timer, TaskBoard, TimeLog)
- `frontend/vite.config.ts` - Proxy to backend at :3000

## API Endpoints (Backend)

- `GET /` - API info
- `GET /health` - Health check
- `GET /api/test` - Test endpoint
- `POST /auth/login` - Login (mock)
- `/api/time/*` - Time tracking (future)
- `/api/tasks/*` - Task management (future)
- `/api/projects/*` - Project management (future)
- `/api/expenses/*` - Expense tracking (future)
