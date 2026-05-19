import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const includeParam = searchParams.get('include');
    const bookmarked = searchParams.get('bookmarked');

    // Get default organization
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { organizationId: org.id };

    if (status) where.status = status;
    if (source) where.source = source;
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { rawText: { contains: search } },
      ];
    }

    const includeAssessments = includeParam === 'assessments';

    // If bookmarked=true, only return bookmarked regulations
    const queryOptions: Record<string, unknown> = {
      where,
      orderBy: { publishedDate: 'desc' },
      include: {
        _count: {
          select: { impactAssessments: true, checklistItems: true },
        },
        ...(includeAssessments
          ? {
              impactAssessments: {
                include: {
                  document: { select: { id: true, title: true, docType: true } },
                  tasks: { select: { id: true, title: true, status: true } },
                },
                orderBy: { createdAt: 'desc' as const },
              },
            }
          : {}),
      },
    };

    let regulations;
    if (bookmarked === 'true') {
      // Get all bookmarked regulation IDs for this org
      const bookmarks = await db.bookmark.findMany({
        where: {
          regulation: { organizationId: org.id },
        },
        select: { regulationId: true },
      });
      const bookmarkedIds = bookmarks.map((b) => b.regulationId);
      (queryOptions.where as Record<string, unknown>).id = { in: bookmarkedIds };
      regulations = await db.regulation.findMany(queryOptions as never);
    } else {
      regulations = await db.regulation.findMany(queryOptions as never);
    }

    return NextResponse.json(regulations);
  } catch (error) {
    console.error('GET /api/regulations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regulations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, source, region, status, effectiveDate, rawText, aiSummary, deltaJson } = body;

    if (!title || !source || !region || !rawText) {
      return NextResponse.json(
        { error: 'title, source, region, and rawText are required' },
        { status: 400 }
      );
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const regulation = await db.regulation.create({
      data: {
        title,
        source,
        region,
        status: status || 'new',
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        rawText,
        aiSummary,
        deltaJson: deltaJson ? (typeof deltaJson === 'string' ? deltaJson : JSON.stringify(deltaJson)) : null,
        organizationId: org.id,
      },
    });

    return NextResponse.json(regulation, { status: 201 });
  } catch (error) {
    console.error('POST /api/regulations error:', error);
    return NextResponse.json(
      { error: 'Failed to create regulation' },
      { status: 500 }
    );
  }
}
