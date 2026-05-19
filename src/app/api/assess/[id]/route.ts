import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeRegulation } from '@/lib/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the regulation
    const regulation = await db.regulation.findUnique({
      where: { id },
    });

    if (!regulation) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    // Get all internal documents for the organization
    const documents = await db.internalDocument.findMany({
      where: { organizationId: regulation.organizationId },
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: 'No internal documents found for assessment' }, { status: 400 });
    }

    // Delete any existing impact assessments for this regulation to avoid duplicates
    const existingAssessments = await db.impactAssessment.findMany({
      where: { regulationId: id },
      select: { id: true },
    });

    if (existingAssessments.length > 0) {
      const existingIds = existingAssessments.map((a) => a.id);
      await db.task.deleteMany({ where: { impactAssessmentId: { in: existingIds } } });
      await db.impactAssessment.deleteMany({ where: { id: { in: existingIds } } });
    }

    try {
      // Use AI to perform gap analysis for each document
      const analysisResults = await analyzeRegulation(regulation, documents);

      // Create ImpactAssessment records for each document
      const assessments = [];

      for (const result of analysisResults as Array<{
        documentId: string;
        riskScore: string;
        gapDescription: string;
        requiredAction: string;
        aiRecommendation: string;
      }>) {
        const assessment = await db.impactAssessment.create({
          data: {
            regulationId: id,
            documentId: result.documentId,
            riskScore: result.riskScore,
            gapDescription: result.gapDescription,
            requiredAction: result.requiredAction,
            aiRecommendation: result.aiRecommendation,
            status: 'open',
            organizationId: regulation.organizationId,
          },
        });

        assessments.push(assessment);
      }

      // Update regulation status to assessed
      await db.regulation.update({
        where: { id },
        data: { status: 'assessed', needsReview: false },
      });

      return NextResponse.json({
        success: true,
        message: `Impact assessment completed for ${assessments.length} documents`,
        assessments,
      });
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);

      // Mark regulation as needing review
      await db.regulation.update({
        where: { id },
        data: { needsReview: true },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'AI analysis encountered errors. Regulation flagged for manual review.',
          details: String(aiError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('POST /api/assess/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to perform impact assessment' },
      { status: 500 }
    );
  }
}
