import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 5x5 risk matrix: Likelihood (1-5) x Impact (1-5)
// Likelihood: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
// Impact: 1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface MatrixCell {
  likelihood: number;
  impact: number;
  count: number;
  riskScore: number;
  riskLevel: string;
  tasks: { id: string; title: string; priority: string; status: string }[];
}

export async function GET() {
  try {
    const org = await db.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get all impact assessments with their tasks
    const assessments = await db.impactAssessment.findMany({
      where: { organizationId: org.id },
      include: {
        tasks: {
          select: { id: true, title: true, priority: true, status: true },
        },
        regulation: {
          select: { id: true, title: true, source: true },
        },
      },
    });

    // Build the 5x5 matrix by mapping risk scores to likelihood/impact
    // Heuristic: 
    //   High risk → distributed across higher likelihood + impact cells
    //   Medium risk → distributed across middle cells
    //   Low risk → distributed across lower cells
    const matrix: MatrixCell[][] = Array.from({ length: 5 }, (_, li) =>
      Array.from({ length: 5 }, (_, im) => ({
        likelihood: li + 1,
        impact: im + 1,
        count: 0,
        riskScore: (li + 1) * (im + 1),
        riskLevel: getRiskLevel((li + 1) * (im + 1)),
        tasks: [],
      }))
    );

    // Assign each assessment to a cell based on risk score and a simple deterministic hash
    for (const assessment of assessments) {
      let targetLikelihood: number;
      let targetImpact: number;

      switch (assessment.riskScore) {
        case 'High':
          // High risk: likelihood 4-5, impact 3-5
          targetLikelihood = simpleHash(assessment.id, 4, 5);
          targetImpact = simpleHash(assessment.id + 'i', 3, 5);
          break;
        case 'Medium':
          // Medium risk: likelihood 2-4, impact 2-4
          targetLikelihood = simpleHash(assessment.id, 2, 4);
          targetImpact = simpleHash(assessment.id + 'i', 2, 4);
          break;
        case 'Low':
          // Low risk: likelihood 1-3, impact 1-3
          targetLikelihood = simpleHash(assessment.id, 1, 3);
          targetImpact = simpleHash(assessment.id + 'i', 1, 3);
          break;
        default:
          targetLikelihood = simpleHash(assessment.id, 2, 4);
          targetImpact = simpleHash(assessment.id + 'i', 2, 4);
      }

      const cell = matrix[targetLikelihood - 1][targetImpact - 1];
      cell.count += 1;
      cell.tasks.push(
        ...assessment.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
        }))
      );
    }

    // Flatten for easy consumption and add labels
    const flatMatrix = matrix.flat().map((cell) => ({
      ...cell,
      likelihoodLabel: LIKELIHOOD_LABELS[cell.likelihood - 1],
      impactLabel: IMPACT_LABELS[cell.impact - 1],
    }));

    // Compute summary stats
    const totalAssessments = assessments.length;
    const riskDistribution = { high: 0, medium: 0, low: 0 };
    for (const a of assessments) {
      if (a.riskScore === 'High') riskDistribution.high++;
      else if (a.riskScore === 'Medium') riskDistribution.medium++;
      else riskDistribution.low++;
    }

    return NextResponse.json({
      matrix: flatMatrix,
      summary: {
        totalAssessments,
        riskDistribution,
        likelihoodLabels: LIKELIHOOD_LABELS,
        impactLabels: IMPACT_LABELS,
      },
    });
  } catch (error) {
    console.error('GET /api/risk-matrix error:', error);
    return NextResponse.json({ error: 'Failed to fetch risk matrix' }, { status: 500 });
  }
}

function getRiskLevel(score: number): string {
  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 6) return 'Medium';
  if (score >= 3) return 'Low';
  return 'Minimal';
}

// Simple deterministic hash to spread items across a range
function simpleHash(str: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const range = max - min + 1;
  return min + (Math.abs(hash) % range);
}
