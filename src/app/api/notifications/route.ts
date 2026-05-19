import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type NotificationType = "critical" | "urgent" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const orgId = org.id;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Fetch data in parallel for all notification sources
    const [
      unassessedRegulations,
      highRiskGaps,
      overdueTasks,
      upcomingRegulations,
    ] = await Promise.all([
      // 1. Unassessed regulations
      db.regulation.findMany({
        where: { organizationId: orgId, status: "new" },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),

      // 2. High-risk open gaps
      db.impactAssessment.findMany({
        where: {
          organizationId: orgId,
          status: "open",
          riskScore: "High",
        },
        select: {
          id: true,
          riskScore: true,
          createdAt: true,
          document: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // 3. Overdue tasks
      db.task.findMany({
        where: {
          organizationId: orgId,
          dueDate: { lt: now },
          status: { not: "done" },
        },
        select: { id: true, title: true, dueDate: true, createdAt: true },
        orderBy: { dueDate: "asc" },
      }),

      // 4. Upcoming regulations (effective within 30 days)
      db.regulation.findMany({
        where: {
          organizationId: orgId,
          effectiveDate: { gte: now, lte: thirtyDaysFromNow },
        },
        select: { id: true, title: true, effectiveDate: true, createdAt: true },
        orderBy: { effectiveDate: "asc" },
      }),
    ]);

    // Build notification array
    const notifications: Notification[] = [];

    // Critical: High-risk open gaps
    for (const gap of highRiskGaps) {
      notifications.push({
        id: `gap-${gap.id}`,
        type: "critical",
        title: "High-risk gap identified",
        message: gap.document.title
          ? `High-risk gap identified for ${gap.document.title}`
          : "High-risk gap identified in impact assessment",
        timestamp: gap.createdAt.toISOString(),
        read: false,
      });
    }

    // Urgent: Overdue tasks
    for (const task of overdueTasks) {
      notifications.push({
        id: `task-${task.id}`,
        type: "urgent",
        title: "Overdue task",
        message: `Overdue task: ${task.title}`,
        timestamp: task.createdAt.toISOString(),
        read: false,
      });
    }

    // Warning: Unassessed regulations
    for (const reg of unassessedRegulations) {
      notifications.push({
        id: `reg-${reg.id}`,
        type: "warning",
        title: "New regulation awaiting assessment",
        message: `New regulation awaiting impact assessment: ${reg.title}`,
        timestamp: reg.createdAt.toISOString(),
        read: false,
      });
    }

    // Info: Upcoming regulations within 30 days
    for (const reg of upcomingRegulations) {
      const daysUntil = Math.ceil(
        (new Date(reg.effectiveDate!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      notifications.push({
        id: `upcoming-${reg.id}`,
        type: "info",
        title: "Regulation effective soon",
        message: `Regulation effective soon: ${reg.title} (in ${daysUntil} days)`,
        timestamp: reg.createdAt.toISOString(),
        read: false,
      });
    }

    // Sort by timestamp descending and limit to 15
    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(notifications.slice(0, 15));
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
