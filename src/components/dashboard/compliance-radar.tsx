"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Radar, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

interface RadarScore {
  axis: string;
  score: number;
  total: number;
  completed: number;
  pending: number;
}

interface RadarData {
  scores: RadarScore[];
  overallScore: number;
  totalItems: number;
  completedItems: number;
}

// ── Axis colors ────────────────────────────────────────────

const AXIS_COLORS: Record<string, { stroke: string; fill: string; bg: string; text: string }> = {
  "Quality System": {
    stroke: "#14b8a6",
    fill: "rgba(20, 184, 166, 0.15)",
    bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
  },
  "Design Controls": {
    stroke: "#a78bfa",
    fill: "rgba(167, 139, 250, 0.15)",
    bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
  },
  "Risk Management": {
    stroke: "#f87171",
    fill: "rgba(248, 113, 113, 0.15)",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    text: "text-red-600 dark:text-red-400",
  },
  "Labeling": {
    stroke: "#fbbf24",
    fill: "rgba(251, 191, 36, 0.15)",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  "Clinical Evidence": {
    stroke: "#34d399",
    fill: "rgba(52, 211, 153, 0.15)",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

// ── SVG Radar Chart ────────────────────────────────────────

function RadarChart({ scores, animated }: { scores: RadarScore[]; animated: boolean }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = 105;
  const levels = 5;
  const numAxes = scores.length;

  // Calculate angle for each axis (start from top, go clockwise)
  const getAngle = (index: number) => {
    return (Math.PI * 2 * index) / numAxes - Math.PI / 2;
  };

  // Get point on radar for given axis index and value (0-100)
  const getPoint = (index: number, value: number) => {
    const angle = getAngle(index);
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Build data polygon path
  const dataPath = scores
    .map((s, i) => {
      const p = getPoint(i, animated ? s.score : 0);
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
    })
    .join(" ") + " Z";

  // Build filled data polygon path
  const dataFillPath = dataPath;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.08" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid - concentric polygons */}
      {Array.from({ length: levels }).map((_, level) => {
        const r = (maxRadius * (level + 1)) / levels;
        const path = scores
          .map((_, i) => {
            const angle = getAngle(i);
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ") + " Z";

        return (
          <path
            key={level}
            d={path}
            fill="none"
            stroke="var(--border)"
            strokeWidth={level === levels - 1 ? 1.5 : 0.5}
            strokeOpacity={0.5 + (level * 0.1)}
          />
        );
      })}

      {/* Axis lines */}
      {scores.map((_, i) => {
        const angle = getAngle(i);
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeOpacity={0.4}
          />
        );
      })}

      {/* Level labels (20%, 40%, 60%, 80%, 100%) */}
      {Array.from({ length: levels }).map((_, level) => {
        const pct = ((level + 1) / levels) * 100;
        return (
          <text
            key={level}
            x={center + 4}
            y={center - (maxRadius * (level + 1)) / levels - 4}
            fill="var(--muted-foreground)"
            fontSize="8"
            opacity={0.5}
          >
            {pct}%
          </text>
        );
      })}

      {/* Data polygon fill */}
      <path
        d={dataFillPath}
        fill="url(#radarGrad)"
        stroke="none"
        className="transition-all duration-1000 ease-out"
      />

      {/* Data polygon stroke */}
      <path
        d={dataPath}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        filter="url(#glow)"
        className="transition-all duration-1000 ease-out"
        strokeDasharray={animated ? "none" : "2000"}
        strokeDashoffset={animated ? "0" : "2000"}
      />

      {/* Data points with hover-friendly invisible larger circles */}
      {scores.map((s, i) => {
        const p = getPoint(i, animated ? s.score : 0);
        const color = AXIS_COLORS[s.axis]?.stroke || "var(--primary)";
        return (
          <g key={i}>
            {/* Invisible hit area */}
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" className="cursor-pointer" />
            {/* Outer ring */}
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill="var(--background)"
              stroke={color}
              strokeWidth={2}
              className="transition-all duration-1000 ease-out"
            />
            {/* Inner dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill={color}
              className="transition-all duration-1000 ease-out"
            />
          </g>
        );
      })}

      {/* Axis labels */}
      {scores.map((s, i) => {
        const angle = getAngle(i);
        const labelRadius = maxRadius + 20;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);

        // Adjust text anchor based on position
        let textAnchor: string = "middle";
        if (Math.abs(Math.cos(angle)) > 0.5) {
          textAnchor = Math.cos(angle) > 0 ? "start" : "end";
        }

        const color = AXIS_COLORS[s.axis]?.text || "text-muted-foreground";

        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="500"
            className={cn(color, "select-none")}
          >
            {s.axis}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────

export function ComplianceRadar() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/compliance-radar");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch radar data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger animation after data loads
  useEffect(() => {
    if (!loading && data) {
      const timer = setTimeout(() => setAnimated(true), 200);
      return () => clearTimeout(timer);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <Card className="card-depth">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Skeleton className="size-[280px] rounded-full" />
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="card-depth">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Radar className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No radar data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="card-depth">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Radar className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Compliance Radar</CardTitle>
                <CardDescription className="mt-0.5">
                  Checklist completion across {data.totalItems} items
                </CardDescription>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/80 text-xs font-medium">
                  <span className={cn(
                    "text-base font-bold",
                    data.overallScore >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                    data.overallScore >= 40 ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {data.overallScore}%
                  </span>
                  <span className="text-muted-foreground">overall</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{data.completedItems} of {data.totalItems} items completed</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <RadarChart scores={data.scores} animated={animated} />

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {data.scores.map((s) => {
              const colors = AXIS_COLORS[s.axis];
              if (!colors) return null;
              return (
                <Tooltip key={s.axis}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] px-2 py-0.5 gap-1.5 cursor-default transition-all hover:shadow-sm",
                        colors.bg
                      )}
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: colors.stroke }}
                      />
                      {s.axis}
                      <span className="font-semibold">{s.score}%</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{s.axis}: {s.score}%</p>
                      <p className="text-muted-foreground">
                        {s.completed} completed · {s.pending} pending · {s.total} total
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Score breakdown mini-bar */}
          <div className="mt-4 space-y-2">
            {data.scores.map((s) => {
              const colors = AXIS_COLORS[s.axis];
              return (
                <div key={s.axis} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground w-28 shrink-0 truncate">{s.axis}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${animated ? s.score : 0}%`,
                        backgroundColor: colors?.stroke || "var(--primary)",
                      }}
                    />
                  </div>
                  <span className={cn("text-[11px] font-semibold w-8 text-right tabular-nums", colors?.text)}>
                    {s.score}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
