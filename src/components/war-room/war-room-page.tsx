"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Brain,
  FileText,
  Zap,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Clock,
  Target,
  Wrench,
  Plus,
  Search,
  Filter,
  Database,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  ClipboardList,
  AlertOctagon,
  CheckCircle2 as CheckCircle2Icon,
  X,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AppPage } from "@/components/layout/app-sidebar";

interface WarRoomPageProps {
  onNavigate: (page: AppPage) => void;
}

interface Regulation {
  id: string;
  title: string;
  source: string;
  region: string;
  status: string;
  effectiveDate: string | null;
  publishedDate: string;
  rawText: string;
  aiSummary: string | null;
  deltaJson: string | null;
  needsReview: boolean;
  _count?: { impactAssessments: number };
}

interface ImpactAssessment {
  id: string;
  regulationId: string;
  documentId: string;
  riskScore: string;
  gapDescription: string | null;
  requiredAction: string | null;
  aiRecommendation: string | null;
  status: string;
  createdAt: string;
  document?: { id: string; title: string; docType: string };
  regulation?: { id: string; title: string; source: string };
  tasks?: { id: string; title: string; status: string }[];
}

interface RegulationWithAssessments extends Regulation {
  impactAssessments?: ImpactAssessment[];
}

interface BulkResult {
  success: boolean;
  assessed: number;
  failed: number;
  totalGaps: number;
  results: { regulationId: string; gapCount: number }[];
}

function getDeltaCount(deltaJson: string | null): number {
  if (!deltaJson) return 0;
  try {
    const parsed = JSON.parse(deltaJson);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 1;
  }
}

function getRiskBadgeVariant(riskScore: string) {
  switch (riskScore.toLowerCase()) {
    case "high":
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20">
          <AlertTriangle className="size-3 mr-1" />
          High Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
          <AlertCircle className="size-3 mr-1" />
          Medium Risk
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
          <CheckCircle2 className="size-3 mr-1" />
          Low Risk
        </Badge>
      );
    default:
      return <Badge variant="outline">{riskScore}</Badge>;
  }
}

function getSourceBadgeColor(source: string) {
  const colors: Record<string, string> = {
    FDA: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    EU: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    ISO: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };
  return colors[source] || "bg-muted text-muted-foreground";
}

function AnalyzingOverlay() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    "Parsing regulatory delta changes...",
    "Cross-referencing with internal documents...",
    "Running AI gap analysis engine...",
    "Generating risk scores and recommendations...",
    "Compiling impact assessment report...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3 + 1;
      });
      setStep((prev) => {
        if (progress > 80) return Math.min(prev, steps.length - 1);
        return Math.min(Math.floor(progress / 20), steps.length - 1);
      });
    }, 500);
    return () => clearInterval(interval);
  }, [progress, steps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center mesh-bg">
      <div className="max-w-md w-full mx-4">
        <Card className="glass border-primary/20 shadow-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center gap-6">
            {/* Brain animation with spinning rings */}
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="absolute -inset-4 spinning-ring-1">
                <div className="size-full rounded-full border-2 border-dashed border-primary/20" />
              </div>
              {/* Inner spinning ring */}
              <div className="absolute -inset-8 spinning-ring-2">
                <div className="size-full rounded-full border border-dotted border-primary/10" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
              <div className="relative size-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="size-10 text-primary animate-pulse float-in" />
              </div>
            </div>

            {/* Data flow lines */}
            <div className="w-full space-y-1">
              <div className="data-flow-line h-[2px] rounded-full w-full" />
              <div className="data-flow-line h-[2px] rounded-full w-4/5" />
              <div className="data-flow-line h-[2px] rounded-full w-3/5" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Analyzing Regulatory Impact</h3>
              <p className="text-sm text-muted-foreground transition-all duration-500">
                {steps[step]}
              </p>
            </div>

            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              <span>AI engine processing — this may take a moment</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RegulationCard({
  regulation,
  onAssess,
  isAssessing,
  selected,
  onToggleSelect,
}: {
  regulation: Regulation;
  onAssess: (reg: Regulation) => void;
  isAssessing: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const deltaCount = getDeltaCount(regulation.deltaJson);

  return (
    <Card className={cn(
      "group hover:border-primary/20 hover:shadow-sm transition-all duration-200",
      selected && "border-primary/40 ring-1 ring-primary/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(regulation.id)}
              className="mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          <div className="flex-1 min-w-0 space-y-1.5">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {regulation.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={getSourceBadgeColor(regulation.source)}>
                {regulation.source}
              </Badge>
              <span className="text-xs text-muted-foreground">{regulation.region}</span>
              {regulation.effectiveDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {format(new Date(regulation.effectiveDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          </div>
          {regulation.needsReview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="size-4 text-amber-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Flagged for manual review</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {regulation.aiSummary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {regulation.aiSummary}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="size-3" />
              {deltaCount} {deltaCount === 1 ? "delta" : "deltas"}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => onAssess(regulation)}
            disabled={isAssessing}
            className="gap-1.5"
          >
            {isAssessing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="size-3.5" />
                Assess Impact
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GapAnalysisCard({
  assessment,
  regulationTitle,
  onCreateTask,
}: {
  assessment: ImpactAssessment;
  regulationTitle: string;
  onCreateTask: (assessment: ImpactAssessment, regTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasTask = assessment.tasks && assessment.tasks.length > 0;
  const isHighRisk = assessment.riskScore.toLowerCase() === "high";

  return (
    <Card className={`overflow-hidden card-depth hover:shadow-sm transition-all duration-200 relative ${isHighRisk ? "danger-glow risk-border-high" : assessment.riskScore.toLowerCase() === "medium" ? "risk-border-medium" : "risk-border-low"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex-shrink-0 size-10 rounded-lg flex items-center justify-center mt-0.5 ${
                assessment.riskScore.toLowerCase() === "high"
                  ? "bg-red-500/10"
                  : assessment.riskScore.toLowerCase() === "medium"
                  ? "bg-amber-500/10"
                  : "bg-emerald-500/10"
              }`}
            >
              {assessment.riskScore.toLowerCase() === "high" ? (
                <ShieldAlert className="size-5 text-red-600 dark:text-red-400" />
              ) : assessment.riskScore.toLowerCase() === "medium" ? (
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-sm font-semibold">
                {assessment.document?.title || "Unknown Document"}
              </CardTitle>
              {assessment.document?.docType && (
                <CardDescription className="text-xs">
                  {assessment.document.docType}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getRiskBadgeVariant(assessment.riskScore)}
            {hasTask && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Wrench className="size-2.5" />
                Task Created
              </Badge>
            )}
          </div>
        </div>
        {/* Risk level indicator bar */}
        <div className={`risk-indicator-bar ${
          assessment.riskScore.toLowerCase() === "high"
            ? "risk-indicator-bar-high"
            : assessment.riskScore.toLowerCase() === "medium"
            ? "risk-indicator-bar-medium"
            : "risk-indicator-bar-low"
        }`} />
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Gap Description */}
        {assessment.gapDescription && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Target className="size-3" />
              Gap Identified
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {assessment.gapDescription}
            </p>
          </div>
        )}

        {/* Required Action */}
        {assessment.requiredAction && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Wrench className="size-3" />
              Required Action
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {assessment.requiredAction}
            </p>
          </div>
        )}

        {/* AI Recommendation - expandable */}
        {assessment.aiRecommendation && (
          <div className="space-y-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Brain className="size-3" />
              AI Remediation Guidance
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/50 text-sm prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{assessment.aiRecommendation}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Assessed {format(new Date(assessment.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </span>
          <Button
            size="sm"
            variant={hasTask ? "outline" : "default"}
            disabled={hasTask}
            onClick={() => onCreateTask(assessment, regulationTitle)}
            className="gap-1.5"
          >
            {hasTask ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Task Exists
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentResultsPanel({
  regulation,
  assessments,
  onCreateTask,
  onClose,
}: {
  regulation: Regulation;
  assessments: ImpactAssessment[];
  onCreateTask: (assessment: ImpactAssessment, regTitle: string) => void;
  onClose: () => void;
}) {
  const highCount = assessments.filter((a) => a.riskScore.toLowerCase() === "high").length;
  const mediumCount = assessments.filter((a) => a.riskScore.toLowerCase() === "medium").length;
  const lowCount = assessments.filter((a) => a.riskScore.toLowerCase() === "low").length;

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 -ml-2">
              <ArrowRight className="size-3.5 rotate-180" />
              Back
            </Button>
          </div>
          <h3 className="text-lg font-semibold">{regulation.title}</h3>
          <p className="text-sm text-muted-foreground">
            Impact assessment completed for {assessments.length}{" "}
            {assessments.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            {highCount} High
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {mediumCount} Medium
          </Badge>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {lowCount} Low
          </Badge>
        </div>
      </div>

      {/* Summary Alert */}
      {highCount > 0 && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <ShieldAlert className="size-4 text-red-500" />
          <AlertTitle className="text-red-600 dark:text-red-400">
            {highCount} High-Risk Gap{highCount > 1 ? "s" : ""} Identified
          </AlertTitle>
          <AlertDescription className="text-red-700/80 dark:text-red-300/80">
            Immediate attention required. These gaps may result in regulatory non-compliance and should be addressed as a priority.
          </AlertDescription>
        </Alert>
      )}

      {/* Assessment Cards - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assessments.map((assessment) => (
          <GapAnalysisCard
            key={assessment.id}
            assessment={assessment}
            regulationTitle={regulation.title}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>
    </div>
  );
}

function AssessedRegulationCard({
  regulationWithAssessments,
  onView,
}: {
  regulationWithAssessments: RegulationWithAssessments;
  onView: (reg: RegulationWithAssessments) => void;
}) {
  const assessments = regulationWithAssessments.impactAssessments || [];
  const highCount = assessments.filter((a) => a.riskScore.toLowerCase() === "high").length;
  const mediumCount = assessments.filter((a) => a.riskScore.toLowerCase() === "medium").length;
  const lowCount = assessments.filter((a) => a.riskScore.toLowerCase() === "low").length;
  const openGaps = assessments.filter((a) => a.status === "open").length;

  return (
    <Card
      className="card-depth hover:border-primary/20 hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={() => onView(regulationWithAssessments)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {regulationWithAssessments.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={getSourceBadgeColor(regulationWithAssessments.source)}>
                {regulationWithAssessments.source}
              </Badge>
              <span className="text-xs text-muted-foreground">{regulationWithAssessments.region}</span>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <FileText className="size-3" />
            {assessments.length} {assessments.length === 1 ? "document" : "documents"} analyzed
          </span>
          {openGaps > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="size-3" />
              {openGaps} open {openGaps === 1 ? "gap" : "gaps"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]">
              {highCount} High
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
              {mediumCount} Med
            </Badge>
          )}
          {lowCount > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
              {lowCount} Low
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WarRoomPage({ onNavigate }: WarRoomPageProps) {
  // Data states
  const [unassessedRegs, setUnassessedRegs] = useState<Regulation[]>([]);
  const [assessedRegs, setAssessedRegs] = useState<RegulationWithAssessments[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssessed, setLoadingAssessed] = useState(false);

  // Interaction states
  const [activeTab, setActiveTab] = useState("unassessed");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Results state
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<ImpactAssessment[]>([]);

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  // Viewed assessment from All Assessments tab
  const [viewedAssessedReg, setViewedAssessedReg] = useState<RegulationWithAssessments | null>(null);

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAssessing, setIsBulkAssessing] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Filter logic for unassessed regulations (needed by selectAllFiltered)
  const filteredUnassessed = unassessedRegs.filter((reg) => {
    const matchesSearch =
      !searchQuery ||
      reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const allIds = filteredUnassessed.map((r) => r.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [filteredUnassessed, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAssess = async () => {
    if (selectedIds.size < 2) return;
    setIsBulkAssessing(true);

    try {
      const res = await fetch("/api/assess/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regulationIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Bulk assessment failed");
      }

      const data = await res.json() as BulkResult;
      setBulkResult(data);
      setBulkDialogOpen(true);
      setSelectedIds(new Set());

      toast.success("Bulk assessment completed", {
        description: `${data.assessed} regulations assessed, ${data.totalGaps} gaps identified`,
      });

      await fetchUnassessed();
      await fetchAssessed();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Bulk assessment failed", { description: message });
    } finally {
      setIsBulkAssessing(false);
    }
  };

  const fetchUnassessed = useCallback(async () => {
    try {
      const res = await fetch("/api/regulations?status=new");
      if (res.ok) {
        const data = await res.json();
        setUnassessedRegs(data);
      }
    } catch (err) {
      console.error("Failed to fetch unassessed regulations:", err);
    }
  }, []);

  const fetchAssessed = useCallback(async () => {
    setLoadingAssessed(true);
    try {
      const res = await fetch("/api/regulations?status=assessed&include=assessments");
      if (res.ok) {
        const data = await res.json();
        setAssessedRegs(data as RegulationWithAssessments[]);
      }
    } catch (err) {
      console.error("Failed to fetch assessed regulations:", err);
    } finally {
      setLoadingAssessed(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUnassessed(), fetchAssessed()]);
    setLoading(false);
  }, [fetchUnassessed, fetchAssessed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssess = async (regulation: Regulation) => {
    setAssessingId(regulation.id);
    setIsAnalyzing(true);

    try {
      const res = await fetch(`/api/assess/${regulation.id}`, { method: "POST" });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Assessment failed");
      }

      // Fetch full regulation data with assessments
      const detailRes = await fetch(`/api/regulations/${regulation.id}`);
      if (detailRes.ok) {
        const fullData = await detailRes.json();
        setSelectedRegulation(regulation);
        setAssessmentResults(fullData.impactAssessments || []);
      }

      toast.success("Impact assessment completed", {
        description: `Analyzed ${regulation.title}`,
      });

      // Refresh data
      await fetchUnassessed();
      await fetchAssessed();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Assessment failed", {
        description: message,
      });
    } finally {
      setAssessingId(null);
      setIsAnalyzing(false);
    }
  };

  const handleCreateTask = (assessment: ImpactAssessment, regulationTitle: string) => {
    setSelectedAssessment(assessment);
    setTaskTitle(
      `Update ${assessment.document?.title || "Document"} to comply with ${regulationTitle}`
    );
    setTaskDescription(
      assessment.aiRecommendation || assessment.requiredAction || assessment.gapDescription || ""
    );
    setTaskPriority(
      assessment.riskScore.toLowerCase() === "high"
        ? "high"
        : assessment.riskScore.toLowerCase() === "medium"
        ? "medium"
        : "low"
    );
    setTaskDialogOpen(true);
  };

  const handleSubmitTask = async () => {
    if (!selectedAssessment || !taskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          impactAssessmentId: selectedAssessment.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Remediation task created", {
        description: `"${taskTitle}" has been added to the task board`,
      });

      setTaskDialogOpen(false);

      // Refresh the assessment results to show task was created
      if (selectedRegulation) {
        const detailRes = await fetch(`/api/regulations/${selectedRegulation.id}`);
        if (detailRes.ok) {
          const fullData = await detailRes.json();
          setAssessmentResults(fullData.impactAssessments || []);
        }
      }
      if (viewedAssessedReg) {
        await fetchAssessed();
        // Re-select the viewed regulation
        const updated = assessedRegs.find((r) => r.id === viewedAssessedReg.id);
        if (updated) {
          const detailRes = await fetch(`/api/regulations/${updated.id}`);
          if (detailRes.ok) {
            setViewedAssessedReg(await detailRes.json());
          }
        }
      }
    } catch {
      toast.error("Failed to create task", {
        description: "Please try again or check the task board",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        toast.success("Demo data seeded successfully", {
          description: "Loading sample regulations and documents...",
        });
        await loadData();
      } else {
        throw new Error("Seed failed");
      }
    } catch {
      toast.error("Failed to seed data", {
        description: "Please try again",
      });
    }
  };

  const handleViewAssessedReg = (reg: RegulationWithAssessments) => {
    setViewedAssessedReg(reg);
    setSelectedRegulation(reg);
    setAssessmentResults(reg.impactAssessments || []);
  };

  // Filter logic
  const filteredAssessed = assessedRegs.filter((reg) => {
    const matchesSearch =
      !searchQuery ||
      reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.source.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (riskFilter === "all") return true;
    const assessments = reg.impactAssessments || [];
    return assessments.some((a) => a.riskScore.toLowerCase() === riskFilter);
  });

  // Summary statistics
  const summaryStats = useMemo(() => {
    const allAssessments = assessedRegs.flatMap((reg) => reg.impactAssessments || []);
    return {
      totalAssessments: assessedRegs.length,
      openGaps: allAssessments.filter((a) => a.status === "open").length,
      highRiskGaps: allAssessments.filter((a) => a.riskScore.toLowerCase() === "high").length,
      tasksCreated: allAssessments.filter((a) => a.tasks && a.tasks.length > 0).length,
    };
  }, [assessedRegs]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // If showing assessment results (from unassessed tab)
  const showResults = selectedRegulation && !viewedAssessedReg;
  // If showing assessment results (from assessed tab)
  const showAssessedResults = viewedAssessedReg && selectedRegulation;

  return (
    <TooltipProvider>
      {isAnalyzing && <AnalyzingOverlay />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                <ShieldAlert className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">War Room</h1>
                <p className="text-muted-foreground text-sm">
                  AI-powered regulatory impact assessment engine
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-2"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedData}
              className="gap-2"
            >
              <Database className="size-3.5" />
              Seed Data
            </Button>
          </div>
        </div>

        {/* Summary Statistics Bar */}
        {!selectedRegulation && !viewedAssessedReg && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Assessments",
                value: summaryStats.totalAssessments,
                borderColor: "border-l-primary",
                iconBg: "bg-primary/10 text-primary",
                icon: ClipboardList,
              },
              {
                label: "Open Gaps",
                value: summaryStats.openGaps,
                borderColor: "border-l-amber-500",
                iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                icon: AlertTriangle,
              },
              {
                label: "High Risk Gaps",
                value: summaryStats.highRiskGaps,
                borderColor: "border-l-red-500",
                iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
                icon: AlertOctagon,
              },
              {
                label: "Tasks Created",
                value: summaryStats.tasksCreated,
                borderColor: "border-l-emerald-500",
                iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                icon: CheckCircle2Icon,
              },
            ].map((stat, index) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.08, ease: "easeOut" }}
                >
                  <Card className={cn("card-depth border-l-[3px] relative overflow-hidden", stat.borderColor)}>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/30 via-primary/5 to-transparent" />
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex items-center justify-center size-8 rounded-lg shrink-0", stat.iconBg)}>
                          <StatIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-bold leading-none tabular-nums">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Back button when viewing results */}
        {(showResults || showAssessedResults) ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRegulation(null);
                setAssessmentResults([]);
                setViewedAssessedReg(null);
              }}
              className="gap-2 -ml-2 mb-2"
            >
              <ArrowRight className="size-3.5 rotate-180" />
              Back to War Room
            </Button>
            <AssessmentResultsPanel
              regulation={selectedRegulation!}
              assessments={assessmentResults}
              onCreateTask={handleCreateTask}
              onClose={() => {
                setSelectedRegulation(null);
                setAssessmentResults([]);
                setViewedAssessedReg(null);
              }}
            />
          </div>
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search regulations by title, source, or region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 input-polished"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="gap-0">
                <TabsTrigger value="unassessed" className={cn("gap-2 tab-underline", activeTab === "unassessed" && "tab-underline-active")}>
                  <Zap className="size-3.5" />
                  Unassessed
                  {unassessedRegs.length > 0 && (
                    <Badge variant="secondary" className={cn("ml-1 h-5 px-1.5 text-[10px] badge-enter", unassessedRegs.length > 0 && "badge-pulse")}>
                      {unassessedRegs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assessed" className={cn("gap-2 tab-underline", activeTab === "assessed" && "tab-underline-active")}>
                  <CheckCircle2 className="size-3.5" />
                  All Assessments
                  {assessedRegs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] badge-enter">
                      {assessedRegs.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Unassessed Tab */}
              <TabsContent value="unassessed" className="mt-4 space-y-4">
                {filteredUnassessed.length === 0 ? (
                  unassessedRegs.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
                          <div className="relative size-16 rounded-full bg-muted/80 flex items-center justify-center">
                            <ShieldAlert className="size-8 text-muted-foreground/70 animate-pulse float-in" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">
                            {searchQuery ? "No matching regulations" : "All Clear!"}
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            {searchQuery
                              ? "No unassessed regulations match your search. Try adjusting your filters."
                              : "There are no unassessed regulations at this time. New regulatory changes will appear here for impact assessment."}
                          </p>
                        </div>
                        {!searchQuery && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Compliance status is up to date
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
                          <Search className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">No results found</h3>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search terms
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={filteredUnassessed.length > 0 && filteredUnassessed.every((r) => selectedIds.has(r.id))}
                          onCheckedChange={selectAllFiltered}
                        />
                        <p className="text-sm text-muted-foreground">
                          {filteredUnassessed.length} regulation{filteredUnassessed.length !== 1 ? "s" : ""} pending impact assessment
                        </p>
                      </div>
                      {selectedIds.size > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {selectedIds.size} selected
                        </span>
                      )}
                    </div>
                    <div className="relative war-room-unassessed-mesh rounded-xl p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredUnassessed.map((reg) => (
                        <RegulationCard
                          key={reg.id}
                          regulation={reg}
                          onAssess={handleAssess}
                          isAssessing={assessingId === reg.id}
                          selected={selectedIds.has(reg.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                    </div>
                    {/* Floating action bar */}
                    {selectedIds.size >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="sticky bottom-4 mt-4"
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card border shadow-lg border-primary/20">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                              <Layers className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{selectedIds.size} regulations selected</p>
                              <p className="text-xs text-muted-foreground">
                                Assess all selected at once
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearSelection}
                              className="gap-1.5"
                            >
                              <X className="size-3.5" />
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleBulkAssess}
                              disabled={isBulkAssessing}
                              className="gap-1.5"
                            >
                              {isBulkAssessing ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  Assessing...
                                </>
                              ) : (
                                <>
                                  <Target className="size-3.5" />
                                  Assess Selected
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Assessed Tab */}
              <TabsContent value="assessed" className="mt-4 space-y-4">
                {loadingAssessed ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-44 rounded-xl" />
                    ))}
                  </div>
                ) : filteredAssessed.length === 0 ? (
                  assessedRegs.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl scale-150" />
                          <div className="relative flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
                            <Brain className="size-8 text-primary animate-pulse float-in" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">No Assessments Yet</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            {searchQuery || riskFilter !== "all"
                              ? "No assessed regulations match your filters. Try adjusting your search or risk filter."
                              : "Start by assessing unassessed regulations. Click the \"Assess Impact\" button on any regulation card to perform an AI-powered gap analysis."}
                          </p>
                        </div>
                        {!searchQuery && riskFilter === "all" && (
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("unassessed")}
                            className="gap-2"
                          >
                            <Zap className="size-3.5" />
                            Go to Unassessed
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
                          <Search className="relative size-8 text-muted-foreground/50 animate-pulse float-in" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">No results found</h3>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your search or risk filter
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {filteredAssessed.length} regulation{filteredAssessed.length !== 1 ? "s" : ""} assessed
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAssessed.map((reg) => (
                        <AssessedRegulationCard
                          key={reg.id}
                          regulationWithAssessments={reg}
                          onView={handleViewAssessedReg}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Bulk Assessment Result Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Bulk Assessment Complete
            </DialogTitle>
            <DialogDescription>
              Summary of the bulk impact assessment results
            </DialogDescription>
          </DialogHeader>
          {bulkResult && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{bulkResult.assessed}</p>
                  <p className="text-xs text-muted-foreground mt-1">Assessed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bulkResult.totalGaps}</p>
                  <p className="text-xs text-muted-foreground mt-1">Gaps Found</p>
                </div>
                {bulkResult.failed > 0 && (
                  <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{bulkResult.failed}</p>
                    <p className="text-xs text-muted-foreground mt-1">Failed</p>
                  </div>
                )}
                {bulkResult.failed === 0 && (
                  <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground mt-1">Failed</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Risk Breakdown
                </p>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                    High Risk
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Automated assessments created — review individual results in the All Assessments tab
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setBulkDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="size-4" />
              Create Remediation Task
            </DialogTitle>
            <DialogDescription>
              Create a task from this gap analysis to track remediation progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/50 p-3">
                <div className="text-sm prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  <ReactMarkdown>{taskDescription}</ReactMarkdown>
                </div>
              </div>
            </div>

            {selectedAssessment && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Linked to assessment for{" "}
                <span className="font-medium text-foreground">
                  {selectedAssessment.document?.title}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
              disabled={creatingTask}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTask}
              disabled={creatingTask || !taskTitle.trim()}
              className="gap-2"
            >
              {creatingTask ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
