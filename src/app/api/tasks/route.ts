import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { organizationId: org.id };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        impactAssessment: {
          include: {
            regulation: {
              select: { id: true, title: true, source: true },
            },
            document: {
              select: { id: true, title: true, docType: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, status, priority, assigneeId, impactAssessmentId, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        impactAssessmentId: impactAssessmentId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        organizationId: org.id,
      },
      include: {
        impactAssessment: {
          include: {
            regulation: {
              select: { id: true, title: true, source: true },
            },
            document: {
              select: { id: true, title: true, docType: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    await createAuditLog({
      action: 'task.created',
      entity: 'task',
      entityId: task.id,
      details: JSON.stringify({ title, priority: priority || 'medium', status: status || 'todo' }),
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
