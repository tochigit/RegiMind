"use client";

import React, { useMemo } from "react";
import { format, differenceInDays, addDays, startOfDay, isSameDay } from "date-fns";
import {
  Calendar,
  ArrowRight,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Link2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  impactAssessment?: {
    id: string;
    regulation?: { title: string };
  };
  dependencies?: {
    blocking: { id: string; task: { id: string; title: string; status: string } }[];
    blockedBy: { id: string; task: { id: string; title: string; status: string } }[];
  };
}

// ── Constants ──────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { bar: string; border: string; bg: string; text: string }> = {
  high: {
    bar: "bg-red-500/80",
    border: "border-red-400/50",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-600 dark:text-red-400",
  },
  medium: {
    bar: "bg-amber-500/80",
    border: "border-amber-400/50",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  low: {
    bar: "bg-emerald-500/80",
    border: "border-emerald-400/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

const STATUS_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  todo: { icon: CircleDot, color: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  in_review: { icon: ArrowRight, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/40" },
  done: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
};

// ── Helper: Calculate date range ───────────────────────────

function getDateRange(tasks: Task[]): { start: Date; end: Date; totalDays: number } {
  const today = startOfDay(new Date());

  let earliest = today;
  let latest = today;

  tasks.forEach((task) => {
    if (task.dueDate) {
      const due = startOfDay(new Date(task.dueDate));
      if (due < earliest) earliest = due;
      if (due > latest) latest = due;
    }
    const created = startOfDay(new Date(task.createdAt));
    if (created < earliest) earliest = created;
  });

  // Add 3 days padding on each side
  const start = addDays(earliest, -3);
  const end = addDays(latest, 5);
  const totalDays = differenceInDays(end, start) + 1;

  return { start, end, totalDays };
}

// ── Gantt Bar Component ───────────────────────────────────

function GanttBar({
  task,
  dateRange,
  colWidth,
  allTasks,
  rowY,
  svgHeight,
}: {
  task: Task;
  dateRange: { start: Date; end: Date; totalDays: number };
  colWidth: number;
  allTasks: Task[];
  rowY: number;
  svgHeight: number;
}) {
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, dateRange.start);

  // Bar positioning
  const createdOffset = differenceInDays(startOfDay(new Date(task.createdAt)), dateRange.start);
  let dueOffset = task.dueDate ? differenceInDays(startOfDay(new Date(task.dueDate)), dateRange.start) : createdOffset + 7;
  const barStart = Math.max(0, createdOffset);
  const barWidth = Math.max(colWidth, (dueOffset - createdOffset + 1) * colWidth);
  const barX = barStart * colWidth;

  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
  const StatusIcon = statusStyle.icon;

  const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.status !== "done";

  // Calculate dependencies line positions
  const deps = task.dependencies;
  const dependencyLines = React.useMemo(() => {
    if (!deps) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    // Draw lines for blocked-by dependencies
    deps.blockedBy?.forEach((dep) => {
      const depTask = allTasks.find((t) => t.id === dep.task.id);
      if (!depTask?.dueDate) return;
      const depDueOffset = differenceInDays(startOfDay(new Date(depTask.dueDate)), dateRange.start);
      lines.push({
        x1: (depDueOffset + 1) * colWidth,
        y1: 0, // Will be set by parent
        x2: barX,
        y2: 0, // Will be set by parent
      });
    });

    return lines;
  }, [deps, allTasks, dateRange.start, colWidth, barX]);

  return (
    <g className="group cursor-pointer">
      {/* Task bar background */}
      <rect
        x={barX}
        y={rowY + 6}
        width={barWidth}
        height={28}
        rx={6}
        fill="var(--card)"
        className={cn(
          "stroke-[1.5] transition-all duration-200 group-hover:opacity-100",
          priorityStyle.border,
          isOverdue && "opacity-70"
        )}
      />

      {/* Task bar fill (colored by priority) */}
      <rect
        x={barX}
        y={rowY + 6}
        width={barWidth}
        height={28}
        rx={6}
        className={cn(
          "transition-all duration-200 group-hover:opacity-100 opacity-80",
          priorityStyle.bar
        )}
      />

      {/* Done overlay stripe pattern */}
      {task.status === "done" && (
        <g>
          <defs>
            <pattern id={`stripe-${task.id}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
            </pattern>
          </defs>
          <rect
            x={barX}
            y={rowY + 6}
            width={barWidth}
            height={28}
            rx={6}
            fill={`url(#stripe-${task.id})`}
          />
        </g>
      )}

      {/* Task title text */}
      <text
        x={barX + 8}
        y={rowY + 24}
        fill="white"
        fontSize="11"
        fontWeight="500"
        className="pointer-events-none select-none"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
      >
        {task.title.length > 30 ? task.title.substring(0, 28) + "…" : task.title}
      </text>

      {/* Status icon on bar */}
      <foreignObject
        x={barX + barWidth - 22}
        y={rowY + 10}
        width={16}
        height={16}
        className="pointer-events-none"
      >
        <StatusIcon className={cn("size-3.5 text-white/80")} />
      </foreignObject>

      {/* Due date marker dot */}
      {task.dueDate && (
        <circle
          cx={dueOffset * colWidth + colWidth / 2}
          cy={rowY + 40}
          r={3}
          className={cn(
            "transition-opacity opacity-0 group-hover:opacity-100",
            isOverdue ? "fill-red-500" : "fill-muted-foreground"
          )}
        />
      )}

      {/* Overdue indicator */}
      {isOverdue && (
        <circle
          cx={barX - 6}
          cy={rowY + 20}
          r={5}
          fill="var(--destructive)"
          className="animate-pulse"
        />
      )}

      {/* Dependency connector lines */}
      {deps?.blockedBy && deps.blockedBy.length > 0 && (
        <g className="opacity-40 group-hover:opacity-80 transition-opacity">
          {deps.blockedBy.map((dep) => {
            const depTask = allTasks.find((t) => t.id === dep.task.id);
            if (!depTask?.dueDate) return null;
            const depDueOffset = differenceInDays(startOfDay(new Date(depTask.dueDate)), dateRange.start);
            const fromX = (depDueOffset + 1) * colWidth;
            const fromY = rowY - 14;
            const toX = barX;
            const toY = rowY + 20;

            return (
              <g key={dep.id}>
                <path
                  d={`M ${fromX} ${fromY} C ${fromX} ${toY}, ${toX} ${fromY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="transition-all duration-200"
                />
                <circle cx={toX} cy={toY} r={2.5} fill="var(--primary)" />
              </g>
            );
          })}
        </g>
      )}

      {/* Hover tooltip area */}
      <rect
        x={barX}
        y={rowY + 4}
        width={barWidth}
        height={32}
        rx={6}
        fill="transparent"
        className="cursor-pointer"
      />
    </g>
  );
}

// ── Task Row with label ────────────────────────────────────

function TaskRow({
  task,
  index,
  allTasks,
  dateRange,
  totalDays,
  colWidth,
}: {
  task: Task;
  index: number;
  allTasks: Task[];
  dateRange: { start: Date; end: Date; totalDays: number };
  totalDays: number;
  colWidth: number;
}) {
  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
  const StatusIcon = statusStyle.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const rowHeight = 48;
  const rowY = index * rowHeight;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center group hover:bg-muted/30 transition-colors" style={{ height: `${rowHeight}px` }}>
        {/* Task label */}
        <div className="w-52 shrink-0 flex items-center gap-2 px-3 border-r border-border/50">
          <StatusIcon className={cn("size-3.5 shrink-0", statusStyle.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-xs font-medium truncate",
              task.status === "done" && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("text-[10px]", priorityStyle.text)}>
                {task.priority}
              </span>
              {task.dueDate && (
                <>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                  )}>
                    {isOverdue && <AlertCircle className="size-2.5" />}
                    {format(new Date(task.dueDate), "MMM d")}
                  </span>
                </>
              )}
              {task.dependencies && (
                task.dependencies.blockedBy.length > 0 || task.dependencies.blocking.length > 0
              ) && (
                <>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <Link2 className="size-2.5 text-primary/60" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Timeline area */}
        <div className="flex-1 relative overflow-hidden" style={{ minWidth: totalDays * colWidth }}>
          <svg
            width={totalDays * colWidth}
            height={rowHeight}
            className="block"
          >
            <GanttBar
              task={task}
              dateRange={dateRange}
              colWidth={colWidth}
              allTasks={allTasks}
              rowY={rowY - (rowHeight - 28) / 2 + 2}
              svgHeight={rowHeight}
            />
          </svg>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Date Header Row ────────────────────────────────────────

function DateHeader({
  dateRange,
  totalDays,
  colWidth,
}: {
  dateRange: { start: Date; end: Date; totalDays: number };
  totalDays: number;
  colWidth: number;
}) {
  const today = startOfDay(new Date());

  return (
    <div className="flex items-center border-b border-border/50 bg-muted/20">
      <div className="w-52 shrink-0 px-3">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Task</span>
      </div>
      <div className="flex-1 relative" style={{ minWidth: totalDays * colWidth }}>
        {Array.from({ length: totalDays }).map((_, i) => {
          const date = addDays(dateRange.start, i);
          const isToday = isSameDay(date, today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const dayOfMonth = date.getDate();
          const showLabel = dayOfMonth === 1 || dayOfMonth === 15 || i === 0;

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-end shrink-0 border-l border-border/20 pb-1",
                isToday && "bg-primary/5",
                isWeekend && "bg-muted/10"
              )}
              style={{ width: `${colWidth}px`, height: "32px" }}
            >
              {showLabel && (
                <span className={cn(
                  "text-[9px] font-medium leading-none",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(date, "MMM d")}
                </span>
              )}
              {!showLabel && (
                <span className={cn(
                  "text-[8px] leading-none",
                  isToday ? "text-primary font-bold" : "text-muted-foreground/40"
                )}>
                  {dayOfMonth}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Today Marker ───────────────────────────────────────────

function TodayMarker({
  dateRange,
  totalDays,
  colWidth,
  totalHeight,
}: {
  dateRange: { start: Date; end: Date; totalDays: number };
  totalDays: number;
  colWidth: number;
  totalHeight: number;
}) {
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, dateRange.start);

  if (todayOffset < 0 || todayOffset >= totalDays) return null;

  const x = todayOffset * colWidth + colWidth / 2;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-10"
      style={{ left: `${x}px`, transform: "translateX(-50%)" }}
    >
      {/* Today line */}
      <div className="w-px h-full bg-primary/60 mx-auto" />
      {/* Today dot at top */}
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="relative flex size-2.5">
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
          <span className="relative rounded-full size-2.5 bg-primary border-2 border-background" />
        </div>
        <span className="text-[8px] font-bold text-primary mt-0.5 bg-background px-1 rounded">Today</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function TaskTimelineView({
  tasks,
  loading,
}: {
  tasks: Task[];
  loading: boolean;
}) {
  const colWidth = 36; // pixels per day

  // Sort tasks: in_progress first, then by due date
  const sortedTasks = useMemo(() => {
    const statusOrder: Record<string, number> = { in_review: 0, todo: 1, done: 2 };
    return [...tasks].sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const prioDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (prioDiff !== 0) return prioDiff;
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [tasks]);

  const dateRange = useMemo(
    () => getDateRange(sortedTasks),
    [sortedTasks]
  );

  const rowHeight = 48;
  const totalContentHeight = sortedTasks.length * rowHeight;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-52 h-8 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedTasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-lg scale-150" />
            <Calendar className="relative size-8 text-muted-foreground/40 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No tasks to display</p>
          <p className="text-xs text-muted-foreground/60">Create tasks with due dates to see the timeline</p>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    total: sortedTasks.length,
    done: sortedTasks.filter((t) => t.status === "done").length,
    overdue: sortedTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
  };

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">{stats.total}</span> tasks
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{stats.done}</span> done
        </span>
        {stats.overdue > 0 && (
          <span className="flex items-center gap-1.5">
            <AlertCircle className="size-3 text-red-500" />
            <span className="font-medium text-red-600 dark:text-red-400">{stats.overdue}</span> overdue
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          {Object.entries(PRIORITY_COLORS).map(([key, style]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-full", style.bar)} />
              <span className="text-[10px] capitalize">{key}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Timeline container */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Date header */}
          <DateHeader
            dateRange={dateRange}
            totalDays={dateRange.totalDays}
            colWidth={colWidth}
          />

          {/* Task rows with scroll */}
          <ScrollArea className="max-h-[calc(100vh-400px)]">
            <div className="relative">
              {/* Today marker */}
              <TodayMarker
                dateRange={dateRange}
                totalDays={dateRange.totalDays}
                colWidth={colWidth}
                totalHeight={totalContentHeight}
              />

              {/* Task rows */}
              <div className="divide-y divide-border/30">
                {sortedTasks.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    allTasks={sortedTasks}
                    dateRange={dateRange}
                    totalDays={dateRange.totalDays}
                    colWidth={colWidth}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}
