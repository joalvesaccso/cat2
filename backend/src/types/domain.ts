// Domain types for Time & Project Management Tool

/* ============= USER & AUTHENTICATION ============= */
export interface User {
  _key: string
  _id?: string
  _rev?: string
  username: string
  email: string
  passwordHash?: string // Only when using local auth (not SSO)
  type: 'employee' | 'manager' | 'admin' | 'guest'
  department: string
  hireDate?: string // ISO date
  terminationDate?: string // ISO date
  consents: ConsentRecord[]
  pseudonymizedId?: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface ConsentRecord {
  type: 'time_tracking' | 'expense_processing' | 'analytics'
  granted: boolean
  date: string
  version: string
}

export interface Role {
  _key: string
  _id?: string
  name: string
  description: string
  permissions: string[] // e.g., ['read:own_time', 'write:project_tasks']
}

export interface Permission {
  _key: string
  _id?: string
  action: 'read' | 'write' | 'delete' | 'admin'
  resource: 'time_logs' | 'projects' | 'tasks' | 'expenses' | 'users' | 'reports'
  scope: 'own' | 'department' | 'all'
}

export interface Consent {
  _key: string
  _id?: string
  userId: string
  type: 'time_tracking' | 'expense_processing' | 'analytics'
  granted: boolean
  date: string
  revocationDate?: string
}

export interface AuditLog {
  _key: string
  _id?: string
  userId: string
  action: string // e.g., 'read_time_log', 'delete_user'
  resourceId: string
  timestamp: string
  ipAddress?: string
  success: boolean
  details?: string
}

/* ============= PROJECT MANAGEMENT ============= */
export interface Project {
  _key: string
  _id?: string
  _rev?: string
  name: string
  description: string
  startDate: string // ISO date
  endDate?: string // ISO date
  status: 'planning' | 'active' | 'completed' | 'on_hold'
  budget: number // EUR
  client?: string
  totalBillableHours?: number
  totalTravelHours?: number
  totalExpenses?: number
  totalTasks?: number
  profitability?: number
  requiredSkills: SkillRequirement[]
  createdAt: string
  updatedAt: string
}

export interface SkillRequirement {
  skillId: string
  requiredProficiency: 'beginner' | 'intermediate' | 'expert'
  allocationCount: number
}

export interface Task {
  _key: string
  _id?: string
  _rev?: string
  projectId: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string // ISO date
  estimatedDuration: number // minutes
  status: 'todo' | 'in_progress' | 'review' | 'done'
  billable: boolean
  assigneeId?: string
  createdAt: string
  updatedAt: string
}

/* ============= TIME TRACKING ============= */
export interface TimeLog {
  _key: string
  _id?: string
  _rev?: string
  userId: string
  projectId: string
  taskId?: string
  description: string
  startTime: string // ISO date
  endTime?: string // ISO date
  duration: number // minutes
  type: 'work' | 'travel' | 'holiday' | 'sick'
  billable: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface FocusSession {
  _key: string
  _id?: string
  userId: string
  taskId: string
  type: 'pomodoro' | 'focus'
  duration: number // minutes (default 25 for pomodoro)
  breakDuration?: number // minutes
  isActive: boolean
  startedAt: string
  completedAt?: string
}

/* ============= EXPENSES ============= */
export interface Expense {
  _key: string
  _id?: string
  _rev?: string
  userId: string
  amount: number // EUR
  currency: 'EUR'
  category: string
  date: string // ISO date
  description: string
  receiptUrl?: string
  projectId?: string
  taskId?: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

/* ============= SKILLS / TALENTS ============= */
export interface Skill {
  _key: string
  _id?: string
  name: string
  description: string
  category: string // e.g., 'Backend', 'Frontend', 'DevOps'
  createdAt: string
}

export interface EmployeeSkill {
  skillId: string
  proficiencyLevel: 'beginner' | 'intermediate' | 'expert'
  yearsExperience: number
  certificationDate?: string
}

/* ============= API RESPONSE TYPES ============= */
export type ApiResponse<T> =
  | { success: true; data: T; status: 200 | 201 }
  | { success: false; error: string; status: 400 | 401 | 403 | 404 | 500 }

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/* ============= AUTH TYPES ============= */
export interface AuthContext {
  userId: string
  username: string
  email: string
  roles: string[]
  permissions: string[]
  department: string
  isAuthenticated: boolean
}

export interface JWTPayload {
  sub: string // userId
  email: string
  name: string
  roles: string[]
  permissions: string[]
  department: string
  iat: number
  exp: number
}
