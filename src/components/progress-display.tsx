// src/components/progress-display.tsx
"use client";

import type { TaskWithId } from "../types/task"; // Relative
import { Progress } from "./ui/progress"; // Relative
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"; // Relative
import { isTaskDueToday, isTaskDueThisMonth } from "../lib/date-utils"; // Relative

interface ProgressDisplayProps {
  tasks: TaskWithId[];
}

const calculateProgress = (filteredTasks: TaskWithId[]): number => {
  if (filteredTasks.length === 0) return 0;
  const totalWeight = filteredTasks.reduce((sum, task) => sum + task.weight, 0);
  if (totalWeight === 0) return 0; // Avoid division by zero if all tasks have 0 weight (though schema enforces >0)
  const completedWeight = filteredTasks
    .filter((task) => task.isCompleted)
    .reduce((sum, task) => sum + task.weight, 0);
  return (completedWeight / totalWeight) * 100;
};

export default function ProgressDisplay({ tasks }: ProgressDisplayProps) {
  const dailyTasksForProgress = tasks.filter(task => task.isRecurring || isTaskDueToday(task.dueDate));

  const nonRecurringTasksDueThisMonth = tasks.filter(task => !task.isRecurring && isTaskDueThisMonth(task.dueDate));
  const allRecurringTasks = tasks.filter(task => task.isRecurring);
  const tasksForMonthlyProgress = [...nonRecurringTasksDueThisMonth, ...allRecurringTasks];

  const dailyProgress = calculateProgress(dailyTasksForProgress);
  const monthlyProgress = calculateProgress(tasksForMonthlyProgress);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Daily Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTasksForProgress.length > 0 ? (
            <>
              <Progress value={dailyProgress} className="w-full h-3 mb-2 [&>div]:bg-primary" />
              <p className="text-sm text-muted-foreground text-center">{Math.round(dailyProgress)}% complete</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks due today or daily goals set.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Monthly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksForMonthlyProgress.length > 0 ? (
            <>
              <Progress value={monthlyProgress} className="w-full h-3 mb-2 [&>div]:bg-primary" />
              <p className="text-sm text-muted-foreground text-center">{Math.round(monthlyProgress)}% complete</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks due this month or daily goals set.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
