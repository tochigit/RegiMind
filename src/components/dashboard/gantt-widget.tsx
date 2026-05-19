"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { format, differenceInDays, addDays, startOfDay, isSameDay } from "date-fns";
import {
  GanttChart,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  dependencies: {
    blocking: string[];
    blockedBy: string[];
  };
}

const STATUS_BAR_COLORS: Record<string, string> = {
  todo: "bg-muted-foreground/25 border-muted-foreground/30",
  in_review: "bg-amber-400/70 border-amber-500/60",
  done: "bg-emerald-400/70 border-emerald-500/60",
};

const STATUS_BAR_TEXT: Record<string, string> = {
  todo: "text-muted-foreground",
  in_review: "text-amber-700 dark:text-amber-300",
  done: "text-emerald-700 dark:text-emerald-300",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_review: "In Review",
  done: "Done",
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

// ── Component ──────────────────────────────────────────────────

export function GanttWidget() {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks/gantt");
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // 30-day window from today
  const today = useMemo(() => startOfDay(new Date()), []);
  const windowStart = useMemo(() => addDays(today, -5), [today]);
  const windowEnd = useMemo(() => addDays(today, 25), [today]);
  const totalDays = useMemo(() => differenceInDays(windowEnd, windowStart), [windowStart, windowEnd]);

  // Filter tasks that have due dates within the window (or nearby)
  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate !== null)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 15); // Limit to 15 tasks for readability
  }, [tasks]);

  const getDatePosition = useCallback(
    (dateStr: string) => {
      const date = startOfDay(new Date(dateStr));
      const daysDiff = differenceInDays(date, windowStart);
      return Math.max(0, Math.min(100, (daysDiff / totalDays) * 100));
    },
    [windowStart, totalDays]
  );

  const getTodayPosition = useMemo(() => {
    return getDatePosition(today.toISOString());
  }, [today, getDatePosition]);

  // Generate date labels for the header
  const dateLabels = useMemo(() => {
    const labels: { date: Date; label: string; position: number }[] = [];
    for (let i = 0; i <= totalDays; i += 5) {
      const date = addDays(windowStart, i);
      labels.push({
        date,
        label: format(date, "MMM d"),
        position: (i / totalDays) * 100,
      });
    }
    return labels;
  }, [windowStart, totalDays]);

  // Stats
  const statusCounts = useMemo(() => {
    const counts = { todo: 0, in_review: 0, done: 0 };
    for (const t of visibleTasks) {
      if (counts[t.status as keyof typeof counts] !== undefined) {
        counts[t.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [visibleTasks]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-3 w-full mb-3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-28 shrink-0" />
                <Skeleton className="h-6 flex-1 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="slide-up card-depth">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GanttChart className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Gantt View</CardTitle>
                <CardDescription>
                  Task timeline ({visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""})
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-sm bg-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground">{statusCounts.todo}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-sm bg-amber-400/70" />
                <span className="text-[10px] text-muted-foreground">{statusCounts.in_review}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-sm bg-emerald-400/70" />
                <span className="text-[10px] text-muted-foreground">{statusCounts.done}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-muted-foreground/5 blur-lg scale-150" />
                <GanttChart className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
              </div>
              <p className="text-sm text-muted-foreground">No tasks with due dates</p>
              <p className="text-xs text-muted-foreground/60">
                Tasks with due dates will appear in the Gantt chart
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Date axis header */}
              <div className="relative h-6 mb-2">
                {/* Date labels */}
                {dateLabels.map((item, idx) => (
                  <div
                    key={idx}
                    className="absolute -translate-x-1/2 text-[10px] text-muted-foreground/60 font-medium"
                    style={{ left: `${item.position}%`, top: 0 }}
                  >
                    {item.label}
                  </div>
                ))}
                {/* Axis line */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-border" />
              </div>

              {/* Task rows */}
              <div className="space-y-1 relative">
                {/* Today marker line - spans full height */}
                <div
                  className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                  style={{ left: `${getTodayPosition}%` }}
                >
                  <div className="w-px h-full border-l border-dashed border-primary/60" />
                  {/* Today label */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Today
                    </span>
                  </div>
                </div>

                {visibleTasks.map((task) => {
                  const dueDate = task.dueDate!;
                  const pos = getDatePosition(dueDate);
                  const isOverdue = isSameDay(startOfDay(new Date(dueDate)), today) || new Date(dueDate) < today;
                  const isToday = isSameDay(startOfDay(new Date(dueDate)), today);

                  return (
                    <Tooltip key={task.id}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 h-8 group cursor-default">
                          {/* Task label */}
                          <div className="flex items-center gap-1.5 w-32 sm:w-40 shrink-0 min-w-0">
                            {/* Priority dot */}
                            <div
                              className={cn(
                                "size-1.5 rounded-full shrink-0",
                                PRIORITY_DOT_COLORS[task.priority] || "bg-muted"
                              )}
                            />
                            <span className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
                              {task.title}
                            </span>
                          </div>

                          {/* Gantt bar area */}
                          <div className="flex-1 relative h-7">
                            {/* Row background */}
                            <div className="absolute inset-x-0 h-full rounded-sm bg-muted/20 group-hover:bg-muted/40 transition-colors" />

                            {/* Task bar */}
                            <div
                              className={cn(
                                "absolute top-1 h-5 rounded-sm border transition-all group-hover:shadow-sm group-hover:scale-y-110 origin-center",
                                STATUS_BAR_COLORS[task.status] || "bg-muted",
                                isOverdue && task.status !== "done" && "ring-1 ring-destructive/30"
                              )}
                              style={{
                                left: `${Math.max(0, pos - 1.5)}%`,
                                width: "3%",
                              }}
                            >
                              {/* Done check indicator */}
                              {task.status === "done" && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[9px] font-bold leading-none">✓</span>
                                </div>
                              )}
                            </div>

                            {/* Overdue indicator */}
                            {isOverdue && task.status !== "done" && !isToday && (
                              <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 -translate-x-full pr-1">
                                <AlertTriangle className="size-3 text-destructive/60" />
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1 py-0",
                                STATUS_BAR_TEXT[task.status] || "text-muted-foreground"
                              )}
                            >
                              {STATUS_LABELS[task.status] || task.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 capitalize"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Due: {format(new Date(dueDate), "MMM d, yyyy")}
                          </p>
                          {isOverdue && task.status !== "done" && (
                            <p className="text-destructive font-medium">Overdue</p>
                          )}
                          {task.dependencies.blockedBy.length > 0 && (
                            <p className="text-muted-foreground">
                              Blocked by {task.dependencies.blockedBy.length} task{task.dependencies.blockedBy.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Time range label */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground/50">
                  {format(windowStart, "MMM d")}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  30-day window
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {format(windowEnd, "MMM d")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
