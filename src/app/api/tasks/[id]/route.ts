import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, assigneeId, impactAssessmentId, dueDate } = body;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (impactAssessmentId !== undefined) updateData.impactAssessmentId = impactAssessmentId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const changedFields: Record<string, { from: string | null; to: string | null }> = {};
    if (title !== undefined && title !== existing.title) changedFields.title = { from: existing.title, to: title };
    if (description !== undefined && description !== existing.description) changedFields.description = { from: existing.description?.substring(0, 100) || null, to: description?.substring(0, 100) || null };
    if (status !== undefined && status !== existing.status) changedFields.status = { from: existing.status, to: status };
    if (priority !== undefined && priority !== existing.priority) changedFields.priority = { from: existing.priority, to: priority };

    const task = await db.task.update({
      where: { id },
      data: updateData,
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
      },
    });

    await createAuditLog({
      action: 'task.updated',
      entity: 'task',
      entityId: id,
      details: Object.keys(changedFields).length > 0 ? JSON.stringify(changedFields) : JSON.stringify({ title: existing.title }),
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    await createAuditLog({
      action: 'task.deleted',
      entity: 'task',
      entityId: id,
      details: JSON.stringify({ title: existing.title }),
    });

    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
