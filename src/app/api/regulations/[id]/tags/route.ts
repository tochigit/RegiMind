import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const regulation = await db.regulation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!regulation) {
      return NextResponse.json(
        { error: "Regulation not found" },
        { status: 404 }
      );
    }

    const tags = await db.tag.findMany({
      where: {
        regulationTags: {
          some: { regulationId: id },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("GET /api/regulations/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Failed to fetch regulation tags" },
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

    const regulation = await db.regulation.findUnique({
      where: { id },
    });

    if (!regulation) {
      return NextResponse.json(
        { error: "Regulation not found" },
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
        { error: "Maximum 5 tags per regulation" },
        { status: 400 }
      );
    }

    // Delete existing tag associations
    await db.regulationTag.deleteMany({
      where: { regulationId: id },
    });

    // Create new tag associations
    if (tagIds.length > 0) {
      await db.regulationTag.createMany({
        data: tagIds.map((tagId) => ({
          regulationId: id,
          tagId,
        })),
      });
    }

    // Return updated tags
    const tags = await db.tag.findMany({
      where: {
        regulationTags: {
          some: { regulationId: id },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("PUT /api/regulations/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Failed to update regulation tags" },
      { status: 500 }
    );
  }
}
