"use client";

import React, { useEffect, useState, useMemo } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  ShieldAlert,
  Kanban,
  ScrollText,
  FileText,
  History,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  type: "assessment" | "task" | "regulation" | "document" | "audit";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

type FilterType = "all" | "assessment" | "task" | "regulation" | "document" | "audit";

// ─── Config ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    badge: string;
    dotColor: string;
    lineColor: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
  }
> = {
  assessment: {
    label: "Assessment",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dotColor: "bg-amber-500",
    lineColor: "bg-amber-400/30",
    icon: ShieldAlert,
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  task: {
    label: "Task",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    dotColor: "bg-violet-500",
    lineColor: "bg-violet-400/30",
    icon: Kanban,
    iconBg: "bg-violet-50 dark:bg-violet-950/50",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  regulation: {
    label: "Regulation",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    dotColor: "bg-teal-500",
    lineColor: "bg-teal-400/30",
    icon: ScrollText,
    iconBg: "bg-teal-50 dark:bg-teal-950/50",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  document: {
    label: "Document",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    dotColor: "bg-orange-500",
    lineColor: "bg-orange-400/30",
    icon: FileText,
    iconBg: "bg-orange-50 dark:bg-orange-950/50",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  audit: {
    label: "Audit",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
    dotColor: "bg-gray-400",
    lineColor: "bg-gray-400/30",
    icon: History,
    iconBg: "bg-gray-50 dark:bg-gray-900/50",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "assessment", label: "Assessments" },
  { value: "task", label: "Tasks" },
  { value: "regulation", label: "Regulations" },
  { value: "document", label: "Documents" },
  { value: "audit", label: "Audit" },
];

// ─── Skeleton ─────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 md:gap-6 py-4">
          <div className="flex flex-col items-center flex-shrink-0 w-6">
            <Skeleton className="size-3 rounded-full" />
            <Skeleton className="flex-1 w-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 empty-pattern-bg rounded-xl">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-muted/80">
          <GitBranch className="size-6 text-muted-foreground/70 float-in" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">
          {hasFilter ? "No matching entries" : "No timeline entries yet"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilter
            ? "Try adjusting your filter to see more entries"
            : "Timeline entries will appear as you work with regulations, tasks, and documents"}
        </p>
      </div>
    </div>
  );
}

// ─── Timeline Entry Card ──────────────────────────────────────────

function TimelineEntryCard({
  entry,
  index,
  isLast,
  isLeft,
}: {
  entry: TimelineEntry;
  index: number;
  isLast: boolean;
  isLeft: boolean;
}) {
  const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.audit;
  const Icon = config.icon;
  const date = new Date(entry.timestamp);

  return (
    <div
      className="slide-up relative flex gap-4 md:gap-6 py-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center flex-shrink-0 w-6">
        <div
          className={cn(
            "size-3 rounded-full ring-4 ring-background z-10 flex-shrink-0",
            config.dotColor,
            index === 0 && "timeline-live-dot"
          )}
        />
        {!isLast && (
          <div className={cn("flex-1 w-0.5 min-h-[2rem] timeline-gradient-line timeline-line-grow", config.lineColor)} style={{ animationDelay: `${index * 60 + 200}ms` }} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", isLeft ? "md:pr-12" : "md:pl-12")}>
        {/* Date label - styled with pill background */}
        <div
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full mb-1.5 inline-flex items-center gap-1.5",
            isLeft ? "md:text-right" : "md:text-left",
            "bg-muted/60 text-muted-foreground"
          )}
        >
          <span className="md:hidden">{format(date, "MMM d, yyyy h:mm a")}</span>
          <span className="hidden md:inline">
            {format(date, "MMM d, yyyy · h:mm a")}
          </span>
        </div>

        <Card className="card-depth border-border/50 overflow-hidden">
          <CardContent className="p-3.5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex items-center justify-center size-8 rounded-lg shrink-0",
                  config.iconBg,
                  config.iconColor
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-medium border-0",
                      config.badge
                    )}
                  >
                    {config.label}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug truncate">
                  {entry.title}
                </p>
                {entry.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      try {
        const res = await fetch("/api/timeline");
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, []);

  const filteredEntries = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  // Count entries by type
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      c[e.type] = (c[e.type] || 0) + 1;
    }
    return c;
  }, [entries]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <GitBranch className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Chronological view of all regulatory activities and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5" />
            <span>
              {filteredEntries.length} of {entries.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map((f) => {
          const count = counts[f.value] || 0;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-all font-medium flex items-center gap-1.5",
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-[10px] min-w-[18px] text-center rounded-full px-1",
                  filter === f.value
                    ? "bg-primary-foreground/20"
                    : "bg-background/60"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Animated gradient separator */}
      <div className="animated-separator-h mb-4" />
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("size-2 rounded-full", cfg.dotColor)} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Header gradient separator */}
      <div className="header-gradient-line -mt-1 mb-4" />

      {/* Timeline */}
      <div className="relative">
        {loading ? (
          <TimelineSkeleton />
        ) : filteredEntries.length === 0 ? (
          <EmptyState hasFilter={filter !== "all"} />
        ) : (
          <div className="relative">
            {filteredEntries.map((entry, index) => {
              /* Show a "now" pulse separator after the first 3 entries to denote recent activity boundary */
              const showNowMarker = index === Math.min(3, filteredEntries.length - 1);
              const isLastEntry = index === filteredEntries.length - 1;
              return (
                <React.Fragment key={entry.id}>
                  <TimelineEntryCard
                    entry={entry}
                    index={index}
                    isLast={isLastEntry}
                    isLeft={index % 2 === 0}
                  />
                  {showNowMarker && !isLastEntry && (
                    <div className="flex items-center gap-3 py-2 px-1 now-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Now</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelinePage;
