import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.internalDocument.findUnique({
      where: { id },
      include: {
        impactAssessments: {
          include: {
            regulation: true,
            tasks: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
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

    const existing = await db.internalDocument.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete related tasks first (through impact assessments)
    const assessments = await db.impactAssessment.findMany({
      where: { documentId: id },
      select: { id: true },
    });

    if (assessments.length > 0) {
      const assessmentIds = assessments.map((a) => a.id);
      await db.task.deleteMany({ where: { impactAssessmentId: { in: assessmentIds } } });
      await db.impactAssessment.deleteMany({ where: { id: { in: assessmentIds } } });
    }

    await db.internalDocument.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
