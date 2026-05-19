"use client";

import React from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ScrollText,
  FileText,
  ShieldAlert,
  Kanban,
  CalendarDays,
  History,
  Settings,
  Moon,
  Sun,
  Loader2,
  Search,
  StickyNote,
  Users,
  GitBranch,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AppPage = "dashboard" | "regulations" | "documents" | "war-room" | "audit-log" | "calendar" | "tasks" | "settings" | "search" | "team" | "timeline" | "reports";

interface AppSidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onToggleNotes?: () => void;
  hasNotes?: boolean;
}

const navItems: {
  page: AppPage;
  label: string;
  icon: React.ElementType;
  description: string;
  shortcut: number;
}[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Compliance overview", shortcut: 1 },
  { page: "regulations", label: "Regulations", icon: ScrollText, description: "Regulatory feed & tracking", shortcut: 2 },
  { page: "documents", label: "Documents", icon: FileText, description: "Internal document library", shortcut: 3 },
  { page: "war-room", label: "War Room", icon: ShieldAlert, description: "Impact assessment engine", shortcut: 4 },
  { page: "audit-log", label: "Audit Log", icon: History, description: "System activity tracking", shortcut: 6 },
  { page: "calendar", label: "Calendar", icon: CalendarDays, description: "Compliance calendar & deadlines", shortcut: 7 },
  { page: "tasks", label: "Tasks", icon: Kanban, description: "Remediation board", shortcut: 5 },
  { page: "search", label: "Search", icon: Search, description: "Global search across all data", shortcut: 8 },
  { page: "team", label: "Team", icon: Users, description: "Team members & roles", shortcut: 9 },
  { page: "timeline", label: "Timeline", icon: GitBranch, description: "Activity timeline & events", shortcut: 10 },
  { page: "reports", label: "Reports", icon: BarChart3, description: "Compliance reports & analytics", shortcut: 11 },
];

const settingsItem = {
  page: "settings" as AppPage,
  label: "Settings",
  icon: Settings,
  description: "Profile & preferences",
};

export function AppSidebar({ currentPage, onNavigate, onToggleNotes, hasNotes }: AppSidebarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [complianceScore, setComplianceScore] = React.useState<number | null>(null);
  const [scoreLoading, setScoreLoading] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    async function fetchComplianceScore() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          const { high, medium, low } = data.gapsByRisk || { high: 0, medium: 0, low: 0 };
          const score = Math.max(0, Math.min(100, 100 - (high * 20 + medium * 10 + low * 5) - (data.overdueTasks || 0) * 5));
          setComplianceScore(score);
        }
      } catch {
        // Silently fail
      } finally {
        setScoreLoading(false);
      }
    }
    fetchComplianceScore();
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="RegiMind">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/25 morph-card">
                <ShieldAlert className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">RegiMind</span>
                <span className="truncate text-xs text-muted-foreground">
                  Compliance Platform
                </span>
                <span className="truncate text-[9px] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
                  v1.0 · Compliance Suite
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <SidebarMenuItem key={item.page}>
                    <SidebarMenuButton
                      tooltip={item.description}
                      isActive={isActive}
                      onClick={() => onNavigate(item.page)}
                      className={cn(
                        "relative",
                        isActive && "bg-gradient-to-r from-primary/8 to-transparent border-l-[3px] border-l-primary font-medium"
                      )}
                    >
                      <div className="relative">
                        <item.icon className="size-4" />
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary dot-pulse" />
                        )}
                      </div>
                      <span>{item.label}</span>
                      <kbd className="ml-auto text-[10px] font-mono text-muted-foreground/50 bg-muted rounded px-1 py-0.5 group-data-[collapsible=icon]:hidden">
                        {item.shortcut}
                      </kbd>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarSeparator className="my-2" />
              {/* Notes - special non-page item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Quick Notes"
                  onClick={() => onToggleNotes?.()}
                  className="relative"
                >
                  <div className="relative">
                    <StickyNote className="size-4" />
                    {hasNotes && (
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span>Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator className="my-2" />
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={settingsItem.description}
                  isActive={currentPage === settingsItem.page}
                  onClick={() => onNavigate(settingsItem.page)}
                  className={cn(
                    "relative",
                    currentPage === settingsItem.page && "bg-gradient-to-r from-primary/8 to-transparent border-l-[3px] border-l-primary font-medium"
                  )}
                >
                  <div className="relative">
                    <settingsItem.icon className="size-4" />
                    {currentPage === settingsItem.page && (
                      <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary dot-pulse" />
                    )}
                  </div>
                  <span>{settingsItem.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 w-full">
              <div className="relative">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    SC
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">Sarah Chen</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  compliance@meddevice.com
                </p>
              </div>
            </div>
          </SidebarMenuItem>
          {/* Compliance progress mini-indicator */}
          <SidebarMenuItem>
            <div className="px-2 py-1.5 w-full group-data-[collapsible=icon]:hidden">
              {scoreLoading ? (
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-1 w-full rounded-full bg-muted animate-pulse" />
                </div>
              ) : complianceScore !== null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium">Compliance</span>
                    <span className="text-[11px] font-semibold text-primary">{complianceScore}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{ width: `${complianceScore}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Toggle theme"
              onClick={() => {
                if (mounted) {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                }
              }}
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
              <span>Toggle Theme</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
