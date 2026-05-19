"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ScrollText,
  FileText,
  Kanban,
  ShieldAlert,
  X,
  Clock,
  ArrowRight,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AppPage } from "@/components/layout/app-sidebar";

interface SearchPageProps {
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
  scope?: string;
  version?: string;
  dueDate?: string;
  riskScore?: string;
}

interface SearchResponse {
  regulations: SearchResult[];
  documents: SearchResult[];
  tasks: SearchResult[];
}

const RECENT_SEARCHES_KEY = "regimind:recent-searches";
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 300;

// --- Config for each entity type ---
function getTypeConfig(type: SearchResult["type"]) {
  switch (type) {
    case "regulation":
      return {
        icon: ScrollText,
        label: "Regulation",
        badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
        iconBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400",
        targetPage: "regulations" as AppPage,
      };
    case "document":
      return {
        icon: FileText,
        label: "Document",
        badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
        iconBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400",
        targetPage: "documents" as AppPage,
      };
    case "task":
      return {
        icon: Kanban,
        label: "Task",
        badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
        iconBg: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400",
        targetPage: "tasks" as AppPage,
      };
    default:
      return {
        icon: Search,
        label: "Result",
        badgeClass: "bg-muted text-muted-foreground",
        iconBg: "bg-muted text-muted-foreground",
        targetPage: "dashboard" as AppPage,
      };
  }
}

function getStatusBadgeClass(status?: string) {
  if (!status) return "bg-muted text-muted-foreground";
  switch (status.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "assessed":
    case "done":
    case "approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "in_progress":
    case "in review":
    case "in_review":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    case "draft":
    case "todo":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPriorityBadgeClass(priority?: string) {
  if (!priority) return "bg-muted text-muted-foreground";
  switch (priority.toLowerCase()) {
    case "high":
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "low":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// --- Recent Searches helpers ---
function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function removeRecentSearch(query: string) {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((s) => s.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// --- Text highlighter ---
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/15 text-primary rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// --- Result Card ---
function ResultCard({
  result,
  query,
  onClick,
}: {
  result: SearchResult;
  query: string;
  onClick: () => void;
}) {
  const typeConfig = getTypeConfig(result.type);
  const TypeIcon = typeConfig.icon;

  return (
    <Card
      className={cn(
        "card-depth card-smooth cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-sm search-result-highlight",
        result.type === "regulation" && "border-l-2 border-l-teal-400/50",
        result.type === "document" && "border-l-2 border-l-orange-400/50",
        result.type === "task" && "border-l-2 border-l-violet-400/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div
            className={cn(
              "flex items-center justify-center size-9 rounded-lg shrink-0 mt-0.5",
              typeConfig.iconBg
            )}
          >
            <TypeIcon className="size-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">
                <HighlightMatch text={result.title} query={query} />
              </h3>
            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 font-medium border-0",
                  typeConfig.badgeClass
                )}
              >
                {typeConfig.label}
              </Badge>

              {result.type === "regulation" && result.source && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  {result.source}
                </Badge>
              )}
              {result.type === "regulation" && result.region && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  {result.region}
                </Badge>
              )}
              {result.type === "document" && result.docType && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  {result.docType}
                </Badge>
              )}
              {result.type === "document" && result.scope && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  {result.scope}
                </Badge>
              )}
              {result.type === "document" && result.version && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  v{result.version}
                </Badge>
              )}
              {result.type === "task" && result.priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-medium border-0",
                    getPriorityBadgeClass(result.priority)
                  )}
                >
                  {result.priority}
                </Badge>
              )}
              {result.type === "task" && result.dueDate && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50 gap-1">
                  <Clock className="size-2.5" />
                  {new Date(result.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Badge>
              )}
              {result.status && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-medium border-0",
                    getStatusBadgeClass(result.status)
                  )}
                >
                  {result.status}
                </Badge>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="size-4 text-muted-foreground/40 shrink-0 mt-2 group-hover:text-primary/60 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Loading Skeleton ---
function SearchResultsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {(["Regulations", "Documents", "Tasks"] as const).map((section) => (
        <div key={section} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/5" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Empty State ---
function EmptyState({ type, query }: { type: "initial" | "no-results" | "error"; query?: string }) {
  return (
    <div className="py-16 text-center animate-in fade-in-0 duration-500 empty-pattern-bg rounded-xl">
      <div className="relative inline-flex items-center justify-center mb-4">
        <div className="absolute size-20 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
        <div className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
          {type === "error" ? (
            <ShieldAlert className="size-6 text-destructive" />
          ) : (
            <Search className="size-6 text-muted-foreground/50" />
          )}
        </div>
      </div>
      {type === "initial" && (
        <>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Search across your compliance data
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Find regulations, documents, tasks, and assessments — all in one place.
          </p>
        </>
      )}
      {type === "no-results" && (
        <>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            No results found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No results for &ldquo;{query}&rdquo;. Try different keywords or check your spelling.
          </p>
        </>
      )}
      {type === "error" && (
        <>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Failed to fetch search results. Please try again.
          </p>
        </>
      )}
    </div>
  );
}

// --- Section Header ---
function SectionHeader({
  title,
  icon: SectionIcon,
  count,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <SectionIcon className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
        {count}
      </Badge>
    </div>
  );
}

// --- Main Search Page ---
export function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "regulation" | "document" | "task">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        setResults(null);
        setError(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(query.trim());
        setTypeFilter("all");
      }, DEBOUNCE_MS);
    } else {
      setDebouncedQuery("");
      setResults(null);
      setError(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchResults() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setResults(data);
          // Save to recent searches
          saveRecentSearch(debouncedQuery);
          setRecentSearches(getRecentSearches());
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const config = getTypeConfig(result.type);
      onNavigate(config.targetPage);
      // Dispatch custom event so target pages can react
      window.dispatchEvent(
        new CustomEvent("regimind:select-entity", {
          detail: { type: result.type, id: result.id },
        })
      );
    },
    [onNavigate]
  );

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  const handleClearRecent = useCallback((term: string) => {
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setResults(null);
    setError(false);
    setTypeFilter("all");
    inputRef.current?.focus();
  }, []);

  // Filtered results based on typeFilter
  const filteredResults = useMemo(() => {
    if (!results) return null;
    if (typeFilter === "all") return results;
    return {
      regulations: typeFilter === "regulation" ? results.regulations : [],
      documents: typeFilter === "document" ? results.documents : [],
      tasks: typeFilter === "task" ? results.tasks : [],
    };
  }, [results, typeFilter]);

  const hasResults = filteredResults
    ? filteredResults.regulations.length +
        filteredResults.documents.length +
        filteredResults.tasks.length >
      0
    : false;
  const isSearching = debouncedQuery.length >= 2;
  const hasRecentSearches = recentSearches.length > 0 && !isSearching;

  const totalResults = filteredResults
    ? filteredResults.regulations.length +
      filteredResults.documents.length +
      filteredResults.tasks.length
    : 0;

  const typeFilterChips = useMemo(() => {
    if (!results) return [];
    const total = results.regulations.length + results.documents.length + results.tasks.length;
    if (total === 0) return [];
    return [
      { key: "all" as const, label: "All Results", count: total },
      { key: "regulation" as const, label: "Regulations", count: results.regulations.length },
      { key: "document" as const, label: "Documents", count: results.documents.length },
      { key: "task" as const, label: "Tasks", count: results.tasks.length },
    ].filter((chip) => chip.count > 0);
  }, [results]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
          <Search className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Global Search</h2>
          <p className="text-sm text-muted-foreground">
            Search across regulations, documents, tasks, and assessments
          </p>
        </div>
      </div>

      {/* Search Input Area */}
      <div
        className={cn(
          "transition-all duration-300 mesh-bg rounded-2xl p-6 focus-ring-card border border-border/50",
          isSearching ? "max-w-2xl" : "max-w-2xl mx-auto"
        )}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground/60" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search regulations, documents, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "h-12 pl-11 pr-10 text-base rounded-xl border-2 transition-all duration-200",
              "focus-visible:ring-0 focus-visible:border-primary/40 focus-visible:shadow-sm focus-visible:shadow-primary/5",
              "bg-muted/30"
            )}
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        {!query && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground/60">
            <kbd className="font-mono bg-muted rounded border px-1.5 py-0.5 text-[11px]">
              /
            </kbd>
            <span>to focus search</span>
            <span className="mx-1">·</span>
            <kbd className="font-mono bg-muted rounded border px-1.5 py-0.5 text-[11px]">
              esc
            </kbd>
            <span>to clear</span>
          </div>
        )}

        {/* Filter Chips - only shown when there are results */}
        {typeFilterChips.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {typeFilterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setTypeFilter(chip.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  typeFilter === chip.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums",
                    typeFilter === chip.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {/* Loading State */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SearchResultsSkeleton />
          </motion.div>
        )}

        {/* Error State */}
        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState type="error" query={debouncedQuery} />
          </motion.div>
        )}

        {/* No Results */}
        {!loading && !error && isSearching && !hasResults && results && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {typeFilter !== "all" ? (
              <EmptyState type="no-results" query={`${debouncedQuery} (${typeFilter})`} />
            ) : (
              <EmptyState type="no-results" query={debouncedQuery} />
            )}
          </motion.div>
        )}

        {/* Search Results */}
        {!loading && !error && hasResults && filteredResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-6 noise-bg rounded-xl"
          >
            {/* Results count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-3.5 text-primary/60" />
              <span>
                Found <strong className="text-foreground">{totalResults}</strong>{" "}
                result{totalResults !== 1 ? "s" : ""} for &ldquo;{debouncedQuery}
                &rdquo;
                {typeFilter !== "all" && (
                  <span className="ml-1">
                    in <strong className="text-foreground">{typeFilter}s</strong>
                  </span>
                )}
              </span>
            </div>

            <Separator />

            {/* Regulations Section */}
            {filteredResults.regulations.length > 0 && (
              <div>
                <SectionHeader
                  title="Regulations"
                  icon={ScrollText}
                  count={filteredResults.regulations.length}
                />
                <div className="space-y-2">
                  {filteredResults.regulations.map((r) => (
                    <ResultCard
                      key={r.id}
                      result={{ ...r, type: "regulation" }}
                      query={debouncedQuery}
                      onClick={() =>
                        handleResultClick({ ...r, type: "regulation" })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {filteredResults.documents.length > 0 && (
              <div>
                <SectionHeader
                  title="Documents"
                  icon={FileText}
                  count={filteredResults.documents.length}
                />
                <div className="space-y-2">
                  {filteredResults.documents.map((d) => (
                    <ResultCard
                      key={d.id}
                      result={{ ...d, type: "document" }}
                      query={debouncedQuery}
                      onClick={() =>
                        handleResultClick({ ...d, type: "document" })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {filteredResults.tasks.length > 0 && (
              <div>
                <SectionHeader
                  title="Tasks"
                  icon={Kanban}
                  count={filteredResults.tasks.length}
                />
                <div className="space-y-2">
                  {filteredResults.tasks.map((t) => (
                    <ResultCard
                      key={t.id}
                      result={{ ...t, type: "task" }}
                      query={debouncedQuery}
                      onClick={() => handleResultClick({ ...t, type: "task" })}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Initial / Recent Searches */}
        {!loading && !error && !isSearching && (
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Empty State */}
            <EmptyState type="initial" />

            {/* Recent Searches */}
            {hasRecentSearches && (
              <div className="max-w-2xl mx-auto mt-8">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Recent Searches
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <button
                            onClick={() => handleRecentClick(term)}
                            className="flex-1 flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors text-left min-w-0"
                          >
                            <Search className="size-3.5 text-muted-foreground/50 shrink-0" />
                            <span className="truncate">{term}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearRecent(term);
                            }}
                            className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-6 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Tips */}
            <div className="max-w-2xl mx-auto mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: ScrollText,
                    label: "Regulations",
                    hint: 'Try "FDA" or "EU MDR"',
                    color: "text-teal-600 dark:text-teal-400",
                    bg: "bg-teal-50 dark:bg-teal-950/50",
                  },
                  {
                    icon: FileText,
                    label: "Documents",
                    hint: 'Try "SOP" or "Design"',
                    color: "text-orange-600 dark:text-orange-400",
                    bg: "bg-orange-50 dark:bg-orange-950/50",
                  },
                  {
                    icon: Kanban,
                    label: "Tasks",
                    hint: 'Try "gap" or "update"',
                    color: "text-violet-600 dark:text-violet-400",
                    bg: "bg-violet-50 dark:bg-violet-950/50",
                  },
                ].map((tip) => (
                  <Card
                    key={tip.label}
                    className="card-depth border-dashed cursor-pointer"
                    onClick={() => {
                      const hintText = tip.hint.match(/"([^"]+)"/)?.[1];
                      if (hintText) handleRecentClick(hintText);
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <div
                        className={cn(
                          "inline-flex items-center justify-center size-8 rounded-lg mb-2",
                          tip.bg,
                          tip.color
                        )}
                      >
                        <tip.icon className="size-4" />
                      </div>
                      <p className="text-xs font-medium">{tip.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {tip.hint}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchPage;
