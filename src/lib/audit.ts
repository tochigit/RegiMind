import { db } from "@/lib/db";

export async function createAuditLog(params: {
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  userName?: string;
}) {
  try {
    const org = await db.organization.findFirst();
    if (!org) return;

    await db.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details || null,
        userName: params.userName || "Sarah Chen",
        organizationId: org.id,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
