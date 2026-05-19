"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  ScrollText,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShieldAlert,
  Activity,
  ShieldCheck,
  Download,
  Zap,
  BarChart3,
  Sliders,
} from "lucide-react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComplianceScoreRing, getScoreCardStyle } from "@/components/dashboard/compliance-score";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { RiskMatrix } from "@/components/dashboard/risk-matrix";
import { RiskMatrixHeatmap } from "@/components/dashboard/risk-matrix-heatmap";
import { OnboardingGuide } from "@/components/dashboard/onboarding-guide";
import { InsightsPanelTrigger } from "@/components/dashboard/insights-panel";
import { ComplianceRadar } from "@/components/dashboard/compliance-radar";
import { GanttWidget } from "@/components/dashboard/gantt-widget";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AppPage } from "@/components/layout/app-sidebar";

interface DashboardPageProps {
  onNavigate: (page: AppPage) => void;
  onOpenInsights?: () => void;
}

// Widget toggle keys
type WidgetKey = "healthScore" | "statsGrid" | "charts" | "riskTrend" | "ganttChart" | "activityTimeline" | "gapBreakdown" | "upcomingQuickActions" | "complianceRadar";

const WIDGET_STORAGE_KEY = "regimind:dashboard-widgets";

const DEFAULT_WIDGETS: Record<WidgetKey, boolean> = {
  healthScore: true,
  statsGrid: true,
  charts: true,
  riskTrend: true,
  ganttChart: true,
  activityTimeline: true,
  gapBreakdown: true,
  upcomingQuickActions: true,
  complianceRadar: true,
};

const WIDGET_LABELS: Record<WidgetKey, string> = {
  healthScore: "Compliance Health Score",
  statsGrid: "Stats Grid",
  charts: "Charts",
  riskTrend: "Risk Trend",
  ganttChart: "Gantt Chart",
  activityTimeline: "Activity Timeline",
  gapBreakdown: "Gap Breakdown",
  upcomingQuickActions: "Upcoming & Quick Actions",
  complianceRadar: "Compliance Radar",
};

function loadWidgetPrefs(): Record<WidgetKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_WIDGETS };
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WIDGETS };
    return { ...DEFAULT_WIDGETS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_WIDGETS };
  }
}

function saveWidgetPrefs(prefs: Record<WidgetKey, boolean>) {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

interface DashboardStats {
  totalRegulations: number;
  newRegulations: number;
  assessedRegulations: number;
  totalDocuments: number;
  totalGaps: number;
  gapsByRisk: { high: number; medium: number; low: number };
  tasksByStatus: { todo: number; in_review: number; done: number };
  overdueTasks: number;
  upcomingRegulations: {
    id: string;
    title: string;
    source: string;
    region: string;
    effectiveDate: string;
    daysUntilEffective: number;
  }[];
}

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
}

interface TrendDay {
  date: string;
  newAssessments: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  tasksCompleted: number;
}

function computeComplianceScore(stats: DashboardStats): number {
  const { high, medium, low } = stats.gapsByRisk;
  const score =
    100 - (high * 20 + medium * 10 + low * 5) - stats.overdueTasks * 5;
  return Math.max(0, Math.min(100, score));
}

function getIconForType(type: string): React.ElementType {
  switch (type) {
    case "assessment":
      return ShieldCheck;
    case "task":
      return CheckCircle2;
    case "regulation":
      return ScrollText;
    case "document":
      return FileText;
    default:
      return Activity;
  }
}

function getIconBgColor(type: string): string {
  switch (type) {
    case "assessment":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "task":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "regulation":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "document":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendDirection = "up",
  variant = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: string;
  trendDirection?: "up" | "down";
  variant?: "default" | "warning" | "danger" | "success";
}) {
  const variantClasses = {
    default: "border-border",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-destructive/30 bg-destructive/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };

  const variantBorderClasses = {
    default: "border-l-primary/40",
    warning: "border-l-yellow-500/40",
    danger: "border-l-destructive/40",
    success: "border-l-emerald-500/40",
  };

  const variantHeaderGradient = {
    default: "from-primary/5 to-transparent",
    warning: "from-yellow-500/5 to-transparent",
    danger: "from-destructive/5 to-transparent",
    success: "from-emerald-500/5 to-transparent",
  };

  const TrendIcon = trendDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={`${variantClasses[variant]} ${variantBorderClasses[variant]} border-l-[3px] card-depth transition-all duration-200 hover:border-primary/20 hover:shadow-sm relative overflow-hidden`}>
      <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${variantHeaderGradient[variant]} pointer-events-none`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
              trendDirection === "up"
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "text-red-600 dark:text-red-400 bg-red-500/10"
            }`}>
              <TrendIcon className="size-3" style={{ animation: "bounce-subtle 2s ease-in-out infinite" }} />
            </span>
          )}
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold">
          {typeof value === "number" ? (
            <AnimatedCounter value={value} />
          ) : (
            value
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = label ? new Date(label + "T00:00:00") : null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md space-y-1">
      <p className="text-xs text-muted-foreground font-medium">
        {d ? format(d, "MMM d, yyyy") : label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">
              {entry.dataKey === "highGaps" ? "High" :
               entry.dataKey === "mediumGaps" ? "Medium" :
               entry.dataKey === "lowGaps" ? "Low" :
               entry.dataKey === "newAssessments" ? "New Assessed" : entry.name}
            </span>
          </div>
          <span className="text-xs font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage({ onNavigate, onOpenInsights }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [trendData, setTrendData] = useState<TrendDay[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [widgetPrefs, setWidgetPrefs] = useState<Record<WidgetKey, boolean>>(DEFAULT_WIDGETS);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Load widget preferences on mount
  useEffect(() => {
    setWidgetPrefs(loadWidgetPrefs());
  }, []);

  const handleToggleWidget = useCallback((key: WidgetKey, checked: boolean) => {
    setWidgetPrefs((prev) => {
      const next = { ...prev, [key]: checked };
      saveWidgetPrefs(next);
      return next;
    });
  }, []);

  const visibleWidgetCount = useMemo(
    () => Object.values(widgetPrefs).filter(Boolean).length,
    [widgetPrefs]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  }, []);

  const fetchTrend = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/trend");
      if (res.ok) {
        const data = await res.json();
        setTrendData(data.days);
      }
    } catch (err) {
      console.error("Failed to fetch trend:", err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchTrend();
  }, [fetchStats, fetchActivities, fetchTrend]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome banner skeleton */}
        <Skeleton className="h-[88px] rounded-xl" />
        {/* Compliance score hero skeleton */}
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
        {/* Trend skeleton */}
        <Skeleton className="h-[300px] rounded-xl" />
        {/* Activity timeline skeleton */}
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
          <AlertTriangle className="relative size-12 text-muted-foreground animate-pulse float-in" />
        </div>
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm text-muted-foreground">
          Please seed the database with sample data.
        </p>
        <Button onClick={async () => {
          await fetch("/api/seed", { method: "POST" });
          setLoading(true);
          fetchStats();
          fetchActivities();
        }}>
          Seed Demo Data
        </Button>
      </div>
    );
  }

  const complianceScore = computeComplianceScore(stats);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative rounded-xl overflow-hidden mesh-bg neon-border hero-gradient">
          <div className="gradient-border absolute inset-0 rounded-xl" />
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome back, Sarah
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You have{" "}
                <span className="font-medium text-foreground">{stats.newRegulations} new regulation{stats.newRegulations !== 1 ? "s" : ""}</span>{" "}
                to review and{" "}
                <span className="font-medium text-foreground">{stats.totalGaps} open compliance gap{stats.totalGaps !== 1 ? "s" : ""}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Customize Widget Button */}
              <Popover open={customizeOpen} onOpenChange={setCustomizeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    title="Customize dashboard widgets"
                  >
                    <Sliders className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3">
                  <div className="space-y-1 mb-3">
                    <p className="text-sm font-medium">Dashboard Widgets</p>
                    <p className="text-xs text-muted-foreground">
                      {visibleWidgetCount} of {Object.keys(WIDGET_LABELS).length} visible
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(WIDGET_LABELS) as WidgetKey[]).map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <Checkbox
                          checked={widgetPrefs[key]}
                          onCheckedChange={(checked) =>
                            handleToggleWidget(key, checked === true)
                          }
                          className="size-4"
                        />
                        <span className="text-xs group-hover:text-foreground text-muted-foreground transition-colors">
                          {WIDGET_LABELS[key]}
                        </span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-background/60 px-4 py-2.5 min-w-[72px]">
                <span className={cn("text-lg font-bold leading-none", stats.newRegulations > 0 && "pulse-glow badge-glow-primary")}>{stats.newRegulations}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">New Regs</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-background/60 px-4 py-2.5 min-w-[72px]">
                <span className="text-lg font-bold leading-none text-destructive">{stats.totalGaps}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Open Gaps</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-background/60 px-4 py-2.5 min-w-[72px]">
                <span className="text-lg font-bold leading-none text-emerald-600 dark:text-emerald-400">{stats.tasksByStatus.done}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Done</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 shrink-0"
                onClick={() => window.open('/api/reports/compliance', '_blank')}
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export Report</span>
              </Button>
              {onOpenInsights && (
                <InsightsPanelTrigger onClick={onOpenInsights} />
              )}
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => {
                  fetchStats();
                  fetchActivities();
                }}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Onboarding Guide - shown when no assessments yet */}
        <OnboardingGuide
          assessedRegulations={stats.assessedRegulations}
          onNavigate={onNavigate}
        />

        {/* Compliance Health Score Hero Card */}
        {widgetPrefs.healthScore && (
        <div className="glass rounded-xl">
        <Card className={`border card-depth bg-gradient-to-br from-primary/3 via-transparent to-primary/5 ${getScoreCardStyle(complianceScore)}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ComplianceScoreRing score={complianceScore} size="lg" showLabel={true} />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold">Compliance Health Score</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on{" "}
                  <span className="font-medium text-foreground">{stats.totalGaps} open gap{stats.totalGaps !== 1 ? "s" : ""}</span>
                  {" "}and{" "}
                  <span className="font-medium text-foreground">{stats.overdueTasks} overdue task{stats.overdueTasks !== 1 ? "s" : ""}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4 justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">
                      High gaps: {stats.gapsByRisk.high} (−{stats.gapsByRisk.high * 20}pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-yellow-500" />
                    <span className="text-xs text-muted-foreground">
                      Med gaps: {stats.gapsByRisk.medium} (−{stats.gapsByRisk.medium * 10}pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      Low gaps: {stats.gapsByRisk.low} (−{stats.gapsByRisk.low * 5}pts)
                    </span>
                  </div>
                  {stats.overdueTasks > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-orange-500" />
                      <span className="text-xs text-muted-foreground">
                        Overdue: {stats.overdueTasks} (−{stats.overdueTasks * 5}pts)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        )}

        {/* Stats Grid */}
        {widgetPrefs.statsGrid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-in relative stack-shadow rounded-xl">
          {/* Background gradient orbs */}
          <div className="gradient-orb size-48 -top-16 -left-24 bg-primary/10" style={{ animationDelay: '0s' }} />
          <div className="gradient-orb size-36 -top-8 right-16 bg-chart-2/8" style={{ animationDelay: '-4s' }} />
          <StatCard
            title="Regulations Tracked"
            value={stats.totalRegulations}
            description={`${stats.newRegulations} new, ${stats.assessedRegulations} assessed`}
            icon={ScrollText}
          />
          <StatCard
            title="Open Compliance Gaps"
            value={stats.totalGaps}
            description={`${stats.gapsByRisk.high} high, ${stats.gapsByRisk.medium} medium, ${stats.gapsByRisk.low} low`}
            icon={AlertTriangle}
            variant={stats.totalGaps > 5 ? "danger" : stats.totalGaps > 0 ? "warning" : "success"}
          />
          <StatCard
            title="Internal Documents"
            value={stats.totalDocuments}
            description="SOPs, manuals, reports"
            icon={FileText}
          />
          <StatCard
            title="Tasks Completed"
            value={stats.tasksByStatus.done}
            description={`${stats.tasksByStatus.todo} todo, ${stats.tasksByStatus.in_review} in review`}
            icon={CheckCircle2}
            variant={stats.tasksByStatus.done > 0 ? "success" : "default"}
          />
        </div>
        )}

        {/* Dashboard Charts */}
        {widgetPrefs.charts && (
        <DashboardCharts
          totalRegulations={stats.totalRegulations}
          assessedRegulations={stats.assessedRegulations}
          gapsByRisk={stats.gapsByRisk}
        />
        )}

        {/* Risk Assessment Matrix - 3x3 Quick View */}
        {widgetPrefs.charts && (
        <RiskMatrix gapsByRisk={stats.gapsByRisk} />
        )}

        {/* 5x5 Risk Matrix Heatmap */}
        {widgetPrefs.charts && (
        <RiskMatrixHeatmap />
        )}

        {/* Compliance Risk Trend */}
        {widgetPrefs.riskTrend && (
        <Card className="slide-up">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Risk Trend (7 Days)</CardTitle>
                  <CardDescription>Compliance gap evolution</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="space-y-3 w-full px-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-lg scale-150" />
                  <BarChart3 className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
                </div>
                <p className="text-sm text-muted-foreground">No trend data available</p>
              </div>
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        tickFormatter={(val: string) => {
                          const d = new Date(val + "T00:00:00");
                          return format(d, "MMM d");
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      />
                      <RechartsTooltip content={<TrendTooltip />} />
                      <Area type="monotone" dataKey="highGaps" stackId="1" stroke="#ef4444" fill="url(#highGrad)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="mediumGaps" stackId="1" stroke="#f59e0b" fill="url(#medGrad)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="lowGaps" stackId="1" stroke="#10b981" fill="url(#lowGrad)" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="newAssessments" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-sm bg-red-500" />
                    <span className="text-xs text-muted-foreground">High Gaps</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-sm bg-amber-500" />
                    <span className="text-xs text-muted-foreground">Medium Gaps</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-sm bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Low Gaps</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">New Assessments</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {/* Gantt Chart Widget */}
        {widgetPrefs.ganttChart && (
        <GanttWidget />
        )}

        {/* Activity Timeline */}
        {widgetPrefs.activityTimeline && (
        <Card className="slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest events across your compliance workspace</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-lg scale-150" />
                  <Activity className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="relative max-h-96 overflow-y-auto custom-scrollbar">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {activities.map((entry) => {
                    const IconComponent = getIconForType(entry.type);
                    const iconColor = getIconBgColor(entry.type);
                    return (
                      <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                        {/* Timeline dot with icon */}
                        <div className={`relative z-10 flex-shrink-0 flex size-[38px] items-center justify-center rounded-full ${iconColor}`}>
                          <IconComponent className="size-4" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm leading-relaxed">{entry.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Compliance Radar + Gap Breakdown side by side */}
        {widgetPrefs.complianceRadar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ComplianceRadar />
          {widgetPrefs.gapBreakdown && (
          <Card className="slide-up card-depth" style={{ animationDelay: '0.15s' }}>
            <CardHeader>
              <CardTitle className="text-base">Gap Analysis Breakdown</CardTitle>
              <CardDescription>Risk distribution of identified compliance gaps</CardDescription>
            </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">High Risk</span>
                  <Badge variant="destructive">{stats.gapsByRisk.high}</Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.high / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Medium Risk</span>
                  <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                    {stats.gapsByRisk.medium}
                  </Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.medium / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Low Risk</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {stats.gapsByRisk.low}
                  </Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.low / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        </div>
        )}

        {/* Standalone Gap Breakdown (when radar is off) */}
        {!widgetPrefs.complianceRadar && widgetPrefs.gapBreakdown && (
        <Card className="slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="text-base">Gap Analysis Breakdown</CardTitle>
            <CardDescription>Risk distribution of identified compliance gaps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">High Risk</span>
                  <Badge variant="destructive">{stats.gapsByRisk.high}</Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.high / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Medium Risk</span>
                  <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                    {stats.gapsByRisk.medium}
                  </Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.medium / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Low Risk</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {stats.gapsByRisk.low}
                  </Badge>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalGaps > 0 ? (stats.gapsByRisk.low / stats.totalGaps) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Upcoming Regulations + Quick Actions */}
        {widgetPrefs.upcomingQuickActions && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Regulations Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="size-4" />
                    Upcoming Regulatory Deadlines
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Regulations with upcoming effective dates
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => onNavigate("regulations")}
                >
                  View All
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats.upcomingRegulations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-lg scale-150" />
                    <Clock className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
                  </div>
                  <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.upcomingRegulations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-start gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                    >
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${
                          reg.daysUntilEffective <= 30
                            ? "bg-destructive/10 text-destructive"
                            : reg.daysUntilEffective <= 60
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <span>{reg.daysUntilEffective}</span>
                        <span className="text-[10px] font-normal">days</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reg.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {reg.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {reg.region}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Effective: {format(new Date(reg.effectiveDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                  <Zap className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription>Common tasks and navigation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 card-depth group/btn"
                onClick={() => onNavigate("war-room")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/10 transition-all group-hover/btn:from-destructive/25 group-hover/btn:to-destructive/10 group-hover/btn:border-destructive/20">
                  <ShieldAlert className="size-4 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Run Impact Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Analyze regulatory gaps
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 card-depth group/btn"
                onClick={() => onNavigate("documents")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 transition-all group-hover/btn:from-primary/25 group-hover/btn:to-primary/10 group-hover/btn:border-primary/20">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Upload Document</p>
                  <p className="text-xs text-muted-foreground">
                    Add internal SOPs or reports
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 card-depth group/btn"
                onClick={() => onNavigate("tasks")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10 transition-all group-hover/btn:from-emerald-500/25 group-hover/btn:to-emerald-500/10 group-hover/btn:border-emerald-500/20">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">View Tasks</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.tasksByStatus.todo + stats.tasksByStatus.in_review} active
                    remediation tasks
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 card-depth group/btn"
                onClick={() => onNavigate("regulations")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/10 transition-all group-hover/btn:from-blue-500/25 group-hover/btn:to-blue-500/10 group-hover/btn:border-blue-500/20">
                  <ScrollText className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Browse Regulations</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.newRegulations} new regulations to review
                  </p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </TooltipProvider>
  );
}
