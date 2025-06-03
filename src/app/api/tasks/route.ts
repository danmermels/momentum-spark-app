
// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Reverted to alias
import { TaskSchema, type TaskFormData, type TaskWithId } from '@/types/task'; // Reverted to alias
import type { Database } from 'sqlite';

const defaultTasksSeedData: Omit<TaskFormData, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: "Morning Review",
    description: "Plan your day.",
    weight: 3,
    dueDate: new Date().toISOString(),
    isCompleted: false,
    isRecurring: true,
    messageType: "text",
  },
  {
    title: "Evening Wind-Down",
    description: "Reflect on the day and prepare for tomorrow.",
    weight: 2,
    dueDate: new Date().toISOString(),
    isCompleted: false,
    isRecurring: true,
    messageType: "text",
  },
  {
    title: "Review Project Proposal",
    description: "Go over the new proposal and provide feedback.",
    weight: 8,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    isRecurring: false,
    messageType: "text",
  },
  {
    title: "Schedule Team Meeting",
    description: "Coordinate with team members to find a suitable time.",
    weight: 5,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: false,
    isRecurring: false,
    messageType: "text",
  },
  {
    title: "Submit Monthly Report",
    description: "Compile and submit the report for last month's activities.",
    weight: 10,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    isCompleted: true,
    isRecurring: false,
    messageType: "text",
  },
];

// Helper to map DB row to TaskWithId, converting 0/1 to boolean
const mapRowToTaskWithId = (row: any): TaskWithId => ({
  ...row,
  id: Number(row.id), // Ensure ID is number
  weight: Number(row.weight),
  isCompleted: row.isCompleted === 1,
  isRecurring: row.isRecurring === 1,
});


export async function GET(request: Request) {
  console.log('[API /api/tasks] GET request received');
  let db: Database | null = null;
  try {
    db = await getDB();
    console.log('[API /api/tasks] Database connection acquired for GET');

    let tasks = await db.all('SELECT * FROM tasks ORDER BY dueDate ASC');
    console.log(`[API /api/tasks] Found ${tasks.length} tasks initially.`);

    if (tasks.length === 0) {
      console.log('[API /api/tasks] No tasks found, attempting to seed default tasks...');
      for (const taskData of defaultTasksSeedData) {
        const { title, description, weight, dueDate, isCompleted, isRecurring, messageType } = taskData;
        await db.run(
          'INSERT INTO tasks (title, description, weight, dueDate, isCompleted, isRecurring, messageType) VALUES (?, ?, ?, ?, ?, ?, ?)',
          title,
          description || null,
          weight,
          dueDate,
          isCompleted ? 1 : 0,
          isRecurring ? 1 : 0,
          messageType
        );
      }
      console.log(`[API /api/tasks] ${defaultTasksSeedData.length} default tasks seeded.`);
      tasks = await db.all('SELECT * FROM tasks ORDER BY dueDate ASC');
      console.log(`[API /api/tasks] Found ${tasks.length} tasks after seeding.`);
    }
    
    const mappedTasks = tasks.map(mapRowToTaskWithId);
    console.log('[API /api/tasks] GET request successful, returning tasks.');
    return NextResponse.json(mappedTasks);
  } catch (error) {
    console.error('[API /api/tasks] Error in GET handler:', error);
    return NextResponse.json({ message: 'Failed to fetch tasks', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('[API /api/tasks] POST request received');
  let db: Database | null = null;
  try {
    const body = await request.json();
    console.log('[API /api/tasks] Request body parsed:', body);

    // Validate all fields except id, createdAt, updatedAt which are auto-generated or not part of creation payload.
    const validatedData = TaskSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(body);
    console.log('[API /api/tasks] Request body validated:', validatedData);
    
    db = await getDB();
    console.log('[API /api/tasks] Database connection acquired for POST');

    const { title, description, weight, dueDate, isCompleted, isRecurring, messageType } = validatedData;
    
    const result = await db.run(
      'INSERT INTO tasks (title, description, weight, dueDate, isCompleted, isRecurring, messageType) VALUES (?, ?, ?, ?, ?, ?, ?)',
      title,
      description || null,
      weight,
      dueDate,
      isCompleted ? 1 : 0,
      isRecurring ? 1 : 0,
      messageType
    );

    if (!result.lastID) {
      console.error('[API /api/tasks] Failed to insert task, lastID is undefined.');
      throw new Error('Failed to insert task into database.');
    }
    console.log(`[API /api/tasks] Task inserted with ID: ${result.lastID}`);

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
    if (!newTask) {
        console.error(`[API /api/tasks] Failed to retrieve newly created task with ID: ${result.lastID}`);
        throw new Error('Failed to retrieve newly created task.');
    }
    
    console.log('[API /api/tasks] POST request successful, returning new task.');
    return NextResponse.json(mapRowToTaskWithId(newTask), { status: 201 });
  } catch (error) {
    console.error('[API /api/tasks] Error in POST handler:', error);
    if (error instanceof require('zod').ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create task', error: (error as Error).message }, { status: 500 });
  }
}
