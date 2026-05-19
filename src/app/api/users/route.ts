import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Get activity counts per user via audit logs and comments
    const auditStats = await db.auditLog.groupBy({
      by: ['userName'],
      _count: { id: true },
    });

    const commentStats = await db.comment.groupBy({
      by: ['authorName'],
      _count: { id: true },
    });

    const statsMap = new Map<string, number>();
    for (const stat of auditStats) {
      const current = statsMap.get(stat.userName) || 0;
      statsMap.set(stat.userName, current + stat._count.id);
    }
    for (const stat of commentStats) {
      const current = statsMap.get(stat.authorName) || 0;
      statsMap.set(stat.authorName, current + stat._count.id);
    }

    const enrichedUsers = users.map((user) => {
      const activityCount = statsMap.get(user.name || '') || 0;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats: {
          activityCount,
        },
      };
    });

    return NextResponse.json(enrichedUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
