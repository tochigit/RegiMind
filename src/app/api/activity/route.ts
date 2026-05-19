import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  userName: string;
  entityType: string;
  entityId: string;
  details: string;
}

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json([], { status: 200 });
    }

    const orgId = org.id;
    const activities: ActivityEntry[] = [];

    // Fetch recent audit logs (most comprehensive)
    const recentAuditLogs = await db.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const log of recentAuditLogs) {
      activities.push({
        id: `audit-${log.id}`,
        type: log.entity,
        message: log.details
          ? (() => {
              try {
                const d = JSON.parse(log.details);
                return `${log.action} ${log.entity}: ${d.title || log.entityId}`;
              } catch {
                return `${log.action} ${log.entity}`;
              }
            })()
          : `${log.action} ${log.entity}`,
        timestamp: log.createdAt.toISOString(),
        icon: getIconForAction(log.action),
        userName: log.userName,
        entityType: log.entity,
        entityId: log.entityId,
        details: log.details || '',
      });
    }

    // Fetch recent assessments (if not already from audit logs)
    const recentAssessments = await db.impactAssessment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        riskScore: true,
        status: true,
        regulation: { select: { title: true } },
        createdAt: true,
      },
    });

    const existingAssessmentIds = new Set(
      recentAuditLogs
        .filter((l) => l.entity === 'assessment')
        .map((l) => l.entityId)
    );

    for (const a of recentAssessments) {
      if (existingAssessmentIds.has(a.id)) continue;
      activities.push({
        id: `assessment-${a.id}`,
        type: 'assessment',
        message: `Impact assessment completed for "${a.regulation.title}" — Risk: ${a.riskScore}`,
        timestamp: a.createdAt.toISOString(),
        icon: 'shield-alert',
        userName: 'Sarah Chen',
        entityType: 'assessment',
        entityId: a.id,
        details: JSON.stringify({ title: `Assessment for ${a.regulation.title}`, riskScore: a.riskScore }),
      });
    }

    // Fetch recent tasks
    const recentTasks = await db.task.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    const existingTaskIds = new Set(
      recentAuditLogs
        .filter((l) => l.entity === 'task')
        .map((l) => l.entityId)
    );

    for (const t of recentTasks) {
      if (existingTaskIds.has(t.id)) continue;
      activities.push({
        id: `task-${t.id}`,
        type: 'task',
        message: `Task created: "${t.title}" (${t.priority} priority)`,
        timestamp: t.createdAt.toISOString(),
        icon: 'check-circle',
        userName: 'Sarah Chen',
        entityType: 'task',
        entityId: t.id,
        details: JSON.stringify({ title: t.title, priority: t.priority, status: t.status }),
      });
    }

    // Fetch recent regulations
    const recentRegulations = await db.regulation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });

    for (const r of recentRegulations) {
      activities.push({
        id: `regulation-${r.id}`,
        type: 'regulation',
        message: `New regulation added: "${r.title}" from ${r.source}`,
        timestamp: r.createdAt.toISOString(),
        icon: 'scroll-text',
        userName: 'Sarah Chen',
        entityType: 'regulation',
        entityId: r.id,
        details: JSON.stringify({ title: r.title, source: r.source, status: r.status }),
      });
    }

    // Fetch recent documents
    const recentDocuments = await db.internalDocument.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        docType: true,
        createdAt: true,
      },
    });

    for (const d of recentDocuments) {
      activities.push({
        id: `document-${d.id}`,
        type: 'document',
        message: `Document uploaded: "${d.title}" (${d.docType})`,
        timestamp: d.createdAt.toISOString(),
        icon: 'file-text',
        userName: 'Sarah Chen',
        entityType: 'document',
        entityId: d.id,
        details: JSON.stringify({ title: d.title, docType: d.docType }),
      });
    }

    // Fetch recent comments
    const recentComments = await db.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        content: true,
        taskId: true,
        authorName: true,
        createdAt: true,
        task: { select: { title: true } },
      },
    });

    for (const c of recentComments) {
      activities.push({
        id: `comment-${c.id}`,
        type: 'comment',
        message: `${c.authorName} commented on "${c.task.title}"`,
        timestamp: c.createdAt.toISOString(),
        icon: 'message-square',
        userName: c.authorName,
        entityType: 'comment',
        entityId: c.id,
        details: JSON.stringify({ title: c.task.title, content: c.content.substring(0, 100) }),
      });
    }

    // Fetch recent checklist item completions
    const recentCompleted = await db.checklistItem.findMany({
      where: { isCompleted: true, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        completedAt: true,
        regulation: { select: { title: true } },
      },
    });

    for (const c of recentCompleted) {
      if (c.completedAt) {
        activities.push({
          id: `checklist-${c.id}`,
          type: 'checklist',
          message: `Completed requirement: "${c.title}" [${c.category}]`,
          timestamp: c.completedAt.toISOString(),
          icon: 'check-circle-2',
          userName: 'Sarah Chen',
          entityType: 'checklist',
          entityId: c.id,
          details: JSON.stringify({ title: c.title, category: c.category, regulation: c.regulation.title }),
        });
      }
    }

    // Deduplicate by id and sort by timestamp descending, take top 25
    const seen = new Set<string>();
    const deduped = activities.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    deduped.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(deduped.slice(0, 25));
  } catch (error) {
    console.error('GET /api/activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}

function getIconForAction(action: string): string {
  if (action.includes('created')) return 'plus-circle';
  if (action.includes('updated')) return 'pencil';
  if (action.includes('deleted')) return 'trash-2';
  return 'activity';
}
