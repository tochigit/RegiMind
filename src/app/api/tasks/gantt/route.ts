import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const tasks = await db.task.findMany({
      where: { organizationId: org.id },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        sourceDependencies: {
          select: {
            targetTaskId: true,
            type: true,
          },
        },
        targetDependencies: {
          select: {
            sourceTaskId: true,
            type: true,
          },
        },
      },
    });

    // Transform dependencies into a flat list
    const ganttTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      dependencies: {
        blocking: task.sourceDependencies
          .filter((d) => d.type === 'blocks')
          .map((d) => d.targetTaskId),
        blockedBy: task.targetDependencies
          .filter((d) => d.type === 'blocks')
          .map((d) => d.sourceTaskId),
      },
    }));

    return NextResponse.json(ganttTasks);
  } catch (error) {
    console.error('GET /api/tasks/gantt error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gantt data' },
      { status: 500 }
    );
  }
}
