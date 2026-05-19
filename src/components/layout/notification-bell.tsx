"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck, ShieldAlert, Clock, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  type: "critical" | "urgent" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const typeConfig: Record<
  Notification["type"],
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
  }
> = {
  critical: {
    icon: ShieldAlert,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-l-red-500",
  },
  urgent: {
    icon: Clock,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-l-orange-500",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-l-amber-500",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-l-blue-500",
  },
};

function NotificationSkeleton() {
  return (
    <div className="space-y-3 p-1">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={cn(
        "flex items-start gap-3 rounded-md p-2.5 w-full text-left transition-colors notif-item-enter",
        "hover:bg-muted/50 cursor-pointer",
        !notification.read && "bg-muted/30",
        "border-l-2",
        config.border
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          config.bg
        )}
      >
        <Icon className={cn("size-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              notification.read
                ? "font-normal text-muted-foreground"
                : "font-medium"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifications((prev) => {
          // Preserve local read state when refreshing
          const readMap = new Map(prev.map((n) => [n.id, n.read]));
          return data.map((n) => ({
            ...n,
            read: readMap.get(n.id) ?? n.read,
          }));
        });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchNotifications, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none badge-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 notif-slide-down"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({unreadCount})
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {loading ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center notif-empty-glow">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-12 rounded-full bg-muted-foreground/5 blur-xl scale-150" />
                </div>
                <Bell className="size-8 text-muted-foreground/40 relative" />
              </div>
              <p className="text-sm text-muted-foreground/70 mt-3">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5 notif-list-stagger">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-auto py-1.5 text-xs text-muted-foreground hover:text-foreground justify-center gap-1.5"
          >
            View all notifications
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
