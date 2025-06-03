
// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { getDB } from 'lib/db'; // Changed to src-relative
import { TaskSchema, type TaskWithId } from 'types/task'; // Changed to src-relative
import type { Database } from 'sqlite';

// Helper to map DB row to TaskWithId, converting 0/1 to boolean
const mapRowToTaskWithId = (row: any): TaskWithId => ({
  ...row,
  id: Number(row.id), // Ensure ID is number
  weight: Number(row.weight),
  isCompleted: row.isCompleted === 1,
  isRecurring: row.isRecurring === 1,
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  console.log(`[API /api/tasks/${id}] GET request received`);
  if (isNaN(id)) {
    console.log(`[API /api/tasks/${id}] Invalid ID provided.`);
    return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
  }

  let db: Database | null = null;
  try {
    db = await getDB();
    console.log(`[API /api/tasks/${id}] Database connection acquired for GET`);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);

    if (!task) {
      console.log(`[API /api/tasks/${id}] Task not found.`);
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    console.log(`[API /api/tasks/${id}] GET request successful, returning task.`);
    return NextResponse.json(mapRowToTaskWithId(task));
  } catch (error) {
    console.error(`[API /api/tasks/${id}] Error in GET handler:`, error);
    return NextResponse.json({ message: 'Failed to fetch task', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  console.log(`[API /api/tasks/${id}] PUT request received`);
   if (isNaN(id)) {
    console.log(`[API /api/tasks/${id}] Invalid ID provided for PUT.`);
    return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
  }

  let db: Database | null = null;
  try {
    const body = await request.json();
    console.log(`[API /api/tasks/${id}] Request body parsed:`, body);

    // For PUT, allow partial updates, so use .partial()
    // Filter out id, createdAt, updatedAt from the body as they shouldn't be updated directly by client
    const { id: bodyId, createdAt, updatedAt, ...updateData } = body;
    const validatedData = TaskSchema.omit({ id: true, createdAt: true, updatedAt: true }).partial().parse(updateData);
    console.log(`[API /api/tasks/${id}] Request body validated for partial update:`, validatedData);

    db = await getDB();
    console.log(`[API /api/tasks/${id}] Database connection acquired for PUT`);

    const existingTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!existingTask) {
      console.log(`[API /api/tasks/${id}] Task not found for update.`);
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    const fieldsToUpdate = { ...validatedData };
    // Handle boolean to integer conversion for DB
    if (typeof fieldsToUpdate.isCompleted === 'boolean') {
      // @ts-ignore
      fieldsToUpdate.isCompleted = fieldsToUpdate.isCompleted ? 1 : 0;
    }
    if (typeof fieldsToUpdate.isRecurring === 'boolean') {
      // @ts-ignore
      fieldsToUpdate.isRecurring = fieldsToUpdate.isRecurring ? 1 : 0;
    }
    
    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = Object.values(fieldsToUpdate);

    if (setClauses.length === 0) {
      console.log(`[API /api/tasks/${id}] No fields to update.`);
      return NextResponse.json(mapRowToTaskWithId(existingTask)); // Return existing task if no changes
    }
    
    console.log(`[API /api/tasks/${id}] Updating task with SET clauses: ${setClauses} and values:`, values);
    await db.run(`UPDATE tasks SET ${setClauses}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
    
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
     if (!updatedTask) {
        console.error(`[API /api/tasks/${id}] Failed to retrieve updated task with ID: ${id}`);
        throw new Error('Failed to retrieve updated task.');
    }
    console.log(`[API /api/tasks/${id}] PUT request successful, returning updated task.`);
    return NextResponse.json(mapRowToTaskWithId(updatedTask));
  } catch (error) {
    console.error(`[API /api/tasks/${id}] Error in PUT handler:`, error);
    if (error instanceof require('zod').ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update task', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  console.log(`[API /api/tasks/${id}] DELETE request received`);
  if (isNaN(id)) {
    console.log(`[API /api/tasks/${id}] Invalid ID provided for DELETE.`);
    return NextResponse.json({ message: 'Invalid task ID' }, { status: 400 });
  }

  let db: Database | null = null;
  try {
    db = await getDB();
    console.log(`[API /api/tasks/${id}] Database connection acquired for DELETE`);
    const result = await db.run('DELETE FROM tasks WHERE id = ?', id);

    if (result.changes === 0) {
      console.log(`[API /api/tasks/${id}] Task not found for deletion.`);
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    console.log(`[API /api/tasks/${id}] DELETE request successful.`);
    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error(`[API /api/tasks/${id}] Error in DELETE handler:`, error);
    return NextResponse.json({ message: 'Failed to delete task', error: (error as Error).message }, { status: 500 });
  }
}
