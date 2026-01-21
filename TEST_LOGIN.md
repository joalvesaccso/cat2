# Login Test Guide

✅ **Sample data successfully seeded!**

## Available Test Credentials

### Admin User (Full Access)
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** Administrator
- **Department:** Management
- **Permissions:** All (admin:users, admin:reports, admin:audit, etc.)

### Developer User 1
- **Email:** `florian@example.com`
- **Password:** `florian123`
- **Role:** Developer
- **Department:** Engineering
- **Skills:** TypeScript (expert), Node.js (expert)

### Developer User 2
- **Email:** `alice@example.com`
- **Password:** `alice123`
- **Role:** Developer
- **Department:** Engineering
- **Skills:** SolidJS (intermediate), TypeScript (intermediate)

### Manager User
- **Email:** `bob@example.com`
- **Password:** `bob123`
- **Role:** Manager
- **Department:** Management
- **Skills:** Project Management (expert)

---

## Testing the Backend API

### Health Check
```bash
curl http://localhost:3000/health
```

### Login (Get JWT Token)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJzdWIiOiJhZG1pbi11c2VyIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoiYWRtaW4iLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE3NjkwMDc4ODkxNjksImV4cCI6MTc2OTA5NDI4OTE2OX0=",
  "user": {
    "id": "admin-user",
    "email": "admin@example.com",
    "username": "admin",
    "type": "admin",
    "department": "Management"
  }
}
```

---

## Database Seeding Details

### Collections Created
- ✅ Users (4 users with bcrypt-hashed passwords)
- ✅ Roles (4 roles: admin, manager, developer, guest)
- ✅ Projects (2 sample projects)
- ✅ Tasks (3 sample tasks with priorities)
- ✅ Skills (5 skills with proficiency levels)
- ✅ Role Assignments (has_role edges)
- ✅ Skill Assignments (has_skill edges)

### Sample Data
- **Projects:**
  - API Backend Refactor (active, 50k budget)
  - Frontend Dashboard (active, 35k budget)

- **Tasks:**
  - Implement JWT Authentication (high priority, in progress)
  - Database Optimization (medium priority, todo)
  - Dashboard UI Components (high priority, in progress)

- **Skills:**
  - TypeScript, Node.js, SolidJS, ArangoDB, Project Management

---

## Running the Backend

```bash
cd backend
bun run dev          # Development mode with watch
# or
bun src/index.ts     # Direct run
```

Server will start on **http://localhost:3000**

## API Endpoints Status

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/` | GET | ✅ | API info |
| `/health` | GET | ✅ | Health check |
| `/api/test` | GET | ✅ | Test endpoint |
| `/auth/login` | POST | ✅ | **Working with DB** |

---

## Next Steps

1. **Frontend Integration:** Update `frontend/src/context/AuthContext.tsx` to call `/auth/login`
2. **JWT Token Storage:** Save the token in localStorage or session
3. **Protected Routes:** Use the token in Authorization header for protected endpoints
4. **RBAC Enforcement:** Implement role-based route guards

---

## File Locations

- **Seed Script:** `backend/src/db/seed.ts`
- **Login Handler:** `backend/src/index.ts` (POST /auth/login)
- **Database Init:** `backend/src/db/init.ts`
- **Sample Data Results:** ArangoDB collections at `http://localhost:8529` (_system/timeprojectdb)
