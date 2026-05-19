import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Return dependencies for a task (both blocking and blocked-by)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify task exists
    const task = await db.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get dependencies where this task is the source (this task blocks target tasks)
    const blocking = await db.taskDependency.findMany({
      where: { sourceTaskId: id, type: "blocks" },
      include: {
        targetTask: { select: { id: true, title: true, status: true } },
      },
    });

    // Get dependencies where this task is the target (other tasks block this task)
    const blockedBy = await db.taskDependency.findMany({
      where: { targetTaskId: id, type: "blocks" },
      include: {
        sourceTask: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json({
      blocking: blocking.map((d) => ({
        id: d.id,
        type: d.type,
        task: d.targetTask,
      })),
      blockedBy: blockedBy.map((d) => ({
        id: d.id,
        type: d.type,
        task: d.sourceTask,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch dependencies:", error);
    return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 });
  }
}

// POST: Add a dependency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceTaskId } = await params;
    const body = await request.json();
    const { targetTaskId, type } = body as {
      targetTaskId: string;
      type: "blocks" | "blocked_by";
    };

    if (!targetTaskId || !type) {
      return NextResponse.json(
        { error: "targetTaskId and type are required" },
        { status: 400 }
      );
    }

    if (!["blocks", "blocked_by"].includes(type)) {
      return NextResponse.json(
        { error: 'type must be "blocks" or "blocked_by"' },
        { status: 400 }
      );
    }

    if (sourceTaskId === targetTaskId) {
      return NextResponse.json(
        { error: "Cannot create self-dependency" },
        { status: 400 }
      );
    }

    // Verify both tasks exist
    const [sourceTask, targetTask] = await Promise.all([
      db.task.findUnique({ where: { id: sourceTaskId } }),
      db.task.findUnique({ where: { id: targetTaskId } }),
    ]);

    if (!sourceTask) {
      return NextResponse.json({ error: "Source task not found" }, { status: 404 });
    }
    if (!targetTask) {
      return NextResponse.json({ error: "Target task not found" }, { status: 404 });
    }

    // For "blocked_by" type, we create a "blocks" dependency from target -> source
    // So if task A is "blocked_by" task B, it means B blocks A
    // We store it as: source=B, target=A, type=blocks
    const actualSource = type === "blocked_by" ? targetTaskId : sourceTaskId;
    const actualTarget = type === "blocked_by" ? sourceTaskId : targetTaskId;

    const dependency = await db.taskDependency.create({
      data: {
        sourceTaskId: actualSource,
        targetTaskId: actualTarget,
        type: "blocks",
      },
      include: {
        sourceTask: { select: { id: true, title: true, status: true } },
        targetTask: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Dependency already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create dependency:", error);
    return NextResponse.json({ error: "Failed to create dependency" }, { status: 500 });
  }
}

// DELETE: Remove a dependency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get("dependencyId");

    if (!dependencyId) {
      return NextResponse.json(
        { error: "dependencyId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the dependency belongs to this task
    const dependency = await db.taskDependency.findFirst({
      where: {
        id: dependencyId,
        OR: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
      },
    });

    if (!dependency) {
      return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
    }

    await db.taskDependency.delete({ where: { id: dependencyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete dependency:", error);
    return NextResponse.json({ error: "Failed to delete dependency" }, { status: 500 });
  }
}
