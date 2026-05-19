"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoryStats {
  category: string;
  total: number;
  completed: number;
  pending: number;
  percentage: number;
}

interface ChecklistData {
  items: ChecklistItem[];
  grouped: Record<string, ChecklistItem[]>;
  stats: { total: number; completed: number; pending: number; percentage: number };
  categoryStats: CategoryStats[];
}

interface RegulationChecklistProps {
  regulationId: string;
}

// ── Category colors ────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  "Quality System": "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
  "Design Controls": "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Risk Management": "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
  Labeling: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Clinical Evidence": "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

function getCategoryColor(category: string) {
  return categoryColors[category] || "text-muted-foreground bg-muted/50 border-border/50";
}

// ── Skeleton loader ────────────────────────────────────────────

function ChecklistSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
            <Skeleton className="size-5 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function RegulationChecklist({ regulationId }: RegulationChecklistProps) {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/regulations/${regulationId}/checklist`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Expand all categories by default
        const cats = new Set(json.categoryStats.map((c: CategoryStats) => c.category));
        setExpandedCategories(cats);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [regulationId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = useCallback(
    async (itemId: string, currentCompleted: boolean) => {
      // Optimistic update
      if (data) {
        const newItems = data.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isCompleted: !currentCompleted,
                completedAt: !currentCompleted ? new Date().toISOString() : null,
              }
            : item
        );
        const newGrouped: Record<string, ChecklistItem[]> = {};
        for (const item of newItems) {
          if (!newGrouped[item.category]) newGrouped[item.category] = [];
          newGrouped[item.category].push(item);
        }
        const completed = newItems.filter((i) => i.isCompleted).length;
        const total = newItems.length;
        setData({
          items: newItems,
          grouped: newGrouped,
          stats: {
            total,
            completed,
            pending: total - completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
          categoryStats: data.categoryStats.map((cs) => {
            const catItems = newGrouped[cs.category] || [];
            const catCompleted = catItems.filter((i) => i.isCompleted).length;
            return {
              ...cs,
              completed: catCompleted,
              pending: catItems.length - catCompleted,
              percentage:
                catItems.length > 0
                  ? Math.round((catCompleted / catItems.length) * 100)
                  : 0,
            };
          }),
        });
      }

      try {
        const res = await fetch(`/api/regulations/${regulationId}/checklist`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, isCompleted: !currentCompleted }),
        });
        if (!res.ok) {
          toast.error("Failed to update item");
          fetchChecklist(); // Revert
        }
      } catch {
        toast.error("Failed to update item");
        fetchChecklist(); // Revert
      }
    },
    [data, regulationId, fetchChecklist]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetch(
          `/api/regulations/${regulationId}/checklist?itemId=${itemId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          toast.success("Item removed");
          fetchChecklist();
        } else {
          toast.error("Failed to delete item");
        }
      } catch {
        toast.error("Failed to delete item");
      }
    },
    [regulationId, fetchChecklist]
  );

  const addNewItem = useCallback(
    async (category: string) => {
      if (!newItemTitle.trim()) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/regulations/${regulationId}/checklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newItemTitle.trim(),
            description: newItemDescription.trim() || undefined,
            category,
          }),
        });
        if (res.ok) {
          toast.success("Checklist item added");
          setNewItemTitle("");
          setNewItemDescription("");
          setAddingToCategory(null);
          fetchChecklist();
        } else {
          toast.error("Failed to add item");
        }
      } catch {
        toast.error("Failed to add item");
      } finally {
        setSubmitting(false);
      }
    },
    [regulationId, newItemTitle, newItemDescription, fetchChecklist]
  );

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Filter items
  const filteredGrouped = useMemo(() => {
    if (!data) return {};
    const result: Record<string, ChecklistItem[]> = {};
    for (const [category, items] of Object.entries(data.grouped)) {
      const filtered = items.filter((item) => {
        if (filter === "completed") return item.isCompleted;
        if (filter === "pending") return !item.isCompleted;
        return true;
      });
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }
    return result;
  }, [data, filter]);

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Compliance Checklist</CardTitle>
              <CardDescription>Loading checklist items...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChecklistSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.stats.total === 0) {
    return (
      <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Compliance Checklist</CardTitle>
              <CardDescription>No checklist items yet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-xl scale-150" />
              <ListChecks className="size-8 text-muted-foreground/40 relative" />
            </div>
            <p className="text-sm text-muted-foreground">
              Seed data to populate compliance checklist items
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="size-4" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Compliance Checklist</CardTitle>
            <CardDescription>
              {data.stats.completed} of {data.stats.total} requirements completed
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-sm font-bold tabular-nums px-2.5 py-1",
              data.stats.percentage === 100
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : data.stats.percentage >= 50
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                : "text-muted-foreground bg-muted/50"
            )}
          >
            {data.stats.percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress bar */}
        <div className="space-y-1.5">
          <Progress
            value={data.stats.percentage}
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{data.stats.completed} completed</span>
            <span>{data.stats.pending} remaining</span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {Object.values(filteredGrouped).flat().length} items shown
          </span>
        </div>

        {/* Category sections */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {Object.entries(filteredGrouped).map(([category, items]) => {
            const isExpanded = expandedCategories.has(category);
            const catStat = data.categoryStats.find((c) => c.category === category);
            const catCompleted = items.filter((i) => i.isCompleted).length;
            const catTotal = items.length;
            const catPercent = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

            return (
              <div
                key={category}
                className="rounded-lg border border-border/60 overflow-hidden"
              >
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-[11px] font-medium", getCategoryColor(category))}
                  >
                    {category}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {catCompleted}/{catTotal}
                  </span>
                  <div className="flex-1" />
                  {/* Mini progress indicator */}
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        catPercent === 100
                          ? "bg-emerald-500"
                          : catPercent >= 50
                          ? "bg-amber-500"
                          : "bg-primary/40"
                      )}
                      style={{ width: `${catPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums w-8 text-right">
                    {catPercent}%
                  </span>
                </button>

                {/* Category items */}
                {isExpanded && (
                  <div className="border-t border-border/40">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 transition-colors group/item checklist-row-hover",
                          "border-b border-border/20 last:border-b-0",
                          item.isCompleted && "opacity-70"
                        )}
                      >
                        <button
                          onClick={() => toggleItem(item.id, item.isCompleted)}
                          className="mt-0.5 shrink-0 transition-transform duration-200 hover:scale-110"
                          aria-label={
                            item.isCompleted
                              ? "Mark as incomplete"
                              : "Mark as complete"
                          }
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="size-5 text-emerald-500" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground/60 hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              item.isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 mt-0.5"
                          aria-label="Delete item"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground/50 hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    ))}

                    {/* Add new item form */}
                    {addingToCategory === category ? (
                      <div className="px-3 py-3 border-t border-border/30 bg-muted/10 space-y-2">
                        <Input
                          placeholder="Requirement title..."
                          value={newItemTitle}
                          onChange={(e) => setNewItemTitle(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newItemTitle.trim()) {
                              addNewItem(category);
                            }
                            if (e.key === "Escape") {
                              setAddingToCategory(null);
                              setNewItemTitle("");
                              setNewItemDescription("");
                            }
                          }}
                        />
                        <Input
                          placeholder="Description (optional)..."
                          value={newItemDescription}
                          onChange={(e) => setNewItemDescription(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setAddingToCategory(null);
                              setNewItemTitle("");
                              setNewItemDescription("");
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => addNewItem(category)}
                            disabled={!newItemTitle.trim() || submitting}
                          >
                            {submitting ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Plus className="size-3" />
                            )}
                            Add
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setAddingToCategory(null);
                              setNewItemTitle("");
                              setNewItemDescription("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToCategory(category)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full border-t border-border/20"
                      >
                        <Plus className="size-3.5" />
                        Add requirement
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
