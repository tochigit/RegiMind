import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = org.id;

    // Run all queries in parallel
    const [
      totalRegulations,
      newRegulations,
      assessedRegulations,
      totalDocuments,
      openAssessments,
      allAssessments,
      allTasks,
      overdueTasks,
      upcomingRegulations,
    ] = await Promise.all([
      db.regulation.count({ where: { organizationId: orgId } }),
      db.regulation.count({ where: { organizationId: orgId, status: 'new' } }),
      db.regulation.count({ where: { organizationId: orgId, status: 'assessed' } }),
      db.internalDocument.count({ where: { organizationId: orgId } }),
      db.impactAssessment.count({ where: { organizationId: orgId, status: 'open' } }),
      db.impactAssessment.findMany({
        where: { organizationId: orgId },
        select: { riskScore: true },
      }),
      db.task.findMany({
        where: { organizationId: orgId },
        select: { status: true },
      }),
      db.task.count({
        where: {
          organizationId: orgId,
          status: { not: 'done' },
          dueDate: { lt: new Date() },
        },
      }),
      db.regulation.findMany({
        where: {
          organizationId: orgId,
          effectiveDate: { gte: new Date() },
        },
        orderBy: { effectiveDate: 'asc' },
        select: {
          id: true,
          title: true,
          source: true,
          region: true,
          effectiveDate: true,
        },
      }),
    ]);

    // Calculate gaps by risk
    const gapsByRisk = { high: 0, medium: 0, low: 0 };
    for (const assessment of allAssessments) {
      const score = assessment.riskScore.toLowerCase();
      if (score in gapsByRisk) {
        (gapsByRisk as Record<string, number>)[score]++;
      }
    }

    // Calculate tasks by status
    const tasksByStatus = { todo: 0, in_review: 0, done: 0 };
    for (const task of allTasks) {
      if (task.status in tasksByStatus) {
        (tasksByStatus as Record<string, number>)[task.status]++;
      }
    }

    // Calculate days until effective for upcoming regulations
    const upcomingWithDays = upcomingRegulations.map((reg) => {
      const now = new Date();
      const effective = new Date(reg.effectiveDate!);
      const diffMs = effective.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        ...reg,
        daysUntilEffective: Math.max(0, daysUntil),
      };
    });

    return NextResponse.json({
      totalRegulations,
      newRegulations,
      assessedRegulations,
      totalDocuments,
      totalGaps: openAssessments,
      gapsByRisk,
      tasksByStatus,
      overdueTasks,
      upcomingRegulations: upcomingWithDays,
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
