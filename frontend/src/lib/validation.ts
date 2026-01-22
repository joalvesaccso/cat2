/**
 * Zod Validation Schemas
 * Centralized validation for all forms in the application
 */

import { z } from 'zod'

/**
 * Login Form Validation
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Time Log Form Validation
 */
export const timeLogSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  taskId: z.string().optional(),
  hours: z
    .number()
    .min(0, 'Hours cannot be negative')
    .max(24, 'Hours cannot exceed 24'),
  minutes: z
    .number()
    .min(0, 'Minutes cannot be negative')
    .max(59, 'Minutes cannot exceed 59'),
  description: z.string().optional(),
})

export type TimeLogInput = z.infer<typeof timeLogSchema>

/**
 * Task Status Update Validation
 */
export const taskStatusSchema = z.object({
  status: z
    .enum(['todo', 'in_progress', 'review', 'done'])
    .refine((val) => val !== undefined, 'Status is required'),
})

export type TaskStatusInput = z.infer<typeof taskStatusSchema>

/**
 * Task Creation Validation
 */
export const taskCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(255, 'Title cannot exceed 255 characters'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional(),
  dueDate: z.string().datetime().optional(),
})

export type TaskCreateInput = z.infer<typeof taskCreateSchema>

/**
 * Validation error helper
 */
export const getValidationError = (error: z.ZodError): string => {
  const firstError = error.errors[0]
  return firstError?.message || 'Validation failed'
}
