
// src/app/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTasksWithSimpleId as useTasks } from '../hooks/use-tasks'; 
import { useSettings } from '../hooks/use-settings'; 
import TaskCard from '../components/task-card'; 
import DailyTaskItem from '../components/daily-task-item'; 
import CompletedMilestoneItem from '../components/completed-milestone-item'; 
import ProgressDisplay from '../components/progress-display'; 
import MonthlyProgressChart from '../components/monthly-progress-chart'; // Relative path
import MotivationalMessageModal from '../components/motivational-message-modal'; 
import { Button } from '../components/ui/button'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'; 
import { Input } from '../components/ui/input'; 
import { generateMotivationalMessage, type MotivationalMessageInput } from '../ai/flows/generate-motivational-message'; // Relative path
import { getDaysUntilDueDate, isDateThisMonth } from '../lib/date-utils'; 
import type { TaskWithId } from '../types/task'; 
import { PlusCircle, ListFilter, Database, Repeat, CalendarDays as CalendarDaysIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from "../hooks/use-toast"; 
import { parseISO, format } from 'date-fns';

type SortOption = "dueDate" | "weight" | "title" | "status";
type FilterOption = "all" | "completed" | "pending";

export default function TaskDashboardPage() {
  const { tasks, toggleTaskCompletion, deleteTask, seedDefaultTasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { settings, loading: settingsLoading } = useSettings();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("dueDate");
  const [filterOption, setFilterOption] = useState<FilterOption>("pending");

  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [motivationalMessageType, setMotivationalMessageType] = useState<'text' | 'audio'>('text');
  const [lastNotifiedUpcomingTaskId, setLastNotifiedUpcomingTaskId] = useState<number | null>(null);
  const [hasAttemptedSeeding, setHasAttemptedSeeding] = useState(false);

  const [currentDateDisplay, setCurrentDateDisplay] = useState({ day: '', month: '' });

  useEffect(() => {
    const now = new Date();
    setCurrentDateDisplay({
      day: format(now, 'd'),
      month: format(now, 'MMMM'),
    });
  }, []);

   useEffect(() => {
    if (!tasksLoading && tasks.length === 0 && !hasAttemptedSeeding && !settingsLoading) {
        setHasAttemptedSeeding(true);
    }
  }, [tasks.length, seedDefaultTasks, hasAttemptedSeeding, tasksLoading, settingsLoading]);


  const handleToggleComplete = useCallback(async (id: number, completed: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (!task || settingsLoading) return;

    toggleTaskCompletion(id, completed);

    if (completed && !task.isRecurring) {
      try {
        const aiInput: MotivationalMessageInput = {
          taskName: task.title,
          userName: settings.userName,
          taskCompletionStatus: true,
          daysUntilDueDate: getDaysUntilDueDate(task.dueDate),
        };
        const aiResponse = await generateMotivationalMessage(aiInput);
        setMotivationalMessage(aiResponse.message);
        setMotivationalMessageType(task.messageType as 'text' | 'audio');
      } catch (error) {
        console.error("Failed to generate motivational message:", error);
        toast({
          title: "AI Message Error",
          description: "Could not generate motivational message.",
          variant: "destructive",
        });
      }
    }
  }, [tasks, settings.userName, toggleTaskCompletion, toast, settingsLoading, settings]);

  const handleDeleteTask = useCallback((id: number) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete && window.confirm(`Are you sure you want to delete "${taskToDelete?.title}"?`)) {
      deleteTask(id);
      toast({
        title: "Task Deleted",
        description: `"${taskToDelete?.title}" has been removed.`,
      });
    }
  }, [tasks, deleteTask, toast]);

  useEffect(() => {
    if (settingsLoading || tasksLoading) return;

    const checkAndNotify = async () => {
      const pendingNonRecurringTasks = tasks.filter(t => !t.isCompleted && !t.isRecurring);
      const upcomingTask = pendingNonRecurringTasks.find(t => {
        const days = getDaysUntilDueDate(t.dueDate);
        return days >= 0 && days <= 1; 
      });

      if (upcomingTask && settings.enableNotifications) {
        if (upcomingTask.id !== lastNotifiedUpcomingTaskId) {
          try {
            const aiInput: MotivationalMessageInput = {
              taskName: upcomingTask.title,
              userName: settings.userName,
              taskCompletionStatus: false,
              daysUntilDueDate: getDaysUntilDueDate(upcomingTask.dueDate),
            };
            const aiResponse = await generateMotivationalMessage(aiInput);
            toast({
              title: `Reminder: ${upcomingTask.title}`,
              description: aiResponse.message,
              duration: 10000,
            });
            setLastNotifiedUpcomingTaskId(upcomingTask.id);
          } catch (error) {
            console.error("Failed to generate due date reminder:", error);
          }
        }
      } else if (!upcomingTask && settings.enableNotifications) {
         if (lastNotifiedUpcomingTaskId !== null) {
            setLastNotifiedUpcomingTaskId(null); 
        }
      }
    };
    
    if (settings.enableNotifications && (hasAttemptedSeeding || tasks.length > 0)) {
      checkAndNotify();
    } else if (!settings.enableNotifications && lastNotifiedUpcomingTaskId !== null) {
      setLastNotifiedUpcomingTaskId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, settings.enableNotifications, hasAttemptedSeeding, settings.userName, settingsLoading, tasksLoading]);


  const { dailyTasks, longTermTasks, completedThisMonthMilestones } = useMemo(() => {
    const daily: TaskWithId[] = [];
    let others: TaskWithId[] = [];
    const completedMonthly: TaskWithId[] = [];

    tasks.forEach(task => {
      if (task.isRecurring) {
        daily.push(task);
      } else {
        if (task.isCompleted && task.updatedAt && typeof task.updatedAt === 'string') {
          try {
            const completedDate = parseISO(task.updatedAt);
            if (isDateThisMonth(completedDate)) {
              completedMonthly.push(task);
            }
          } catch (e) { console.error("Error parsing updatedAt for completed task:", task.updatedAt); }
        }
        if (!task.isCompleted || (task.isCompleted && task.updatedAt && typeof task.updatedAt === 'string' && !isDateThisMonth(parseISO(task.updatedAt)))) {
            others.push(task);
        }
      }
    });

    if (searchTerm) {
      others = others.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterOption === "completed") {
      others = others.filter(task => task.isCompleted);
    } else if (filterOption === "pending") {
      others = others.filter(task => !task.isCompleted);
    }

    others.sort((a, b) => {
      if (sortOption === "dueDate") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortOption === "weight") {
        return (b.weight || 0) - (a.weight || 0);
      }
      if (sortOption === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === "status") {
        return (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0);
      }
      return 0;
    });
    
    daily.sort((a,b) => a.title.localeCompare(b.title));
    completedMonthly.sort((a,b) => {
        try {
            const dateA = a.updatedAt && typeof a.updatedAt === 'string' ? parseISO(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt && typeof b.updatedAt === 'string' ? parseISO(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        } catch (e) {
            console.error("Error sorting completed milestones by date", e);
            return 0;
        }
    });

    return { dailyTasks: daily, longTermTasks: others, completedThisMonthMilestones: completedMonthly };
  }, [tasks, searchTerm, sortOption, filterOption]);

  const hasAnyTasks = tasks.length > 0;
  const hasLongTermTasks = longTermTasks.length > 0;
  const hasDailyTasks = dailyTasks.length > 0;
  const hasCompletedThisMonthMilestones = completedThisMonthMilestones.length > 0;

  const handleSortChange = useCallback((value: string) => {
    setSortOption(value as SortOption);
  }, []);

  const handleFilterChange = useCallback((value: string) => {
    setFilterOption(value as FilterOption);
  }, []);

  if (tasksLoading || settingsLoading) {
    return (
      <div className="container mx-auto py-8 flex flex-col justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your tasks...</p>
      </div>
    );
  }

  if (tasksError) {
     return (
      <div className="container mx-auto py-8 text-center text-destructive">
        Error loading tasks: {tasksError}. Please try refreshing.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="text-left">
          <span className="text-4xl font-bold text-primary">{currentDateDisplay.day}</span>
          {currentDateDisplay.day && <span className="text-xl text-muted-foreground"> - {currentDateDisplay.month}</span>}
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary text-right">Task Dashboard</h1>
      </div>

      <div className="space-y-4 mb-8">
        <ProgressDisplay tasks={tasks} />
        <MonthlyProgressChart tasks={tasks} />
      </div>

      {hasDailyTasks && (
        <div className="my-8">
          <h2 className="text-2xl font-semibold mb-4 font-headline text-secondary-foreground flex items-center">
            <Repeat className="mr-3 h-6 w-6 text-primary" /> Daily Goals
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dailyTasks.map((task) => (
              <DailyTaskItem
                key={task.id}
                task={task}
                onToggleComplete={(id, isCompleted) => handleToggleComplete(Number(id), isCompleted)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="my-8">
        <h2 className="text-2xl font-semibold mb-4 font-headline text-secondary-foreground flex items-center">
          <CalendarDaysIcon className="mr-3 h-6 w-6 text-primary" /> Projects & Milestones
        </h2>
        {hasLongTermTasks ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {longTermTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={(id, isCompleted) => handleToggleComplete(Number(id), isCompleted)}
                onDelete={(id) => handleDeleteTask(Number(id))}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-card rounded-lg shadow">
            <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2 font-headline">
              {filterOption === 'pending' ? 'No pending projects or milestones!' : 'No projects or milestones match your filters.'}
            </h3>
            <p className="text-muted-foreground">
              {filterOption === 'pending' ? 'Add a new task or check your other filters.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}
      </div>
      
      {hasCompletedThisMonthMilestones && (
        <div className="my-8">
          <h2 className="text-2xl font-semibold mb-4 font-headline text-secondary-foreground flex items-center">
            <CheckCircle2 className="mr-3 h-6 w-6 text-primary" /> Accomplishments This Month
          </h2>
          <div className="space-y-3">
            {completedThisMonthMilestones.map((task) => (
              <CompletedMilestoneItem
                key={task.id}
                task={task}
                onToggleComplete={(id, isCompleted) => handleToggleComplete(Number(id), isCompleted)}
              />
            ))}
          </div>
        </div>
      )}

      {!hasAnyTasks && !tasksLoading && (hasAttemptedSeeding || tasks.length === 0) && (
         <div className="text-center py-10 mt-8">
            <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2 font-headline">No tasks yet</h2>
            <p className="text-muted-foreground mb-4">
                It looks like your task list is empty. Add your first task to get started!
            </p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/tasks/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Task
                </Link>
            </Button>
        </div>
      )}

      <div className="my-8 mt-12 p-4 bg-card rounded-lg shadow sticky bottom-0 border-t border-border">
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <Input
            type="text"
            placeholder="Search projects/milestones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow md:max-w-xs"
          />
          <div className="flex gap-2 items-center">
            <ListFilter className="h-5 w-5 text-muted-foreground" />
            <Select value={sortOption} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOption} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All (Excl. This Month's Done)</SelectItem>
                <SelectItem value="completed">Completed (Excl. This Month's)</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <Button asChild className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground ml-auto">
            <Link href="/tasks/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
            </Link>
          </Button>
        </div>
      </div>

      {motivationalMessage && (
        <MotivationalMessageModal
          isOpen={!!motivationalMessage}
          onClose={() => setMotivationalMessage(null)}
          message={motivationalMessage}
          messageType={motivationalMessageType}
        />
      )}
    </div>
  );
}
    

    