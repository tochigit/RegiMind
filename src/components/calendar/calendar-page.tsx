"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Kanban,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn, formatRelativeTime } from "@/lib/utils";

// --- Types ---
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "regulation" | "task" | "assessment";
  color: string;
  meta: Record<string, unknown>;
}

interface CalendarSummary {
  regulations: number;
  tasksDue: number;
  tasksOverdue: number;
  assessmentsDone: number;
}

// --- Helpers ---
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventIcon(type: string) {
  switch (type) {
    case "regulation":
      return ScrollText;
    case "task":
      return Kanban;
    case "assessment":
      return ClipboardCheck;
    default:
      return CalendarDays;
  }
}

function getEventTypeBadge(type: string) {
  switch (type) {
    case "regulation":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "task":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "assessment":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "default" as const;
    case "low":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

// --- Main Component ---
export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary>({
    regulations: 0,
    tasksDue: 0,
    tasksOverdue: 0,
    assessmentsDone: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch calendar events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const month = format(currentMonth, "M");
        const year = format(currentMonth, "yyyy");
        const res = await fetch(`/api/calendar?month=${month}&year=${year}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setSummary(data.summary || { regulations: 0, tasksDue: 0, tasksOverdue: 0, assessmentsDone: 0 });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [currentMonth]);

  // Build calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Events grouped by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const key = format(new Date(e.date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate[key] || [];
  }, [selectedDate, eventsByDate]);

  // Upcoming deadlines (next 30 days from today)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const futureLimit = addDays(now, 30);
    return events
      .filter((e) => {
        const d = new Date(e.date);
        return d >= now && d <= futureLimit && (e.type === "task" || e.type === "regulation");
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8);
  }, [events]);

  const navigateMonth = useCallback(
    (direction: "prev" | "next") => {
      setCurrentMonth((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)));
      setSelectedDate(null);
    },
    []
  );

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  const dayCountdown = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = differenceInCalendarDays(d, new Date());
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `${diff}d left`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <CalendarDays className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Compliance Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Track regulation dates, task deadlines & assessments
            </p>
          </div>
        </div>
        <Button size="sm" onClick={goToToday} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 hover-lift">
          <CalendarDays className="size-3.5 mr-1.5" />
          Today
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        <StatCard
          icon={ScrollText}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
          iconColor="text-blue-600 dark:text-blue-400"
          label="Regulations"
          value={summary.regulations}
          sub="this month"
        />
        <StatCard
          icon={Kanban}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Tasks Due"
          value={summary.tasksDue}
          sub="this month"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-50 dark:bg-red-950/50"
          iconColor="text-red-600 dark:text-red-400"
          label="Overdue"
          value={summary.tasksOverdue}
          sub="need attention"
        />
        <StatCard
          icon={ClipboardCheck}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
          iconColor="text-violet-600 dark:text-violet-400"
          label="Assessments"
          value={summary.assessmentsDone}
          sub="completed"
        />
      </div>

      {/* Main Content: Calendar + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card className="card-depth focus-ring-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <CalendarSkeleton />
              ) : (
                <div className="space-y-1">
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const dayEvents = eventsByDate[dateKey] || [];
                      const inCurrentMonth = isSameMonth(day, currentMonth);
                      const today = isToday(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const hasEvents = dayEvents.length > 0;
                      const isUrgent = dayEvents.some(e => e.meta.isOverdue as boolean);

                      return (
                        <button
                          key={dateKey}
                          onClick={() => setSelectedDate(isSelected ? null : day)}
                          className={cn(
                            "relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-[68px] transition-all duration-150",
                            "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            !inCurrentMonth && "opacity-30 pointer-events-none",
                            isSelected && "bg-primary/10 ring-1 ring-primary/30",
                            today && !isSelected && "today-indicator",
                            hasEvents && !isSelected && !today && "calendar-day-with-events",
                            isUrgent && !isSelected && "bg-destructive/[0.03]"
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-medium leading-none mb-1",
                              today
                                ? "bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center"
                                : inCurrentMonth
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {/* Event dots */}
                          {hasEvents && (
                            <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5">
                              {dayEvents.slice(0, 3).map((event) => (
                                <span
                                  key={event.id}
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: event.color }}
                                  title={event.title}
                                />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[8px] text-muted-foreground leading-none">
                                  +{dayEvents.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Regulations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">High Priority</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Done / Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-violet-500" />
                  <span className="text-xs text-muted-foreground">Assessments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mini Event List - Upcoming Items */}
          <Card className="card-depth card-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {upcomingDeadlines.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="size-6 rounded" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))}
                </div>
              ) : upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingDeadlines.slice(0, 5).map((event) => {
                    const isOverdue = event.meta.isOverdue as boolean;
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-muted/50",
                          isOverdue && "bg-destructive/[0.03]"
                        )}
                      >
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isOverdue ? "bg-destructive" : "bg-primary"
                          )}
                        />
                        <span className="truncate flex-1 font-medium">{event.title}</span>
                        <span className={cn(
                          "text-[10px] font-medium shrink-0",
                          isOverdue ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {format(new Date(event.date), "MMM d")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Selected Date Details + Upcoming */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          <AnimatePresence mode="wait">
            {selectedDate ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="card-depth">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {format(selectedDate, "EEEE, MMM d")}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setSelectedDate(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedDateEvents.length === 0 ? (
                      <div className="py-6 text-center">
                        <CalendarDays className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No events on this date</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {selectedDateEvents.map((event) => {
                          const EventIcon = getEventIcon(event.type);
                          return (
                            <EventDetailItem key={event.id} event={event} icon={EventIcon} />
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="py-10">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-primary/5 blur-2xl" />
                      </div>
                      <div className="relative text-center">
                        <CalendarDays className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Select a date</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Click any day to see event details
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming Deadlines */}
          <Card className="card-depth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Upcoming Deadlines</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  Next 30 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="size-6 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All clear for the next 30 days</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {upcomingDeadlines.map((event) => {
                    const EventIcon = getEventIcon(event.type);
                    const isOverdue = event.meta.isOverdue as boolean;
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5",
                            event.type === "regulation"
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                              : isOverdue
                                ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                                : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          <EventIcon className="size-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-snug">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isOverdue ? "text-red-500" : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(event.date), "MMM d")}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                isOverdue
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              )}
                            >
                              {dayCountdown(event.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card className="card-depth">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center size-9 rounded-lg shrink-0", iconBg, iconColor)}>
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {label} <span className="text-muted-foreground/60">{sub}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventDetailItem({
  event,
  icon: Icon,
}: {
  event: CalendarEvent;
  icon: React.ElementType;
}) {
  const isOverdue = event.meta.isOverdue as boolean;
  const status = event.meta.status as string;
  const priority = event.meta.priority as string;

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div
        className="flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5"
        style={{ backgroundColor: event.color + "18", color: event.color }}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{event.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 border-0", getEventTypeBadge(event.type))}
          >
            {event.type}
          </Badge>
          {event.type === "task" && priority && (
            <Badge variant={getPriorityVariant(priority)} className="text-[10px] px-1.5 py-0">
              {priority}
            </Badge>
          )}
          {status && event.type !== "task" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {status}
            </Badge>
          )}
          {event.type === "task" && status !== "done" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {status}
            </Badge>
          )}
          {event.type === "assessment" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {event.meta.riskScore as string} risk
            </Badge>
          )}
        </div>
        {/* Meta info */}
        {event.type === "regulation" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {event.meta.source && <span>{event.meta.source as string}</span>}
            {event.meta.region && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span>{event.meta.region as string}</span>
              </>
            )}
          </div>
        )}
        {event.type === "assessment" && event.meta.gapDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {event.meta.gapDescription as string}
          </p>
        )}
        {event.type === "task" && isOverdue && (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle className="size-3" />
            <span>Overdue</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center">
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[68px] rounded-lg p-1.5">
            <Skeleton className="size-5 rounded-full mx-auto mb-1" />
            {i % 3 === 0 && (
              <div className="flex gap-0.5 justify-center mt-1">
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className="size-1.5 rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
