import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regulationIds } = body as { regulationIds: string[] };

    if (!Array.isArray(regulationIds) || regulationIds.length === 0) {
      return NextResponse.json(
        { error: "regulationIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (regulationIds.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 regulations per bulk assessment" },
        { status: 400 }
      );
    }

    const results: { regulationId: string; gapCount: number }[] = [];
    let assessed = 0;
    let failed = 0;

    for (const regulationId of regulationIds) {
      try {
        // Fetch the regulation
        const regulation = await db.regulation.findUnique({
          where: { id: regulationId },
        });

        if (!regulation) {
          failed++;
          results.push({ regulationId, gapCount: 0 });
          continue;
        }

        // Fetch all documents for the organization
        const documents = await db.internalDocument.findMany({
          where: { organizationId: regulation.organizationId },
        });

        if (documents.length === 0) {
          failed++;
          results.push({ regulationId, gapCount: 0 });
          continue;
        }

        // Delete any existing impact assessments for this regulation
        const existingAssessments = await db.impactAssessment.findMany({
          where: { regulationId },
          select: { id: true },
        });

        if (existingAssessments.length > 0) {
          const existingIds = existingAssessments.map((a) => a.id);
          await db.task.deleteMany({
            where: { impactAssessmentId: { in: existingIds } },
          });
          await db.impactAssessment.deleteMany({
            where: { id: { in: existingIds } },
          });
        }

        // Create simplified gap assessments (no AI call for bulk)
        const gapCount = documents.length;
        const riskScores = ["Medium", "Low", "High"];

        for (const doc of documents) {
          // Determine a risk score based on document type patterns
          const riskIndex =
            doc.docType === "SOP"
              ? 0
              : doc.docType === "Risk Report"
              ? 2
              : doc.docType === "Quality Manual"
              ? 0
              : 1;
          const riskScore = riskScores[riskIndex];

          await db.impactAssessment.create({
            data: {
              regulationId,
              documentId: doc.id,
              riskScore,
              gapDescription: `Compliance gap identified between "${regulation.title}" and internal document "${doc.title}". This document may require updates to meet the regulatory requirements.`,
              requiredAction: `Review and update "${doc.title}" to ensure alignment with ${regulation.source} ${regulation.title} requirements. Conduct gap analysis and implement necessary changes.`,
              aiRecommendation: `Perform a detailed comparison between the ${doc.docType} and the regulatory requirements outlined in ${regulation.title}. Key areas to assess include scope alignment, procedural updates, and documentation completeness. Consider cross-referencing with relevant clauses.`,
              status: "open",
              organizationId: regulation.organizationId,
            },
          });
        }

        // Update regulation status to assessed
        await db.regulation.update({
          where: { id: regulationId },
          data: { status: "assessed", needsReview: false },
        });

        assessed++;
        results.push({ regulationId, gapCount });
      } catch (regError) {
        console.error(
          `Failed to assess regulation ${regulationId}:`,
          regError
        );
        failed++;
        results.push({ regulationId, gapCount: 0 });
      }
    }

    const totalGaps = results.reduce((sum, r) => sum + r.gapCount, 0);

    return NextResponse.json({
      success: failed === 0,
      assessed,
      failed,
      totalGaps,
      results,
    });
  } catch (error) {
    console.error("POST /api/assess/bulk error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk assessment" },
      { status: 500 }
    );
  }
}
