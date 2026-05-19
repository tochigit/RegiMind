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
    });

    if (!regulation) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    const changes = await db.regulationChange.findMany({
      where: { regulationId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(changes);
  } catch (error) {
    console.error('GET /api/regulations/[id]/changelog error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}
