"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  GripVertical,
  CircleDot,
  Search,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Database,
  RotateCcw,
  Kanban,
  MessageSquare,
  Link2,
  X,
  GanttChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TagDisplay, TagManager } from "@/components/layout/tag-manager";

// ─── Types ───────────────────────────────────────────────────────────

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface DependencyInfo {
  id: string;
  type: string;
  task: { id: string; title: string; status: string };
}

interface TaskDependencies {
  blocking: DependencyInfo[];
  blockedBy: DependencyInfo[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string; // todo, in_review, done
  priority: string; // high, medium, low
  assigneeId: string | null;
  impactAssessmentId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  impactAssessment?: {
    id: string;
    regulation?: { title: string };
    document?: { title: string };
  };
  _count?: {
    comments: number;
  };
}

interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
}

const emptyFormData: TaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
};

// ─── Constants ───────────────────────────────────────────────────────

const COLUMNS: { id: string; label: string; headerBg: string; icon: React.ElementType; emptyBg: string; countBg: string; borderColor: string }[] = [
  {
    id: "todo",
    label: "To Do",
    headerBg: "bg-slate-50 dark:bg-slate-900/40",
    icon: CircleDot,
    emptyBg: "border-slate-200 dark:border-slate-700",
    countBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    borderColor: "border-l-slate",
  },
  {
    id: "in_review",
    label: "In Review",
    headerBg: "bg-amber-50/70 dark:bg-amber-950/20",
    icon: ArrowRight,
    emptyBg: "border-amber-200/60 dark:border-amber-800/40",
    countBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    borderColor: "border-l-amber",
  },
  {
    id: "done",
    label: "Done",
    headerBg: "bg-emerald-50/70 dark:bg-emerald-950/20",
    icon: CheckCircle2,
    emptyBg: "border-emerald-200/60 dark:border-emerald-800/40",
    countBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    borderColor: "border-l-emerald",
  },
];

const PRIORITY_STYLES: Record<string, { badge: string; dot: string }> = {
  high: {
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    dot: "bg-red-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  low: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
};

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

// ─── Priority Badge ──────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <Badge variant="outline" className={`text-[11px] px-1.5 py-0 font-medium ${style.badge}`}>
      <span className={`inline-block size-1.5 rounded-full ${style.dot} mr-1`} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onComment,
  currentTags,
  allTags,
  onUpdateTags,
  onCreateTag,
  dependencies,
  onRemoveDependency,
  onAddDependency,
  allTasks,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: string) => void;
  onComment: (task: Task) => void;
  currentTags?: Tag[];
  allTags?: Tag[];
  onUpdateTags?: (taskId: string, tagIds: string[]) => void;
  onCreateTag?: (name: string) => void;
  dependencies?: TaskDependencies;
  onRemoveDependency?: (taskId: string, depId: string) => void;
  onAddDependency?: (taskId: string, targetTaskId: string, type: "blocks" | "blocked_by") => void;
  allTasks?: Task[];
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const hasDependencies = dependencies && (
    (dependencies.blocking && dependencies.blocking.length > 0) ||
    (dependencies.blockedBy && dependencies.blockedBy.length > 0)
  );

  return (
    <Card className={`group relative card-depth transition-all duration-200 hover:shadow-md hover:border-border/80 border-border/50 group-hover:shadow-lg ${task.priority === "high" && task.status !== "done" ? "priority-glow-high" : task.priority === "medium" && task.status !== "done" ? "priority-glow-medium" : ""}`}>
      <CardContent className="p-3.5 space-y-2.5">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <GripVertical className="size-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0 drag-handle-pulse" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {hasDependencies && (
                <Link2 className="size-3 text-primary flex-shrink-0" />
              )}
              <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="size-3.5" />
                <span className="sr-only">Task actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onComment(task)}
                className="gap-2 text-xs"
              >
                <MessageSquare className="size-3" />
                Add Comment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(task)}
                className="gap-2 text-xs"
              >
                <Pencil className="size-3" />
                Edit Task
              </DropdownMenuItem>
              {STATUS_OPTIONS.filter((s) => s.value !== task.status).map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => onStatusChange(task, s.value)}
                  className="gap-2 text-xs"
                >
                  {s.value === "todo" && <CircleDot className="size-3" />}
                  {s.value === "in_review" && <ArrowRight className="size-3" />}
                  {s.value === "done" && <CheckCircle2 className="size-3" />}
                  Move to {s.label}
                </DropdownMenuItem>
              ))}
              <Separator className="my-1" />
              <DropdownMenuItem
                onClick={() => onDelete(task)}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row: regulation / doc */}
        {task.impactAssessment?.regulation && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5.5">
            <AlertCircle className="size-3 flex-shrink-0 text-amber-500" />
            <span className="truncate">{task.impactAssessment.regulation.title}</span>
          </div>
        )}
        {task.impactAssessment?.document && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5.5">
            <AlertCircle className="size-3 flex-shrink-0 text-blue-500" />
            <span className="truncate">{task.impactAssessment.document.title}</span>
          </div>
        )}

        {/* Footer row: priority + date */}
        <div className="flex items-center justify-between gap-2 pt-1 pl-5.5">
          <PriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
            >
              {isOverdue ? <AlertCircle className="size-3" /> : <Calendar className="size-3" />}
              {format(new Date(task.dueDate), "MMM d, yyyy")}
            </span>
          )}
        </div>

        {/* Created date + comment count */}
        <div className="flex items-center justify-between pl-5.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <Clock className="size-2.5" />
            Created {format(new Date(task.createdAt), "MMM d")}
          </div>
          {(task._count?.comments ?? 0) > 0 && (
            <button
              onClick={() => onComment(task)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors"
            >
              <MessageSquare className="size-2.5" />
              <span>{task._count!.comments}</span>
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="pl-5.5">
          {currentTags && currentTags.length > 0 && allTags && onUpdateTags && onCreateTag ? (
            <TagManager
              currentTags={currentTags}
              availableTags={allTags}
              onUpdate={(tagIds) => onUpdateTags(task.id, tagIds)}
              onCreateTag={onCreateTag}
              compact
            />
          ) : (
            <TagDisplay tags={currentTags || []} />
          )}
        </div>

        {/* Dependencies section */}
        <div className="pl-5.5 pt-1 border-t border-border/30 mt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Link2 className="size-3 text-muted-foreground/60" />
            <span className="text-[11px] font-medium text-muted-foreground/60">Dependencies</span>
          </div>

          {/* Blocking tasks (this task blocks them) */}
          {dependencies?.blocking && dependencies.blocking.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground/50 mr-1">blocks:</span>
              {dependencies.blocking.map((dep) => (
                <Badge
                  key={dep.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <span className="truncate max-w-[80px]">{dep.task.title}</span>
                  {onRemoveDependency && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDependency(task.id, dep.id);
                      }}
                      className="size-3 rounded-full hover:bg-primary/20 flex items-center justify-center"
                    >
                      <X className="size-2" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Blocked by tasks */}
          {dependencies?.blockedBy && dependencies.blockedBy.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground/50 mr-1">blocked by:</span>
              {dependencies.blockedBy.map((dep) => (
                <Badge
                  key={dep.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-1 border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                >
                  <span className="truncate max-w-[80px]">{dep.task.title}</span>
                  {onRemoveDependency && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDependency(task.id, dep.id);
                      }}
                      className="size-3 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800/50 flex items-center justify-center"
                    >
                      <X className="size-2" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Add dependency button */}
          {onAddDependency && allTasks && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-1.5 text-muted-foreground/60 hover:text-foreground gap-1"
                >
                  <Plus className="size-2.5" />
                  Add dependency
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground px-1 mb-1.5">Select a task to depend on</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-0.5">
                    {allTasks
                      .filter((t) => t.id !== task.id)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onAddDependency(task.id, t.id, "blocked_by")}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors truncate flex items-center gap-2"
                        >
                          <div className={`size-1.5 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-emerald-500" : t.status === "in_review" ? "bg-amber-500" : "bg-slate-400"}`} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {!hasDependencies && (
            <p className="text-[10px] text-muted-foreground/40">No dependencies</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Column Skeleton ─────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      <div className="space-y-2.5 p-1">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Empty Column ────────────────────────────────────────────────────

function EmptyColumn({ column }: { column: (typeof COLUMNS)[number] }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-lg ${column.emptyBg} transition-colors`}
    >
      <column.icon className="size-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground/60 font-medium">No tasks</p>
    </div>
  );
}

// ─── Task Form Dialog ────────────────────────────────────────────────

function TaskFormDialog({
  open,
  onOpenChange,
  title: dialogTitle,
  description: dialogDescription,
  formData,
  onFormDataChange,
  onSubmit,
  isEdit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formData: TaskFormData;
  onFormDataChange: (data: TaskFormData) => void;
  onSubmit: () => void;
  isEdit: boolean;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Enter task title..."
              value={formData.title}
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Describe the task..."
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => onFormDataChange({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => onFormDataChange({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-due">Due Date</Label>
            <Input
              id="task-due"
              type="date"
              value={formData.dueDate}
              onChange={(e) => onFormDataChange({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !formData.title.trim()}>
            {isLoading ? "Saving..." : isEdit ? "Update Task" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // View mode: board (kanban) or timeline
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, Tag[]>>({});
  const [expandedTagTask, setExpandedTagTask] = useState<string | null>(null);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Dependencies state
  const [taskDependencies, setTaskDependencies] = useState<Record<string, TaskDependencies>>({});

  // ─── Fetch Tasks ──────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchTaskTags = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setTaskTags((prev) => ({ ...prev, [taskId]: data }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUpdateTaskTags = async (taskId: string, tagIds: string[]) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setTaskTags((prev) => ({ ...prev, [taskId]: data }));
        toast.success("Tags updated");
        fetchTags();
      }
    } catch {
      toast.error("Failed to update tags");
    }
  };

  const handleCreateTag = async (name: string, _color?: string) => {
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newTag = await res.json();
        setAllTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Tag "${name}" created`);
      } else if (res.status === 409) {
        toast.error("A tag with this name already exists");
      }
    } catch {
      toast.error("Failed to create tag");
    }
  };

  // Fetch tags for all visible tasks on load
  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach((task) => {
        if (!taskTags[task.id]) {
          fetchTaskTags(task.id);
        }
      });
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
    fetchTags();
  }, [fetchTasks, fetchTags]);

  // ─── Dependencies ─────────────────────────────────────────────
  const fetchTaskDependencies = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`);
      if (res.ok) {
        const data = await res.json();
        setTaskDependencies((prev) => ({ ...prev, [taskId]: data }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch dependencies for all visible tasks on load
  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach((task) => {
        if (!taskDependencies[task.id]) {
          fetchTaskDependencies(task.id);
        }
      });
    }
  }, [tasks, fetchTaskDependencies]);

  const handleRemoveDependency = async (taskId: string, depId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies?dependencyId=${depId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Dependency removed");
        fetchTaskDependencies(taskId);
        // Also refresh any related tasks
        tasks.forEach((t) => {
          if (t.id !== taskId && taskDependencies[t.id]) {
            fetchTaskDependencies(t.id);
          }
        });
      }
    } catch {
      toast.error("Failed to remove dependency");
    }
  };

  const handleAddDependency = async (taskId: string, targetTaskId: string, type: "blocks" | "blocked_by") => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTaskId, type }),
      });
      if (res.ok) {
        toast.success("Dependency added");
        fetchTaskDependencies(taskId);
        fetchTaskDependencies(targetTaskId);
      } else if (res.status === 409) {
        toast.error("Dependency already exists");
      }
    } catch {
      toast.error("Failed to add dependency");
    }
  };

  // ─── Filtered Tasks ───────────────────────────────────────────
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery.trim() ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getTasksByStatus = (status: string) => filteredTasks.filter((t) => t.status === status);

  // ─── Create Task ──────────────────────────────────────────────
  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
        }),
      });
      if (res.ok) {
        toast.success("Task created successfully");
        setCreateOpen(false);
        setFormData(emptyFormData);
        fetchTasks();
      } else {
        toast.error("Failed to create task");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit Task ────────────────────────────────────────────────
  const handleEditOpen = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedTask || !formData.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          status: formData.status,
          dueDate: formData.dueDate || null,
        }),
      });
      if (res.ok) {
        toast.success("Task updated successfully");
        setEditOpen(false);
        setSelectedTask(null);
        setFormData(emptyFormData);
        fetchTasks();
      } else {
        toast.error("Failed to update task");
      }
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  // ─── Comment on Task ──────────────────────────────────────────
  const handleCommentOpen = (task: Task) => {
    setSelectedTask(task);
    setCommentOpen(true);
  };

  // ─── Delete Task ──────────────────────────────────────────────
  const handleDeleteOpen = (task: Task) => {
    setSelectedTask(task);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Task deleted successfully");
        setDeleteOpen(false);
        setSelectedTask(null);
        fetchTasks();
      } else {
        toast.error("Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setSaving(false);
    }
  };

  // ─── Quick Status Change ─────────────────────────────────────
  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const statusLabel = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus;
        toast.success(`Task moved to ${statusLabel}`);
        fetchTasks();
      } else {
        toast.error("Failed to update task status");
      }
    } catch {
      toast.error("Failed to update task status");
    }
  };

  // ─── Seed Data ────────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        toast.success("Demo data seeded successfully");
        setLoading(true);
        fetchTasks();
      } else {
        toast.error("Failed to seed data");
      }
    } catch {
      toast.error("Failed to seed data");
    }
  };

  // ─── Rendering ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            {viewMode === "board" ? <Kanban className="size-5 text-primary" /> : <GanttChart className="size-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage remediation tasks and track compliance progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors font-medium",
                viewMode === "board"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="size-3" />
              Board
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors font-medium",
                viewMode === "timeline"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GanttChart className="size-3" />
              Timeline
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasks}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormData(emptyFormData);
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No data / seed prompt */}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border-2 border-dashed border-border empty-pattern-bg">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
            <div className="relative flex size-14 items-center justify-center rounded-full bg-muted/80">
              <CircleDot className="size-6 text-muted-foreground/70 animate-pulse float-in" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create tasks manually or seed demo data to get started
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="outline"
              onClick={handleSeed}
              className="gap-2"
            >
              <Database className="size-4" />
              Seed Demo Data
            </Button>
            <Button
              onClick={() => {
                setFormData(emptyFormData);
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Create First Task
            </Button>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <TaskTimelineView
          tasks={filteredTasks.map((task) => ({
            ...task,
            dependencies: taskDependencies[task.id],
          }))}
          loading={loading}
        />
      )}

      {/* Kanban Board */}
      {viewMode === "board" && (loading || tasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            const ColIcon = column.icon;

            return (
              <div
                key={column.id}
                className={`flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden relative column-smooth-height ${column.id === "todo" ? "column-gradient-border column-gradient-border-slate" : column.id === "in_review" ? "column-gradient-border column-gradient-border-amber" : "column-gradient-border column-gradient-border-emerald"}`}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-l-3 ${column.borderColor} ${column.headerBg} border-b border-border/50`}>
                  <div className="flex items-center gap-2">
                    <ColIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{column.label}</h3>
                  </div>
                  <Badge variant="secondary" className={`text-[11px] h-5 min-w-[22px] flex items-center justify-center font-semibold ${column.countBg} ${!loading && columnTasks.length > 0 ? 'bg-gradient-to-r from-primary/10 to-primary/5 count-pop' : ''}`}>
                    {loading ? "..." : columnTasks.length}
                  </Badge>
                </div>

                {/* Column Body */}
                <div className="flex-1 p-2 min-h-[200px]">
                  {loading ? (
                    <div className="space-y-2.5">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-lg" />
                      ))}
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <EmptyColumn column={column} />
                  ) : (
                    <ScrollArea className="max-h-[calc(100vh-380px)]">
                      <div className="space-y-2.5 pb-2">
                        {columnTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEditOpen}
                            onDelete={handleDeleteOpen}
                            onStatusChange={handleStatusChange}
                            onComment={handleCommentOpen}
                            currentTags={taskTags[task.id]}
                            allTags={allTags}
                            onUpdateTags={handleUpdateTaskTags}
                            onCreateTag={handleCreateTag}
                            dependencies={taskDependencies[task.id]}
                            onRemoveDependency={handleRemoveDependency}
                            onAddDependency={handleAddDependency}
                            allTasks={tasks}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Add task button at bottom of To Do column */}
                {column.id === "todo" && !loading && (
                  <div className="px-2 pb-2 pt-1 border-t border-dashed border-muted-foreground/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground h-9 border border-dashed border-muted-foreground/40 rounded-md hover:border-primary/30 hover:bg-primary/[0.02]"
                      onClick={() => {
                        setFormData(emptyFormData);
                        setCreateOpen(true);
                      }}
                    >
                      <Plus className="size-3.5 text-muted-foreground/70" />
                      Add task
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create New Task"
        description="Add a new remediation task to your compliance workflow."
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleCreate}
        isEdit={false}
        isLoading={saving}
      />

      {/* Edit Task Dialog */}
      <TaskFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedTask(null);
        }}
        title="Edit Task"
        description="Update task details and status."
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleEditSave}
        isEdit={true}
        isLoading={saving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTask?.title}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Comments Dialog */}
      <TaskComments
        taskId={selectedTask?.id ?? ""}
        open={commentOpen}
        onOpenChange={setCommentOpen}
      />
    </div>
  );
}

export default TasksPage;
