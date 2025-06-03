
// src/hooks/use-tasks.ts
"use client";

import { useCallback, useState, useEffect } from 'react';
import type { TaskFormData, TaskWithId } from '@/types/task';
import { useToast } from './use-toast';
import { isSameDate } from '@/lib/date-utils'; 

export function useTasksWithSimpleId() {
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async (isInitialFetch = false) => {
    console.log('[useTasks] Fetching tasks...');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks');
      console.log('[useTasks] Fetch response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from fetch tasks' }));
        console.error('[useTasks] Failed to fetch tasks, server responded with:', errorData);
        throw new Error(errorData.message || `Failed to fetch tasks. Status: ${response.status}`);
      }
      let data: TaskWithId[] = await response.json();
      console.log('[useTasks] Tasks fetched successfully:', data.length);

      // Daily task reset logic (still relevant even with server-side seeding for ongoing use)
      if (data.length > 0) {
        const today = new Date();
        let tasksWereReset = false;
        const resetPromises = [];

        for (const task of data) {
          if (task.isRecurring && task.isCompleted && task.updatedAt) {
            const updatedAtDate = new Date(task.updatedAt);
            if (!isSameDate(updatedAtDate, today)) { 
              console.log(`[useTasks] Task ${task.id} (${task.title}) is recurring, completed, and not updated today. Queueing for reset.`);
              resetPromises.push(
                fetch(`/api/tasks/${task.id}`, { // Ensure task.id is number
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isCompleted: false }),
                }).then(async (res) => {
                  if (!res.ok) {
                    console.error(`[useTasks] Failed to reset task ${task.id}`);
                    return null; 
                  }
                  tasksWereReset = true;
                  console.log(`[useTasks] Task ${task.id} reset successfully.`);
                  return res.json(); 
                }).catch(apiError => {
                  console.error(`[useTasks] API error resetting task ${task.id}:`, apiError);
                  return null;
                })
              );
            }
          }
        }
        
        if (resetPromises.length > 0) {
            console.log(`[useTasks] Awaiting ${resetPromises.length} task reset operations...`);
            await Promise.all(resetPromises); 
            if(tasksWereReset){
                console.log('[useTasks] Tasks were reset, re-fetching to get latest state...');
                const refreshedResponse = await fetch('/api/tasks');
                if (!refreshedResponse.ok) {
                    const errorData = await refreshedResponse.json().catch(() => ({ message: 'Failed to parse error from refresh tasks' }));
                    console.error('[useTasks] Failed to refresh tasks after reset:', errorData);
                    throw new Error(errorData.message || 'Failed to refresh tasks after reset.');
                }
                data = await refreshedResponse.json();
                console.log('[useTasks] Tasks refreshed after reset:', data.length);
            }
        }
      }
      
      setTasks(data);

    } catch (err) {
      console.error('[useTasks] Error in fetchTasks:', err);
      setError((err as Error).message);
      toast({ title: "Error Loading Tasks", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
      console.log('[useTasks] Fetching tasks finished.');
    }
  }, [toast]); // fetchTasks dependency removed to avoid loops, relies on manual call or useEffect once.

  useEffect(() => {
    fetchTasks(true); 
  }, [fetchTasks]);

  const addTask = useCallback(async (taskData: TaskFormData): Promise<TaskWithId | undefined> => {
    console.log('[useTasks] Adding task:', taskData);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from add task' }));
        console.error('[useTasks] Failed to create task:', errorData);
        throw new Error(errorData.message || 'Failed to create task');
      }
      const newTask: TaskWithId = await response.json();
      console.log('[useTasks] Task added successfully:', newTask);
      setTasks((prevTasks) => [...prevTasks, newTask]);
      return newTask;
    } catch (err) {
      console.error('[useTasks] Error in addTask:', err);
      toast({ title: "Error Creating Task", description: (err as Error).message, variant: "destructive" });
      return undefined;
    }
  }, [toast]);

  const updateTask = useCallback(async (id: number, updates: Partial<TaskFormData>): Promise<TaskWithId | undefined> => {
    console.log(`[useTasks] Updating task ${id} with:`, updates);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from update task' }));
        console.error(`[useTasks] Failed to update task ${id}:`, errorData);
        throw new Error(errorData.message || `Failed to update task ${id}`);
      }
      const updatedTask: TaskWithId = await response.json();
      console.log(`[useTasks] Task ${id} updated successfully:`, updatedTask);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === id ? updatedTask : task))
      );
      return updatedTask;
    } catch (err) {
      console.error(`[useTasks] Error in updateTask for id ${id}:`, err);
      toast({ title: "Error Updating Task", description: (err as Error).message, variant: "destructive" });
      return undefined;
    }
  }, [toast]);

  const deleteTask = useCallback(async (id: number) => {
    console.log(`[useTasks] Deleting task ${id}`);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from delete task' }));
        console.error(`[useTasks] Failed to delete task ${id}:`, errorData);
        throw new Error(errorData.message || `Failed to delete task ${id}`);
      }
      console.log(`[useTasks] Task ${id} deleted successfully from server.`);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error(`[useTasks] Error in deleteTask for id ${id}:`, err);
      toast({ title: "Error Deleting Task", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast]);

  const toggleTaskCompletion = useCallback(async (id: number, completed: boolean) => {
    console.log(`[useTasks] Toggling task ${id} completion to: ${completed}`);
    const originalTasks = [...tasks]; 
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, isCompleted: completed, updatedAt: new Date().toISOString() } : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: completed }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from toggle task' }));
        console.error(`[useTasks] Failed to toggle task ${id} completion:`, errorData);
        throw new Error(errorData.message || `Failed to toggle task ${id} completion`);
      }
      const updatedTaskFromServer: TaskWithId = await response.json();
      console.log(`[useTasks] Task ${id} completion toggled successfully on server:`, updatedTaskFromServer);
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === id ? updatedTaskFromServer : task))
      );
    } catch (err) {
      console.error(`[useTasks] Error in toggleTaskCompletion for id ${id}:`, err);
      setTasks(originalTasks); 
      toast({ title: "Error Toggling Task", description: (err as Error).message, variant: "destructive" });
    }
  }, [tasks, toast]);
  
  const getTaskById = useCallback((id: number): TaskWithId | undefined => {
    // ID is expected to be a number here as per TaskWithId and DB schema
    console.log(`[useTasks] Getting task by ID: ${id}`);
    return tasks.find(task => task.id === id);
  }, [tasks]);
  
  // seedDefaultTasks function is removed as seeding is now server-side.
  // The initial fetchTasks (called in useEffect) will trigger server-side seeding if DB is empty.

  return { tasks, addTask, updateTask, deleteTask, toggleTaskCompletion, getTaskById, loading, error };
}
