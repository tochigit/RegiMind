"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  currentTags: Tag[];
  availableTags: Tag[];
  onUpdate: (tagIds: string[]) => void;
  maxTags?: number;
  onCreateTag?: (name: string, color?: string) => void;
  compact?: boolean;
}

export function TagManager({
  currentTags,
  availableTags,
  onUpdate,
  maxTags = 5,
  onCreateTag,
  compact = false,
}: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const remainingTags = availableTags.filter((t) => !currentTagIds.has(t.id));
  const canAdd = currentTags.length < maxTags;

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAdd = (tagId: string) => {
    if (!canAdd) return;
    onUpdate([...currentTagIds, tagId]);
  };

  const handleRemove = (tagId: string) => {
    onUpdate(currentTags.filter((t) => t.id !== tagId).map((t) => t.id));
  };

  const handleCreate = async () => {
    if (!newTagName.trim() || !onCreateTag) return;
    setIsCreating(true);
    try {
      await onCreateTag(newTagName.trim());
      setNewTagName("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagName.trim() && onCreateTag) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Current Tags */}
      {currentTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "text-[11px] px-2 py-0.5 gap-1 font-medium border-current/20 transition-all",
            compact ? "text-[10px] px-1.5 py-0" : ""
          )}
          style={{
            backgroundColor: `${tag.color}15`,
            color: tag.color,
            borderColor: `${tag.color}30`,
          }}
        >
          <span
            className="size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(tag.id);
            }}
            className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full size-3.5 flex items-center justify-center transition-colors"
          >
            <X className="size-2" />
          </button>
        </Badge>
      ))}

      {/* Add Tag Popover */}
      {canAdd && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1 h-6 text-muted-foreground hover:text-foreground",
                compact ? "h-5 text-[10px] px-1.5" : "text-xs px-2"
              )}
            >
              <Plus className={compact ? "size-2.5" : "size-3"} />
              {!compact && "Add tag"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {/* Create new tag */}
              {onCreateTag && (
                <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-border">
                  <Input
                    ref={inputRef}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="New tag name..."
                    className="h-7 text-xs"
                    disabled={isCreating}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newTagName.trim() || isCreating}
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    Add
                  </Button>
                </div>
              )}

              {/* Available tags */}
              {remainingTags.length > 0 ? (
                remainingTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAdd(tag.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/80 text-sm transition-colors text-left"
                  >
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </button>
                ))
              ) : (
                !onCreateTag && (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">
                    No more tags available
                  </p>
                )
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/** Simple tag display (read-only) for use in table cells, etc. */
export function TagDisplay({
  tags,
  max = 3,
}: {
  tags: Tag[];
  max?: number;
}) {
  if (tags.length === 0) return <span className="text-xs text-muted-foreground/50">—</span>;

  const visible = tags.slice(0, max);
  const remaining = tags.length - max;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="text-[10px] px-1.5 py-0 gap-1 font-medium border-current/20"
          style={{
            backgroundColor: `${tag.color}15`,
            color: tag.color,
            borderColor: `${tag.color}30`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </Badge>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-muted-foreground">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
