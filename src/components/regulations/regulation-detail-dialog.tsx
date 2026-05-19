"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import {
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";

export interface Regulation {
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
}

interface DeltaItem {
  section?: string;
  clause?: string;
  before?: string;
  after?: string;
  type?: string;
  description?: string;
}

interface RegulationDetailDialogProps {
  regulation: Regulation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceBadgeClasses: Record<string, string> = {
  FDA: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/15",
  EU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
  ISO: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/15",
};

const statusBadgeClasses: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  assessed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
};

function getSourceBadgeClass(source: string): string {
  return sourceBadgeClasses[source] || "";
}

function getStatusBadgeClass(status: string): string {
  return statusBadgeClasses[status] || "";
}

export function RegulationDetailDialog({
  regulation,
  open,
  onOpenChange,
}: RegulationDetailDialogProps) {
  const deltas: DeltaItem[] = useMemo(() => {
    if (!regulation?.deltaJson) return [];
    try {
      const parsed = JSON.parse(regulation.deltaJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }, [regulation?.deltaJson]);

  if (!regulation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
        {/* Gradient Header Bar */}
        <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
          <div className="p-6 pb-4 space-y-4">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold leading-tight">
                    {regulation.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Published {format(new Date(regulation.publishedDate), "MMMM d, yyyy")}
                    {regulation.effectiveDate && (
                      <> &middot; Effective {format(new Date(regulation.effectiveDate), "MMMM d, yyyy")}</>
                    )}
                  </DialogDescription>
                </div>
                {regulation.needsReview && (
                  <Badge
                    variant="outline"
                    className="flex-shrink-0 gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25"
                  >
                    <ShieldAlert className="size-3.5" />
                    Needs Review
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={getSourceBadgeClass(regulation.source)}>
                {regulation.source}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {regulation.region}
              </Badge>
              <Badge variant="outline" className={getStatusBadgeClass(regulation.status)}>
                {regulation.status.charAt(0).toUpperCase() + regulation.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 pt-4 space-y-8">
            {/* Needs Review Warning */}
            {regulation.needsReview && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/25 bg-yellow-500/5">
                <AlertCircle className="size-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Flagged for Manual Review
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This regulation was flagged during automated analysis. AI confidence was below the
                    threshold, and a compliance officer should review the assessment manually.
                  </p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            {regulation.aiSummary ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Summary
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/50 bg-muted/30 p-4">
                  <ReactMarkdown>{regulation.aiSummary}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Summary
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  No AI summary available. Run an impact assessment to generate one.
                </p>
              </div>
            )}

            {/* Regulatory Deltas */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Regulatory Deltas
              </h3>
              {deltas.length > 0 ? (
                <div className="space-y-3">
                  {deltas.map((delta, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border overflow-hidden ${
                        delta.type === 'addition'
                          ? 'border-l-3 border-l-emerald-500/60 border-border/60'
                          : delta.type === 'removal'
                          ? 'border-l-3 border-l-red-500/60 border-border/60'
                          : 'border-l-3 border-l-amber-500/60 border-border/60'
                      }`}
                    >
                      {/* Delta header */}
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/40">
                        {delta.section && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {delta.section}
                          </span>
                        )}
                        {delta.clause && (
                          <>
                            <ChevronRight className="size-3 text-muted-foreground/50" />
                            <span className="text-xs font-mono text-muted-foreground">
                              {delta.clause}
                            </span>
                          </>
                        )}
                        {delta.type && (
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px] px-1.5 py-0 font-normal"
                          >
                            {delta.type}
                          </Badge>
                        )}
                      </div>
                      {/* Delta description */}
                      {delta.description && (
                        <div className="px-4 py-2 border-b border-border/30 bg-background">
                          <p className="text-sm text-foreground/90">{delta.description}</p>
                        </div>
                      )}
                      {/* Before / After */}
                      {(delta.before || delta.after) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                          {delta.before && (
                            <div className="px-4 py-3 space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500/80">
                                Previous
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                {delta.before}
                              </p>
                            </div>
                          )}
                          {delta.after && (
                            <div className="px-4 py-3 space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500/80">
                                Updated
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                {delta.after}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No regulatory deltas available for this regulation.
                </p>
              )}
            </div>

            {/* Full Regulation Text */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Full Regulation Text
              </h3>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 max-h-72 overflow-y-auto custom-scrollbar">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {regulation.rawText}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
