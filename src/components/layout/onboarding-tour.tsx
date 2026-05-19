"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  ScrollText,
  FileText,
  ShieldAlert,
  Kanban,
  Settings,
  PartyPopper,
  Lightbulb,
  Target,
  BookOpen,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────

export type TourStep = {
  id: string;
  targetPage: string;
  title: string;
  description: string;
  highlight?: string;
  icon: React.ElementType;
};

export interface OnboardingStatus {
  completedSteps: string[];
  isComplete: boolean;
}

// ── Tour Steps ─────────────────────────────────────────────

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    targetPage: "dashboard",
    title: "Welcome to RegiMind",
    description:
      "Your all-in-one compliance automation platform. Track regulations, manage documents, run impact assessments, and stay audit-ready — all powered by AI. Let's take a quick tour!",
    highlight: "main",
    icon: Compass,
  },
  {
    id: "regulations",
    targetPage: "regulations",
    title: "Regulations Feed",
    description:
      "Browse, search, and filter regulatory changes from FDA, EU, and ISO. Bookmark important ones, add tags, and compare regulations side by side.",
    highlight: "filter-bar",
    icon: ScrollText,
  },
  {
    id: "documents",
    targetPage: "documents",
    title: "Document Library",
    description:
      "Manage your internal compliance documents — SOPs, quality manuals, and risk reports. Upload, version, and link them to regulatory requirements.",
    highlight: "add-button",
    icon: FileText,
  },
  {
    id: "war-room",
    targetPage: "war-room",
    title: "War Room — Impact Assessment",
    description:
      "The AI-powered engine that analyzes regulatory changes against your documents. It identifies gaps, assigns risk scores, and creates remediation tasks automatically.",
    highlight: "assess-button",
    icon: ShieldAlert,
  },
  {
    id: "tasks",
    targetPage: "tasks",
    title: "Task Board",
    description:
      "A Kanban board for tracking all remediation tasks. Prioritize work, assign to team members, add comments, and track progress through to completion.",
    highlight: "new-task-button",
    icon: Kanban,
  },
  {
    id: "settings",
    targetPage: "settings",
    title: "All Done!",
    description:
      "Pro tip: Use ⌘K for the command palette to navigate anywhere instantly. Check the Settings page to customize your experience. You're all set to manage compliance with confidence!",
    highlight: "main",
    icon: PartyPopper,
  },
];

// ── Main Component ──────────────────────────────────────────

interface OnboardingTourProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isComplete?: boolean;
  completedSteps?: string[];
  onComplete?: (steps: string[], isComplete: boolean) => void;
}

export function OnboardingTour({
  currentPage,
  onNavigate,
  isComplete: isCompleteProp,
  completedSteps: completedStepsProp,
  onComplete,
}: OnboardingTourProps) {
  const [tourActive, setTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(
    completedStepsProp || []
  );
  const [isComplete, setIsComplete] = useState(isCompleteProp || false);
  const [loading, setLoading] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
    align: "left" | "right" | "center";
  }>({ top: 50, left: 50, align: "center" });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasAutoSaved = useRef(false);

  // Fetch onboarding status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          setCompletedSteps(data.completedSteps || []);
          setIsComplete(data.isComplete || false);
        }
      } catch {
        // Fallback: check localStorage
        try {
          const stored = localStorage.getItem("regimind:onboarding");
          if (stored) {
            const parsed = JSON.parse(stored);
            setCompletedSteps(parsed.completedSteps || []);
            setIsComplete(parsed.isComplete || false);
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  // Show trigger if not complete and tour not active
  useEffect(() => {
    if (!loading && !isComplete && !tourActive) {
      // Small delay for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isComplete, tourActive]);

  // Navigate to the target page for current step
  useEffect(() => {
    if (!tourActive) return;

    const step = TOUR_STEPS[currentStepIndex];
    if (step && step.targetPage !== currentPage) {
      onNavigate(step.targetPage);
    }

    // Mark step as viewed after 1 second on the page
    const timer = setTimeout(() => {
      markStepComplete(step.id);
    }, 1000);

    return () => clearTimeout(timer);
  }, [tourActive, currentStepIndex]);

  // Save progress to API and localStorage
  const saveProgress = useCallback(
    async (steps: string[], complete: boolean) => {
      try {
        await fetch("/api/onboarding/status", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedSteps: steps, isComplete: complete }),
        });
      } catch {
        // Fallback to localStorage
      }
      try {
        localStorage.setItem(
          "regimind:onboarding",
          JSON.stringify({ completedSteps: steps, isComplete: complete })
        );
      } catch {
        // ignore
      }
      setCompletedSteps(steps);
      setIsComplete(complete);
      onComplete?.(steps, complete);
    },
    [onComplete]
  );

  const markStepComplete = useCallback(
    (stepId: string) => {
      if (completedSteps.includes(stepId)) return;

      const newSteps = [...completedSteps, stepId];
      const allDone = newSteps.length >= TOUR_STEPS.length;
      saveProgress(newSteps, allDone);
    },
    [completedSteps, saveProgress]
  );

  const startTour = () => {
    // Find first incomplete step
    const firstIncomplete = TOUR_STEPS.findIndex(
      (s) => !completedSteps.includes(s.id)
    );
    setCurrentStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setTourActive(true);
    setIsVisible(false);
  };

  const nextStep = () => {
    const step = TOUR_STEPS[currentStepIndex];
    markStepComplete(step.id);

    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour complete
      const allSteps = TOUR_STEPS.map((s) => s.id);
      saveProgress(allSteps, true);
      setTourActive(false);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const skipTour = () => {
    setTourActive(false);
    const allSteps = TOUR_STEPS.map((s) => s.id);
    saveProgress(allSteps, true);
  };

  const step = TOUR_STEPS[currentStepIndex];
  const StepIcon = step?.icon || Sparkles;
  const progress = completedSteps.length;
  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Calculate tooltip position (center of screen for simplicity)
  useEffect(() => {
    if (!tourActive || !step) return;

    // Position tooltip in a good spot
    const updatePosition = () => {
      const isSmallScreen = window.innerWidth < 640;
      const top = isSmallScreen
        ? Math.max(window.innerHeight * 0.6, 280)
        : Math.max(window.innerHeight * 0.35, 200);
      const left = isSmallScreen ? 20 : Math.max(window.innerWidth * 0.3, 200);

      setTooltipPosition({
        top: Math.min(top, window.innerHeight - 200),
        left: Math.min(left, window.innerWidth - 380),
        align: isSmallScreen ? "left" : "left",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [tourActive, currentStepIndex, step]);

  if (loading) return null;

  return (
    <>
      {/* Floating Get Started button */}
      {isVisible && !tourActive && !isComplete && (
        <button
          onClick={startTour}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl",
            "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
            "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
            "transition-all duration-300 animate-slide-up group",
            "hover:scale-[1.03] active:scale-[0.98]"
          )}
        >
          <div className="relative">
            <Sparkles className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-yellow-400 animate-ping opacity-75" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-yellow-400" />
          </div>
          <span className="text-sm font-medium">Get Started</span>
          <ChevronRight className="size-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Tour overlay and tooltip */}
      {tourActive && step && (
        <>
          {/* Semi-transparent backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={skipTour}
          />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className={cn(
              "fixed z-[101] w-[340px] sm:w-[380px]",
              "animate-slide-up"
            )}
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            <div className="rounded-xl bg-background border shadow-xl overflow-hidden">
              {/* Header with gradient */}
              <div className="px-5 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                    <StepIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Step {currentStepIndex + 1} of {totalSteps}
                    </p>
                  </div>
                  <button
                    onClick={skipTour}
                    className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{
                      width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Step indicators (dots) */}
              <div className="px-5 pb-3 flex items-center justify-center gap-1.5">
                {TOUR_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      idx === currentStepIndex
                        ? "w-5 bg-primary"
                        : completedSteps.includes(s.id)
                          ? "w-1.5 bg-primary/40"
                          : "w-1.5 bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Footer buttons */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted"
                    >
                      <ChevronLeft className="size-3" />
                      Back
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={skipTour}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
                  >
                    Skip tour
                  </button>
                  <button
                    onClick={nextStep}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                      "active:scale-[0.98]"
                    )}
                  >
                    {isLastStep ? (
                      <>
                        <PartyPopper className="size-3" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="size-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Exported trigger for manual start ───────────────────────

export function OnboardingTourTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl",
        "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
        "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
        "transition-all duration-300 animate-slide-up group",
        "hover:scale-[1.03] active:scale-[0.98]"
      )}
    >
      <div className="relative">
        <Sparkles className="size-4" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-yellow-400 animate-ping opacity-75" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-yellow-400" />
      </div>
      <span className="text-sm font-medium">Get Started</span>
      <ChevronRight className="size-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
