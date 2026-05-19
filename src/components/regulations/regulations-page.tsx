"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Search,
  Eye,
  ShieldAlert,
  RefreshCw,
  Download,
  ScrollText,
  Filter,
  X,
  Maximize2,
  Star,
  Bookmark,
  ListChecks,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RegulationDetailDialog } from "./regulation-detail-dialog";
import type { Regulation } from "./regulation-detail-dialog";
import { RegulationDetailPage } from "./regulation-detail-page";
import { TagManager, TagDisplay } from "@/components/layout/tag-manager";
import { RegulationComparison } from "./regulation-comparison";

interface Tag {
  id: string;
  name: string;
  color: string;
}

// ── Badge variants ──────────────────────────────────────────────

const sourceBadgeClasses: Record<string, string> = {
  FDA: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/15",
  EU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  ISO: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/15",
};

const statusBadgeClasses: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  assessed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
};

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className={sourceBadgeClasses[source] || ""}>
      {source}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusBadgeClasses[status] || ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ── Skeleton loader ─────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1 max-w-sm" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Skeleton className="h-4 flex-1 max-w-xs" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [bookmarkFilter, setBookmarkFilter] = useState<"all" | "bookmarked">("all");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Full-page detail view
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Comparison dialog
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // Bookmarks state
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkCount, setBookmarkCount] = useState(0);

  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [regulationTags, setRegulationTags] = useState<Record<string, Tag[]>>({});
  const [expandedTagRow, setExpandedTagRow] = useState<string | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter);
      if (regionFilter && regionFilter !== "all") params.set("region", regionFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (bookmarkFilter === "bookmarked") params.set("bookmarked", "true");

      const res = await fetch(`/api/regulations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch regulations");
      const data = await res.json();
      setRegulations(data);
    } catch (err) {
      console.error("Failed to fetch regulations:", err);
      setError("Failed to load regulations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, regionFilter, debouncedSearch, bookmarkFilter]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (res.ok) {
        const data = await res.json();
        const ids = new Set(data.map((b: { regulationId: string }) => b.regulationId));
        setBookmarkedIds(ids);
        setBookmarkCount(ids.size);
      }
    } catch {
      // ignore
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

  useEffect(() => {
    fetchRegulations();
    fetchBookmarks();
    fetchTags();
  }, [fetchRegulations, fetchBookmarks, fetchTags]);

  const handleSeedData = async () => {
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        fetchRegulations();
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Failed to seed data:", err);
    }
  };

  const handleViewDetails = (regulation: Regulation) => {
    setSelectedRegulation(regulation);
    setDialogOpen(true);
  };

  const handleToggleBookmark = async (e: React.MouseEvent, regulationId: string) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedIds.has(regulationId);

    try {
      if (isBookmarked) {
        const res = await fetch("/api/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regulationId }),
        });
        if (res.ok) {
          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            next.delete(regulationId);
            return next;
          });
          setBookmarkCount((c) => c - 1);
          toast.success("Bookmark removed");
          // If we're on the bookmarked filter, refetch
          if (bookmarkFilter === "bookmarked") {
            fetchRegulations();
          }
        }
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regulationId }),
        });
        if (res.ok) {
          setBookmarkedIds((prev) => new Set(prev).add(regulationId));
          setBookmarkCount((c) => c + 1);
          toast.success("Regulation bookmarked");
        } else if (res.status === 409) {
          toast.info("Already bookmarked");
        }
      }
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

  const activeFilterCount = [
    statusFilter !== "all",
    sourceFilter !== "all",
    regionFilter !== "all",
    search.trim() !== "",
    bookmarkFilter === "bookmarked",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setRegionFilter("all");
    setBookmarkFilter("all");
  };

  const fetchRegulationTags = useCallback(async (regId: string) => {
    try {
      const res = await fetch(`/api/regulations/${regId}/tags`);
      if (res.ok) {
        const data = await res.json();
        setRegulationTags((prev) => ({ ...prev, [regId]: data }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUpdateRegulationTags = async (regId: string, tagIds: string[]) => {
    try {
      const res = await fetch(`/api/regulations/${regId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegulationTags((prev) => ({ ...prev, [regId]: data }));
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

  // Fetch tags for all visible regulations on load
  useEffect(() => {
    if (regulations.length > 0) {
      regulations.forEach((reg) => {
        if (!regulationTags[reg.id]) {
          fetchRegulationTags(reg.id);
        }
      });
    }
  }, [regulations]);

  const handleExpandDetail = (regId: string) => {
    setSelectedDetailId(regId);
  };

  // If full-page detail is open, render it instead
  if (selectedDetailId) {
    return (
      <RegulationDetailPage
        regulationId={selectedDetailId}
        onBack={() => setSelectedDetailId(null)}
      />
    );
  }

  // ── Empty state ──────────────────────────────────────────────────

  if (!loading && !error && regulations.length === 0 && !search && statusFilter === "all" && sourceFilter === "all" && regionFilter === "all" && bookmarkFilter === "all") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <ScrollText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Regulations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track, review, and manage regulatory changes
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 empty-pattern-bg rounded-lg">
            <div className="flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
              <ScrollText className="size-7 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">No Regulations Yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Get started by loading sample regulations. This will populate the system with
                realistic regulatory data for demonstration purposes.
              </p>
            </div>
            <Button onClick={handleSeedData} className="gap-2 cta-glow">
              <Download className="size-4" />
              Seed Demo Data
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <ScrollText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Regulations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track, review, and manage regulatory changes
              {!loading && regulations.length > 0 && (
                <span className="ml-1">
                  &middot; <span className="font-medium text-foreground">{regulations.length}</span> found
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bookmarkCount > 0 && (
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Bookmark className="size-3" />
              {bookmarkCount} bookmarked
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompareDialog(true)}
            disabled={loading || regulations.length < 2}
            className="gap-2"
            title={regulations.length < 2 ? "Need at least 2 regulations to compare" : "Compare regulations side by side"}
          >
            <Scale className="size-3.5" />
            Compare
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRegulations}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main card */}
      <Card>
        {/* Filters */}
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                Regulatory Feed
              </CardTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search regulations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 input-polished"
                />
              </div>

              {/* Bookmark filter toggle */}
              <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
                <button
                  onClick={() => setBookmarkFilter("all")}
                  className={`px-3 py-1.5 text-xs rounded-sm transition-colors font-medium ${
                    bookmarkFilter === "all"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setBookmarkFilter("bookmarked")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors font-medium ${
                    bookmarkFilter === "bookmarked"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star className="size-3" />
                  Bookmarked
                  {bookmarkCount > 0 && (
                    <span className={`ml-0.5 text-[10px] px-1 py-0 rounded-full ${
                      bookmarkFilter === "bookmarked"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {bookmarkCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Source filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="FDA">FDA</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="ISO">ISO</SelectItem>
                </SelectContent>
              </Select>

              {/* Region filter */}
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRegulations} className="gap-2">
                <RefreshCw className="size-3.5" />
                Try Again
              </Button>
            </div>
          ) : regulations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {bookmarkFilter === "bookmarked" ? "No bookmarked regulations" : "No matching regulations"}
              </p>
              <p className="text-xs text-muted-foreground">
                {bookmarkFilter === "bookmarked"
                  ? "Star regulations to add them to your bookmarks."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {bookmarkFilter === "bookmarked" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookmarkFilter("all")}
                  className="gap-1.5 text-xs"
                >
                  <X className="size-3" />
                  Show All
                </Button>
              )}
              {bookmarkFilter !== "bookmarked" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1.5 text-xs"
                >
                  <X className="size-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="row-stagger row-alternate cell-glow row-accent">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[35%] min-w-[240px] pl-6">Title</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[100px]">Region</TableHead>
                    <TableHead className="w-[120px]">Effective Date</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[100px] text-center">Review</TableHead>
                    <TableHead className="w-[90px] text-center">Checklist</TableHead>
                    <TableHead className="w-[140px]">Tags</TableHead>
                    <TableHead className="pr-6 w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regulations.map((reg) => (
                    <TableRow
                      key={reg.id}
                      className={cn(
                        "group cursor-pointer hover:border-l-2 hover:border-l-primary/20 hover:bg-primary/[0.02]"
                      )}
                      onClick={() => handleViewDetails(reg)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-start gap-2 min-w-0">
                          {bookmarkedIds.has(reg.id) && (
                            <Star className="size-3.5 text-yellow-500 fill-yellow-500 shrink-0 mt-0.5" />
                          )}
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {reg.title}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={reg.source} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{reg.region}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {reg.effectiveDate
                            ? format(new Date(reg.effectiveDate), "MMM d, yyyy")
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={reg.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.needsReview && (
                          <div className="flex items-center justify-center">
                            <ShieldAlert className="size-4 text-yellow-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <ListChecks className="size-3" />
                          <span className="tabular-nums">
                            {(reg as Record<string, unknown>)._count &&
                            typeof (reg as Record<string, unknown>)._count === "object" &&
                            (reg as Record<string, unknown>)._count !== null
                              ? ((reg as Record<string, unknown>)._count as Record<string, number>).checklistItems || 0
                              : 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expandedTagRow === reg.id ? (
                          <TagManager
                            currentTags={regulationTags[reg.id] || []}
                            availableTags={allTags}
                            onUpdate={(tagIds) => handleUpdateRegulationTags(reg.id, tagIds)}
                            onCreateTag={handleCreateTag}
                            compact
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTagRow(reg.id);
                            }}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <TagDisplay tags={regulationTags[reg.id] || []} />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => handleToggleBookmark(e, reg.id)}
                            title={bookmarkedIds.has(reg.id) ? "Remove bookmark" : "Add bookmark"}
                          >
                            <Star
                              className={`size-3.5 ${
                                bookmarkedIds.has(reg.id)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(reg);
                            }}
                            title="Preview in dialog"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpandDetail(reg.id);
                            }}
                            title="Expand full detail"
                          >
                            <Maximize2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <RegulationDetailDialog
        regulation={selectedRegulation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Comparison Dialog */}
      {showCompareDialog && (
        <RegulationComparison
          open={showCompareDialog}
          onOpenChange={setShowCompareDialog}
          regulations={regulations.map((r) => ({
            id: r.id,
            title: r.title,
            source: r.source,
            region: r.region,
            status: r.status,
          }))}
          onViewDetail={(regId) => setSelectedDetailId(regId)}
        />
      )}
    </div>
  );
}
