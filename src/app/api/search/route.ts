import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({
        regulations: [],
        documents: [],
        tasks: [],
      });
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const query = q.trim();
    const searchCondition = {
      contains: query,
      mode: "insensitive" as const,
    };

    const [regulations, documents, tasks] = await Promise.all([
      db.regulation.findMany({
        where: {
          organizationId: org.id,
          OR: [
            { title: searchCondition },
            { source: searchCondition },
            { region: searchCondition },
          ],
        },
        select: {
          id: true,
          title: true,
          source: true,
          region: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      db.internalDocument.findMany({
        where: {
          organizationId: org.id,
          OR: [
            { title: searchCondition },
            { docType: searchCondition },
            { scope: searchCondition },
          ],
        },
        select: {
          id: true,
          title: true,
          docType: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      db.task.findMany({
        where: {
          organizationId: org.id,
          OR: [
            { title: searchCondition },
            { description: searchCondition },
            { priority: searchCondition },
          ],
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      regulations: regulations.map((r) => ({ ...r, type: "regulation" as const })),
      documents: documents.map((d) => ({ ...d, type: "document" as const })),
      tasks: tasks.map((t) => ({ ...t, type: "task" as const })),
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
