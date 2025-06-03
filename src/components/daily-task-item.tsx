
"use client";

import type { TaskWithId } from "../types/task"; // Relative
import { Card, CardContent } from "./ui/card"; // Relative
import { Checkbox } from "./ui/checkbox"; // Relative
import { cn } from "../lib/utils"; // Relative

interface DailyTaskItemProps {
  task: TaskWithId;
  onToggleComplete: (id: number, completed: boolean) => void; // ID is number
}

export default function DailyTaskItem({ task, onToggleComplete }: DailyTaskItemProps) {
  return (
    <Card className={cn("transition-all hover:shadow-md", task.isCompleted ? "bg-muted/50" : "bg-card")}>
      <CardContent className="p-3 flex items-center justify-between">
        <label
          htmlFor={`complete-daily-${task.id}`}
          className={cn(
            "flex-grow text-sm font-medium cursor-pointer mr-2",
            task.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </label>
        <Checkbox
          id={`complete-daily-${task.id}`}
          checked={task.isCompleted}
          onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
          className="h-5 w-5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          aria-label={`Mark daily task ${task.title} as ${task.isCompleted ? 'incomplete' : 'complete'}`}
        />
      </CardContent>
    </Card>
  );
}

