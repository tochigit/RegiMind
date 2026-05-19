"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { StickyNote, X, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatRelativeTime } from "@/lib/utils";

const STORAGE_KEY = "regimind:quick-notes";

interface NotesData {
  content: string;
  updatedAt: string | null;
}

function getStoredNotes(): NotesData {
  if (typeof window === "undefined") return { content: "", updatedAt: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { content: "", updatedAt: null };
    const parsed = JSON.parse(raw);
    return { content: parsed.content || "", updatedAt: parsed.updatedAt || null };
  } catch {
    return { content: "", updatedAt: null };
  }
}

function saveToStorage(content: string) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ content, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Storage full or unavailable
  }
}

interface QuickNotesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickNotes({ open, onOpenChange }: QuickNotesProps) {
  const [notesData, setNotesData] = useState<NotesData>(() => getStoredNotes());
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce
  const handleContentChange = (value: string) => {
    setNotesData((prev) => ({ ...prev, content: value }));
    setSaving(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      saveToStorage(value);
      setSaving(false);
    }, 500);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    setNotesData({ content: "", updatedAt: null });
    saveToStorage("");
  };

  const content = notesData.content;
  const updatedAt = notesData.updatedAt;
  const charCount = content.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <StickyNote className="size-4 text-primary" />
              </div>
              Quick Notes
            </SheetTitle>
            <SheetDescription className="text-xs">
              Jot down notes, ideas, and reminders. Auto-saved to browser.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {charCount.toLocaleString()} character{charCount !== 1 ? "s" : ""}
            </span>
            {saving && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                Saving...
              </Badge>
            )}
            {!saving && updatedAt && (
              <span className="text-[11px] text-muted-foreground/70">
                Last saved {formatRelativeTime(updatedAt)}
              </span>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                disabled={!content.trim()}
              >
                <Trash2 className="size-3" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all notes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your notes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear Notes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Textarea */}
        <div className="flex-1 overflow-hidden p-4">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start typing your notes here..."
            className="h-full min-h-[300px] resize-none text-sm leading-relaxed border-0 focus-visible:ring-0 bg-transparent p-0 custom-scrollbar"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface QuickNotesTriggerProps {
  onClick: () => void;
  hasContent?: boolean;
}

export function QuickNotesTrigger({ onClick, hasContent }: QuickNotesTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left"
    >
      <div className="relative">
        <StickyNote className="size-4" />
        {hasContent && (
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
        )}
      </div>
      <span className="truncate">Notes</span>
    </button>
  );
}
