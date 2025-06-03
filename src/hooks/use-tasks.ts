
"use client";

import { useCallback, useState, useEffect } from 'react';
import type { TaskFormData, TaskWithId } from '../types/task'; // Relative path
import { useToast } from './use-toast'; // Relative path
import { isSameDate } from '../lib/date-utils'; // Relative path

// This hook is designed to work with numeric IDs as per the DB schema (INTEGER PRIMARY KEY)

export function useTasksWithSimpleId() {
  const [tasks, setTasks] = useState<TaskWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async (isInitialFetch = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tasks' }));
        throw new Error(errorData.message || 'Failed to fetch tasks');
      }
      let data: TaskWithId[] = await response.json();

      // Daily task reset logic
      if (data.length > 0) {
        const today = new Date();
        let tasksWereReset = false;
        const resetPromises = [];

        for (const task of data) {
          if (task.isRecurring && task.isCompleted && task.updatedAt) {
            const updatedAtDate = new Date(task.updatedAt);
            if (!isSameDate(updatedAtDate, today)) {
              resetPromises.push(
                fetch(`/api/tasks/${task.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isCompleted: false }),
                }).then(async (res) => {
                  if (!res.ok) {
                    console.error(`Failed to reset task ${task.id}`);
                    return null; 
                  }
                  tasksWereReset = true;
                  return res.json(); 
                }).catch(apiError => {
                  console.error(`API error resetting task ${task.id}:`, apiError);
                  return null;
                })
              );
            }
          }
        }
        
        if (resetPromises.length > 0) {
            await Promise.all(resetPromises); 
            if(tasksWereReset){
                const refreshedResponse = await fetch('/api/tasks');
                if (!refreshedResponse.ok) {
                    const errorData = await refreshedResponse.json().catch(() => ({ message: 'Failed to refresh tasks after reset' }));
                    throw new Error(errorData.message || 'Failed to refresh tasks after reset.');
                }
                data = await refreshedResponse.json();
            }
        }
      }
      
      setTasks(data);

    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Removed fetchTasks from dependency array to avoid potential loops if it's called within useEffect

  useEffect(() => {
    fetchTasks(true); 
  }, [fetchTasks]);

  const addTask = useCallback(async (taskData: TaskFormData): Promise<TaskWithId | undefined> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create task' }));
        throw new Error(errorData.message || 'Failed to create task');
      }
      const newTask: TaskWithId = await response.json();
      setTasks((prevTasks) => [...prevTasks, newTask]);
      return newTask;
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      // throw err; // Re-throwing might be too aggressive for UI, depends on desired UX
      return undefined;
    }
  }, [toast]);

  const updateTask = useCallback(async (id: number, updates: Partial<TaskFormData>): Promise<TaskWithId | undefined> => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message || 'Failed to update task');
      }
      const updatedTask: TaskWithId = await response.json();
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === id ? updatedTask : task))
      );
      return updatedTask;
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
      return undefined;
    }
  }, [toast]);

  const deleteTask = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete task' }));
        throw new Error(errorData.message || 'Failed to delete task');
      }
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast]);

  const toggleTaskCompletion = useCallback(async (id: number, completed: boolean) => {
    const originalTasks = [...tasks]; // Shallow copy for potential revert
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to toggle task completion' }));
        throw new Error(errorData.message || 'Failed to toggle task completion');
      }
      const updatedTaskFromServer: TaskWithId = await response.json();
      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === id ? updatedTaskFromServer : task))
      );
    } catch (err) {
      console.error(err);
      setTasks(originalTasks); 
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  }, [tasks, toast]);
  
  const getTaskById = useCallback((id: number): TaskWithId | undefined => {
    return tasks.find(task => task.id === id);
  }, [tasks]);
  
  // seedDefaultTasks might be better as a separate utility or an API endpoint
  // if it involves direct DB manipulation not fitting the hook's main responsibilities.
  // For now, keeping it but acknowledging it's a bit of an outlier.
  const seedDefaultTasks = useCallback(async () => {
    console.log("Seeding default tasks (Note: this usually happens server-side on empty DB).");
    // This would typically call an API endpoint like POST /api/tasks/seed
    // For now, it will just re-trigger a fetch which might trigger server-side seeding if API is designed for it.
    await fetchTasks(); 
    toast({ title: "Default Tasks", description: "Default tasks seeding process initiated." });
  }, [fetchTasks, toast]); 

  return { tasks, addTask, updateTask, deleteTask, toggleTaskCompletion, getTaskById, seedDefaultTasks, loading, error };
}

