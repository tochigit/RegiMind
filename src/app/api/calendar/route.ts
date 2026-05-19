import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ events: [], summary: { regulations: 0, tasks: 0, assessments: 0 } });
    }

    // Fetch all three sources in parallel
    const [regulations, tasks, assessments] = await Promise.all([
      db.regulation.findMany({
        where: {
          organizationId: org.id,
          effectiveDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          title: true,
          effectiveDate: true,
          status: true,
          source: true,
          region: true,
        },
      }),
      db.task.findMany({
        where: {
          organizationId: org.id,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          priority: true,
        },
      }),
      db.impactAssessment.findMany({
        where: {
          organizationId: org.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          riskScore: true,
          gapDescription: true,
          createdAt: true,
          status: true,
          regulation: {
            select: { title: true },
          },
        },
      }),
    ]);

    const now = new Date();

    // Build events array
    const events = [
      ...regulations.map((r) => ({
        id: `reg-${r.id}`,
        title: r.title,
        date: r.effectiveDate!.toISOString(),
        type: "regulation" as const,
        color: getRegulationColor(r.status),
        meta: {
          status: r.status,
          source: r.source,
          region: r.region,
        },
      })),
      ...tasks.map((t) => {
        const isOverdue = t.status !== "done" && t.dueDate && new Date(t.dueDate) < now;
        return {
          id: `task-${t.id}`,
          title: t.title,
          date: t.dueDate!.toISOString(),
          type: "task" as const,
          color: getTaskColor(t.priority, t.status, isOverdue),
          meta: {
            status: t.status,
            priority: t.priority,
            isOverdue,
          },
        };
      }),
      ...assessments.map((a) => ({
        id: `assess-${a.id}`,
        title: `Assessment: ${a.regulation.title}`,
        date: a.createdAt.toISOString(),
        type: "assessment" as const,
        color: getAssessmentColor(a.riskScore),
        meta: {
          riskScore: a.riskScore,
          gapDescription: a.gapDescription,
          status: a.status,
          regulationTitle: a.regulation.title,
        },
      })),
    ];

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Summary stats
    const summary = {
      regulations: regulations.length,
      tasksDue: tasks.length,
      tasksOverdue: tasks.filter(
        (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
      ).length,
      assessmentsDone: assessments.length,
    };

    return NextResponse.json({ events, summary });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ events: [], summary: { regulations: 0, tasks: 0, assessments: 0 } }, { status: 500 });
  }
}

function getRegulationColor(status: string): string {
  switch (status) {
    case "assessed":
      return "#10b981"; // emerald
    case "new":
      return "#3b82f6"; // blue
    case "archived":
      return "#9ca3af"; // gray
    default:
      return "#3b82f6"; // blue
  }
}

function getTaskColor(priority: string, status: string, isOverdue: boolean): string {
  if (status === "done") return "#10b981"; // green
  if (isOverdue) return "#ef4444"; // red
  switch (priority) {
    case "high":
      return "#ef4444"; // red
    case "medium":
      return "#f59e0b"; // amber
    case "low":
      return "#10b981"; // green
    default:
      return "#f59e0b"; // amber
  }
}

function getAssessmentColor(riskScore: string): string {
  switch (riskScore) {
    case "High":
      return "#8b5cf6"; // purple
    case "Medium":
      return "#f59e0b"; // amber
    case "Low":
      return "#10b981"; // green
    default:
      return "#f59e0b"; // amber
  }
}
