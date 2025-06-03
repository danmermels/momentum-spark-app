
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().optional(), // In the DB it's number, but for client-side state with local storage, string is fine. API handles conversion.
  title: z.string().min(1, { message: "Title is required." }).max(100, { message: "Title must be 100 characters or less." }),
  description: z.string().max(500, { message: "Description must be 500 characters or less." }).optional().nullable(),
  weight: z.coerce.number().min(1, { message: "Weight must be at least 1." }).max(10, { message: "Weight must be at most 10." }),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid due date." }),
  isCompleted: z.boolean().default(false),
  isRecurring: z.boolean().default(false).optional(),
  messageType: z.enum(['text', 'audio']).default('text'),
  createdAt: z.string().optional(), // Will be set by DB
  updatedAt: z.string().optional(), // Will be set by DB
});

export type TaskFormData = z.infer<typeof TaskSchema>;

// This type is for tasks that have come from the database and definitely have an ID and timestamps
export interface TaskWithId extends TaskFormData {
  id: number; // Changed from string to number to match DB
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

// For the useTasks hook, we often deal with string IDs client-side before DB interaction or if using non-integer IDs.
// However, given our DB schema uses INTEGER PRIMARY KEY, we should align.
// Let's assume TaskWithSimpleId is what useTasks internally manages if it needs to handle optimistic updates with temp string IDs.
// For now, let's make TaskWithId the primary type from the hook after DB interaction.
// The useTasks hook from the prompt used 'number' for IDs in its functions.

export type Task = TaskFormData; // Alias for form data / new task data

