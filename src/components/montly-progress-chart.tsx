// src/components/monthly-progress-chart.tsx
"use client";

import * as React from "react";
import { parseISO, isValid, getMonth, getYear, getDate } from 'date-fns';
import type { TaskWithId } from "../types/task"; // Relative
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"; // Relative
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"; // Relative
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from "recharts";
import { isTaskDueThisMonth, getDaysInCurrentMonth, isSameDate } from "../lib/date-utils"; // Relative
import { TrendingUp } from "lucide-react";

interface MonthlyProgressChartProps {
  tasks: TaskWithId[];
}

const chartConfig = {
  progress: {
    label: "Progress (%)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function MonthlyProgressChart({ tasks }: MonthlyProgressChartProps) {
  const chartData = React.useMemo(() => {
    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYear = getYear(today);
    const daysInMonth = getDaysInCurrentMonth();
    const todayDate = getDate(today);

    const relevantTasks = tasks.filter(
      (task) => isTaskDueThisMonth(task.dueDate) || task.isRecurring
    );

    const totalPossibleMonthlyWeight = relevantTasks.reduce(
      (sum, task) => sum + task.weight,
      0
    );

    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      // Logic to only show data up to today, or null for future days
      if (day > todayDate && !isSameDate(new Date(currentYear, currentMonth, day), today)) {
         data.push({ name: String(day), day, progress: null }); // Use null for future days not yet reached
         continue;
      }
      
      const currentDateIter = new Date(currentYear, currentMonth, day, 23, 59, 59); // End of day for comparison

      let cumulativeWeightCompleted = 0;
      relevantTasks.forEach((task) => {
        if (task.isCompleted && task.updatedAt) {
          const completedDate = parseISO(task.updatedAt);
          if (isValid(completedDate) && completedDate <= currentDateIter) {
            cumulativeWeightCompleted += task.weight;
          }
        }
      });
      
      const percentage =
        totalPossibleMonthlyWeight > 0
          ? (cumulativeWeightCompleted / totalPossibleMonthlyWeight) * 100
          : 0;
      
      data.push({ name: String(day), day, progress: Math.round(percentage) });
    }
    return data;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-muted-foreground text-center">No task data available for the chart.</p>
            </CardContent>
        </Card>
    );
  }
  
  const lastValidProgressPoint = [...chartData].reverse().find(d => d.progress !== null);

  return (
    <Card className="shadow-lg">
      <CardHeader className="py-3 px-4">
        <CardTitle className="font-headline text-lg flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Monthly Progress Trend
        </CardTitle>
        {lastValidProgressPoint && (
          <CardDescription className="text-xs">
            Current: {lastValidProgressPoint.progress}%
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-2 h-24">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 5,
              right: 5, 
              left: -25, 
              bottom: 0, 
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              padding={{ left: 10, right: 10 }} 
              interval="preserveStartEnd"
              height={15}
              tick={{fontSize: '10px'}}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={30} 
              tick={{fontSize: '10px'}}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="progress"
              type="monotone"
              stroke="var(--color-progress)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={chartConfig.progress.label}
              connectNulls={false} 
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
