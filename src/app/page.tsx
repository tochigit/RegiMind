"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ActivityFeed, ActivityFeedTrigger } from "@/components/layout/activity-feed";
import { ComplianceChatWidget } from "@/components/layout/chat-widget";
import type { AppPage } from "@/components/layout/app-sidebar";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { TeamPage } from "@/components/team/team-page";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { RegulationsPage } from "@/components/regulations/regulations-page";
import { DocumentsPage } from "@/components/documents/documents-page";
import { WarRoomPage } from "@/components/war-room/war-room-page";
import { TasksPage } from "@/components/tasks/tasks-page";
import { AuditLogPanel } from "@/components/layout/audit-log-panel";
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  ShieldAlert,
  Kanban,
  CalendarDays,
  History,
  Search,
  Clock,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
  Settings,
  Sparkles,
  Activity,
  Users,
  ShieldCheck,
  GitBranch,
  BarChart3,
} from "lucide-react";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { SearchPage } from "@/components/search/search-page";
import { SettingsPage } from "@/components/settings/settings-page";
import { TimelinePage } from "@/components/timeline/timeline-page";
import { ReportsPage } from "@/components/reports/reports-page";
import { OnboardingTour } from "@/components/layout/onboarding-tour";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// --- Audit Log inline helpers ---
function getActionConfig(action: string) {
  if (action.includes("created")) return { icon: Plus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Created" };
  if (action.includes("updated")) return { icon: Pencil, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", label: "Updated" };
  if (action.includes("deleted")) return { icon: Trash2, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/50", badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: "Deleted" };
  return { icon: ShieldAlert, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: action.split(".")[1] || "Action" };
}
function getEntityConfig(entity: string) {
  switch (entity) {
    case "task": return { icon: Kanban, label: "Task", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" };
    case "assessment": return { icon: ShieldAlert, label: "Assessment", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
    case "document": return { icon: FileText, label: "Document", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
    case "comment": return { icon: MessageSquare, label: "Comment", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" };
    default: return { icon: History, label: entity, badge: "bg-muted text-muted-foreground" };
  }
}
function getAuditDescription(entry: { action: string; entity: string; entityId: string; details: string | null }) {
  const ac = getActionConfig(entry.action);
  const ec = getEntityConfig(entry.entity);
  try {
    const d = entry.details ? JSON.parse(entry.details) : {};
    return `${ac.label.toLowerCase()} ${ec.label.toLowerCase()}: ${d.title || entry.entityId}`;
  } catch {
    return `${ac.label.toLowerCase()} ${ec.label.toLowerCase()}`;
  }
}
function AuditLogListItem({ entry }: { entry: { id: string; action: string; entity: string; entityId: string; details: string | null; userName: string; createdAt: string } }) {
  const ac = getActionConfig(entry.action);
  const ec = getEntityConfig(entry.entity);
  const ActionIcon = ac.icon;
  const EntityIcon = ec.icon;
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className={cn("flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5", ac.bg, ac.color)}>
        <ActionIcon className="size-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 font-medium", ac.badge)}>{ac.label}</Badge>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium gap-1", ec.badge, "border-0")}>
            <EntityIcon className="size-2.5" />{ec.label}
          </Badge>
        </div>
        <p className="text-sm text-foreground leading-snug">{getAuditDescription(entry)}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{entry.userName.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback></Avatar>
            <span>{entry.userName}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1"><Clock className="size-3" /><span>{formatRelativeTime(entry.createdAt)}</span></div>
        </div>
      </div>
    </div>
  );
}
import { KeyboardShortcuts, ShortcutHint } from "@/components/layout/keyboard-shortcuts";
import { QuickNotes } from "@/components/layout/quick-notes";

const pageConfig: Record<AppPage, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  regulations: { label: "Regulations", icon: ScrollText },
  documents: { label: "Documents", icon: FileText },
  "war-room": { label: "War Room", icon: ShieldAlert },
  "audit-log": { label: "Audit Log", icon: History },
  calendar: { label: "Calendar", icon: CalendarDays },
  tasks: { label: "Tasks", icon: Kanban },
  settings: { label: "Settings", icon: Settings },
  search: { label: "Search", icon: Search },
  team: { label: "Team", icon: Users },
  timeline: { label: "Timeline", icon: GitBranch },
  reports: { label: "Reports", icon: BarChart3 },
};

function AuditLogFullPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
          <History className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Track all system actions and changes across the platform</p>
        </div>
      </div>
      <AuditLogFullPanel />
    </div>
  );
}

interface AuditStats {
  totalEntries: number;
  todayEntries: number;
  byEntity: { task: number; assessment: number; document: number; comment: number };
  byAction: { created: number; updated: number; deleted: number };
}

function AuditLogFullPanel() {
  const [logs, setLogs] = React.useState<Array<{
    id: string; action: string; entity: string; entityId: string;
    details: string | null; userName: string; createdAt: string;
  }>>([]);
  const [stats, setStats] = React.useState<AuditStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const entityFilters = [
    { key: "all", label: "All" },
    { key: "task", label: "Tasks" },
    { key: "assessment", label: "Assessments" },
    { key: "document", label: "Documents" },
    { key: "comment", label: "Comments" },
  ];

  React.useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== "all") params.set("entity", filter);
        params.set("limit", "50");
        params.set("include", "stats");
        const res = await fetch(`/api/audit?${params}`);
        if (res.ok) {
          const json = await res.json();
          setLogs(json.data);
          if (json.stats) setStats(json.stats);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [filter]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((e) =>
      e.action.includes(q) || e.entity.includes(q) || e.userName.toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Derive most active entity and most common action from stats
  const mostActiveEntity = React.useMemo(() => {
    if (!stats) return null;
    const entries = Object.entries(stats.byEntity) as [string, number][];
    const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a), ["task", 0]);
    if (max[1] === 0) return null;
    const cfg = getEntityConfig(max[0]);
    return { entity: cfg.label, count: max[1], badge: cfg.badge };
  }, [stats]);

  const mostCommonAction = React.useMemo(() => {
    if (!stats) return null;
    const entries = Object.entries(stats.byAction) as [string, number][];
    const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a), ["created", 0]);
    if (max[1] === 0) return null;
    const cfg = getActionConfig(max[0] === "created" ? "created" : max[0] === "updated" ? "updated" : "deleted");
    return { action: cfg.label, count: max[1], badge: cfg.badge };
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Stats summary row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Actions */}
          <Card className="card-smooth border-l-4 border-l-primary/60 slide-in-left" style={{ animationDelay: '0ms' }}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Total Actions</p>
              <p className="text-xl font-bold mt-1">{stats.totalEntries}</p>
            </CardContent>
          </Card>
          {/* Today's Activity */}
          <Card className="card-smooth border-l-4 border-l-emerald-500/60 slide-in-left" style={{ animationDelay: '60ms' }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground font-medium">Today's Activity</p>
                {stats.todayEntries > 0 && (
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="text-xl font-bold mt-1">{stats.todayEntries}</p>
            </CardContent>
          </Card>
          {/* Most Active Entity */}
          <Card className={cn("card-smooth border-l-4 slide-in-left", mostActiveEntity ? "border-l-violet-500/60" : "border-l-muted")} style={{ animationDelay: '120ms' }}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Most Active Entity</p>
              <div className="flex items-center gap-2 mt-1">
                {mostActiveEntity ? (
                  <>
                    <span className="text-xl font-bold">{mostActiveEntity.count}</span>
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 font-medium", mostActiveEntity.badge)}>{mostActiveEntity.entity}</Badge>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground mt-0.5">—</span>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Most Common Action */}
          <Card className={cn("card-smooth border-l-4 slide-in-left", mostCommonAction ? "border-l-amber-500/60" : "border-l-muted")} style={{ animationDelay: '180ms' }}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground font-medium">Most Common Action</p>
              <div className="flex items-center gap-2 mt-1">
                {mostCommonAction ? (
                  <>
                    <span className="text-xl font-bold">{mostCommonAction.count}</span>
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 font-medium", mostCommonAction.badge)}>{mostCommonAction.action}</Badge>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground mt-0.5">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="rounded-xl border bg-card">
        <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search audit log..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {entityFilters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{f.label}</button>
          ))}
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 space-y-4">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3"><Skeleton className="size-8 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div></div>
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No matching entries" : "No audit entries yet"}</p>
          </div>
        ) : (
          <div className="divide-y row-alternate">
            {filtered.map((entry) => (
              <AuditLogListItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}

interface FooterStats {
  totalGaps: number;
  activeTasks: number;
  totalDocuments: number;
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<AppPage>("dashboard");
  const hasSeededRef = useRef(false);
  const [footerStats, setFooterStats] = useState<FooterStats | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [showInsights, setShowInsights] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hasNotes, setHasNotes] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("regimind:quick-notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        return !!parsed.content && parsed.content.trim().length > 0;
      }
    } catch { /* ignore */ }
    return false;
  });

  // Fetch footer stats
  useEffect(() => {
    async function fetchFooterStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setFooterStats({
            totalGaps: data.totalGaps || 0,
            activeTasks: (data.tasksByStatus?.todo || 0) + (data.tasksByStatus?.in_review || 0),
            totalDocuments: data.totalDocuments || 0,
          });
        }
      } catch { /* ignore */ }
    }
    fetchFooterStats();
  }, []);

  // Re-check notes content when panel closes
  const checkNotes = useCallback(() => {
    try {
      const raw = localStorage.getItem("regimind:quick-notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        setHasNotes(!!parsed.content && parsed.content.trim().length > 0);
      } else {
        setHasNotes(false);
      }
    } catch { /* ignore */ }
  }, []);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handler = () => checkNotes();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [checkNotes]);

  const handleNotesOpenChange = (open: boolean) => {
    setShowNotes(open);
    if (!open) {
      // Small delay to let localStorage write complete
      setTimeout(checkNotes, 100);
    }
  };

  // Auto-seed data on first mount only (strict-mode safe)
  useEffect(() => {
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;

    async function seedIfNeeded() {
      try {
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.totalRegulations === 0) {
            await fetch("/api/seed", { method: "POST" });
          }
        }
      } catch {
        // Ignore errors
      }
    }
    seedIfNeeded();
  }, []);

  const config = pageConfig[currentPage];
  const PageIcon = config.icon;

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} onOpenInsights={() => setShowInsights(true)} />;
      case "regulations":
        return <RegulationsPage />;
      case "documents":
        return <DocumentsPage />;
      case "war-room":
        return <WarRoomPage />;
      case "audit-log":
        return <AuditLogFullPage />;
      case "calendar":
        return <CalendarPage />;
      case "tasks":
        return <TasksPage />;
      case "settings":
        return <SettingsPage />;
      case "search":
        return <SearchPage onNavigate={setCurrentPage} />;
      case "team":
        return <TeamPage />;
      case "timeline":
        return <TimelinePage />;
      case "reports":
        return <ReportsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar currentPage={currentPage} onNavigate={setCurrentPage} onToggleNotes={() => setShowNotes(true)} hasNotes={hasNotes} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 glass bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <ShieldAlert className="size-4 text-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 border-[1.5px] border-background">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
              </span>
            </div>
            <span className="text-sm font-semibold">RegiMind</span>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <PageIcon className="size-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{config.label}</span>
          </div>
          <div className="flex-1" />
          <ActivityFeedTrigger onClick={() => setShowActivity(true)} unreadCount={activityUnreadCount} />
          <NotificationBell />
          <button className="relative flex items-center justify-center size-8 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors" aria-label="User menu">
            <Avatar className="size-7">
              <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-semibold">SC</AvatarFallback>
            </Avatar>
          </button>
          <ShortcutHint />
        </header>
        <main className="flex-1 overflow-auto relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent z-10" />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.2, ease: "easeOut", staggerChildren: 0.03 }}
              className="p-4 lg:p-6"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
        <KeyboardShortcuts onNavigate={setCurrentPage} />
        <QuickNotes open={showNotes} onOpenChange={handleNotesOpenChange} />
        <ActivityFeed open={showActivity} onOpenChange={(open) => { setShowActivity(open); if (open) setActivityUnreadCount(0); }} />
        <InsightsPanel open={showInsights} onOpenChange={setShowInsights} />
        <ComplianceChatWidget open={showChat} onOpenChange={setShowChat} />
        <OnboardingTour currentPage={currentPage} onNavigate={setCurrentPage} />
        {/* Footer */}
        <footer className="relative border-t bg-muted/30 px-4 lg:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              <span className="font-medium bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Powered by RegiMind AI</span>
              <span className="text-muted-foreground/50">v0.3.0</span>
            </div>
            {/* Animated separator between footer sections */}
            <div className="animated-separator h-4" />
            {/* Live stats */}
            {footerStats && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="mini-stat">
                  <span className="mini-stat-label">Gaps</span>
                  <span className="mini-stat-value">{footerStats.totalGaps}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-label">Active</span>
                  <span className="mini-stat-value">{footerStats.activeTasks}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat-label">Docs</span>
                  <span className="mini-stat-value">{footerStats.totalDocuments}</span>
                </div>
              </div>
            )}
            {/* Animated separator before compliance score */}
            <div className="animated-separator h-4" />
            {/* Compliance score mini badge */}
            {footerStats && (() => {
              const circumference = 2 * Math.PI * 8;
              const pct = Math.max(0, Math.min(100, 100 - (footerStats.totalGaps * 10)));
              const offset = circumference * (1 - pct / 100);
              return (
                <div className="hidden md:flex items-center gap-1.5" title="Compliance Score">
                  <div className="relative flex size-5 items-center justify-center">
                    <svg className="size-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/40" />
                      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={String(offset)} className="text-primary transition-all duration-700" />
                    </svg>
                    <ShieldCheck className="absolute size-2.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary">{pct}%</span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">ISO 13485 · FDA 21 CFR · EU MDR</span>
            <span className="text-muted-foreground/50">© {new Date().getFullYear()} MedDevice Corp</span>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
