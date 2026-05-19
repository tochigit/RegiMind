"use client";

import React from "react";
import { Grid3X3, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GapsByRisk {
  high: number;
  medium: number;
  low: number;
}

interface RiskMatrixProps {
  gapsByRisk: GapsByRisk;
  className?: string;
}

type Likelihood = "Low" | "Medium" | "High";
type Impact = "Low" | "Medium" | "High";

interface MatrixCell {
  likelihood: Likelihood;
  impact: Impact;
  count: number;
}

function getCellColor(likelihood: Likelihood, impact: Impact, count: number): string {
  if (count === 0) {
    return "bg-muted/30 border-border/40 text-muted-foreground/40";
  }

  const riskScore = (likelihood === "High" ? 3 : likelihood === "Medium" ? 2 : 1) *
                    (impact === "High" ? 3 : impact === "Medium" ? 2 : 1);

  switch (riskScore) {
    case 9: // High Likelihood + High Impact
      return "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400";
    case 6: // (High+Medium) or (Medium+High)
      return "bg-orange-500/12 border-orange-500/25 text-orange-700 dark:text-orange-400";
    case 4: // Medium + Medium
      return "bg-yellow-500/12 border-yellow-500/25 text-yellow-700 dark:text-yellow-400";
    case 3: // (High+Low) or (Low+High)
      return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400";
    case 2: // (Medium+Low) or (Low+Medium)
      return "bg-lime-500/10 border-lime-500/20 text-lime-700 dark:text-lime-400";
    case 1: // Low + Low
      return "bg-emerald-500/12 border-emerald-500/25 text-emerald-700 dark:text-emerald-400";
    default:
      return "bg-muted/30 border-border/40 text-muted-foreground";
  }
}

function getCellDotColor(likelihood: Likelihood, impact: Impact, count: number): string {
  if (count === 0) return "bg-muted-foreground/30";

  const riskScore = (likelihood === "High" ? 3 : likelihood === "Medium" ? 2 : 1) *
                    (impact === "High" ? 3 : impact === "Medium" ? 2 : 1);

  if (riskScore >= 6) return "bg-red-500";
  if (riskScore >= 4) return "bg-yellow-500";
  if (riskScore >= 2) return "bg-amber-500";
  return "bg-emerald-500";
}

function getRiskLabel(likelihood: Likelihood, impact: Impact): string {
  const riskScore = (likelihood === "High" ? 3 : likelihood === "Medium" ? 2 : 1) *
                    (impact === "High" ? 3 : impact === "Medium" ? 2 : 1);

  if (riskScore >= 9) return "Critical";
  if (riskScore >= 6) return "High";
  if (riskScore >= 4) return "Medium";
  if (riskScore >= 2) return "Low";
  return "Minimal";
}

export function RiskMatrix({ gapsByRisk, className }: RiskMatrixProps) {
  // Build 3x3 matrix using simple heuristic mapping
  // High risk → High Likelihood + High Impact
  // Medium risk → Medium Likelihood + Medium Impact
  // Low risk → Low Likelihood + Low Impact
  const buildMatrix = (): MatrixCell[][] => {
    const matrix: MatrixCell[][] = [];

    // Y-axis: Impact (High → Medium → Low, top to bottom)
    const impacts: Impact[] = ["High", "Medium", "Low"];
    const likelihoods: Likelihood[] = ["Low", "Medium", "High"];

    for (const impact of impacts) {
      const row: MatrixCell[] = [];
      for (const likelihood of likelihoods) {
        let count = 0;
        // Simple heuristic: map risk level to corresponding likelihood + impact
        if (likelihood === "High" && impact === "High") {
          count = gapsByRisk.high;
        } else if (likelihood === "Medium" && impact === "Medium") {
          count = gapsByRisk.medium;
        } else if (likelihood === "Low" && impact === "Low") {
          count = gapsByRisk.low;
        }
        row.push({ likelihood, impact, count });
      }
      matrix.push(row);
    }

    return matrix;
  };

  const matrix = buildMatrix();
  const totalGaps = gapsByRisk.high + gapsByRisk.medium + gapsByRisk.low;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <Grid3X3 className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Risk Assessment Matrix</CardTitle>
            <CardDescription>Gap distribution by likelihood and impact</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="glass rounded-lg p-4">
          {/* Matrix Grid */}
          <div className="flex flex-col gap-1">
            {/* X-axis label */}
            <div className="flex items-end ml-16 sm:ml-20">
              <div className="flex-1 text-center text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1.5">
                Likelihood →
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-1">
              {/* Empty corner */}
              <div className="w-16 sm:w-20 shrink-0" />
              {["Low", "Medium", "High"].map((label) => (
                <div key={label} className="flex-1 text-center text-xs font-medium text-muted-foreground py-1.5">
                  {label}
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {matrix.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-1">
                {/* Y-axis label */}
                <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground py-1">
                  <span className={rowIndex === 2 ? "mt-3" : rowIndex === 0 ? "-mt-3" : ""}>
                    {row[0].impact}
                  </span>
                </div>

                {/* Cells */}
                {row.map((cell, colIndex) => (
                  <TooltipProvider key={`${rowIndex}-${colIndex}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            flex-1 aspect-square min-h-[64px] rounded-lg border flex flex-col items-center justify-center gap-1
                            transition-all duration-200 hover:scale-[1.03] cursor-default
                            ${getCellColor(cell.likelihood, cell.impact, cell.count)}
                          `}
                        >
                          <span className="text-xl sm:text-2xl font-bold leading-none">
                            {cell.count}
                          </span>
                          {cell.count > 0 && (
                            <span className="text-[10px] font-medium opacity-75">
                              {getRiskLabel(cell.likelihood, cell.impact)}
                            </span>
                          )}
                          <div className={`size-1.5 rounded-full mt-0.5 ${getCellDotColor(cell.likelihood, cell.impact, cell.count)}`} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">
                          {cell.likelihood} Likelihood × {cell.impact} Impact
                        </p>
                        <p className="text-muted-foreground">
                          {cell.count} gap{cell.count !== 1 ? "s" : ""} · Risk: {getRiskLabel(cell.likelihood, cell.impact)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            ))}

            {/* Y-axis label */}
            <div className="flex items-center ml-16 sm:ml-20 mt-1">
              <div className="flex-1 text-center text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                ← Impact
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              <span className="text-[11px] text-muted-foreground">Minimal (1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-lime-500/30 border border-lime-500/50" />
              <span className="text-[11px] text-muted-foreground">Low (2-3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50" />
              <span className="text-[11px] text-muted-foreground">Medium (4)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-orange-500/30 border border-orange-500/50" />
              <span className="text-[11px] text-muted-foreground">High (6)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-red-500/30 border border-red-500/50" />
              <span className="text-[11px] text-muted-foreground">Critical (9)</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Info className="size-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/60">{totalGaps} total gap{totalGaps !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
