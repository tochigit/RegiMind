"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ComplianceScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#f59e0b"; // amber-500
  if (score >= 40) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "Critical";
}

function getScoreLabelColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/5";
  if (score >= 60) return "border-amber-500/30 bg-amber-500/5";
  if (score >= 40) return "border-orange-500/30 bg-orange-500/5";
  return "border-red-500/30 bg-red-500/5";
}

const sizeConfig = {
  sm: { svg: 80, strokeWidth: 6, radius: 32, fontSize: "text-lg", labelSize: "text-[10px]" },
  md: { svg: 120, strokeWidth: 8, radius: 48, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { svg: 160, strokeWidth: 10, radius: 64, fontSize: "text-4xl", labelSize: "text-sm" },
};

export function ComplianceScoreRing({
  score,
  size = "md",
  showLabel = true,
  className,
}: ComplianceScoreRingProps) {
  const config = sizeConfig[size];
  const center = config.svg / 2;
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const labelColor = getScoreLabelColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("inline-flex flex-col items-center", className)}
    >
      <div className="relative" style={{ width: config.svg, height: config.svg }}>
        <svg
          width={config.svg}
          height={config.svg}
          viewBox={`0 0 ${config.svg} ${config.svg}`}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={config.strokeWidth}
          />
          {/* Score ring */}
          <motion.circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        {/* Center score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn("font-bold leading-none", config.fontSize)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.8 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      {showLabel && (
        <motion.p
          className={cn("mt-2 font-semibold", labelColor, config.labelSize)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1 }}
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  );
}

export function getScoreCardStyle(score: number): string {
  return getScoreBgColor(score);
}

export { getScoreColor, getScoreLabel, getScoreLabelColor };
