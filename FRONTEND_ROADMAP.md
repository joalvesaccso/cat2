# Frontend Development Roadmap & Open Tasks

**Status**: MVP Structure Complete | Ready for Backend Integration  
**Date**: 21 January 2026  
**Framework**: SolidJS + Vite + TanStack Query  

---

## 📊 Current Frontend Status

### ✅ **COMPLETED:**

#### Architecture & Setup
- [x] SolidJS + TypeScript + Vite build system
- [x] Router setup with @solidjs/router (Auth guards implemented)
- [x] TanStack Query installed (ready for data fetching)
- [x] Tailwind CSS configured for styling
- [x] API proxy to backend (http://localhost:3000) in vite.config.ts

#### Components Structure
- [x] **AuthContext** - Global auth state management
  - Token storage in localStorage
  - User info caching
  - Login/logout methods
  - ✅ Status: **Ready**

- [x] **Login Page** - Full form with validation
  - Email & password inputs
  - Error handling
  - Loading state indicator
  - Redirect on success
  - ✅ Status: **Ready**

- [x] **Dashboard Page** - Main layout with sidebar
  - Responsive sidebar navigation
  - Tab-based view switching (Timer/Tasks/TimeLog)
  - Mobile hamburger menu
  - User avatar/profile area
  - ✅ Status: **UI Complete** (data binding needed)

- [x] **Timer Component** - Toggl Track-like interface
  - Start/stop button
  - Project dropdown selector
  - Description text input
  - Running timer display
  - CSS styling with animations
  - ✅ Status: **UI Complete** (API binding needed)

- [x] **TaskBoard Component** - Toggl Focus-like interface
  - Kanban board (To Do, In Progress, Review, Done)
  - List view with sorting options
  - Calendar view framework
  - Priority badges with colors
  - Drag-and-drop structure ready
  - ✅ Status: **UI Complete** (API binding needed)

- [x] **TimeLog Component** - Time tracking history
  - Date range filtering
  - Chronological list display
  - Daily/weekly totals calculation
  - Edit/delete action buttons
  - ✅ Status: **UI Complete** (API binding needed)

#### Styling
- [x] CSS Modules for all components
- [x] Responsive mobile design
- [x] Tailwind utilities integrated
- [x] Hover effects & transitions

---

## ❌ **OPEN TASKS & UNFINISHED PARTS**

### **TIER 1: CRITICAL (Must Do First)**

#### 1️⃣ **Fix Import Paths in App.tsx**
- **File**: `frontend/src/App.tsx`
- **Issue**: Imports use wrong paths (`./frontend/context/AuthContext` instead of `./context/AuthContext`)
- **Impact**: Frontend won't compile/run
- **Effort**: 5 minutes
- **Priority**: 🔴 CRITICAL

```tsx
// ❌ Current (WRONG):
import { AuthProvider, useAuth } from './frontend/context/AuthContext'
import { Login } from './frontend/pages/Login'
import { Dashboard } from './frontend/pages/Dashboard'

// ✅ Should be:
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
```

#### 2️⃣ **API Integration in AuthContext**
- **File**: `frontend/src/context/AuthContext.tsx` (lines 35-65)
- **Issue**: Login calls `/api/auth/login` but response format mismatch
- **Current**: `const data = await response.json()` expects `data.success` & `data.data`
- **Actual**: Backend returns `{ success, token, user }` (no nested `data`)
- **Impact**: Login will fail even with correct credentials
- **Effort**: 10 minutes
- **Priority**: 🔴 CRITICAL

**Fix needed:**
```tsx
// Backend returns: { success, token, user }
// Not: { success, data: { token, user } }

const data = await response.json()
if (data.success) {
  const { token, user } = data  // ← Remove .data nesting
  setAuth({
    userId: user.id,
    username: user.username,
    email: user.email,
    department: user.department,
    roles: user.roles || [],  // Handle undefined
    token,
    isAuthenticated: true,
  })
  localStorage.setItem('auth_token', token)
}
```

#### 3️⃣ **Implement Frontend API Fetching with TanStack Query**
- **Files to Update**: 
  - Timer.tsx
  - TaskBoard.tsx
  - TimeLog.tsx
- **Task**: Wire up components to backend APIs using `createQuery` hook
- **Effort**: 2-3 hours
- **Priority**: 🔴 CRITICAL

**Example pattern:**
```tsx
import { createQuery } from '@tanstack/solid-query'

export const Timer: Component = () => {
  // Fetch projects for dropdown
  const projectsQuery = createQuery(() => ({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      })
      return response.json()
    }
  }))

  // Submit time log
  const createTimeLogMutation = createMutation(() => ({
    mutationFn: async (data: TimeLogInput) => {
      const response = await fetch('/api/time/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(data)
      })
      return response.json()
    }
  }))

  return (
    // JSX using projectsQuery.data, createTimeLogMutation.mutate, etc.
  )
}
```

---

### **TIER 2: HIGH PRIORITY (Do Soon)**

#### 4️⃣ **Create API Client Utility**
- **File**: Create `frontend/src/lib/apiClient.ts`
- **Purpose**: DRY principle - centralized API calls with auth header
- **Effort**: 1 hour
- **Priority**: 🟠 HIGH

```tsx
// frontend/src/lib/apiClient.ts
import { useAuth } from '../context/AuthContext'

export const createApiClient = () => {
  const { auth } = useAuth()

  return {
    get: (path: string) =>
      fetch(`${path}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      }),
    
    post: (path: string, data: any) =>
      fetch(`${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(data)
      }),
    
    // patch, delete, etc...
  }
}
```

#### 5️⃣ **Add Token Refresh Logic**
- **File**: `frontend/src/context/AuthContext.tsx`
- **Task**: Handle JWT expiration (24 hours)
- **Issue**: Currently no refresh mechanism
- **Effort**: 1.5 hours
- **Priority**: 🟠 HIGH

```tsx
// On app init, check if token needs refresh
// Implement logout on 401 responses
// Auto-retry with refresh token
```

#### 6️⃣ **Implement Real-time Timer**
- **File**: `frontend/src/components/Timer.tsx`
- **Task**: Add JavaScript interval for running timer
- **Current**: UI only, no timer logic
- **Effort**: 1 hour
- **Priority**: 🟠 HIGH

```tsx
import { createEffect, onCleanup } from 'solid-js'

export const Timer: Component = () => {
  const [seconds, setSeconds] = createSignal(0)
  const [isRunning, setIsRunning] = createSignal(false)

  const startTimer = () => {
    setIsRunning(true)
    setSeconds(0)
  }

  const stopTimer = () => {
    setIsRunning(false)
    // Send time log to API
  }

  createEffect(() => {
    if (!isRunning()) return

    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)

    onCleanup(() => clearInterval(interval))
  })

  return (
    // Display seconds in HH:MM:SS format
    // Start/Stop buttons that call startTimer/stopTimer
  )
}
```

#### 7️⃣ **Connect TaskBoard to API**
- **File**: `frontend/src/components/TaskBoard.tsx`
- **Tasks**:
  - Fetch tasks from `/api/tasks`
  - Implement drag-and-drop (SolidJS compatible library)
  - Add task creation modal
  - Update task status on drag
- **Effort**: 3-4 hours
- **Priority**: 🟠 HIGH

---

### **TIER 3: MEDIUM PRIORITY (Nice to Have)**

#### 8️⃣ **Add Search & Filter UI**
- **Locations**: Timer.tsx, TaskBoard.tsx, TimeLog.tsx
- **Features**: 
  - Project search in Timer dropdown
  - Task status filter in TaskBoard
  - Date range picker in TimeLog
- **Effort**: 2 hours
- **Priority**: 🟡 MEDIUM

#### 9️⃣ **Implement Data Validation**
- **Framework**: Zod or Valibot (TypeScript validation)
- **Apply to**: Login form, Task creation, Expense form
- **Effort**: 1.5 hours
- **Priority**: 🟡 MEDIUM

#### 🔟 **Add Loading & Error States**
- **Task**: Show spinners, error modals, empty states
- **Files**: All components
- **Effort**: 1.5 hours
- **Priority**: 🟡 MEDIUM

---

### **TIER 4: POLISH (Can Defer)**

#### 11️⃣ **Implement Drag-and-Drop for Tasks**
- **Library**: `solid-dnd` or `dnd-core`
- **Effort**: 2-3 hours
- **Priority**: 🔵 LOW

#### 1️⃣2️⃣ **Add Dark Mode**
- **Implementation**: Tailwind dark mode toggle
- **Effort**: 1 hour
- **Priority**: 🔵 LOW

#### 1️⃣3️⃣ **Calendar View for Tasks**
- **Library**: `@solid/calendar` or custom component
- **Effort**: 2 hours
- **Priority**: 🔵 LOW

#### 1️⃣4️⃣ **Expense Upload UI**
- **File**: Create `frontend/src/pages/Expenses.tsx`
- **Features**:
  - Receipt image upload
  - Category selection
  - Amount input
  - Approval status display
- **Effort**: 2 hours
- **Priority**: 🔵 LOW

---

## 🎯 **RECOMMENDED IMPLEMENTATION PLAN**

### **Phase 1: Make Frontend Functional (2-3 hours)**
1. ✅ Fix import paths in App.tsx
2. ✅ Fix AuthContext API call format
3. ✅ Add TanStack Query integration to Timer component
4. ✅ Add TanStack Query integration to TaskBoard component
5. ✅ Test login → Dashboard flow

**Result**: Frontend can log in and fetch real data from backend

---

### **Phase 2: Core Features Working (4-5 hours)**
1. ✅ Create API client utility
2. ✅ Implement real-time timer logic
3. ✅ Connect TaskBoard to API (fetch + update)
4. ✅ Connect TimeLog to API
5. ✅ Add error handling & loading states

**Result**: All main features functional (Timer, Tasks, TimeLog)

---

### **Phase 3: Polish & Enhancement (3-4 hours)**
1. ✅ Add token refresh logic
2. ✅ Implement search/filters
3. ✅ Add data validation
4. ✅ Implement drag-and-drop

**Result**: Production-ready MVP

---

## 📋 **Quick Checklist**

```
PHASE 1 - CRITICAL FIXES
- [ ] Fix App.tsx imports
- [ ] Fix AuthContext API response parsing
- [ ] Test login flow
- [ ] Add TanStack Query to Timer
- [ ] Add TanStack Query to TaskBoard

PHASE 2 - DATA BINDING
- [ ] Create apiClient.ts utility
- [ ] Implement timer countdown
- [ ] Connect TaskBoard CRUD ops
- [ ] Connect TimeLog list view
- [ ] Add loading spinners

PHASE 3 - ENHANCEMENT
- [ ] Token refresh mechanism
- [ ] Search/filter UI
- [ ] Form validation (Zod)
- [ ] Error modals
- [ ] Drag-and-drop for tasks

PHASE 4 - POLISH (OPTIONAL)
- [ ] Dark mode toggle
- [ ] Calendar view
- [ ] Expense upload page
- [ ] User settings page
```

---

## 🚀 **Start Here**

Run these commands to test current state:

```bash
# Terminal 1: Backend
cd backend
bun src/index.ts

# Terminal 2: Frontend  
cd frontend
bun install  # If not done
npm run dev  # or bun run dev
```

Then in browser: **http://localhost:5173**

**Expected**: Login page appears  
**Next**: Click Login with `admin@example.com` / `admin123`  
**Issue**: Will likely fail due to import/API format issues → Fix Phase 1 first!

---

## 💡 **Technical Notes**

- **Token Storage**: Currently in `localStorage` (consider httpOnly cookie from backend)
- **CORS**: Backend has CORS enabled, frontend proxy configured
- **Type Safety**: Use domain types from `frontend/src/types/domain.ts` (create if missing)
- **State Management**: Solid-js signals + stores sufficient for MVP (TanStack Query for server state)
- **API Base**: Uses `/api/` proxy, actual requests go to `http://localhost:3000/api/`

---

## 📞 **Questions to Answer**

1. Should we use httpOnly cookies for tokens instead of localStorage?
2. Do we need real-time WebSocket updates for timer/tasks?
3. Should we implement offline mode (PWA)?
4. Do we need multi-language i18n support?

