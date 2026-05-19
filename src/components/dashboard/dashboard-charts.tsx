"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardChartsProps {
  totalRegulations: number;
  assessedRegulations: number;
  gapsByRisk: { high: number; medium: number; low: number };
  className?: string;
}

const RISK_BAR_COLORS = [
  "var(--chart-3)", // High risk - red/warm
  "var(--chart-4)", // Medium risk - amber/yellow
  "var(--chart-1)", // Low risk - primary teal
];

const COMPLIANCE_COLORS = [
  "var(--chart-1)", // Assessed - primary teal
  "var(--chart-5)", // Unassessed - secondary warm
];

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function RiskBarTooltip({ active, payload }: CustomBarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{data.name}</p>
      <p className="text-sm font-semibold">
        {data.value} gap{data.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number };
  }>;
}

function CompliancePieTooltip({ active, payload }: CustomPieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{data.name}</p>
      <p className="text-sm font-semibold">{data.value} regulation{data.value !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function DashboardCharts({
  totalRegulations,
  assessedRegulations,
  gapsByRisk,
  className,
}: DashboardChartsProps) {
  const unassessedRegulations = totalRegulations - assessedRegulations;

  const riskData = [
    { name: "High", value: gapsByRisk.high },
    { name: "Medium", value: gapsByRisk.medium },
    { name: "Low", value: gapsByRisk.low },
  ];

  const complianceData = [
    { name: "Assessed", value: assessedRegulations },
    { name: "Unassessed", value: unassessedRegulations },
  ];

  const assessmentRate =
    totalRegulations > 0
      ? Math.round((assessedRegulations / totalRegulations) * 100)
      : 0;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Risk Distribution Bar Chart */}
      <Card className="card-depth">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Distribution</CardTitle>
          <CardDescription>Compliance gaps by risk severity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] transition-transform duration-300 ease-out hover:scale-[1.01]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskData}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  content={<RiskBarTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={64}
                >
                  {riskData.map((_, index) => (
                    <Cell key={`risk-cell-${index}`} fill={RISK_BAR_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-2">
            <div className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: RISK_BAR_COLORS[0] }}
              />
              <span className="text-xs text-muted-foreground">High ({gapsByRisk.high})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: RISK_BAR_COLORS[1] }}
              />
              <span className="text-xs text-muted-foreground">Medium ({gapsByRisk.medium})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: RISK_BAR_COLORS[2] }}
              />
              <span className="text-xs text-muted-foreground">Low ({gapsByRisk.low})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Overview Donut */}
      <Card className="card-depth">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compliance Overview</CardTitle>
          <CardDescription>Regulations assessment progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8 transition-transform duration-300 ease-out hover:scale-[1.01]">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {complianceData.map((_, index) => (
                      <Cell
                        key={`compliance-cell-${index}`}
                        fill={COMPLIANCE_COLORS[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CompliancePieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{assessmentRate}%</span>
                <span className="text-[11px] text-muted-foreground">Assessed</span>
              </div>
            </div>

            {/* Stats breakdown */}
            <div className="flex flex-col gap-3 min-w-[120px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: COMPLIANCE_COLORS[0] }}
                  />
                  <span className="text-sm text-muted-foreground">Assessed</span>
                </div>
                <p className="text-xl font-bold pl-[18px]">
                  {assessedRegulations}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: COMPLIANCE_COLORS[1] }}
                  />
                  <span className="text-sm text-muted-foreground">Unassessed</span>
                </div>
                <p className="text-xl font-bold pl-[18px]">
                  {unassessedRegulations}
                </p>
              </div>
              <div className="pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Total Regulations</span>
                <p className="text-lg font-semibold">{totalRegulations}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
