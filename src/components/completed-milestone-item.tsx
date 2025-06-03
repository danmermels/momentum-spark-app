
"use client";

import type { TaskWithId } from "../types/task"; // Relative
import { Card, CardContent } from "./ui/card"; // Relative
import { Button } from "./ui/button"; // Relative
import { Undo2 } from "lucide-react";
import { formatDate, isDateThisMonth } from "../lib/date-utils"; // Relative
import { parseISO } from 'date-fns';

interface CompletedMilestoneItemProps {
  task: TaskWithId;
  onToggleComplete: (id: number, completed: boolean) => void; // ID is number
}

export default function CompletedMilestoneItem({ task, onToggleComplete }: CompletedMilestoneItemProps) {
  const completedDate = task.updatedAt ? parseISO(task.updatedAt) : null;
  const completedDateString = completedDate && isDateThisMonth(completedDate) 
    ? `Completed: ${formatDate(task.updatedAt!)}` 
    : 'Completed recently';

  return (
    <Card className="bg-card/70 border-green-500/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-grow">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          {task.updatedAt && (
            <p className="text-xs text-muted-foreground">{completedDateString}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleComplete(task.id, false)} 
          aria-label={`Mark task ${task.title} as incomplete`}
          className="ml-2 border-orange-500 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
        >
          <Undo2 className="mr-1 h-4 w-4" />
          Undo
        </Button>
      </CardContent>
    </Card>
  );
}

