"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Settings,
  User,
  Mail,
  Shield,
  Palette,
  Sun,
  Moon,
  Monitor,
  Database,
  Download,
  Info,
  Bell,
  FileText,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  RotateCcw,
  GraduationCap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";

// ── Main Settings Page ─────────────────────────────────────────

export function SettingsPage() {
  // User Profile state
  const [userName, setUserName] = useState("Sarah Chen");
  const [userEmail, setUserEmail] = useState("sarah.chen@meddevice.com");
  const [savingProfile, setSavingProfile] = useState(false);

  // Theme
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Notification preferences with localStorage persistence
  const NOTIF_PREFS_KEY = "regimind:notification-prefs";

  interface NotificationPrefs {
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskAssignmentAlerts: boolean;
    gapDetectionAlerts: boolean;
    regulationChangeAlerts: boolean;
    dailySummaryEmail: boolean;
    weeklyReport: boolean;
  }

  const defaultPrefs: NotificationPrefs = {
    emailNotifications: true,
    pushNotifications: true,
    taskAssignmentAlerts: true,
    gapDetectionAlerts: true,
    regulationChangeAlerts: true,
    dailySummaryEmail: false,
    weeklyReport: false,
  };

  function loadNotifPrefs(): NotificationPrefs {
    if (typeof window === "undefined") return { ...defaultPrefs };
    try {
      const raw = localStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...defaultPrefs };
  }

  function saveNotifPrefs(prefs: NotificationPrefs) {
    try {
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
      toast.success("Notification preferences saved");
    } catch { /* ignore */ }
  }

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultPrefs);

  // Data management
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    setNotifPrefs(loadNotifPrefs());
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSavingProfile(false);
    toast.success("Profile updated successfully");
  };

  const handleReseed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        toast.success("Demo data re-seeded successfully");
      } else {
        toast.error("Failed to re-seed data");
      }
    } catch {
      toast.error("Failed to re-seed data");
    } finally {
      setSeeding(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      window.open("/api/reports/compliance", "_blank");
      toast.success("Export started — downloading CSV");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleClearAssessments = () => {
    toast.success("Assessment data cleared (mock action)");
  };

  const themeOptions = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      description: "Clean light background",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      description: "Easy on the eyes",
    },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      description: "Follow system preference",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl noise-bg rounded-xl p-1" style={{ backgroundBlendMode: 'normal' }}>
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
          <Settings className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your profile, appearance, and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stack-shadow rounded-xl">
        {/* ── User Profile ─────────────────────────────────── */}
        <Card className="group card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">User Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="soft-inset space-y-5 group-hover:bg-primary/[0.02] transition-colors rounded-b-lg -m-6 mt-0 p-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  SC
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Shield className="size-3 mr-1" />
                    Compliance Manager
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="settings-name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="settings-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-9 input-polished"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="settings-email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="settings-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="pl-9 h-9 input-polished"
                />
              </div>
            </div>

            {/* Organization (read-only) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Organization</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">MedDevice Corp</span>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full gap-2"
            >
              {savingProfile ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* ── Appearance ─────────────────────────────────── */}
        <Card className="group card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="soft-inset">
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-6",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {option.description}
                    </span>
                    {isActive && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            {!mounted && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Theme preview loading...
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Notification Preferences ────────────────────── */}
        <Card className="group lg:col-span-2 card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>Control what alerts you receive</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="soft-inset space-y-5 group-hover:bg-primary/[0.02] transition-colors rounded-b-lg -m-6 mt-0 p-6">
            {/* Delivery Channels Section */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Channels</p>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
              <Switch
                checked={notifPrefs.emailNotifications}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, emailNotifications: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Browser push notifications for real-time alerts
                </p>
              </div>
              <Switch
                checked={notifPrefs.pushNotifications}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, pushNotifications: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            {/* Alert Types Section */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Alert Types</p>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Task Assignment Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Notified when tasks are assigned to you
                </p>
              </div>
              <Switch
                checked={notifPrefs.taskAssignmentAlerts}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, taskAssignmentAlerts: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Gap Detection Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Alerts when new compliance gaps are detected
                </p>
              </div>
              <Switch
                checked={notifPrefs.gapDetectionAlerts}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, gapDetectionAlerts: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Regulation Change Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  New and updated regulation notifications
                </p>
              </div>
              <Switch
                checked={notifPrefs.regulationChangeAlerts}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, regulationChangeAlerts: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            {/* Scheduled Reports Section */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">Scheduled Reports</p>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Daily Summary Email</Label>
                <p className="text-xs text-muted-foreground">
                  Daily digest of compliance activity
                </p>
              </div>
              <Switch
                checked={notifPrefs.dailySummaryEmail}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, dailySummaryEmail: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Weekly Report</Label>
                <p className="text-xs text-muted-foreground">
                  Comprehensive weekly compliance report
                </p>
              </div>
              <Switch
                checked={notifPrefs.weeklyReport}
                onCheckedChange={(checked) => {
                  const next = { ...notifPrefs, weeklyReport: checked };
                  setNotifPrefs(next);
                  saveNotifPrefs(next);
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30 transition-all duration-200 switch-glow"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Data Management ────────────────────────────── */}
        <Card className="group card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Data Management</CardTitle>
                <CardDescription>Manage your compliance data</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="soft-inset space-y-4 group-hover:bg-primary/[0.02] transition-colors rounded-b-lg -m-6 mt-0 p-6">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11"
                onClick={handleReseed}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Database className="size-4 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium">Re-seed Demo Data</p>
                  <p className="text-xs text-muted-foreground">
                    Reset and reload sample data
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium">Export All Data</p>
                  <p className="text-xs text-muted-foreground">
                    Download compliance report as CSV
                  </p>
                </div>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                  >
                    <Trash2 className="size-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Clear Assessment Data</p>
                      <p className="text-xs text-muted-foreground">
                        Remove all impact assessments and tasks
                      </p>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Assessment Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all impact assessments and related tasks.
                      This action cannot be undone. Your regulations and documents will be
                      preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAssessments}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* ── Onboarding ──────────────────────────────── */}
        <Card className="group card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Onboarding Tour</CardTitle>
                <CardDescription>Learn how to use the platform</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="soft-inset space-y-4 group-hover:bg-primary/[0.02] transition-colors rounded-b-lg -m-6 mt-0 p-6">
            <p className="text-sm text-muted-foreground">
              Restart the guided tour to learn about the platform&apos;s key features and navigation.
              The tour covers Dashboard, Regulations, Documents, War Room, and Tasks pages.
            </p>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={async () => {
                try {
                  await fetch("/api/onboarding/status", { method: "DELETE" });
                  localStorage.removeItem("regimind:onboarding");
                  toast.success("Onboarding tour reset! Reload the page to start the tour.");
                } catch {
                  toast.error("Failed to reset onboarding tour");
                }
              }}
            >
              <RotateCcw className="size-4 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Reset Tour</p>
                <p className="text-xs text-muted-foreground">
                  Clear progress and restart the onboarding tour
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* ── About ──────────────────────────────────────── */}
        <Card className="group lg:col-span-2 card-depth focus-ring-card settings-card-gradient transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Info className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">About RegiMind</CardTitle>
                <CardDescription>Application information</CardDescription>
              </div>
            </div>
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </CardHeader>
          <CardContent className="group-hover:bg-primary/[0.02] transition-colors rounded-b-lg -m-6 mt-0 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Version
                </p>
                <p className="text-sm font-medium">v0.3.0</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Build
                </p>
                <p className="text-sm font-medium">Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Database
                </p>
                <p className="text-sm font-medium">SQLite (demo mode)</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Standards
                </p>
                <p className="text-sm font-medium">ISO 13485, FDA 21 CFR Part 820, EU MDR 2017/745</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
