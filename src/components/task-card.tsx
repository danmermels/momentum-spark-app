
"use client";

import type { TaskWithId } from "../types/task"; // Relative
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card"; // Relative
import { Button } from "./ui/button"; // Relative
import { Checkbox } from "./ui/checkbox"; // Relative
import { Badge } from "./ui/badge"; // Relative
import { formatDate, getDaysUntilDueDate } from "../lib/date-utils"; // Relative
import { Edit3, Trash2, CalendarDays, BarChartBig, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "../lib/utils"; // Relative

interface TaskCardProps {
  task: TaskWithId;
  onToggleComplete: (id: number, completed: boolean) => void; // ID is number
  onDelete: (id: number) => void; // ID is number
}

export default function TaskCard({ task, onToggleComplete, onDelete }: TaskCardProps) {
  const daysUntilDue = getDaysUntilDueDate(task.dueDate);
  const dueDateHasPassed = new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)); // Check if due date is in the past

  return (
    <Card className={cn("transition-all hover:shadow-lg", task.isCompleted ? "bg-muted/50" : "bg-card")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className={cn("font-headline text-xl mb-1", task.isCompleted && "line-through text-muted-foreground")}>
            {task.title}
          </CardTitle>
          <Checkbox
            id={`complete-${task.id}`}
            checked={task.isCompleted}
            onCheckedChange={(checked) => onToggleComplete(task.id, !!checked)}
            className="h-6 w-6 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            aria-label={`Mark task ${task.title} as ${task.isCompleted ? 'incomplete' : 'complete'}`}
          />
        </div>
        {task.description && (
          <CardDescription className={cn("text-sm", task.isCompleted && "line-through text-muted-foreground/80")}>
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>Due: {formatDate(task.dueDate)}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <BarChartBig className="mr-2 h-4 w-4" />
          <span>Weight: {task.weight} points</span>
        </div>
        {!task.isCompleted && dueDateHasPassed && (
           <Badge variant="destructive" className="mt-2 flex items-center w-fit">
            <AlertTriangle className="mr-1 h-3 w-3" /> Overdue
          </Badge>
        )}
        {!task.isCompleted && !dueDateHasPassed && daysUntilDue >= 0 && daysUntilDue <= 2 && (
          <Badge variant="outline" className="mt-2 border-orange-500 text-orange-600 flex items-center w-fit">
            <AlertTriangle className="mr-1 h-3 w-3" /> Due {daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}
          </Badge>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Link href={`/tasks/${task.id}/edit`} passHref>
          <Button variant="outline" size="sm" aria-label={`Edit task ${task.title}`}>
            <Edit3 className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)} aria-label={`Delete task ${task.title}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

