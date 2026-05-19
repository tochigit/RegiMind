"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  Scale,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Tag,
  ShieldCheck,
  ShieldAlert,
  ListChecks,
  ExternalLink,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface RegulationOption {
  id: string;
  title: string;
  source: string;
  region: string;
  status: string;
}

interface RiskBreakdown {
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface AssessmentStatus {
  open: number;
  in_progress: number;
  resolved: number;
}

interface RegulationCompareData {
  id: string;
  title: string;
  source: string;
  region: string;
  status: string;
  effectiveDate: string | null;
  summary: string;
  categories: string[];
  riskBreakdown: RiskBreakdown;
  assessmentStatus: AssessmentStatus;
  checklistTotal: number;
  checklistCompleted: number;
  checklistProgress: number;
  tags: { id: string; name: string; color: string }[];
  assessmentCount: number;
  checklistCount: number;
}

interface ComparisonResponse {
  regulations: RegulationCompareData[];
  sourceComparison: { values: { id: string; source: string }[]; isUniform: boolean };
  regionComparison: { values: { id: string; region: string }[]; isUniform: boolean };
  statusComparison: { values: { id: string; status: string }[]; isUniform: boolean };
  commonThemes: { theme: string; count: number }[];
  uniqueThemes: string[];
  tagComparison: {
    shared: { id: string; name: string; color: string }[];
    unique: { regulationId: string; tags: { id: string; name: string; color: string }[] }[];
  };
  similarityScore: number;
  similarityLabel: string;
}

// ── Badge variants ──────────────────────────────────────────

const sourceBadgeClasses: Record<string, string> = {
  FDA: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  EU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  ISO: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

const statusBadgeClasses: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  assessed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
};

const riskColors = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-emerald-500",
};

const riskBgColors = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const riskBgLightColors = {
  high: "bg-red-500/15",
  medium: "bg-amber-500/15",
  low: "bg-emerald-500/15",
};

// ── Animation variants ──────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: "easeOut" },
};

// ── Similarity Ring ─────────────────────────────────────────

function SimilarityRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - score / 100);
  const color =
    score >= 80 ? "text-emerald-500" :
    score >= 60 ? "text-teal-500" :
    score >= 40 ? "text-amber-500" :
    score >= 20 ? "text-orange-500" :
    "text-red-500";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-28 flex items-center justify-center">
        <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/20"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={String(circumference)}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold tabular-nums"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {score}%
          </motion.span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">Similarity Score</p>
      </div>
    </div>
  );
}

// ── Winner indicator ────────────────────────────────────────

function WinnerBadge({ isWinner, label }: { isWinner: boolean; label: string }) {
  if (!isWinner) return null;
  return (
    <Badge
      variant="outline"
      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[10px] px-1.5 py-0"
    >
      <Trophy className="size-2.5" />
      {label}
    </Badge>
  );
}

// ── Loading skeleton ────────────────────────────────────────

function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function RegulationComparison({
  open,
  onOpenChange,
  regulations: regulationList,
  onViewDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regulations: RegulationOption[];
  onViewDetail: (regulationId: string) => void;
}) {
  const [reg1Id, setReg1Id] = useState<string>("");
  const [reg2Id, setReg2Id] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reg1 = regulationList.find((r) => r.id === reg1Id);
  const reg2 = regulationList.find((r) => r.id === reg2Id);

  // Fetch comparison data when both regulations are selected
  const fetchComparison = useCallback(async () => {
    if (!reg1Id || !reg2Id || reg1Id === reg2Id) {
      setComparisonData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/regulations/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regulationId1: reg1Id, regulationId2: reg2Id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch comparison");
      }
      const data = await res.json();
      setComparisonData(data);
    } catch (err) {
      console.error("Comparison error:", err);
      setError(err instanceof Error ? err.message : "Failed to load comparison");
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  }, [reg1Id, reg2Id]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const handleReset = () => {
    setReg1Id("");
    setReg2Id("");
    setComparisonData(null);
    setError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      handleReset();
    }
    onOpenChange(isOpen);
  };

  // Can compare?
  const canCompare = reg1Id && reg2Id && reg1Id !== reg2Id;

  // Determine "better" regulation in each category
  const regA = comparisonData?.regulations[0];
  const regB = comparisonData?.regulations[1];

  const betterProgress = regA && regB
    ? regA.checklistProgress > regB.checklistProgress
      ? "reg1"
      : regB.checklistProgress > regA.checklistProgress
        ? "reg2"
        : "tie"
    : "tie";

  const betterRisk = regA && regB
    ? (regA.riskBreakdown.high + regA.riskBreakdown.medium * 0.5) <
      (regB.riskBreakdown.high + regB.riskBreakdown.medium * 0.5)
      ? "reg1" // reg1 has fewer high/medium risks → better
      : (regB.riskBreakdown.high + regB.riskBreakdown.medium * 0.5) <
        (regA.riskBreakdown.high + regA.riskBreakdown.medium * 0.5)
        ? "reg2"
        : "tie"
    : "tie";

  const betterResolved = regA && regB
    ? regA.assessmentStatus.resolved > regB.assessmentStatus.resolved
      ? "reg1"
      : regB.assessmentStatus.resolved > regA.assessmentStatus.resolved
        ? "reg2"
        : "tie"
    : "tie";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
              <Scale className="size-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Regulation Comparison</DialogTitle>
              <DialogDescription>
                Select two regulations to compare side by side
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Regulation selectors */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">A</span>
                First Regulation
              </label>
              <Select value={reg1Id} onValueChange={setReg1Id}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select regulation..." />
                </SelectTrigger>
                <SelectContent>
                  {regulationList
                    .filter((r) => r.id !== reg2Id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="truncate">{r.title}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="inline-flex size-5 items-center justify-center rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold">B</span>
                Second Regulation
              </label>
              <Select value={reg2Id} onValueChange={setReg2Id}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select regulation..." />
                </SelectTrigger>
                <SelectContent>
                  {regulationList
                    .filter((r) => r.id !== reg1Id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="truncate">{r.title}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {!canCompare ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 border mb-4">
                <ArrowRightLeft className="size-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Select two regulations to begin comparison
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Choose different regulations from the dropdowns above
              </p>
            </div>
          ) : loading ? (
            <div className="px-6 py-4">
              <ComparisonSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <AlertCircle className="size-10 text-destructive/60 mb-3" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : comparisonData ? (
            <ScrollArea className="h-full max-h-[calc(90vh-220px)]">
              <div className="px-6 py-4 space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${reg1Id}-${reg2Id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    {/* ── Similarity Score ── */}
                    <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0 }}>
                      <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                        <CardContent className="py-5">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <SimilarityRing
                              score={comparisonData.similarityScore}
                              label={comparisonData.similarityLabel}
                            />
                            <div className="text-center sm:text-left space-y-2">
                              <h3 className="text-sm font-semibold">How Similar Are These Regulations?</h3>
                              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                                {comparisonData.sourceComparison.isUniform && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    <CheckCircle2 className="size-2.5" />Same Source
                                  </Badge>
                                )}
                                {comparisonData.regionComparison.isUniform && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    <CheckCircle2 className="size-2.5" />Same Region
                                  </Badge>
                                )}
                                {comparisonData.statusComparison.isUniform && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    <CheckCircle2 className="size-2.5" />Same Status
                                  </Badge>
                                )}
                                {comparisonData.tagComparison.shared.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-teal-500/10 text-teal-600 border-teal-500/20">
                                    <Tag className="size-2.5" />{comparisonData.tagComparison.shared.length} Shared Tags
                                  </Badge>
                                )}
                                {comparisonData.commonThemes.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    <TrendingUp className="size-2.5" />{comparisonData.commonThemes.length} Common Themes
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* ── Side-by-Side Overview ── */}
                    <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.05 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ShieldCheck className="size-4 text-muted-foreground" />
                            Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Field</th>
                                  <th className="text-left px-4 py-2.5 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">A</span>
                                      <span className="truncate max-w-[180px]">{regA?.title.substring(0, 35)}...</span>
                                    </div>
                                  </th>
                                  <th className="text-left px-4 py-2.5 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex size-5 items-center justify-center rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold">B</span>
                                      <span className="truncate max-w-[180px]">{regB?.title.substring(0, 35)}...</span>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {/* Source */}
                                <tr className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Source</td>
                                  {[regA, regB].map((reg) => (
                                    <td key={reg?.id} className="px-4 py-2.5">
                                      <Badge variant="outline" className={sourceBadgeClasses[reg?.source || ""] || ""}>
                                        {reg?.source}
                                      </Badge>
                                    </td>
                                  ))}
                                </tr>
                                {/* Region */}
                                <tr className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Region</td>
                                  {[regA, regB].map((reg) => (
                                    <td key={reg?.id} className="px-4 py-2.5 text-sm">{reg?.region}</td>
                                  ))}
                                </tr>
                                {/* Status */}
                                <tr className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Status</td>
                                  {[regA, regB].map((reg) => (
                                    <td key={reg?.id} className="px-4 py-2.5">
                                      <Badge variant="outline" className={statusBadgeClasses[reg?.status || ""] || ""}>
                                        {reg?.status.charAt(0).toUpperCase()}{reg?.status?.slice(1)}
                                      </Badge>
                                    </td>
                                  ))}
                                </tr>
                                {/* Effective Date */}
                                <tr className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Effective</td>
                                  {[regA, regB].map((reg) => (
                                    <td key={reg?.id} className="px-4 py-2.5 text-sm text-muted-foreground">
                                      {reg?.effectiveDate ? format(new Date(reg.effectiveDate), "MMM d, yyyy") : "—"}
                                    </td>
                                  ))}
                                </tr>
                                {/* View Detail Links */}
                                <tr className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Detail</td>
                                  {[regA, regB].map((reg) => (
                                    <td key={reg?.id} className="px-4 py-2.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5 h-7 text-xs text-primary"
                                        onClick={() => {
                                          onOpenChange(false);
                                          onViewDetail(reg!.id);
                                        }}
                                      >
                                        <ExternalLink className="size-3" />
                                        View
                                      </Button>
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* ── Risk Assessment Comparison ── */}
                    <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.1 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <ShieldAlert className="size-4 text-muted-foreground" />
                              Risk Assessment
                            </CardTitle>
                            {betterRisk !== "tie" && (
                              <WinnerBadge isWinner label="Lower Risk" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {comparisonData.regulations.map((reg, idx) => (
                              <div key={reg.id} className={cn(
                                "space-y-3 rounded-lg border p-4 transition-all",
                                betterRisk === `reg${idx + 1}` && "border-emerald-500/30 bg-emerald-500/5"
                              )}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "inline-flex size-5 items-center justify-center rounded text-[10px] font-bold",
                                      idx === 0 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                                    )}>
                                      {idx === 0 ? "A" : "B"}
                                    </span>
                                    <span className="text-xs font-medium truncate max-w-[160px]">{reg.title.substring(0, 28)}...</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{reg.riskBreakdown.total} total</span>
                                </div>

                                {/* Risk level bars */}
                                {(["high", "medium", "low"] as const).map((level) => {
                                  const count = reg.riskBreakdown[level];
                                  const pct = reg.riskBreakdown.total > 0
                                    ? Math.round((count / reg.riskBreakdown.total) * 100)
                                    : 0;
                                  return (
                                    <div key={level} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <div className={cn("size-2 rounded-full", riskBgColors[level])} />
                                          <span className="capitalize font-medium">{level}</span>
                                        </div>
                                        <span className={cn("font-semibold tabular-nums", riskColors[level])}>
                                          {count}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <motion.div
                                          className={cn("h-full rounded-full", riskBgColors[level])}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Assessment status */}
                                <Separator />
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    <span className="text-foreground font-medium">{reg.assessmentStatus.open}</span> open
                                  </span>
                                  <span>
                                    <span className="text-foreground font-medium">{reg.assessmentStatus.in_progress}</span> in progress
                                  </span>
                                  <span>
                                    <span className="text-foreground font-medium">{reg.assessmentStatus.resolved}</span> resolved
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* ── Checklist Progress Comparison ── */}
                    <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.15 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <ListChecks className="size-4 text-muted-foreground" />
                              Checklist Progress
                            </CardTitle>
                            {betterProgress !== "tie" && (
                              <WinnerBadge isWinner label="More Complete" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {comparisonData.regulations.map((reg, idx) => (
                              <div key={reg.id} className={cn(
                                "space-y-3 rounded-lg border p-4 transition-all",
                                betterProgress === `reg${idx + 1}` && "border-emerald-500/30 bg-emerald-500/5"
                              )}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "inline-flex size-5 items-center justify-center rounded text-[10px] font-bold",
                                      idx === 0 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                                    )}>
                                      {idx === 0 ? "A" : "B"}
                                    </span>
                                    <span className="text-xs font-medium truncate max-w-[160px]">{reg.title.substring(0, 28)}...</span>
                                  </div>
                                </div>

                                <div className="flex items-end gap-2">
                                  <span className="text-2xl font-bold tabular-nums">{reg.checklistProgress}%</span>
                                  <span className="text-xs text-muted-foreground pb-0.5">
                                    {reg.checklistCompleted}/{reg.checklistTotal} items
                                  </span>
                                </div>

                                <Progress
                                  value={reg.checklistProgress}
                                  className={cn(
                                    "h-2.5",
                                    reg.checklistProgress >= 80 ? "[&>div]:bg-emerald-500" :
                                    reg.checklistProgress >= 50 ? "[&>div]:bg-teal-500" :
                                    reg.checklistProgress >= 25 ? "[&>div]:bg-amber-500" :
                                    "[&>div]:bg-red-500"
                                  )}
                                />

                                <div className="flex items-center gap-2 text-xs">
                                  {reg.checklistProgress >= 80 ? (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]">
                                      <CheckCircle2 className="size-2.5" />On Track
                                    </Badge>
                                  ) : reg.checklistProgress >= 50 ? (
                                    <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20 gap-1 text-[10px]">
                                      <TrendingUp className="size-2.5" />In Progress
                                    </Badge>
                                  ) : reg.checklistTotal > 0 ? (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-[10px]">
                                      <ShieldAlert className="size-2.5" />Needs Attention
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      No checklist
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* ── Tags Comparison ── */}
                    <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.2 }}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Tag className="size-4 text-muted-foreground" />
                            Tags
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Shared tags */}
                          {comparisonData.tagComparison.shared.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                                <span className="font-medium">Shared Tags</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {comparisonData.tagComparison.shared.length}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {comparisonData.tagComparison.shared.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unique tags per regulation */}
                          {comparisonData.tagComparison.unique.map((entry) => {
                            const reg = comparisonData.regulations.find((r) => r.id === entry.regulationId);
                            const idx = comparisonData.regulations.findIndex((r) => r.id === entry.regulationId);
                            if (!reg || entry.tags.length === 0) return null;
                            return (
                              <div key={entry.regulationId} className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <XCircle className="size-3.5 text-amber-500" />
                                  <span className="font-medium">
                                    Unique to {idx === 0 ? "Regulation A" : "Regulation B"}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {entry.tags.length}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {entry.tags.map((tag) => (
                                    <Badge
                                      key={tag.id}
                                      variant="outline"
                                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs"
                                    >
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          {comparisonData.tagComparison.shared.length === 0 &&
                            comparisonData.tagComparison.unique.every((u) => u.tags.length === 0) && (
                            <p className="text-sm text-muted-foreground">No tags assigned to either regulation</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* ── Common Themes ── */}
                    {comparisonData.commonThemes.length > 0 && (
                      <motion.div {...fadeInUp} transition={{ duration: 0.3, delay: 0.25 }}>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="size-4 text-muted-foreground" />
                              Common Themes
                              <Badge variant="secondary" className="text-[10px]">
                                {comparisonData.commonThemes.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-1.5">
                              {comparisonData.commonThemes.map((t) => (
                                <Badge
                                  key={t.theme}
                                  variant="outline"
                                  className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 gap-1 text-xs"
                                >
                                  {t.theme}
                                  <span className="text-[9px] text-teal-500/60 ml-0.5">×{t.count}</span>
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
