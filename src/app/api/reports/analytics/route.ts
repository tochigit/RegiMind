import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }
    const orgId = org.id;
    const now = new Date();

    // Parallel queries for all analytics data
    const [
      totalRegulations,
      totalDocuments,
      totalTasks,
      openAssessments,
      allAssessments,
      allTasks,
      overdueTasks,
      regulationsBySource,
      regulationsByStatus,
      assessedRegulations,
      documentsWithAssessments,
      recentGaps7d,
      recentGaps30d,
      recentGaps90d,
      topRegsWithGaps,
      tasksDoneWithDates,
    ] = await Promise.all([
      // Total regulations
      db.regulation.count({ where: { organizationId: orgId } }),
      // Total documents
      db.internalDocument.count({ where: { organizationId: orgId } }),
      // Total tasks
      db.task.count({ where: { organizationId: orgId } }),
      // Open gaps (assessments)
      db.impactAssessment.count({ where: { organizationId: orgId, status: 'open' } }),
      // All assessments for risk breakdown
      db.impactAssessment.findMany({
        where: { organizationId: orgId },
        select: { riskScore: true, regulationId: true, createdAt: true },
      }),
      // All tasks for status breakdown
      db.task.findMany({
        where: { organizationId: orgId },
        select: { status: true, createdAt: true, updatedAt: true },
      }),
      // Overdue tasks
      db.task.count({
        where: {
          organizationId: orgId,
          status: { not: 'done' },
          dueDate: { lt: now },
        },
      }),
      // Regulations grouped by source
      db.regulation.groupBy({
        by: ['source'],
        where: { organizationId: orgId },
        _count: true,
      }),
      // Regulations grouped by status
      db.regulation.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
      // Assessed regulations count
      db.regulation.count({ where: { organizationId: orgId, status: 'assessed' } }),
      // Documents with assessments
      db.internalDocument.count({
        where: {
          organizationId: orgId,
          impactAssessments: { some: {} },
        },
      }),
      // Gaps created in last 7 days
      db.impactAssessment.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Gaps created in last 30 days
      db.impactAssessment.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Gaps created in last 90 days
      db.impactAssessment.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Top 5 regulations with most open gaps
      db.regulation.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          title: true,
          source: true,
          _count: {
            select: { impactAssessments: { where: { status: 'open' } } },
          },
        },
        orderBy: { impactAssessments: { _count: 'desc' } },
        take: 5,
      }),
      // Done tasks with dates for avg close time
      db.task.findMany({
        where: { organizationId: orgId, status: 'done' },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    // Gap distribution by risk
    const gapsByRisk = { high: 0, medium: 0, low: 0 };
    for (const assessment of allAssessments) {
      const score = assessment.riskScore.toLowerCase();
      if (score in gapsByRisk) {
        (gapsByRisk as Record<string, number>)[score]++;
      }
    }

    // Task status breakdown
    const tasksByStatus = { todo: 0, in_review: 0, done: 0 };
    for (const task of allTasks) {
      if (task.status in tasksByStatus) {
        (tasksByStatus as Record<string, number>)[task.status]++;
      }
    }

    // Compliance score (same formula as stats endpoint)
    const { high, medium, low } = gapsByRisk;
    const complianceScore = Math.max(0, Math.min(100, 100 - (high * 20 + medium * 10 + low * 5) - overdueTasks * 5));

    // Task completion rate
    const taskCompletionRate = totalTasks > 0 ? Math.round((tasksByStatus.done / totalTasks) * 100) : 0;

    // Document coverage
    const documentCoverage = totalDocuments > 0 ? Math.round((documentsWithAssessments / totalDocuments) * 100) : 0;

    // Average days to close tasks
    let avgDaysToClose = 0;
    if (tasksDoneWithDates.length > 0) {
      const totalDays = tasksDoneWithDates.reduce((sum, task) => {
        const diffMs = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
        return sum + diffMs / (1000 * 60 * 60 * 24);
      }, 0);
      avgDaysToClose = Math.round((totalDays / tasksDoneWithDates.length) * 10) / 10;
    }

    // Regulations by source
    const regulationsBySourceMap: Record<string, number> = {};
    for (const item of regulationsBySource) {
      regulationsBySourceMap[item.source] = item._count;
    }

    // Regulations by status
    const regulationsByStatusMap: Record<string, number> = {};
    for (const item of regulationsByStatus) {
      regulationsByStatusMap[item.status] = item._count;
    }

    // Top 5 regulations with most open gaps
    const topRegulationsWithGaps = topRegsWithGaps
      .map((reg) => ({
        id: reg.id,
        title: reg.title,
        source: reg.source,
        openGaps: reg._count.impactAssessments,
      }))
      .filter((r) => r.openGaps > 0)
      .slice(0, 5);

    return NextResponse.json({
      complianceScore,
      totalRegulations,
      totalDocuments,
      totalTasks,
      totalOpenGaps: openAssessments,
      gapsByRisk,
      taskCompletionRate,
      tasksByStatus,
      documentsCoverage: documentCoverage,
      avgDaysToClose,
      regulationsBySource: regulationsBySourceMap,
      regulationsByStatus: regulationsByStatusMap,
      assessedRegulations,
      recentGapTrend: {
        last7Days: recentGaps7d,
        last30Days: recentGaps30d,
        last90Days: recentGaps90d,
      },
      topRegulationsWithGaps,
      overdueTasks,
    });
  } catch (error) {
    console.error('GET /api/reports/analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
