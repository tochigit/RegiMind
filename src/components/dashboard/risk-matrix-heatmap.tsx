"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Grid3X3, ChevronRight, ShieldAlert, CheckCircle2, Clock, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MatrixCell {
  likelihood: number;
  impact: number;
  count: number;
  riskScore: number;
  riskLevel: string;
  tasks: { id: string; title: string; priority: string; status: string }[];
  likelihoodLabel: string;
  impactLabel: string;
}

interface RiskMatrixData {
  matrix: MatrixCell[];
  summary: {
    totalAssessments: number;
    riskDistribution: { high: number; medium: number; low: number };
    likelihoodLabels: string[];
    impactLabels: string[];
  };
}

function getCellBgColor(score: number, count: number): string {
  if (count === 0) return "bg-muted/20 border-border/30";
  if (score >= 20) return "bg-red-500/25 border-red-500/40";
  if (score >= 16) return "bg-red-500/20 border-red-500/35";
  if (score >= 12) return "bg-orange-500/20 border-orange-500/35";
  if (score >= 9) return "bg-amber-500/18 border-amber-500/30";
  if (score >= 6) return "bg-yellow-500/15 border-yellow-500/25";
  if (score >= 4) return "bg-lime-500/15 border-lime-500/25";
  if (score >= 3) return "bg-emerald-500/12 border-emerald-500/25";
  if (score >= 2) return "bg-emerald-500/10 border-emerald-500/20";
  return "bg-emerald-500/8 border-emerald-500/15";
}

function getCellTextColor(score: number): string {
  if (score >= 12) return "text-red-700 dark:text-red-300";
  if (score >= 6) return "text-amber-700 dark:text-amber-300";
  if (score >= 3) return "text-yellow-700 dark:text-yellow-300";
  return "text-emerald-700 dark:text-emerald-300";
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-[10px] px-1.5 py-0">Med</Badge>;
    case "low":
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">Low</Badge>;
    default:
      return null;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case "in_review":
      return <Clock className="size-3.5 text-amber-500" />;
    default:
      return <ShieldAlert className="size-3.5 text-muted-foreground" />;
  }
}

export function RiskMatrixHeatmap({ className }: { className?: string }) {
  const [data, setData] = useState<RiskMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  const fetchMatrix = useCallback(async () => {
    try {
      const res = await fetch("/api/risk-matrix");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const buildGrid = (cells: MatrixCell[]): MatrixCell[][] => {
    const grid: MatrixCell[][] = Array.from({ length: 5 }, () => []);
    for (const cell of cells) {
      // Impact is the row (1=Catastrophic at top, 5=Negligible at bottom)
      // Likelihood is the column (1=Rare on left, 5=Almost Certain on right)
      const impactRow = 5 - cell.impact; // Invert so Catastrophic is at top
      grid[impactRow][cell.likelihood - 1] = cell;
    }
    return grid;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
              <Grid3X3 className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const grid = buildGrid(data.matrix);
  const maxCount = Math.max(1, ...data.matrix.map((c) => c.count));
  const impactLabels = data.summary.impactLabels; // Negligible → Catastrophic
  const likelihoodLabels = data.summary.likelihoodLabels; // Rare → Almost Certain

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                <Grid3X3 className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Risk Matrix Heatmap</CardTitle>
                <CardDescription>
                  5×5 likelihood vs impact matrix · {data.summary.totalAssessments} total assessments
                </CardDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="destructive" className="text-[10px]">{data.summary.riskDistribution.high} High</Badge>
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-[10px]">{data.summary.riskDistribution.medium} Med</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">{data.summary.riskDistribution.low} Low</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="glass rounded-lg p-3 sm:p-4 heatmap-grid-glow">
            <div className="flex flex-col gap-1">
              {/* Likelihood header */}
              <div className="flex items-end" style={{ marginLeft: "56px" }}>
                <div className="flex-1 text-center text-[10px] font-medium text-muted-foreground tracking-wide uppercase mb-1.5">
                  Likelihood →
                </div>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-1">
                <div className="w-14 shrink-0" />
                {likelihoodLabels.map((label, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-medium text-muted-foreground py-1 truncate">
                    {label}
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-1">
                  {/* Impact label */}
                  <div className="w-14 shrink-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground py-1">
                    {impactLabels[4 - rowIndex]}
                  </div>

                  {/* Cells */}
                  {row.map((cell, colIndex) => (
                    <TooltipProvider key={`${rowIndex}-${colIndex}`} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => cell.count > 0 ? setSelectedCell(cell) : undefined}
                            disabled={cell.count === 0}
                            className={cn(
                              "flex-1 aspect-square min-h-[48px] sm:min-h-[56px] rounded-lg border flex flex-col items-center justify-center gap-0.5 heatmap-cell-hover",
                              "cursor-default",
                              cell.count > 0 && "cursor-pointer active:scale-[0.98]",
                              getCellBgColor(cell.riskScore, cell.count)
                            )}
                          >
                            <span className={cn(
                              "text-base sm:text-lg font-bold leading-none tabular-nums",
                              cell.count === 0 ? "text-muted-foreground/30" : getCellTextColor(cell.riskScore)
                            )}>
                              {cell.count}
                            </span>
                            {cell.count > 0 && (
                              <>
                                <span className={cn(
                                  "text-[8px] sm:text-[9px] font-medium opacity-80",
                                  getCellTextColor(cell.riskScore)
                                )}>
                                  {cell.riskLevel}
                                </span>
                                {/* Intensity bar */}
                                <div className="w-6 h-1 rounded-full bg-foreground/10 mt-0.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-current opacity-50 transition-all duration-500"
                                    style={{
                                      width: `${Math.max(8, (cell.count / maxCount) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[200px] heatmap-tooltip-glass">
                          <p className="font-medium">
                            {cell.likelihoodLabel} × {cell.impactLabel}
                          </p>
                          <p className="text-muted-foreground">
                            {cell.count} assessment{cell.count !== 1 ? "s" : ""} · Score: {cell.riskScore} · {cell.riskLevel}
                          </p>
                          {cell.count > 0 && cell.tasks.length > 0 && (
                            <p className="text-muted-foreground pt-0.5">
                              {cell.tasks.length} task{cell.tasks.length !== 1 ? "s" : ""} · Click to view
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}

              {/* Impact axis label */}
              <div className="flex items-center mt-1" style={{ marginLeft: "56px" }}>
                <div className="flex-1 text-center text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
                  ← Impact
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/50" />
                <span className="text-[10px] text-muted-foreground">Minimal (1-2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-yellow-500/40 border border-yellow-500/50" />
                <span className="text-[10px] text-muted-foreground">Low (3-5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-amber-500/40 border border-amber-500/50" />
                <span className="text-[10px] text-muted-foreground">Medium (6-9)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-orange-500/40 border border-orange-500/50" />
                <span className="text-[10px] text-muted-foreground">High (12-16)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-red-500/40 border border-red-500/50" />
                <span className="text-[10px] text-muted-foreground">Critical (20-25)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Detail Panel */}
      {selectedCell && (
        <Card className="slide-up">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex size-10 items-center justify-center rounded-xl border",
                  selectedCell.riskScore >= 12
                    ? "bg-red-500/15 border-red-500/30"
                    : selectedCell.riskScore >= 6
                    ? "bg-amber-500/15 border-amber-500/30"
                    : "bg-emerald-500/15 border-emerald-500/30"
                )}>
                  <Grid3X3 className={cn(
                    "size-5",
                    selectedCell.riskScore >= 12
                      ? "text-red-600 dark:text-red-400"
                      : selectedCell.riskScore >= 6
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedCell.likelihoodLabel} × {selectedCell.impactLabel}
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      selectedCell.riskScore >= 12
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : selectedCell.riskScore >= 6
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    )}>
                      Score: {selectedCell.riskScore} · {selectedCell.riskLevel}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {selectedCell.count} assessment{selectedCell.count !== 1 ? "s" : ""} in this cell · {selectedCell.tasks.length} linked task{selectedCell.tasks.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setSelectedCell(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCell.tasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tasks linked to this risk area
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {selectedCell.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getPriorityBadge(task.priority)}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
