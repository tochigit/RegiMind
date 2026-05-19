"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  FileUp,
  ShieldAlert,
  Kanban,
  X,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppPage } from "@/components/layout/app-sidebar";

interface OnboardingGuideProps {
  assessedRegulations: number;
  onNavigate: (page: AppPage) => void;
  className?: string;
}

interface OnboardingStep {
  step: number;
  icon: React.ElementType;
  title: string;
  description: string;
  page: AppPage;
  color: string;
  bgColor: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    step: 1,
    icon: ScrollText,
    title: "Review Regulations",
    description: "Browse the regulatory feed to stay updated on the latest compliance requirements and upcoming changes.",
    page: "regulations",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    step: 2,
    icon: FileUp,
    title: "Upload Documents",
    description: "Add your internal compliance documents, SOPs, and policy manuals to the document library.",
    page: "documents",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
  },
  {
    step: 3,
    icon: ShieldAlert,
    title: "Run Assessment",
    description: "Use the War Room to analyze gaps between regulations and your internal documents with AI assistance.",
    page: "war-room",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/20",
  },
  {
    step: 4,
    icon: Kanban,
    title: "Track Progress",
    description: "Manage remediation tasks on the Kanban board and track your team's progress toward compliance.",
    page: "tasks",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const STORAGE_KEY = "regimind:onboarding-dismissed";

// Track listeners for the custom localStorage store
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // Default to dismissed on server to prevent flash
  return true;
}

function useDismissedState(): [boolean, () => void] {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setDismissed = useCallback((value: boolean) => {
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      emitChange();
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  return [dismissed, () => setDismissed(true)];
}

export function OnboardingGuide({ assessedRegulations, onNavigate, className }: OnboardingGuideProps) {
  const [dismissed, handleDismiss] = useDismissedState();

  // Only show when there are no assessments and not dismissed
  if (assessedRegulations > 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        <Card className="mesh-bg overflow-hidden">
          <div className="gradient-border absolute inset-0 rounded-[var(--radius)]" />
          <div className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                    <Rocket className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Getting Started</CardTitle>
                    <CardDescription>
                      Follow these steps to set up your compliance workflow
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleDismiss}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="glass rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {onboardingSteps.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200 group onboard-step-glow"
                    >
                      {/* Step number + icon */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className={`flex size-10 items-center justify-center rounded-xl border ${step.bgColor} transition-transform duration-200 group-hover:scale-105`}>
                          <step.icon className={`size-4.5 ${step.color}`} />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
                          STEP {step.step}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-sm font-semibold">{step.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                          {step.description}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 gap-1 px-2 text-xs text-primary hover:text-primary hover:bg-primary/8"
                          onClick={() => onNavigate(step.page)}
                        >
                          Get Started
                          <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
