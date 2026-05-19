"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Clock,
  User,
  ShieldAlert,
  FileText,
  ScrollText,
  CheckCircle2,
  MessageSquare,
  PlusCircle,
  Pencil,
  Trash2,
  ListChecks,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Types ──────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  userName: string;
  entityType: string;
  entityId: string;
  details: string;
}

interface ActivityFeedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Icon mapping ───────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  "shield-alert": ShieldAlert,
  "check-circle": CheckCircle2,
  "check-circle-2": CheckCircle2,
  "scroll-text": ScrollText,
  "file-text": FileText,
  "message-square": MessageSquare,
  "plus-circle": PlusCircle,
  pencil: Pencil,
  "trash-2": Trash2,
  activity: Activity,
  listchecks: ListChecks,
};

const entityTypeConfig: Record<string, { label: string; badge: string }> = {
  assessment: {
    label: "Assessment",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  task: {
    label: "Task",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  regulation: {
    label: "Regulation",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  document: {
    label: "Document",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  comment: {
    label: "Comment",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
  checklist: {
    label: "Checklist",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

// ── Time grouping ──────────────────────────────────────────────

type TimeGroup = "Just now" | "Today" | "Yesterday" | "Earlier this week" | "Earlier";

function getTimeGroup(timestamp: string): TimeGroup {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 5) return "Just now";
  if (diffHours < 24 && date.getDate() === now.getDate()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate()) return "Yesterday";

  const dayOfWeek = date.getDay();
  const nowDayOfWeek = now.getDay();
  const daysDiff = nowDayOfWeek - dayOfWeek;
  if (daysDiff > 0 && daysDiff < 7) return "Earlier this week";

  return "Earlier";
}

// ── Skeleton loader ────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Activity Feed component ───────────────────────────────

export function ActivityFeed({ open, onOpenChange }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const data: ActivityItem[] = await res.json();
        setActivities(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchActivities();

      // Auto-refresh every 30 seconds
      intervalRef.current = setInterval(fetchActivities, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [open, fetchActivities]);

  const unreadCount = activities.filter((a) => !readIds.has(a.id)).length;

  const markAllRead = useCallback(() => {
    setReadIds(new Set(activities.map((a) => a.id)));
  }, [activities]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  }, []);

  // Group by time
  const grouped = (() => {
    const groups: Record<TimeGroup, ActivityItem[]> = {
      "Just now": [],
      Today: [],
      Yesterday: [],
      "Earlier this week": [],
      Earlier: [],
    };

    for (const item of activities) {
      const group = getTimeGroup(item.timestamp);
      groups[group].push(item);
    }

    // Only return groups with items, in order
    const result: Array<{ label: TimeGroup; items: ActivityItem[] }> = [];
    const order: TimeGroup[] = ["Just now", "Today", "Yesterday", "Earlier this week", "Earlier"];
    for (const label of order) {
      if (groups[label].length > 0) {
        result.push({ label, items: groups[label] });
      }
    }
    return result;
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-full sm:max-w-md">
        {/* Header with gradient */}
        <SheetHeader className="p-4 pb-3 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Activity className="size-4" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-sm">Team Activity</SheetTitle>
                <SheetDescription className="text-xs">
                  {unreadCount > 0
                    ? `${unreadCount} new ${unreadCount === 1 ? "item" : "items"}`
                    : "All caught up"}
                </SheetDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Activity list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ height: "calc(100vh - 80px)" }}>
          {loading ? (
            <div className="py-4">
              <ActivitySkeleton />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/5 blur-xl scale-150" />
                <Activity className="size-10 text-muted-foreground/30 relative float-in" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/70">No activity yet</p>
              <p className="text-xs text-muted-foreground/40 mt-1 max-w-[200px]">
                Team actions and updates will appear here as your team works across the platform.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {grouped.map((group) => (
                <div key={group.label}>
                  {/* Time group header */}
                  <div className="px-4 py-2 bg-muted/20 sticky top-0 z-10 border-l-2 border-l-primary/15">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3 text-muted-foreground/60" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">
                        ({group.items.length})
                      </span>
                    </div>
                  </div>

                  {/* Group items */}
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon] || Activity;
                    const entityConfig = entityTypeConfig[item.entityType] || {
                      label: item.entityType,
                      badge: "bg-muted text-muted-foreground",
                    };
                    const isRead = readIds.has(item.id);
                    const initials = item.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2);

                    return (
                      <button
                        key={item.id}
                        onClick={() => markRead(item.id)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 w-full text-left transition-colors inner-shadow glow-border rounded-lg",
                          "hover:bg-muted/30",
                          !isRead && "bg-primary/[0.02]"
                        )}
                      >
                        {/* Avatar */}
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                              className={cn(
                                "text-xs leading-snug",
                                !isRead ? "font-medium" : "text-muted-foreground"
                              )}
                            >
                              {item.message}
                            </p>
                            {!isRead && (
                              <span className="size-1.5 shrink-0 rounded-full bg-primary breathe" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-1.5 py-0 font-medium border-0",
                                entityConfig.badge
                              )}
                            >
                              {entityConfig.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                              <Clock className="size-2.5" />
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Activity icon */}
                        <div className="size-7 shrink-0 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground mt-0.5">
                          <Icon className="size-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Trigger button component ───────────────────────────────────

interface ActivityFeedTriggerProps {
  onClick: () => void;
  unreadCount: number;
}

export function ActivityFeedTrigger({ onClick, unreadCount }: ActivityFeedTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-9"
      onClick={onClick}
      aria-label={`Activity feed${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`}
    >
      <Activity className="size-4 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none badge-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
