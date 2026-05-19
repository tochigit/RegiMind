import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Fetch all relevant data sources in parallel
    const [assessments, tasks, regulations, documents, auditLogs] = await Promise.all([
      db.impactAssessment.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          regulation: { select: { title: true } },
          document: { select: { title: true } },
        },
      }),
      db.task.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.regulation.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.internalDocument.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Build unified timeline entries
    const entries: Array<{
      id: string;
      type: "assessment" | "task" | "regulation" | "document" | "audit";
      title: string;
      description: string;
      timestamp: Date;
      icon: string;
      color: string;
    }> = [];

    // Assessments
    for (const a of assessments) {
      entries.push({
        id: `assessment-${a.id}`,
        type: "assessment",
        title: `Impact Assessment: ${a.riskScore} Risk`,
        description: a.gapDescription || `${a.regulation.title || "Regulation"} × ${a.document.title || "Document"}`,
        timestamp: a.createdAt,
        icon: "ShieldAlert",
        color: "amber",
      });
    }

    // Tasks
    for (const t of tasks) {
      const statusLabel = t.status === "done" ? "Completed" : t.status === "in_review" ? "In Review" : "Created";
      entries.push({
        id: `task-${t.id}`,
        type: "task",
        title: `Task ${statusLabel}: ${t.title}`,
        description: t.description || `${t.priority} priority task`,
        timestamp: t.createdAt,
        icon: "Kanban",
        color: "violet",
      });
    }

    // Regulations
    for (const r of regulations) {
      entries.push({
        id: `regulation-${r.id}`,
        type: "regulation",
        title: `Regulation: ${r.title}`,
        description: `${r.source} · ${r.region} · ${r.status}`,
        timestamp: r.createdAt,
        icon: "ScrollText",
        color: "teal",
      });
    }

    // Documents
    for (const d of documents) {
      entries.push({
        id: `document-${d.id}`,
        type: "document",
        title: `Document: ${d.title}`,
        description: `${d.docType}${d.version ? ` v${d.version}` : ""} · ${d.status}`,
        timestamp: d.createdAt,
        icon: "FileText",
        color: "orange",
      });
    }

    // Audit logs
    for (const a of auditLogs) {
      let description = `${a.action} on ${a.entity}`;
      try {
        if (a.details) {
          const details = JSON.parse(a.details);
          if (details.title) {
            description = `${a.action} ${details.title}`;
          }
        }
      } catch {
        // ignore parse errors
      }

      entries.push({
        id: `audit-${a.id}`,
        type: "audit",
        title: `${a.entity.charAt(0).toUpperCase() + a.entity.slice(1)}: ${a.action}`,
        description,
        timestamp: a.createdAt,
        icon: "History",
        color: "gray",
      });
    }

    // Sort by timestamp descending, deduplicate, limit to 50
    const sorted = entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
      .slice(0, 50);

    return NextResponse.json(
      sorted.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch timeline:", error);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
}
