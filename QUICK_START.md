# ⚡ Quick Start - Time & Project Management Tool

Get the app running in **5 minutes**.

## 🎯 One-Liner Setup

```bash
cd cat2 && \
bun install && \
cp .env.example .env && \
docker compose up -d && \
sleep 10 && \
bun run db:init && \
bun run dev
```

Then in another terminal:
```bash
bun add vite @vitejs/plugin-solid solid-js @solidjs/router && \
npx vite --port 5173
```

## ✅ Access the App

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | App UI |
| Backend API | http://localhost:3000 | REST API |
| API Docs | http://localhost:3000/swagger | Interactive docs |
| Database | http://localhost:8529 | ArangoDB UI |

## 🔑 Demo Credentials

```
Email:    user@example.com
Password: password123
```

## 📝 What You Get

✅ Working time tracker with start/stop timer  
✅ Kanban task board  
✅ Time log viewer with date filters  
✅ Authentication with JWT  
✅ RBAC (role-based access)  
✅ Full REST API with auto-generated docs  
✅ PostgreSQL-compatible graph database  

## 🆘 Troubleshooting

**Services won't start?**
```bash
docker compose down -v
docker compose up -d
sleep 10
bun run db:init
```

**Backend not responding?**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

**Frontend can't connect to API?**
- Check backend is running: `curl http://localhost:3000`
- Check browser console for errors
- Verify API token is in Authorization header

## 📚 Next Steps

1. **Understand the architecture** → Read [IMPLEMENTATION.md](IMPLEMENTATION.md)
2. **Explore the API** → Open http://localhost:3000/swagger
3. **Review code standards** → Check [rules.md](rules.md)
4. **Start developing** → Pick a task from [IMPLEMENTATION.md#next-steps](IMPLEMENTATION.md#next-steps)

## 🚀 Development Commands

```bash
bun run dev             # Start backend (watch mode)
bun run db:init        # Reset database
bun run lint           # Check code style
bun run format         # Auto-format code
bun test               # Run tests
bun run build          # Build for production
```

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Backend API (Elysia) |
| `src/App.tsx` | Frontend root (SolidJS) |
| `src/db/connection.ts` | Database setup |
| `src/middleware/auth.ts` | Authentication |
| `src/middleware/rbac.ts` | Permissions |
| `src/routes/*.ts` | API endpoints |
| `src/frontend/pages/` | Pages (Login, Dashboard) |
| `src/frontend/components/` | React components |

## 📊 Architecture at a Glance

```
Browser (SolidJS)
      ↓ HTTP
Elysia API Server
      ↓ Graph Queries
ArangoDB (data) + DragonflyDB (cache)
```

---

**Ready?** Just run those commands above and you're good to go! 🎉
