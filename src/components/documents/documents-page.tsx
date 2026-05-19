"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  FileCheck,
  X,
  Filter,
  ChevronRight,
  Shield,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InternalDocument {
  id: string;
  title: string;
  docType: string;
  fileName: string | null;
  fileContent: string | null;
  scope: string | null;
  clause: string | null;
  version: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    impactAssessments: number;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPES = ["SOP", "Quality Manual", "Risk Report", "Report", "Other"] as const;

const DOC_TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  SOP: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: FileCheck,
  },
  "Quality Manual": {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/20",
    icon: BookOpen,
  },
  "Risk Report": {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/20",
    icon: AlertTriangle,
  },
  Report: {
    bg: "bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-500/20",
    icon: FileText,
  },
  Other: {
    bg: "bg-gray-500/10",
    text: "text-gray-700 dark:text-gray-400",
    border: "border-gray-500/20",
    icon: FileText,
  },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  draft: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400" },
  archived: { bg: "bg-gray-500/10", text: "text-gray-500 dark:text-gray-400" },
};

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const documentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  docType: z.string().min(1, "Document type is required"),
  scope: z.string().max(100, "Scope must be under 100 characters").optional().or(z.literal("")),
  clause: z.string().max(100, "Clause must be under 100 characters").optional().or(z.literal("")),
  version: z
    .string()
    .max(20, "Version must be under 20 characters")
    .regex(/^[0-9]+\.[0-9]+(\.[0-9]+)?$/, "Version must follow x.y or x.y.z format")
    .optional()
    .or(z.literal("")),
  fileContent: z
    .string()
    .min(50, "Document content must be at least 50 characters")
    .max(50000, "Document content must be under 50,000 characters"),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDocTypeStyle(docType: string) {
  return DOC_TYPE_STYLES[docType] || DOC_TYPE_STYLES.Other;
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.draft;
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

// ─── Skeleton Grid ───────────────────────────────────────────────────────────

function DocumentSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="pb-3 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </CardContent>
          <CardFooter className="pt-3 border-t">
            <div className="flex items-center justify-between w-full">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ─── Document Detail Dialog ──────────────────────────────────────────────────

function DocumentDetailDialog({
  document,
  open,
  onClose,
}: {
  document: InternalDocument | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!document) return null;

  const docTypeStyle = getDocTypeStyle(document.docType);
  const statusStyle = getStatusStyle(document.status);
  const DocTypeIcon = docTypeStyle.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`flex size-10 items-center justify-center rounded-lg ${docTypeStyle.bg}`}>
              <DocTypeIcon className={`size-5 ${docTypeStyle.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-tight">
                {document.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Full details for {document.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`${docTypeStyle.bg} ${docTypeStyle.text} ${docTypeStyle.border} border`}>
              {document.docType}
            </Badge>
            <Badge variant="outline" className={`${statusStyle.bg} ${statusStyle.text} border border-transparent`}>
              {document.status}
            </Badge>
            {document.scope && (
              <Badge variant="outline" className="gap-1">
                <Shield className="size-3" />
                {document.scope}
              </Badge>
            )}
            {document.clause && (
              <Badge variant="outline">{document.clause}</Badge>
            )}
            {document.version && (
              <Badge variant="secondary">v{document.version}</Badge>
            )}
          </div>

          <Separator />

          {/* File info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {document.fileName && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">File Name</p>
                <p className="font-medium truncate">{document.fileName}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Version</p>
              <p className="font-medium">{document.version || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Created</p>
              <p className="font-medium">
                {format(new Date(document.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Document Content */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Document Content</h3>
            <ScrollArea className="h-[300px] rounded-lg border p-4">
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {document.fileContent || "No content available."}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DocumentsPage() {
  const [documents, setDocuments] = useState<InternalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<InternalDocument | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // ─── Fetch documents ────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("docType", filterType);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Filtered documents (client-side search only; docType filtered server-side) ──

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.fileContent?.toLowerCase().includes(q) ||
        doc.scope?.toLowerCase().includes(q) ||
        doc.clause?.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  // ─── Form setup ────────────────────────────────────────────────────────

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: "",
      docType: "",
      scope: "",
      clause: "",
      version: "",
      fileContent: "",
    },
  });

  // ─── Submit handler ────────────────────────────────────────────────────

  const onSubmit = async (data: DocumentFormData) => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          docType: data.docType,
          scope: data.scope || null,
          clause: data.clause || null,
          version: data.version || null,
          fileContent: data.fileContent || null,
          status: "active",
        }),
      });

      if (res.ok) {
        form.reset();
        setAddDialogOpen(false);
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to create document:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete handler ────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  // ─── Seed handler ──────────────────────────────────────────────────────

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to seed:", err);
    } finally {
      setSeeding(false);
    }
  };

  // ─── Open detail ───────────────────────────────────────────────────────

  const openDetail = useCallback(async (doc: InternalDocument) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      if (res.ok) {
        const fullDoc = await res.json();
        setDetailDoc(fullDoc);
        setDetailOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch document detail:", err);
    }
  }, []);

  // ─── Doc type counts for filter badge ──────────────────────────────────

  const typeCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.docType] = (acc[doc.docType] || 0) + 1;
    return acc;
  }, {});

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
        <DocumentSkeletonGrid />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Internal Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage SOPs, quality manuals, and regulatory compliance documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-shadow"
          >
            <Plus className="size-3.5" />
            Add Document
          </Button>
        </div>
      </div>

      {/* ─── Search and Filter Bar ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title, content, scope, or clause..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7 p-0 hover:bg-muted rounded-full"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 shrink-0 ${showFilterPanel ? "bg-accent" : ""}`}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          <Filter className="size-3.5" />
          Filter
          {filterType !== "all" && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {filterType}
            </Badge>
          )}
        </Button>
      </div>

      {/* ─── Filter Panel ────────────────────────────────────────────── */}
      {showFilterPanel && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Type:</span>
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className="h-7 text-xs"
              >
                All
                <span className="ml-1 text-muted-foreground">({documents.length})</span>
              </Button>
              {DOC_TYPES.map((type) => {
                const count = typeCounts[type] || 0;
                if (count === 0) return null;
                const style = getDocTypeStyle(type);
                return (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={`h-7 text-xs ${filterType !== type ? `${style.bg} ${style.text} ${style.border} border hover:${style.bg}` : ""}`}
                  >
                    {type}
                    <span className="ml-1 opacity-70">({count})</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Results Summary ─────────────────────────────────────────── */}
      {!loading && documents.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      )}

      {/* ─── Empty State (no documents at all) ───────────────────────── */}
      {!loading && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-muted/80">
              <FileText className="size-8 text-muted-foreground/70 animate-pulse float-in" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload your internal compliance documents to start tracking regulatory
              alignment and gap analysis.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Button onClick={handleSeed} disabled={seeding} variant="outline" className="gap-2">
              {seeding ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <FileCheck className="size-4" />
              )}
              Seed Demo Data
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Document
            </Button>
          </div>
        </div>
      )}

      {/* ─── No Results State ────────────────────────────────────────── */}
      {!loading && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-lg scale-150" />
            <Search className="relative size-10 text-muted-foreground/50 animate-pulse float-in" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No matching documents</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* ─── Document Card Grid ──────────────────────────────────────── */}
      {filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const docTypeStyle = getDocTypeStyle(doc.docType);
            const statusStyle = getStatusStyle(doc.status);
            const DocTypeIcon = docTypeStyle.icon;

            return (
              <Card
                key={doc.id}
                className="group relative overflow-hidden card-stripe card-depth hover:shadow-sm hover:border-primary/20 transition-all duration-200 cursor-pointer"
                onClick={() => openDetail(doc)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${docTypeStyle.bg} mt-0.5 doc-icon-hover`}>
                        <DocTypeIcon className={`size-4 ${docTypeStyle.text}`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {doc.title}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 border ${docTypeStyle.bg} ${docTypeStyle.text} ${docTypeStyle.border}`}
                    >
                      {doc.docType}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-3 space-y-3">
                  {/* Meta badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className={`${statusStyle.bg} ${statusStyle.text} text-[10px] border border-transparent`}>
                      {doc.status}
                    </Badge>
                    {doc.scope && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                        <Shield className="size-2.5" />
                        {doc.scope}
                      </Badge>
                    )}
                    {doc.clause && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {doc.clause}
                      </Badge>
                    )}
                    {doc.version && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        v{doc.version}
                      </Badge>
                    )}
                  </div>

                  {/* Content preview */}
                  {doc.fileContent && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {truncateText(doc.fileContent, 180)}
                    </p>
                  )}

                  {/* Impact assessments count */}
                  {doc._count && doc._count.impactAssessments > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <AlertTriangle className="size-3 text-amber-500" />
                      <span>
                        {doc._count.impactAssessments} impact assessment
                        {doc._count.impactAssessments !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </CardContent>

                <Separator />

                <CardFooter className="py-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(doc);
                        }}
                      >
                        <Eye className="size-3.5 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 hover:bg-destructive/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{" "}
                              <span className="font-semibold text-foreground">
                                &ldquo;{doc.title}&rdquo;
                              </span>
                              ? This will also remove all associated impact assessments
                              and tasks. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete(doc.id)}
                              className="gap-2"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Add Document Dialog ─────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="size-4 text-primary" />
              </div>
              Add New Document
            </DialogTitle>
            <DialogDescription>
              Upload an internal compliance document to the RegiMind document library.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., SOP-QMS-001: Quality Management System Procedure"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Row: docType + version */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docType">
                  Document Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch("docType")}
                  onValueChange={(val) => form.setValue("docType", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="docType">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((type) => {
                      const style = getDocTypeStyle(type);
                      return (
                        <SelectItem key={type} value={type}>
                          <span className="flex items-center gap-2">
                            {type}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {form.formState.errors.docType && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.docType.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="e.g., 1.0 or 2.3.1"
                  {...form.register("version")}
                />
                {form.formState.errors.version && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.version.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row: scope + clause */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Input
                  id="scope"
                  placeholder="e.g., Risk Management, QMS"
                  {...form.register("scope")}
                />
                {form.formState.errors.scope && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.scope.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clause">Clause / Standard Reference</Label>
                <Input
                  id="clause"
                  placeholder="e.g., ISO 14971, EU MDR Art. 10"
                  {...form.register("clause")}
                />
                {form.formState.errors.clause && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.clause.message}
                  </p>
                )}
              </div>
            </div>

            {/* File Content */}
            <div className="space-y-2">
              <Label htmlFor="fileContent">
                Document Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="fileContent"
                placeholder="Paste or type the full text content of the document here. This content will be used for automated gap analysis against regulatory requirements..."
                className="min-h-[200px] resize-y"
                {...form.register("fileContent")}
              />
              <div className="flex items-center justify-between">
                {form.formState.errors.fileContent ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fileContent.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Minimum 50 characters required
                  </p>
                )}
                {form.watch("fileContent") && (
                  <p className="text-xs text-muted-foreground">
                    {form.watch("fileContent").length.toLocaleString()} chars
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setAddDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {submitting ? "Creating..." : "Create Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Document Detail Dialog ──────────────────────────────────── */}
      <DocumentDetailDialog
        document={detailDoc}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailDoc(null);
        }}
      />
    </div>
  );
}
