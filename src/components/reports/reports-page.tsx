"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ScrollText,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  Target,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────

interface AnalyticsData {
  complianceScore: number;
  totalRegulations: number;
  totalDocuments: number;
  totalTasks: number;
  totalOpenGaps: number;
  gapsByRisk: { high: number; medium: number; low: number };
  taskCompletionRate: number;
  tasksByStatus: { todo: number; in_review: number; done: number };
  documentsCoverage: number;
  avgDaysToClose: number;
  regulationsBySource: Record<string, number>;
  regulationsByStatus: Record<string, number>;
  assessedRegulations: number;
  recentGapTrend: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };
  topRegulationsWithGaps: {
    id: string;
    title: string;
    source: string;
    openGaps: number;
  }[];
  overdueTasks: number;
}

// ── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ── Helper: Score Ring ─────────────────────────────────────────────

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-yellow-500"
        : score >= 40
          ? "text-orange-500"
          : "text-red-500";

  return (
    <div className="relative flex items-center justify-center score-ring-animated" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={String(circumference)}
          strokeDashoffset={String(offset)}
          className={cn(color, "transition-all duration-1000 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">Score</span>
      </div>
    </div>
  );
}

// ── Helper: Horizontal Bar ────────────────────────────────────────

function HorizontalBar({
  label,
  value,
  max,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ElementType;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Loading Skeleton ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
          <BarChart3 className="relative size-12 text-muted-foreground animate-pulse" />
        </div>
        <p className="text-lg font-medium">No analytics data available</p>
        <p className="text-sm text-muted-foreground">Please seed the database with sample data first.</p>
        <Button onClick={() => { setLoading(true); fetchAnalytics(); }}>Refresh</Button>
      </div>
    );
  }

  const maxSourceCount = Math.max(...Object.values(data.regulationsBySource), 1);
  const totalGaps = data.gapsByRisk.high + data.gapsByRisk.medium + data.gapsByRisk.low;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ────────────────────────────────────────── */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance Reports</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Comprehensive analytics and compliance metrics</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            fetchAnalytics();
          }}
        >
          <Activity className="size-3.5" />
          Refresh
        </Button>
      </motion.div>

      {/* ── Summary Cards Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-in">
        {/* Compliance Score */}
        <motion.div variants={itemVariants}>
          <Card className="card-depth card-stripe border-l-[3px] border-l-primary/60 relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={cn(
                      "text-3xl font-bold",
                      data.complianceScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                      data.complianceScore >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                      data.complianceScore >= 40 ? "text-orange-600 dark:text-orange-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {data.complianceScore}
                    </div>
                    <span className="text-sm text-muted-foreground mt-1">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {data.complianceScore >= 80 ? "Excellent health" :
                     data.complianceScore >= 60 ? "Needs attention" :
                     data.complianceScore >= 40 ? "At risk" : "Critical"}
                  </p>
                </div>
                <ScoreRing score={data.complianceScore} size={72} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Open Gaps */}
        <motion.div variants={itemVariants}>
          <Card className="card-depth card-stripe border-l-[3px] border-l-destructive/60 relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Open Gaps</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-3xl font-bold text-destructive">{data.totalOpenGaps}</span>
                    {data.recentGapTrend.last7Days > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-red-600 dark:text-red-400 bg-red-500/10">
                        <ArrowUpRight className="size-3" />
                        +{data.recentGapTrend.last7Days} this week
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {data.gapsByRisk.high} high · {data.gapsByRisk.medium} med · {data.gapsByRisk.low} low
                  </p>
                </div>
                <div className="flex items-center justify-center size-10 rounded-xl bg-destructive/10">
                  <AlertTriangle className="size-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Completion Rate */}
        <motion.div variants={itemVariants}>
          <Card className="card-depth card-stripe border-l-[3px] border-l-emerald-500/60 relative overflow-hidden">
            <CardContent className="p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Task Completion Rate</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "text-3xl font-bold",
                    data.taskCompletionRate >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                    data.taskCompletionRate >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {data.taskCompletionRate}%
                  </span>
                  {data.taskCompletionRate >= 70 && (
                    <TrendingUp className="size-4 text-emerald-500" />
                  )}
                  {data.taskCompletionRate < 40 && (
                    <TrendingDown className="size-4 text-red-500" />
                  )}
                </div>
                <Progress value={data.taskCompletionRate} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {data.tasksByStatus.done} of {data.totalTasks} tasks done
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents Coverage */}
        <motion.div variants={itemVariants}>
          <Card className="card-depth card-stripe border-l-[3px] border-l-teal-500/60 relative overflow-hidden">
            <CardContent className="p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Documents Coverage</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "text-3xl font-bold",
                    data.documentsCoverage >= 80 ? "text-teal-600 dark:text-teal-400" :
                    data.documentsCoverage >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-orange-600 dark:text-orange-400"
                  )}>
                    {data.documentsCoverage}%
                  </span>
                </div>
                <Progress value={data.documentsCoverage} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {data.totalDocuments} documents · {data.assessedRegulations} assessed
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (wider) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Regulation Coverage */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Regulation Coverage</CardTitle>
                    <CardDescription>Regulations by source</CardDescription>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {Object.entries(data.regulationsBySource).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No regulations found</p>
                ) : (
                  Object.entries(data.regulationsBySource)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <HorizontalBar
                        key={source}
                        label={source}
                        value={count}
                        max={maxSourceCount}
                        color={
                          source === "FDA"
                            ? "bg-teal-500"
                            : source === "EU"
                              ? "bg-amber-500"
                              : "bg-violet-500"
                        }
                        icon={ScrollText}
                      />
                    ))
                )}
                {/* Regulations by status */}
                <Separator className="my-2" />
                <div className="grid grid-cols-3 gap-3">
                  {(["new", "assessed", "archived"] as const).map((status) => (
                    <div key={status} className="text-center p-2 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{data.regulationsByStatus[status] || 0}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gap Analysis */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-destructive/10 text-destructive">
                    <ShieldAlert className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Gap Analysis</CardTitle>
                    <CardDescription>Gap distribution by risk level</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">{totalGaps} total</Badge>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-destructive/20 via-border to-transparent" />
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                {/* High Risk */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">High Risk</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">{data.gapsByRisk.high}</Badge>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full inner-shadow"
                      initial={{ width: 0 }}
                      animate={{ width: `${totalGaps > 0 ? (data.gapsByRisk.high / totalGaps) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                  {data.gapsByRisk.high > 0 && (
                    <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">−{data.gapsByRisk.high * 20} points impact</p>
                  )}
                </div>
                {/* Medium Risk */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-yellow-500" />
                      <span className="text-sm font-medium">Medium Risk</span>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-xs">{data.gapsByRisk.medium}</Badge>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full inner-shadow"
                      initial={{ width: 0 }}
                      animate={{ width: `${totalGaps > 0 ? (data.gapsByRisk.medium / totalGaps) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                  {data.gapsByRisk.medium > 0 && (
                    <p className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">−{data.gapsByRisk.medium * 10} points impact</p>
                  )}
                </div>
                {/* Low Risk */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">Low Risk</span>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">{data.gapsByRisk.low}</Badge>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full inner-shadow"
                      initial={{ width: 0 }}
                      animate={{ width: `${totalGaps > 0 ? (data.gapsByRisk.low / totalGaps) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                    />
                  </div>
                  {data.gapsByRisk.low > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">−{data.gapsByRisk.low * 5} points impact</p>
                  )}
                </div>

                {/* Recent gap trend */}
                <Separator />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Gap Creation Trend</span>
                  <div className="flex items-center gap-4">
                    <span>7d: <strong className="text-foreground">{data.recentGapTrend.last7Days}</strong></span>
                    <span>30d: <strong className="text-foreground">{data.recentGapTrend.last30Days}</strong></span>
                    <span>90d: <strong className="text-foreground">{data.recentGapTrend.last90Days}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Task Analytics */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Target className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Task Analytics</CardTitle>
                    <CardDescription>Task completion and status breakdown</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">{data.totalTasks} total</Badge>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-violet-500/20 via-border to-transparent" />
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {/* Status breakdown with progress */}
                <div className="space-y-3">
                  {([
                    { label: "To Do", count: data.tasksByStatus.todo, color: "bg-muted-foreground/60", icon: Clock },
                    { label: "In Review", count: data.tasksByStatus.in_review, color: "bg-amber-500", icon: Activity },
                    { label: "Done", count: data.tasksByStatus.done, color: "bg-emerald-500", icon: CheckCircle2 },
                  ] as const).map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon className="size-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{item.count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({data.totalTasks > 0 ? Math.round((item.count / data.totalTasks) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", item.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${data.totalTasks > 0 ? (item.count / data.totalTasks) * 100 : 0}%` }}
                          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overdue & avg close time */}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="size-4 text-destructive" />
                      <span className="text-xs text-muted-foreground font-medium">Overdue Tasks</span>
                    </div>
                    <p className="text-xl font-bold text-destructive mt-1">{data.overdueTasks}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">Avg Close Time</span>
                    </div>
                    <p className="text-xl font-bold mt-1">{data.avgDaysToClose}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
                  </div>
                </div>

                {/* Top regulations with gaps */}
                {data.topRegulationsWithGaps.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top Regulations with Open Gaps</p>
                      <div className="space-y-2">
                        {data.topRegulationsWithGaps.map((reg, idx) => (
                          <div key={reg.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                            <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{reg.title}</p>
                              <p className="text-xs text-muted-foreground">{reg.source}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0 border-destructive/20 text-destructive">
                              {reg.openGaps} gap{reg.openGaps !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Metrics */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Quick Metrics</CardTitle>
                    <CardDescription>Key numbers at a glance</CardDescription>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Regs", value: data.totalRegulations, icon: FileText, color: "text-teal-600 dark:text-teal-400" },
                    { label: "Assessed", value: data.assessedRegulations, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Documents", value: data.totalDocuments, icon: FileText, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Avg Days", value: data.avgDaysToClose, icon: Clock, color: "text-violet-600 dark:text-violet-400" },
                    { label: "Overdue", value: data.overdueTasks, icon: AlertOctagon, color: "text-red-600 dark:text-red-400" },
                    { label: "Total Tasks", value: data.totalTasks, icon: Target, color: "text-primary" },
                  ].map((metric) => (
                    <div key={metric.label} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <metric.icon className={cn("size-4 mb-1.5", metric.color)} />
                      <p className="text-lg font-bold">{metric.value}</p>
                      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Risk Exposure */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Risk Exposure</CardTitle>
                    <CardDescription>Overall risk level indicator</CardDescription>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-destructive/20 via-border to-transparent" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Risk gauge */}
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden stack-shadow gauge-glow">
                    <motion.div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                        data.complianceScore >= 80
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : data.complianceScore >= 60
                            ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                            : data.complianceScore >= 40
                              ? "bg-gradient-to-r from-orange-500 to-orange-400"
                              : "bg-gradient-to-r from-red-500 to-red-400"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - data.complianceScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  {/* Risk level label */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Exposure Level</span>
                    <Badge
                      className={cn(
                        data.complianceScore >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                        data.complianceScore >= 60 ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                        data.complianceScore >= 40 ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" :
                        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      )}
                    >
                      {data.complianceScore >= 80 ? "Low" :
                       data.complianceScore >= 60 ? "Moderate" :
                       data.complianceScore >= 40 ? "High" : "Critical"}
                    </Badge>
                  </div>

                  {/* Risk breakdown */}
                  <div className="space-y-2">
                    {[
                      { label: "High Risk Gaps", value: data.gapsByRisk.high, color: "text-red-500", bg: "bg-red-500/10" },
                      { label: "Medium Risk Gaps", value: data.gapsByRisk.medium, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
                      { label: "Overdue Tasks", value: data.overdueTasks, color: "text-orange-500", bg: "bg-orange-500/10" },
                    ].map((item) => (
                      <div key={item.label} className={cn("flex items-center justify-between p-2 rounded-lg", item.bg)}>
                        <span className="text-xs font-medium">{item.label}</span>
                        <span className={cn("text-sm font-bold", item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Export Section */}
          <motion.div variants={itemVariants}>
            <Card className="card-depth slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                    <Download className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Export Data</CardTitle>
                    <CardDescription>Download compliance reports</CardDescription>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 card-depth group/btn"
                  onClick={() => window.open("/api/reports/compliance", "_blank")}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 transition-all group-hover/btn:from-primary/25 group-hover/btn:to-primary/10 group-hover/btn:border-primary/20">
                    <Download className="size-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Download CSV Report</p>
                    <p className="text-xs text-muted-foreground">Full compliance data export</p>
                  </div>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Includes regulations, gaps, tasks, and documents
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}


