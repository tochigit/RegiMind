import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const regulation = await db.regulation.findUnique({
      where: { id },
      include: {
        impactAssessments: {
          include: {
            document: { select: { id: true, title: true, docType: true } },
            tasks: { select: { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!regulation) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    return NextResponse.json(regulation);
  } catch (error) {
    console.error('GET /api/regulations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regulation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, source, region, status, effectiveDate, rawText, aiSummary, deltaJson, needsReview, changedBy } = body;

    const existing = await db.regulation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const fieldChanges: { field: string; oldValue: string; newValue: string }[] = [];

    if (title !== undefined && title !== existing.title) {
      updateData.title = title;
      fieldChanges.push({ field: 'title', oldValue: existing.title, newValue: title });
    }
    if (source !== undefined && source !== existing.source) {
      updateData.source = source;
      fieldChanges.push({ field: 'source', oldValue: existing.source, newValue: source });
    }
    if (region !== undefined && region !== existing.region) {
      updateData.region = region;
      fieldChanges.push({ field: 'region', oldValue: existing.region, newValue: region });
    }
    if (status !== undefined && status !== existing.status) {
      updateData.status = status;
      fieldChanges.push({ field: 'status', oldValue: existing.status, newValue: status });
    }
    if (effectiveDate !== undefined) {
      const newDate = effectiveDate ? new Date(effectiveDate) : null;
      const oldDateStr = existing.effectiveDate ? existing.effectiveDate.toISOString() : '';
      const newDateStr = newDate ? newDate.toISOString() : '';
      if (oldDateStr !== newDateStr) {
        updateData.effectiveDate = newDate;
        fieldChanges.push({
          field: 'effectiveDate',
          oldValue: existing.effectiveDate ? existing.effectiveDate.toISOString().split('T')[0] : 'none',
          newValue: newDate ? newDate.toISOString().split('T')[0] : 'none',
        });
      }
    }
    if (rawText !== undefined && rawText !== existing.rawText) {
      updateData.rawText = rawText;
      fieldChanges.push({ field: 'rawText', oldValue: existing.rawText.substring(0, 100), newValue: rawText.substring(0, 100) });
    }
    if (aiSummary !== undefined && aiSummary !== existing.aiSummary) {
      updateData.aiSummary = aiSummary;
      fieldChanges.push({ field: 'aiSummary', oldValue: existing.aiSummary || '(empty)', newValue: aiSummary || '(empty)' });
    }
    if (deltaJson !== undefined) {
      const newJson = typeof deltaJson === 'string' ? deltaJson : JSON.stringify(deltaJson);
      if (newJson !== existing.deltaJson) {
        updateData.deltaJson = newJson;
        fieldChanges.push({ field: 'deltaJson', oldValue: existing.deltaJson || '(empty)', newValue: newJson.substring(0, 100) });
      }
    }
    if (needsReview !== undefined && needsReview !== existing.needsReview) {
      updateData.needsReview = needsReview;
      fieldChanges.push({ field: 'needsReview', oldValue: String(existing.needsReview), newValue: String(needsReview) });
    }

    // Skip if no actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existing);
    }

    const regulation = await db.regulation.update({
      where: { id },
      data: updateData,
    });

    // Create changelog entries for each changed field
    if (fieldChanges.length > 0) {
      await db.regulationChange.createMany({
        data: fieldChanges.map((change) => ({
          regulationId: id,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changedBy: changedBy || 'System',
        })),
      });
    }

    return NextResponse.json(regulation);
  } catch (error) {
    console.error('PATCH /api/regulations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update regulation' },
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

    const existing = await db.regulation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    // Delete related tasks first (through impact assessments)
    const assessments = await db.impactAssessment.findMany({
      where: { regulationId: id },
      select: { id: true },
    });

    if (assessments.length > 0) {
      const assessmentIds = assessments.map((a) => a.id);
      await db.task.deleteMany({ where: { impactAssessmentId: { in: assessmentIds } } });
      await db.impactAssessment.deleteMany({ where: { id: { in: assessmentIds } } });
    }

    await db.regulation.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Regulation deleted' });
  } catch (error) {
    console.error('DELETE /api/regulations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete regulation' },
      { status: 500 }
    );
  }
}
