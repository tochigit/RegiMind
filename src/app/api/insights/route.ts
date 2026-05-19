import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 1. Gap closure rate
    const [totalGaps, resolvedGaps] = await Promise.all([
      db.impactAssessment.count(),
      db.impactAssessment.count({ where: { status: 'resolved' } }),
    ]);
    const gapClosureRate = totalGaps > 0 ? Math.round((resolvedGaps / totalGaps) * 100) : 0;

    // 2. Average time to close gaps (days)
    const resolvedAssessments = await db.impactAssessment.findMany({
      where: { status: 'resolved' },
      select: { createdAt: true, updatedAt: true },
    });
    let avgTimeToClose = 0;
    if (resolvedAssessments.length > 0) {
      const totalDays = resolvedAssessments.reduce((sum, a) => {
        const diff = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTimeToClose = Math.round(totalDays / resolvedAssessments.length);
    }

    // 3. Risk distribution
    const [highRisk, mediumRisk, lowRisk] = await Promise.all([
      db.impactAssessment.count({ where: { riskScore: 'High' } }),
      db.impactAssessment.count({ where: { riskScore: 'Medium' } }),
      db.impactAssessment.count({ where: { riskScore: 'Low' } }),
    ]);

    // 4. Compliance trend (group assessments by week of createdAt)
    const allAssessments = await db.impactAssessment.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const trendByWeek: Record<string, number> = {};
    for (const a of allAssessments) {
      const date = new Date(a.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      trendByWeek[key] = (trendByWeek[key] || 0) + 1;
    }
    const complianceTrend = Object.entries(trendByWeek)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // 5. Document coverage
    const [docsWithAssessments, totalDocs] = await Promise.all([
      db.impactAssessment.groupBy({
        by: ['documentId'],
      }),
      db.internalDocument.count(),
    ]);
    const documentCoverage = totalDocs > 0
      ? Math.round((docsWithAssessments.length / totalDocs) * 100)
      : 0;

    // 6. Task completion rate
    const [doneTasks, totalTasks] = await Promise.all([
      db.task.count({ where: { status: 'done' } }),
      db.task.count(),
    ]);
    const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // 7. Overdue tasks
    const now = new Date();
    const overdueTasks = await db.task.count({
      where: {
        status: { not: 'done' },
        dueDate: { lt: now },
      },
    });

    // 8. Upcoming regulation deadlines (next 30/60/90 days)
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const upcomingRegulations = await db.regulation.findMany({
      where: {
        effectiveDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        source: true,
        region: true,
        effectiveDate: true,
      },
      orderBy: { effectiveDate: 'asc' },
      take: 10,
    });

    const deadlines30 = upcomingRegulations.filter(r => new Date(r.effectiveDate!) <= thirtyDays).length;
    const deadlines60 = upcomingRegulations.filter(r => {
      const d = new Date(r.effectiveDate!);
      return d > thirtyDays && d <= sixtyDays;
    }).length;
    const deadlines90 = upcomingRegulations.filter(r => {
      const d = new Date(r.effectiveDate!);
      return d > sixtyDays && d <= ninetyDays;
    }).length;

    // 9. Top risk areas (most common gapDescription patterns)
    const gapsWithDescriptions = await db.impactAssessment.findMany({
      where: { gapDescription: { not: null } },
      select: { gapDescription: true, riskScore: true },
    });

    // Extract top patterns from gap descriptions
    const gapPatterns = new Map<string, { count: number; riskScore: string }>();
    for (const gap of gapsWithDescriptions) {
      if (!gap.gapDescription) continue;
      // Take the first part of the description as a category pattern
      const pattern = gap.gapDescription.length > 60
        ? gap.gapDescription.substring(0, 60) + '...'
        : gap.gapDescription;
      const existing = gapPatterns.get(pattern);
      if (existing) {
        gapPatterns.set(pattern, { count: existing.count + 1, riskScore: gap.riskScore });
      } else {
        gapPatterns.set(pattern, { count: 1, riskScore: gap.riskScore });
      }
    }

    const topRiskAreas = Array.from(gapPatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([description, data]) => ({
        description,
        count: data.count,
        riskScore: data.riskScore,
      }));

    // 10. Compliance score (derived from gap/risk data)
    const complianceScore = Math.max(
      0,
      Math.min(100, 100 - (highRisk * 20 + mediumRisk * 10 + lowRisk * 5) - overdueTasks * 5)
    );

    return NextResponse.json({
      complianceScore,
      gapClosureRate,
      avgTimeToClose,
      riskDistribution: { high: highRisk, medium: mediumRisk, low: lowRisk },
      complianceTrend,
      documentCoverage,
      taskCompletionRate,
      totalTasks,
      doneTasks,
      overdueTasks,
      upcomingDeadlines: upcomingRegulations.map(r => ({
        id: r.id,
        title: r.title,
        source: r.source,
        region: r.region,
        effectiveDate: r.effectiveDate,
        daysUntilEffective: Math.ceil(
          (new Date(r.effectiveDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      deadlineSummary: { within30: deadlines30, within60: deadlines60, within90: deadlines90 },
      topRiskAreas,
    });
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
