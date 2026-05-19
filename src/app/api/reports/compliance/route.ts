import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = org.id;

    const regulations = await db.regulation.findMany({
      where: { organizationId: orgId },
      include: {
        impactAssessments: {
          include: {
            document: {
              select: { title: true },
            },
            tasks: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Regulation Title',
      'Source',
      'Region',
      'Status',
      'Effective Date',
      'Risk Score',
      'Gap Description',
      'Required Action',
      'Document',
      'Task Title',
      'Task Status',
    ];

    const rows: string[][] = [];

    for (const reg of regulations) {
      if (reg.impactAssessments.length === 0) {
        rows.push([
          csvEscape(reg.title),
          csvEscape(reg.source),
          csvEscape(reg.region),
          csvEscape(reg.status),
          csvEscape(reg.effectiveDate ? reg.effectiveDate.toISOString().split('T')[0] : ''),
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      } else {
        for (const assessment of reg.impactAssessments) {
          if (assessment.tasks.length === 0) {
            rows.push([
              csvEscape(reg.title),
              csvEscape(reg.source),
              csvEscape(reg.region),
              csvEscape(reg.status),
              csvEscape(reg.effectiveDate ? reg.effectiveDate.toISOString().split('T')[0] : ''),
              csvEscape(assessment.riskScore),
              csvEscape(assessment.gapDescription || ''),
              csvEscape(assessment.requiredAction || ''),
              csvEscape(assessment.document?.title || ''),
              '',
              '',
            ]);
          } else {
            for (const task of assessment.tasks) {
              rows.push([
                csvEscape(reg.title),
                csvEscape(reg.source),
                csvEscape(reg.region),
                csvEscape(reg.status),
                csvEscape(reg.effectiveDate ? reg.effectiveDate.toISOString().split('T')[0] : ''),
                csvEscape(assessment.riskScore),
                csvEscape(assessment.gapDescription || ''),
                csvEscape(assessment.requiredAction || ''),
                csvEscape(assessment.document?.title || ''),
                csvEscape(task.title),
                csvEscape(task.status),
              ]);
            }
          }
        }
      }
    }

    const csvContent = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const today = new Date().toISOString().split('T')[0];
    const filename = `compliance-report-${today}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/compliance error:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}

function csvEscape(value: string): string {
  if (!value) return '""';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
}
