import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('docType');
    const scope = searchParams.get('scope');
    const search = searchParams.get('search');

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { organizationId: org.id };

    if (docType) where.docType = docType;
    if (scope) where.scope = scope;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { fileContent: { contains: search } },
      ];
    }

    const documents = await db.internalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { impactAssessments: true },
        },
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, docType, fileName, fileContent, scope, clause, version, status } = body;

    if (!title || !docType) {
      return NextResponse.json(
        { error: 'title and docType are required' },
        { status: 400 }
      );
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const document = await db.internalDocument.create({
      data: {
        title,
        docType,
        fileName: fileName || null,
        fileContent: fileContent || null,
        scope: scope || null,
        clause: clause || null,
        version: version || null,
        status: status || 'active',
        organizationId: org.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
