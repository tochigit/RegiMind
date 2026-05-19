"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskCommentsProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Comment Item ────────────────────────────────────────────────

function CommentItem({ comment }: { comment: Comment }) {
  const initial = comment.authorName.charAt(0).toUpperCase();

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="size-8 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────

function CommentsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyComments() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
        <div className="relative flex size-12 items-center justify-center rounded-full bg-muted/80">
          <MessageCircle className="size-5 text-muted-foreground/50 animate-pulse float-in" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground/60 font-medium mt-3">
        No comments yet
      </p>
      <p className="text-xs text-muted-foreground/40 mt-1">
        Be the first to add a comment
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function TaskComments({ taskId, open, onOpenChange }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      console.error("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Fetch comments when dialog opens
  useEffect(() => {
    if (open) {
      setContent("");
      fetchComments();
    }
  }, [open, fetchComments]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (open && !loading) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, loading]);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);

    // Optimistic update
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      content: content.trim(),
      authorName: "Sarah Chen",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setContent("");

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimisticComment.content }),
      });

      if (res.ok) {
        const newComment = await res.json();
        // Replace optimistic comment with real one
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? newComment : c))
        );
      } else {
        // Remove optimistic comment on failure
        setComments((prev) =>
          prev.filter((c) => c.id !== optimisticComment.id)
        );
        toast.error("Failed to post comment");
      }
    } catch {
      setComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id)
      );
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[80vh]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">Task Comments</DialogTitle>
            {!loading && comments.length > 0 && (
              <Badge variant="secondary" className="text-[11px] h-5 min-w-[20px] font-semibold">
                {comments.length}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Add and view comments for this task
          </DialogDescription>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Comments List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto max-h-80 custom-scrollbar"
        >
          {loading ? (
            <CommentsSkeleton />
          ) : comments.length === 0 ? (
            <EmptyComments />
          ) : (
            <div className="divide-y divide-border/50">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>

        <Separator className="flex-shrink-0" />

        {/* Comment Input */}
        <div className="flex-shrink-0 pt-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none text-sm min-h-[44px] max-h-[120px]"
              disabled={submitting}
            />
            <Button
              size="icon"
              className={cn(
                "size-9 flex-shrink-0 rounded-lg",
                (!content.trim() || submitting) &&
                  "opacity-50"
              )}
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
            >
              <Send className="size-4" />
              <span className="sr-only">Send comment</span>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/50 mt-1.5">
            Press{" "}
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/50">
              ⌘↵
            </kbd>{" "}
            to send
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TaskComments;
