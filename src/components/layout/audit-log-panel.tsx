"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Search,
  Clock,
  ShieldAlert,
  MessageSquare,
  Trash2,
  Pencil,
  Plus,
  FileText,
  ScrollText,
  Kanban,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface AuditLogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  userName: string;
  createdAt: string;
}

const entityFilters = [
  { key: "all", label: "All" },
  { key: "task", label: "Tasks" },
  { key: "assessment", label: "Assessments" },
  { key: "document", label: "Documents" },
  { key: "comment", label: "Comments" },
] as const;

type EntityFilter = (typeof entityFilters)[number]["key"];

function getActionConfig(action: string) {
  if (action.includes("created") || action.includes(".created")) {
    return {
      icon: Plus,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      label: "Created",
    };
  }
  if (action.includes("updated") || action.includes(".updated")) {
    return {
      icon: Pencil,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      label: "Updated",
    };
  }
  if (action.includes("deleted") || action.includes(".deleted")) {
    return {
      icon: Trash2,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/50",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      label: "Deleted",
    };
  }
  return {
    icon: ShieldAlert,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: action.split(".")[1] || "Action",
  };
}

function getEntityConfig(entity: string) {
  switch (entity) {
    case "task":
      return { icon: Kanban, label: "Task", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" };
    case "assessment":
      return { icon: ShieldAlert, label: "Assessment", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
    case "document":
      return { icon: FileText, label: "Document", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
    case "comment":
      return { icon: MessageSquare, label: "Comment", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" };
    case "regulation":
      return { icon: ScrollText, label: "Regulation", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" };
    default:
      return { icon: History, label: entity, badge: "bg-muted text-muted-foreground" };
  }
}

function getDescription(entry: AuditLogEntry): string {
  const actionConfig = getActionConfig(entry.action);
  const entityConfig = getEntityConfig(entry.entity);
  const verb = actionConfig.label.toLowerCase();

  try {
    const details = entry.details ? JSON.parse(entry.details) : {};
    const title = details.title || entry.entityId;
    return `${verb} ${entityConfig.label.toLowerCase()}: ${title}`;
  } catch {
    return `${verb} ${entityConfig.label.toLowerCase()} ${entry.entityId.substring(0, 8)}`;
  }
}

export function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const actionConfig = getActionConfig(entry.action);
  const entityConfig = getEntityConfig(entry.entity);
  const ActionIcon = actionConfig.icon;
  const EntityIcon = entityConfig.icon;
  const hasDetails = entry.details;
  let parsedDetails: Record<string, unknown> | null = null;

  try {
    parsedDetails = entry.details ? JSON.parse(entry.details) : null;
  } catch {
    // ignore
  }

  return (
    <div className="group px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5",
            actionConfig.bg,
            actionConfig.color
          )}
        >
          <ActionIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 font-medium", actionConfig.badge)}>
              {actionConfig.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium gap-1", entityConfig.badge, "border-0")}>
              <EntityIcon className="size-2.5" />
              {entityConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-foreground leading-snug">
            {getDescription(entry)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {entry.userName.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span>{entry.userName}</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{formatRelativeTime(entry.createdAt)}</span>
            </div>
          </div>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <span>Details</span>
            </button>
          )}
          {expanded && parsedDetails && (
            <div className="mt-1.5 p-2.5 rounded-lg bg-muted/50 border text-xs font-mono space-y-0.5 overflow-x-auto">
              {Object.entries(parsedDetails).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{key}:</span>
                  <span className="text-foreground break-all">
                    {typeof value === "string" && value.length > 80
                      ? value.substring(0, 80) + "..."
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-1 px-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="size-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogPanel({ open, onOpenChange }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<EntityFilter>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("entity", filter);
      params.set("limit", "50");
      params.set("offset", "0");
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((entry) => {
      const desc = getDescription(entry).toLowerCase();
      const action = entry.action.toLowerCase();
      const entity = entry.entity.toLowerCase();
      const userName = entry.userName.toLowerCase();
      return (
        desc.includes(q) ||
        action.includes(q) ||
        entity.includes(q) ||
        userName.includes(q)
      );
    });
  }, [logs, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
              <History className="size-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Audit Log</SheetTitle>
              <SheetDescription className="text-xs">
                Track all system actions and changes
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 pt-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {entityFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors font-medium",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Separator className="mt-3" />

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full custom-scrollbar">
            {loading ? (
              <div className="py-2">
                <AuditLogSkeleton />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center">
                <div className="relative inline-flex mb-4">
                  <div className="size-12 rounded-full bg-muted-foreground/5 blur-xl scale-150 absolute inset-0" />
                  <div className="relative size-12 rounded-full bg-muted/80 flex items-center justify-center">
                    <History className="size-5 text-muted-foreground/50 animate-pulse float-in" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {search ? "No matching audit entries" : "No audit entries yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {search
                    ? "Try a different search term"
                    : "Actions will appear here as you use the platform"}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filteredLogs.map((entry) => (
                  <AuditLogItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {logs.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Showing {filteredLogs.length} of {logs.length} entries
              </span>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AuditLogPanel;
