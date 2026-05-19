"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ShieldAlert,
  AlertCircle,
  ChevronRight,
  Maximize2,
  Clock,
  User,
  FileText,
  Brain,
  ListChecks,
  CheckCircle2,
  CircleDot,
  Circle,
  Loader2,
  History,
  ArrowRightLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { RegulationChecklist } from "./regulation-checklist";

// ── Changelog types ──────────────────────────────────────────

interface ChangeLogEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  source: "Source",
  region: "Region",
  status: "Status",
  effectiveDate: "Effective Date",
  rawText: "Raw Text",
  aiSummary: "AI Summary",
  deltaJson: "Regulatory Deltas",
  needsReview: "Needs Review",
};

const FIELD_COLORS: Record<string, string> = {
  title: "text-foreground",
  source: "text-red-500 dark:text-red-400",
  region: "text-amber-500 dark:text-amber-400",
  status: "text-emerald-500 dark:text-emerald-400",
  effectiveDate: "text-teal-500 dark:text-teal-400",
  rawText: "text-muted-foreground",
  aiSummary: "text-purple-500 dark:text-purple-400",
  deltaJson: "text-orange-500 dark:text-orange-400",
  needsReview: "text-yellow-500 dark:text-yellow-400",
};

// ── Types ──────────────────────────────────────────────────────

interface Assessment {
  id: string;
  riskScore: string;
  gapDescription: string | null;
  requiredAction: string | null;
  aiRecommendation: string | null;
  status: string;
  createdAt: string;
  document: {
    id: string;
    title: string;
    docType: string;
  } | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    assigneeId: string | null;
  }[];
}

interface RegulationDetail {
  id: string;
  title: string;
  source: string;
  region: string;
  status: string;
  effectiveDate: string | null;
  publishedDate: string;
  rawText: string;
  aiSummary: string | null;
  deltaJson: string | null;
  needsReview: boolean;
  createdAt: string;
  impactAssessments: Assessment[];
}

interface DeltaItem {
  section?: string;
  clause?: string;
  before?: string;
  after?: string;
  type?: string;
  description?: string;
}

interface RegulationDetailPageProps {
  regulationId: string;
  onBack: () => void;
}

// ── Badge variants ──────────────────────────────────────────────

const sourceBadgeClasses: Record<string, string> = {
  FDA: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  EU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  ISO: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

const statusBadgeClasses: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  assessed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
};

const riskBadgeClasses: Record<string, string> = {
  High: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const assessmentStatusClasses: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const taskPriorityClasses: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const taskStatusIcons: Record<string, React.ElementType> = {
  todo: Circle,
  in_review: CircleDot,
  done: CheckCircle2,
};

const taskStatusColors: Record<string, string> = {
  todo: "text-muted-foreground",
  in_review: "text-amber-500",
  done: "text-emerald-500",
};

// ── Loading skeleton ───────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-40" />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-[500px] max-w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>

          {/* Assessments skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function RegulationDetailPage({ regulationId, onBack }: RegulationDetailPageProps) {
  const [regulation, setRegulation] = useState<RegulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecs, setExpandedRecs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "changelog">("overview");
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);

  useEffect(() => {
    async function fetchRegulation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/regulations/${regulationId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Regulation not found.");
          } else {
            setError("Failed to fetch regulation details.");
          }
          return;
        }
        const data = await res.json();
        setRegulation(data);
      } catch (err) {
        console.error("Failed to fetch regulation:", err);
        setError("Failed to fetch regulation details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    if (regulationId) {
      fetchRegulation();
    }
  }, [regulationId]);

  // Fetch changelog when switching to changelog tab
  useEffect(() => {
    if (activeTab === "changelog" && regulationId) {
      setChangelogLoading(true);
      fetch(`/api/regulations/${regulationId}/changelog`)
        .then((res) => res.json())
        .then((data) => setChangelog(Array.isArray(data) ? data : []))
        .catch(() => setChangelog([]))
        .finally(() => setChangelogLoading(false));
    }
  }, [activeTab, regulationId]);

  const deltas: DeltaItem[] = useMemo(() => {
    if (!regulation?.deltaJson) return [];
    try {
      const parsed = JSON.parse(regulation.deltaJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }, [regulation?.deltaJson]);

  const allTasks = useMemo(() => {
    if (!regulation) return [];
    return regulation.impactAssessments.flatMap((a) =>
      a.tasks.map((t) => ({ ...t, assessmentId: a.id }))
    );
  }, [regulation]);

  const gapCounts = useMemo(() => {
    if (!regulation) return { high: 0, medium: 0, low: 0, total: 0 };
    const counts = { high: 0, medium: 0, low: 0, total: 0 };
    for (const a of regulation.impactAssessments) {
      counts.total++;
      if (a.riskScore === "High") counts.high++;
      else if (a.riskScore === "Medium") counts.medium++;
      else counts.low++;
    }
    return counts;
  }, [regulation]);

  const toggleRecommendation = (id: string) => {
    setExpandedRecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-2">
        <DetailSkeleton />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────

  if (error || !regulation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="size-12 text-destructive/50" />
        <p className="text-lg font-medium text-muted-foreground">{error || "Regulation not found"}</p>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back to Regulations
        </Button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="p-2 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Regulations
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={sourceBadgeClasses[regulation.source] || ""}>
            {regulation.source}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {regulation.region}
          </Badge>
          <Badge variant="outline" className={statusBadgeClasses[regulation.status] || ""}>
            {regulation.status.charAt(0).toUpperCase() + regulation.status.slice(1)}
          </Badge>
          {regulation.needsReview && (
            <Badge
              variant="outline"
              className="gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25"
            >
              <ShieldAlert className="size-3.5" />
              Needs Review
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{regulation.title}</h1>
        <p className="text-sm text-muted-foreground">
          Published {format(new Date(regulation.publishedDate), "MMMM d, yyyy")}
          {regulation.effectiveDate && (
            <> &middot; Effective {format(new Date(regulation.effectiveDate), "MMMM d, yyyy")}</>
          )}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center rounded-lg border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-all font-medium tab-switch-pill",
            activeTab === "overview"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-active={activeTab === "overview" || undefined}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-all font-medium flex items-center gap-2 tab-switch-pill",
            activeTab === "checklist"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-active={activeTab === "checklist" || undefined}
        >
          <ListChecks className="size-3.5" />
          Checklist
        </button>
        <button
          onClick={() => setActiveTab("changelog")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-all font-medium flex items-center gap-2 tab-switch-pill",
            activeTab === "changelog"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-active={activeTab === "changelog" || undefined}
        >
          <History className="size-3.5" />
          Change History
        </button>
      </div>

      {/* Checklist tab */}
      {activeTab === "checklist" && (
        <div className="section-crossfade">
          <RegulationChecklist regulationId={regulationId} />
        </div>
      )}

      {/* Change History tab */}
      {activeTab === "changelog" && (
        <div className="section-crossfade">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Change History</CardTitle>
                  <CardDescription>
                    {changelogLoading
                      ? "Loading..."
                      : `${changelog.length} change${changelog.length !== 1 ? "s" : ""} recorded`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {changelogLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <Skeleton className="size-8 rounded-full" />
                        <Skeleton className="w-px flex-1 mt-2" />
                      </div>
                      <div className="flex-1 space-y-2 pb-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : changelog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/5 blur-xl scale-150" />
                    <History className="size-8 text-muted-foreground/40 relative float-in" />
                  </div>
                  <p className="text-sm text-muted-foreground">No changes recorded yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Changes to regulation details will appear here
                  </p>
                </div>
              ) : (
                <div className="relative max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-0">
                    {changelog.map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-4 pl-1">
                        {/* Timeline dot */}
                        <div className={cn(
                          "relative z-10 flex-shrink-0 flex size-[30px] items-center justify-center rounded-full border-2 border-background bg-muted",
                          FIELD_COLORS[entry.field]?.replace("text-", "bg-").replace("dark:text-", "dark:bg-") || "bg-muted"
                        )}>
                          <ArrowRightLeft className="size-3 text-muted-foreground" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold px-1.5 py-0 border-border/50",
                                FIELD_COLORS[entry.field] || "text-muted-foreground"
                              )}
                            >
                              {FIELD_LABELS[entry.field] || entry.field}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              by {entry.changedBy}
                            </span>
                            <span className="text-[11px] text-muted-foreground/60 ml-auto shrink-0">
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>
                          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-red-500/80 font-mono text-xs bg-red-500/5 px-1.5 py-0.5 rounded max-w-[200px] truncate shrink-0" title={entry.oldValue}>
                                {entry.oldValue.length > 50 ? entry.oldValue.substring(0, 50) + "..." : entry.oldValue}
                              </span>
                              <span className="text-muted-foreground shrink-0 mt-px">→</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs bg-emerald-500/5 px-1.5 py-0.5 rounded max-w-[200px] truncate shrink-0" title={entry.newValue}>
                                {entry.newValue.length > 50 ? entry.newValue.substring(0, 50) + "..." : entry.newValue}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                            {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview tab content (main content grid) */}
      {activeTab === "overview" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 section-crossfade">
        {/* Left column - main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary Section */}
          {regulation.aiSummary ? (
            <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Brain className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">AI Summary</CardTitle>
                    <CardDescription>AI-generated regulation overview</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/50 bg-muted/30 p-4">
                  <ReactMarkdown>{regulation.aiSummary}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Delta Changes Section */}
          {deltas.length > 0 ? (
            <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Regulatory Deltas</CardTitle>
                    <CardDescription>
                      {deltas.length} change{deltas.length !== 1 ? "s" : ""} identified
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {deltas.map((delta, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border overflow-hidden",
                      delta.type === "addition"
                        ? "border-l-3 border-l-emerald-500/60 border-border/60"
                        : delta.type === "removal"
                        ? "border-l-3 border-l-red-500/60 border-border/60"
                        : "border-l-3 border-l-amber-500/60 border-border/60"
                    )}
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/40">
                      {delta.section && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {delta.section}
                        </span>
                      )}
                      {delta.clause && (
                        <>
                          <ChevronRight className="size-3 text-muted-foreground/50" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {delta.clause}
                          </span>
                        </>
                      )}
                      {delta.type && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto text-[10px] px-1.5 py-0 font-normal",
                            delta.type === "addition" && "text-emerald-600 border-emerald-500/20",
                            delta.type === "removal" && "text-red-600 border-red-500/20",
                            delta.type === "modification" && "text-amber-600 border-amber-500/20"
                          )}
                        >
                          {delta.type}
                        </Badge>
                      )}
                    </div>
                    {delta.description && (
                      <div className="px-4 py-2 border-b border-border/30 bg-background">
                        <p className="text-sm text-foreground/90">{delta.description}</p>
                      </div>
                    )}
                    {(delta.before || delta.after) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                        {delta.before && (
                          <div className="px-4 py-3 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500/80">
                              Previous
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {delta.before}
                            </p>
                          </div>
                        )}
                        {delta.after && (
                          <div className="px-4 py-3 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500/80">
                              Updated
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {delta.after}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Impact Assessments Section */}
          <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Impact Assessments</CardTitle>
                  <CardDescription>
                    {regulation.impactAssessments.length} gap analysis
                    {regulation.impactAssessments.length !== 1 ? "es" : ""}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {regulation.impactAssessments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/5 blur-xl scale-150" />
                    <ListChecks className="size-8 text-muted-foreground/40 relative" />
                  </div>
                  <p className="text-sm text-muted-foreground">No impact assessments yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      window.location.hash = "war-room";
                      window.dispatchEvent(
                        new CustomEvent("navigate-to-page", { detail: "war-room" })
                      );
                    }}
                  >
                    <Brain className="size-3.5" />
                    Go to War Room
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {regulation.impactAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="rounded-lg border p-4 space-y-3 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={riskBadgeClasses[assessment.riskScore] || ""}>
                            {assessment.riskScore} Risk
                          </Badge>
                          <Badge variant="outline" className={assessmentStatusClasses[assessment.status] || ""}>
                            {assessment.status === "in_progress"
                              ? "In Progress"
                              : assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(assessment.createdAt)}
                        </span>
                      </div>

                      {assessment.gapDescription && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Gap Description
                          </p>
                          <p className="text-sm text-foreground/90">{assessment.gapDescription}</p>
                        </div>
                      )}

                      {assessment.requiredAction && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Required Action
                          </p>
                          <p className="text-sm text-foreground/90">{assessment.requiredAction}</p>
                        </div>
                      )}

                      {assessment.document && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="size-3.5" />
                          <span>
                            Document: <span className="font-medium text-foreground">{assessment.document.title}</span>
                          </span>
                        </div>
                      )}

                      {assessment.aiRecommendation && (
                        <div className="space-y-1">
                          <button
                            onClick={() => toggleRecommendation(assessment.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Brain className="size-3.5" />
                            AI Recommendation
                            <ChevronRight
                              className={cn(
                                "size-3 transition-transform",
                                expandedRecs.has(assessment.id) && "rotate-90"
                              )}
                            />
                          </button>
                          {expandedRecs.has(assessment.id) && (
                            <div className="rounded-md border border-border/50 bg-muted/30 p-3 mt-1">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{assessment.aiRecommendation}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {assessment.tasks.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Related Tasks ({assessment.tasks.length})
                            </p>
                            {assessment.tasks.map((task) => {
                              const TaskIcon = taskStatusIcons[task.status] || Circle;
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <TaskIcon className={cn("size-4 shrink-0", taskStatusColors[task.status])} />
                                  <span className="truncate flex-1">{task.title}</span>
                                  <Badge variant="outline" className={taskPriorityClasses[task.priority] || ""}>
                                    {task.priority}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Tasks Section (aggregated) */}
          {allTasks.length > 0 && (
            <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Related Tasks</CardTitle>
                    <CardDescription>
                      {allTasks.length} task{allTasks.length !== 1 ? "s" : ""} linked to assessments
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allTasks.map((task) => {
                    const TaskIcon = taskStatusIcons[task.status] || Circle;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
                      >
                        <TaskIcon className={cn("size-4 shrink-0", taskStatusColors[task.status])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={taskPriorityClasses[task.priority] || ""}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className={assessmentStatusClasses[task.status] || ""}>
                              {task.status === "todo"
                                ? "To Do"
                                : task.status === "in_review"
                                ? "In Review"
                                : "Done"}
                            </Badge>
                          </div>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <Clock className="size-3" />
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </div>
                        )}
                        {task.assigneeId && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <User className="size-3" />
                            Assigned
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Metadata sidebar */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Regulation Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <Badge variant="outline" className={sourceBadgeClasses[regulation.source] || ""}>
                  {regulation.source}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Region</span>
                <span className="text-sm font-medium capitalize">{regulation.region}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className={statusBadgeClasses[regulation.status] || ""}>
                  {regulation.status.charAt(0).toUpperCase() + regulation.status.slice(1)}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Effective Date</span>
                <span className="text-sm font-medium">
                  {regulation.effectiveDate
                    ? format(new Date(regulation.effectiveDate), "MMM d, yyyy")
                    : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Published</span>
                <span className="text-sm font-medium">
                  {format(new Date(regulation.publishedDate), "MMM d, yyyy")}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm font-medium">
                  {format(new Date(regulation.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Gap Analysis Summary */}
          <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gap Summary</CardTitle>
              <CardDescription>{gapCounts.total} total assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">High Risk</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {gapCounts.high}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm text-muted-foreground">Medium Risk</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {gapCounts.medium}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm text-muted-foreground">Low Risk</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {gapCounts.low}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("navigate-to-page", { detail: "war-room" })
                  );
                }}
              >
                <Brain className="size-4" />
                Assess Impact
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onBack}
              >
                <Maximize2 className="size-3.5" />
                Back to List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
