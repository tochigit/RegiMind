import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const bookmarks = await db.bookmark.findMany({
      include: {
        regulation: {
          include: {
            _count: {
              select: { impactAssessments: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error('GET /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regulationId } = body;

    if (!regulationId) {
      return NextResponse.json(
        { error: 'regulationId is required' },
        { status: 400 }
      );
    }

    // Check if regulation exists
    const regulation = await db.regulation.findUnique({
      where: { id: regulationId },
    });

    if (!regulation) {
      return NextResponse.json(
        { error: 'Regulation not found' },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    const existing = await db.bookmark.findUnique({
      where: { regulationId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Regulation already bookmarked' },
        { status: 409 }
      );
    }

    const bookmark = await db.bookmark.create({
      data: { regulationId },
    });

    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { regulationId } = body;

    if (!regulationId) {
      return NextResponse.json(
        { error: 'regulationId is required' },
        { status: 400 }
      );
    }

    const bookmark = await db.bookmark.findUnique({
      where: { regulationId },
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    await db.bookmark.delete({
      where: { regulationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/bookmarks error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
