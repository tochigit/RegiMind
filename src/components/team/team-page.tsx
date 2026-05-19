"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Users,
  ArrowUpDown,
  Mail,
  Calendar,
  Activity,
  Shield,
  Crown,
  Eye,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatRelativeTime } from "@/lib/utils";

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    activityCount: number;
  };
}

type RoleFilter = "all" | "admin" | "manager" | "viewer";
type SortKey = "name" | "role" | "joinDate";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-500/20",
        icon: Crown,
      };
    case "manager":
      return {
        label: "Manager",
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-500/20",
        icon: Shield,
      };
    case "viewer":
      return {
        label: "Viewer",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border-gray-500/20",
        icon: Eye,
      };
    default:
      return { label: role, className: "bg-muted text-muted-foreground", icon: Eye };
  }
}

function getAvatarColor(name: string | null): string {
  if (!name) return "bg-muted text-muted-foreground";
  const colors = [
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("joinDate");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filter by role
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "role": {
          const roleOrder = { admin: 0, manager: 1, viewer: 2 };
          return (roleOrder[a.role as keyof typeof roleOrder] ?? 3) - (roleOrder[b.role as keyof typeof roleOrder] ?? 3);
        }
        case "joinDate":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [users, search, roleFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      managers: users.filter((u) => u.role === "manager").length,
      viewers: users.filter((u) => u.role === "viewer").length,
    };
  }, [users]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Decorative gradient accent line */}
      <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent -mt-2 mb-2" />
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 shadow-sm">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Organization members, roles, and compliance activity
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-[3px] border-l-primary/40 card-depth">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground font-medium">Total Members</p>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-emerald-500/40 card-depth">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground font-medium">Admins</p>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.admins}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-amber-500/40 card-depth">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground font-medium">Managers</p>
            <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.managers}</p>
          </CardContent>
        </Card>
        <Card className="border-l-[3px] border-l-gray-400/40 card-depth">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground font-medium">Viewers</p>
            <p className="text-xl font-bold mt-1 text-gray-600 dark:text-gray-400">{stats.viewers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 input-polished"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortKey)}
          >
            <SelectTrigger className="w-[150px]">
              <ArrowUpDown className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="joinDate">Join Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Decorative gradient accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-full mt-3" />

      {/* Team Grid */}
      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
            <Users className="relative size-12 text-muted-foreground animate-pulse float-in" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No team members found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || roleFilter !== "all"
                ? "Try adjusting your search or filter"
                : "No team members have been added yet"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
          {filteredUsers.map((user, idx) => {
            const roleBadge = getRoleBadge(user.role);
            const RoleIcon = roleBadge.icon;
            const initials = getInitials(user.name);
            const avatarColor = getAvatarColor(user.name);
            const joinDate = format(new Date(user.createdAt), "MMM d, yyyy");

            return (
              <Card
                key={user.id}
                className={cn(
                  "card-stripe card-smooth card-depth glow-border scale-hover group hover:shadow-md transition-all duration-200 slide-in-left",
                  user.role === "admin" ? "team-card-role-admin" : user.role === "manager" ? "team-card-role-manager" : "team-card-role-viewer"
                )}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <CardContent className="p-5 card-reveal-bottom">
                  <div className="flex items-start gap-4">
                    {/* Avatar with gradient ring */}
                    <div className="relative avatar-status avatar-status-online group">
                      <div className="avatar-ring-gradient rounded-full">
                        <Avatar className="size-14 group-hover:scale-105 transition-transform duration-200">
                          <AvatarFallback
                            className={cn("text-base font-semibold", avatarColor)}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-background dot-pulse" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-fade-in">{user.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-medium gap-1 badge-enter",
                            roleBadge.className
                          )}
                        >
                          <RoleIcon className="size-3" />
                          {roleBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats - hover reveal */}
                  <div className="reveal-content border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Joined</p>
                          <p className="text-xs font-medium">{joinDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="size-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activity</p>
                          <p className="text-xs font-medium">
                            {user.stats.activityCount} action{user.stats.activityCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
