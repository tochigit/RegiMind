import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = org.id;
    const now = new Date();

    // Build array of last 7 days (YYYY-MM-DD)
    const days: { date: string; start: Date; end: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = new Date(d);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      days.push({
        date: start.toISOString().split("T")[0],
        start,
        end,
      });
    }

    // Fetch all relevant data for the last 7 days in parallel
    const [assessments, tasks] = await Promise.all([
      db.impactAssessment.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: days[0].start },
        },
        select: {
          riskScore: true,
          createdAt: true,
        },
      }),
      db.task.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: days[0].start },
        },
        select: {
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Build trend data for each day
    const result = days.map(({ date, start, end }) => {
      // Assessments created on this day
      const newAssessments = assessments.filter(
        (a) => a.createdAt >= start && a.createdAt <= end
      ).length;

      // Gaps by risk level (all open assessments, not just new ones - count existing)
      const highGaps = assessments.filter(
        (a) => a.riskScore === "High" && a.createdAt <= end
      ).length;
      const mediumGaps = assessments.filter(
        (a) => a.riskScore === "Medium" && a.createdAt <= end
      ).length;
      const lowGaps = assessments.filter(
        (a) => a.riskScore === "Low" && a.createdAt <= end
      ).length;

      // Tasks completed on this day (status = done and updatedAt on this day)
      const tasksCompleted = tasks.filter(
        (t) => t.status === "done" && t.updatedAt >= start && t.updatedAt <= end
      ).length;

      return {
        date,
        newAssessments,
        highGaps,
        mediumGaps,
        lowGaps,
        tasksCompleted,
      };
    });

    return NextResponse.json({ days: result });
  } catch (error) {
    console.error("GET /api/stats/trend error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trend data" },
      { status: 500 }
    );
  }
}
