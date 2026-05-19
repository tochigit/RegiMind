"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  ShieldAlert,
  Kanban,
  CalendarDays,
  History,
  Settings,
  Search,
  ArrowRight,
  GitBranch,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppPage } from "@/components/layout/app-sidebar";

interface KeyboardShortcutsProps {
  onNavigate: (page: AppPage) => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: "regulation" | "document" | "task";
  source?: string;
  region?: string;
  docType?: string;
  priority?: string;
  status?: string;
}

const navPages: {
  page: AppPage;
  label: string;
  description: string;
  icon: React.ElementType;
  shortcut: number | null;
}[] = [
  {
    page: "dashboard",
    label: "Dashboard",
    description: "Compliance overview & health score",
    icon: LayoutDashboard,
    shortcut: 1,
  },
  {
    page: "regulations",
    label: "Regulations",
    description: "Regulatory feed & tracking",
    icon: ScrollText,
    shortcut: 2,
  },
  {
    page: "documents",
    label: "Documents",
    description: "Internal document library",
    icon: FileText,
    shortcut: 3,
  },
  {
    page: "war-room",
    label: "War Room",
    description: "Impact assessment engine",
    icon: ShieldAlert,
    shortcut: 4,
  },
  {
    page: "tasks",
    label: "Tasks",
    description: "Remediation board",
    icon: Kanban,
    shortcut: 5,
  },
  {
    page: "audit-log",
    label: "Audit Log",
    description: "System activity tracking",
    icon: History,
    shortcut: 6,
  },
  {
    page: "calendar",
    label: "Calendar",
    description: "Compliance calendar & deadlines",
    icon: CalendarDays,
    shortcut: 7,
  },
  {
    page: "timeline",
    label: "Timeline",
    description: "Activity timeline & events",
    icon: GitBranch,
    shortcut: 10,
  },
  {
    page: "reports",
    label: "Reports",
    description: "Compliance reports & analytics",
    icon: BarChart3,
    shortcut: 11,
  },
  {
    page: "settings",
    label: "Settings",
    description: "Profile & preferences",
    icon: Settings,
    shortcut: null,
  },
];

function getModKey() {
  if (typeof navigator !== "undefined") {
    return navigator.platform?.toUpperCase().includes("MAC")
      ? "⌘"
      : "⌃";
  }
  return "⌘";
}

function getSearchResultIcon(type: string) {
  switch (type) {
    case "regulation": return ScrollText;
    case "document": return FileText;
    case "task": return Kanban;
    default: return Search;
  }
}

function getSearchResultBadge(type: string) {
  switch (type) {
    case "regulation": return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
    case "document": return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
    case "task": return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    default: return "bg-muted text-muted-foreground";
  }
}

function getSearchResultSubtitle(result: SearchResult): string {
  switch (result.type) {
    case "regulation": return result.source || "";
    case "document": return result.docType || "";
    case "task": return result.priority ? `${result.priority} priority` : "";
    default: return "";
  }
}

function getSearchResultTarget(result: SearchResult): AppPage {
  switch (result.type) {
    case "regulation": return "regulations";
    case "document": return "documents";
    case "task": return "tasks";
    default: return "dashboard";
  }
}

export function KeyboardShortcuts({ onNavigate }: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<{
    regulations: SearchResult[];
    documents: SearchResult[];
    tasks: SearchResult[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const modKey = getModKey();

  // Filter page shortcuts by search
  const filteredPages = useMemo(() => {
    if (search.length <= 2) return navPages;
    return navPages.filter(
      (p) =>
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Build flat list for navigation: search results first, then pages
  const flatItems = useMemo(() => {
    const items: Array<{ type: "search"; result: SearchResult } | { type: "page"; page: typeof navPages[number] }> = [];

    if (searchResults) {
      if (searchResults.regulations.length > 0) {
        searchResults.regulations.forEach((r) => items.push({ type: "search", result: { ...r, type: "regulation" } }));
      }
      if (searchResults.documents.length > 0) {
        searchResults.documents.forEach((d) => items.push({ type: "search", result: { ...d, type: "document" } }));
      }
      if (searchResults.tasks.length > 0) {
        searchResults.tasks.forEach((t) => items.push({ type: "search", result: { ...t, type: "task" } }));
      }
    }

    if (search.length <= 2) {
      filteredPages.forEach((p) => items.push({ type: "page", page: p }));
    }

    return items;
  }, [searchResults, filteredPages, search.length]);

  // Debounced search
  useEffect(() => {
    if (search.length > 2) {
      setSearchLoading(true);
      setSearchResults(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch {
          // ignore
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    } else {
      setSearchResults(null);
      setSearchLoading(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems.length]);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSearchResults(null);
      setSearchLoading(false);
    }
  }, [open]);

  const handleNavigate = useCallback(
    (page: AppPage) => {
      onNavigate(page);
      setOpen(false);
    },
    [onNavigate]
  );

  const handleSearchResultClick = useCallback(
    (result: SearchResult) => {
      const targetPage = getSearchResultTarget(result);
      handleNavigate(targetPage);
      // Dispatch custom event so pages can react (e.g., open detail dialog)
      window.dispatchEvent(
        new CustomEvent("regimind:select-entity", {
          detail: { type: result.type, id: result.id },
        })
      );
    },
    [handleNavigate]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 11) {
          e.preventDefault();
          const target = navPages.find((p) => p.shortcut === num);
          if (target) {
            handleNavigate(target.page);
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigate]);

  // Keyboard navigation within dialog
  function handleDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) {
        if (item.type === "search") {
          handleSearchResultClick(item.result);
        } else {
          handleNavigate(item.page.page);
        }
      }
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (open && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-nav-item]");
      const selectedEl = items[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, open]);

  const totalSearchResults = searchResults
    ? searchResults.regulations.length + searchResults.documents.length + searchResults.tasks.length
    : 0;

  const hasResults = totalSearchResults > 0 || filteredPages.length > 0;
  const isSearching = search.length > 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Navigate or search</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, regulations, documents, and tasks
          </DialogDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search pages, regulations, documents, tasks..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              onKeyDown={handleDialogKeyDown}
              className="pl-9 h-11 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:z-10 bg-transparent text-base"
            />
          </div>
        </DialogHeader>

        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto py-1 custom-scrollbar"
        >
          {/* Loading state */}
          {searchLoading && (
            <div className="px-4 py-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground px-2 mb-2">Searching...</div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!searchLoading && !hasResults && (
            <div className="py-12 text-center">
              <Search className="size-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{search}&rdquo;
              </p>
            </div>
          )}

          {/* Search results grouped by entity */}
          {!searchLoading && isSearching && searchResults && totalSearchResults > 0 && (
            <div className="space-y-0">
              {searchResults.regulations.length > 0 && (
                <SearchSection
                  title="Regulations"
                  icon={ScrollText}
                  results={searchResults.regulations}
                  selectedIndex={selectedIndex}
                  flatOffset={0}
                  onSelect={handleSearchResultClick}
                />
              )}
              {searchResults.documents.length > 0 && (
                <SearchSection
                  title="Documents"
                  icon={FileText}
                  results={searchResults.documents}
                  selectedIndex={selectedIndex}
                  flatOffset={searchResults.regulations.length}
                  onSelect={handleSearchResultClick}
                />
              )}
              {searchResults.tasks.length > 0 && (
                <SearchSection
                  title="Tasks"
                  icon={Kanban}
                  results={searchResults.tasks}
                  selectedIndex={selectedIndex}
                  flatOffset={searchResults.regulations.length + searchResults.documents.length}
                  onSelect={handleSearchResultClick}
                />
              )}
            </div>
          )}

          {/* Page shortcuts section */}
          {!searchLoading && filteredPages.length > 0 && (
            <div>
              {isSearching && totalSearchResults > 0 && (
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Pages
                  </span>
                </div>
              )}
              {filteredPages.map((item, index) => {
                const flatIdx = isSearching
                  ? totalSearchResults + index
                  : index;
                const Icon = item.icon;
                const isSelected = flatIdx === selectedIndex;
                return (
                  <button
                    key={item.page}
                    data-nav-item
                    onClick={() => handleNavigate(item.page)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-9 rounded-md shrink-0",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                    {item.shortcut !== null && (
                      <kbd
                        className={cn(
                          "text-[11px] font-mono bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 shrink-0",
                          isSelected && "border-primary/20 bg-primary/5 text-primary"
                        )}
                      >
                        {modKey}{item.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-muted rounded border px-1 py-0.5">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-muted rounded border px-1 py-0.5">↵</kbd>
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="font-mono bg-muted rounded border px-1 py-0.5">esc</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchSection({
  title,
  icon: SectionIcon,
  results,
  selectedIndex,
  flatOffset,
  onSelect,
}: {
  title: string;
  icon: React.ElementType;
  results: SearchResult[];
  selectedIndex: number;
  flatOffset: number;
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <SectionIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      {results.map((result, index) => {
        const flatIdx = flatOffset + index;
        const isSelected = flatIdx === selectedIndex;
        const ResultIcon = getSearchResultIcon(result.type);
        const badgeClass = getSearchResultBadge(result.type);
        const subtitle = getSearchResultSubtitle(result);

        return (
          <button
            key={`${result.type}-${result.id}`}
            data-nav-item
            onClick={() => onSelect(result)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center size-9 rounded-md shrink-0",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ResultIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {result.title}
              </div>
              {subtitle && (
                <div className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", badgeClass)}>
                {result.type}
              </Badge>
              <ArrowRight className="size-3 text-muted-foreground/50" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Small "⌘K" badge to show in the header */
export function ShortcutHint() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: navigator.platform?.toUpperCase().includes("MAC"),
            ctrlKey: !navigator.platform?.toUpperCase().includes("MAC"),
            bubbles: true,
          })
        );
      }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md border border-border/50 px-1.5 py-0.5 hover:bg-accent/50 cursor-pointer"
      title="Search pages..."
    >
      <span className="text-[11px] font-mono">
        {getModKey()}K
      </span>
    </button>
  );
}

export default KeyboardShortcuts;
