"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  X,
  TrendingUp,
  ShieldAlert,
  Clock,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  Target,
  Layers,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface InsightsData {
  complianceScore: number;
  gapClosureRate: number;
  avgTimeToClose: number;
  riskDistribution: { high: number; medium: number; low: number };
  complianceTrend: { week: string; count: number }[];
  documentCoverage: number;
  taskCompletionRate: number;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  upcomingDeadlines: {
    id: string;
    title: string;
    source: string;
    region: string;
    effectiveDate: string;
    daysUntilEffective: number;
  }[];
  deadlineSummary: { within30: number; within60: number; within90: number };
  topRiskAreas: {
    description: string;
    count: number;
    riskScore: string;
  }[];
}

interface InsightsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ComplianceScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return { stroke: "var(--primary)", text: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 50) return { stroke: "#f59e0b", text: "text-amber-600 dark:text-amber-400" };
    return { stroke: "#ef4444", text: "text-red-600 dark:text-red-400" };
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            opacity="0.3"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold text-fade-in", color.text)}>{score}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Score
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {score >= 80 ? "Excellent compliance posture" : score >= 50 ? "Moderate - improvements needed" : "Critical - immediate action required"}
      </p>
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function getRiskBadge(riskScore: string) {
  switch (riskScore) {
    case "High":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-500/20";
    case "Medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-500/20";
    case "Low":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-36 rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  );
}

export function InsightsPanel({ open, onOpenChange }: InsightsPanelProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insights");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchInsights();
    }
  }, [open, fetchInsights]);

  const totalRisks =
    data?.riskDistribution.high +
    data?.riskDistribution.medium +
    data?.riskDistribution.low || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
              <BarChart3 className="size-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base gradient-text">Compliance Insights</SheetTitle>
              <SheetDescription>
                Advanced analytics and compliance metrics
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4">
          {loading || !data ? (
            <InsightsSkeleton />
          ) : (
            <div className="space-y-6 px-6 pb-6">
              {/* Compliance Score Gauge */}
              <Card className="card-stripe card-depth morph-card">
                <CardContent className="p-5">
                  <ComplianceScoreGauge score={data.complianceScore} />
                </CardContent>
              </Card>

              <div className="animated-separator-h my-1" />

              {/* Gap Closure Rate */}
              <Card className="card-stripe card-depth morph-card">
                <CardHeader className="pb-3 px-5 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      Gap Closure Rate
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5",
                        data.gapClosureRate >= 70
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : data.gapClosureRate >= 40
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      )}
                    >
                      {data.gapClosureRate}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <Progress value={data.gapClosureRate} className="h-2.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {data.gapClosureRate}% of gaps resolved
                    </span>
                    <span>
                      Avg. {data.avgTimeToClose} day{data.avgTimeToClose !== 1 ? "s" : ""} to close
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card className="card-stripe card-depth morph-card">
                <CardHeader className="pb-3 px-5 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <StatBar
                    label="High Risk"
                    value={data.riskDistribution.high}
                    max={totalRisks}
                    color="bg-red-500 risk-indicator-bar-high"
                  />
                  <StatBar
                    label="Medium Risk"
                    value={data.riskDistribution.medium}
                    max={totalRisks}
                    color="bg-amber-500 risk-indicator-bar-medium"
                  />
                  <StatBar
                    label="Low Risk"
                    value={data.riskDistribution.low}
                    max={totalRisks}
                    color="bg-emerald-500 risk-indicator-bar-low"
                  />
                </CardContent>
              </Card>

              {/* Task Completion Rate */}
              <Card className="card-stripe card-depth morph-card">
                <CardHeader className="pb-3 px-5 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      Task Completion
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5",
                        data.taskCompletionRate >= 70
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      )}
                    >
                      {data.doneTasks}/{data.totalTasks}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <Progress value={data.taskCompletionRate} className="h-2.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{data.taskCompletionRate}% complete</span>
                    {data.overdueTasks > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {data.overdueTasks} overdue
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Document Coverage */}
              <Card className="card-stripe card-depth morph-card">
                <CardHeader className="pb-3 px-5 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="size-4 text-teal-500" />
                      Document Coverage
                    </CardTitle>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {data.documentCoverage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <Progress value={data.documentCoverage} className="h-2.5" />
                  <p className="text-xs text-muted-foreground">
                    Documents assessed for compliance gaps
                  </p>
                </CardContent>
              </Card>

              <Separator />

              {/* Upcoming Deadlines */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Clock className="size-4 text-muted-foreground" />
                  Upcoming Deadlines
                  <div className="flex gap-1.5 ml-auto">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      30d: {data.deadlineSummary.within30}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      60d: {data.deadlineSummary.within60}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      90d: {data.deadlineSummary.within90}
                    </Badge>
                  </div>
                </h3>
                {data.upcomingDeadlines.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="size-8 text-muted-foreground/30 mx-auto mb-2 float-in" />
                    <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.upcomingDeadlines.slice(0, 5).map((deadline) => (
                      <div
                        key={deadline.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold",
                            deadline.daysUntilEffective <= 30
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : deadline.daysUntilEffective <= 60
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          <span>{deadline.daysUntilEffective}</span>
                          <span className="font-normal">days</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{deadline.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {deadline.source}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {deadline.effectiveDate && format(new Date(deadline.effectiveDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Top Risk Areas */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  Top Risk Areas
                </h3>
                {data.topRiskAreas.length === 0 ? (
                  <div className="text-center py-6">
                    <ShieldAlert className="size-8 text-muted-foreground/30 mx-auto mb-2 float-in" />
                    <p className="text-xs text-muted-foreground">No risk areas identified</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.topRiskAreas.map((area, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center justify-center size-6 rounded-full bg-muted text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed">{area.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1.5 py-0 border-0", getRiskBadge(area.riskScore))}
                            >
                              {area.riskScore}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {area.count} occurrence{area.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function InsightsPanelTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 h-9 shrink-0"
      onClick={onClick}
    >
      <BarChart3 className="size-3.5" />
      <span className="hidden sm:inline">Insights</span>
    </Button>
  );
}
