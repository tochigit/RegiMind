import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const tags = await db.tag.findMany({
      where: {
        taskTags: {
          some: { taskId: id },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("GET /api/tasks/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task tags" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tagIds } = body as { tagIds: string[] };

    const task = await db.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: "tagIds must be an array" },
        { status: 400 }
      );
    }

    if (tagIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 tags per task" },
        { status: 400 }
      );
    }

    // Delete existing tag associations
    await db.taskTag.deleteMany({
      where: { taskId: id },
    });

    // Create new tag associations
    if (tagIds.length > 0) {
      await db.taskTag.createMany({
        data: tagIds.map((tagId) => ({
          taskId: id,
          tagId,
        })),
      });
    }

    // Return updated tags
    const tags = await db.tag.findMany({
      where: {
        taskTags: {
          some: { taskId: id },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("PUT /api/tasks/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Failed to update task tags" },
      { status: 500 }
    );
  }
}
