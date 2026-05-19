import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const include = searchParams.get("include");

    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { organizationId: org.id };
    if (entity) where.entity = entity;

    const [data, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    const response: Record<string, unknown> = { data, total, limit, offset };

    // Include stats summary if requested
    if (include === "stats") {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const [totalEntries, todayEntries, byEntityResult, byActionResult] = await Promise.all([
        db.auditLog.count({ where: { organizationId: org.id } }),
        db.auditLog.count({
          where: {
            organizationId: org.id,
            createdAt: { gte: startOfToday },
          },
        }),
        db.auditLog.groupBy({
          by: ["entity"],
          where: { organizationId: org.id },
          _count: true,
        }),
        db.auditLog.groupBy({
          by: ["action"],
          where: { organizationId: org.id },
          _count: true,
        }),
      ]);

      const byEntity: Record<string, number> = {
        task: 0,
        assessment: 0,
        document: 0,
        comment: 0,
      };
      for (const row of byEntityResult) {
        if (row.entity in byEntity) {
          byEntity[row.entity] = row._count;
        }
      }

      const byAction: Record<string, number> = {
        created: 0,
        updated: 0,
        deleted: 0,
      };
      for (const row of byActionResult) {
        const action = row.action.toLowerCase();
        if (action.includes("created")) byAction.created += row._count;
        else if (action.includes("updated")) byAction.updated += row._count;
        else if (action.includes("deleted")) byAction.deleted += row._count;
      }

      response.stats = {
        totalEntries,
        todayEntries,
        byEntity,
        byAction,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
