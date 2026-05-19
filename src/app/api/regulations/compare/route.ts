import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regulationId1, regulationId2, regulationIds } = body;

    // Support both { regulationId1, regulationId2 } and { regulationIds: string[] }
    let ids: string[];
    if (regulationId1 && regulationId2) {
      ids = [regulationId1, regulationId2];
    } else if (regulationIds && Array.isArray(regulationIds)) {
      ids = regulationIds;
    } else {
      return NextResponse.json(
        { error: "Provide regulationId1 and regulationId2, or regulationIds array" },
        { status: 400 }
      );
    }

    if (ids.length < 2) {
      return NextResponse.json(
        { error: "At least 2 regulation IDs are required for comparison" },
        { status: 400 }
      );
    }

    if (ids.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 regulations can be compared at once" },
        { status: 400 }
      );
    }

    // Fetch all requested regulations with rich data
    const regulations = await db.regulation.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        impactAssessments: {
          select: {
            id: true,
            riskScore: true,
            status: true,
          },
        },
        checklistItems: {
          select: {
            id: true,
            isCompleted: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            impactAssessments: true,
            checklistItems: true,
            tags: true,
          },
        },
      },
    });

    if (regulations.length < 2) {
      return NextResponse.json(
        { error: "Could not find enough regulations for comparison" },
        { status: 404 }
      );
    }

    // Build regulation data with rich analysis
    const regulationData = regulations.map((reg) => {
      // Risk level breakdown
      const riskBreakdown = {
        high: reg.impactAssessments.filter((a) => a.riskScore === "High").length,
        medium: reg.impactAssessments.filter((a) => a.riskScore === "Medium").length,
        low: reg.impactAssessments.filter((a) => a.riskScore === "Low").length,
        total: reg.impactAssessments.length,
      };

      // Assessment status breakdown
      const assessmentStatus = {
        open: reg.impactAssessments.filter((a) => a.status === "open").length,
        in_progress: reg.impactAssessments.filter((a) => a.status === "in_progress").length,
        resolved: reg.impactAssessments.filter((a) => a.status === "resolved").length,
      };

      // Checklist progress
      const totalChecklist = reg.checklistItems.length;
      const completedChecklist = reg.checklistItems.filter((c) => c.isCompleted).length;
      const checklistProgress = totalChecklist > 0
        ? Math.round((completedChecklist / totalChecklist) * 100)
        : 0;

      // Extract categories from raw text
      const sourceText = reg.aiSummary || reg.rawText;
      const categories = extractCategories(sourceText);

      return {
        id: reg.id,
        title: reg.title,
        source: reg.source,
        region: reg.region,
        status: reg.status,
        effectiveDate: reg.effectiveDate?.toISOString() || null,
        summary: reg.aiSummary || reg.rawText.substring(0, 300) + "...",
        categories,
        riskBreakdown,
        assessmentStatus,
        checklistTotal: totalChecklist,
        checklistCompleted: completedChecklist,
        checklistProgress,
        tags: reg.tags,
        assessmentCount: reg._count.impactAssessments,
        checklistCount: reg._count.checklistItems,
      };
    });

    // ── Comparison analysis ──

    // Source, Region, Status comparisons
    const allSources = regulationData.map((r) => r.source);
    const allRegions = regulationData.map((r) => r.region);
    const allStatuses = regulationData.map((r) => r.status);

    // Tag comparison
    const tagSets = regulationData.map((r) => new Set(r.tags.map((t) => t.id)));
    const allTagIds = new Set(regulationData.flatMap((r) => r.tags.map((t) => t.id)));
    const sharedTagIds = new Set<string>();
    allTagIds.forEach((tagId) => {
      if (tagSets.every((ts) => ts.has(tagId))) {
        sharedTagIds.add(tagId);
      }
    });

    const sharedTags = regulationData[0].tags.filter((t) => sharedTagIds.has(t.id));
    const uniqueTags = regulationData.map((reg) =>
      reg.tags.filter((t) => !sharedTagIds.has(t.id))
    );

    // Common themes (categories that appear in 2+ regulations)
    const allCategories = regulationData.flatMap((r) => r.categories);
    const categoryFrequency: Record<string, number> = {};
    allCategories.forEach((cat) => {
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
    });
    const commonThemes = Object.entries(categoryFrequency)
      .filter(([, count]) => count >= 2)
      .map(([theme, count]) => ({ theme, count }));
    const uniqueThemes = Object.entries(categoryFrequency)
      .filter(([, count]) => count === 1)
      .map(([theme]) => theme);

    // ── Similarity Score ──
    // Based on: shared tags, source match, region match, status match, common themes
    let similarityScore = 0;
    const maxScore = 100;

    // Shared tags (max 40 points)
    const totalUniqueTagCount = allTagIds.size;
    if (totalUniqueTagCount > 0) {
      similarityScore += Math.round((sharedTagIds.size / totalUniqueTagCount) * 40);
    }

    // Source match (max 15 points)
    if (allSources.every((s) => s === allSources[0])) {
      similarityScore += 15;
    } else {
      // Partial credit for having at least 2 with same source
      const sourceCounts: Record<string, number> = {};
      allSources.forEach((s) => { sourceCounts[s] = (sourceCounts[s] || 0) + 1; });
      const maxSourceCount = Math.max(...Object.values(sourceCounts));
      similarityScore += Math.round((maxSourceCount / allSources.length) * 15);
    }

    // Region match (max 15 points)
    if (allRegions.every((r) => r === allRegions[0])) {
      similarityScore += 15;
    } else {
      const regionCounts: Record<string, number> = {};
      allRegions.forEach((r) => { regionCounts[r] = (regionCounts[r] || 0) + 1; });
      const maxRegionCount = Math.max(...Object.values(regionCounts));
      similarityScore += Math.round((maxRegionCount / allRegions.length) * 15);
    }

    // Status match (max 10 points)
    if (allStatuses.every((s) => s === allStatuses[0])) {
      similarityScore += 10;
    }

    // Common themes (max 20 points)
    if (allCategories.length > 0) {
      similarityScore += Math.round((commonThemes.length / Math.max(1, categoryFrequency ? Object.keys(categoryFrequency).length : 1)) * 20);
    }

    similarityScore = Math.min(maxScore, similarityScore);

    return NextResponse.json({
      regulations: regulationData,
      sourceComparison: {
        values: regulationData.map((r) => ({ id: r.id, source: r.source })),
        isUniform: allSources.length === 1,
      },
      regionComparison: {
        values: regulationData.map((r) => ({ id: r.id, region: r.region })),
        isUniform: allRegions.length === 1,
      },
      statusComparison: {
        values: regulationData.map((r) => ({ id: r.id, status: r.status })),
        isUniform: allStatuses.length === 1,
      },
      commonThemes,
      uniqueThemes,
      tagComparison: {
        shared: sharedTags,
        unique: regulationData.map((r, idx) => ({
          regulationId: r.id,
          tags: uniqueTags[idx],
        })),
      },
      similarityScore,
      similarityLabel:
        similarityScore >= 80 ? "Very Similar" :
        similarityScore >= 60 ? "Similar" :
        similarityScore >= 40 ? "Moderately Different" :
        similarityScore >= 20 ? "Different" :
        "Very Different",
    });
  } catch (error) {
    console.error("POST /api/regulations/compare error:", error);
    return NextResponse.json(
      { error: "Failed to compare regulations" },
      { status: 500 }
    );
  }
}

// Helper: Extract categories/themes from text
function extractCategories(text: string): string[] {
  const categories: string[] = [];
  const categoryKeywords = [
    { pattern: /quality\s*management/i, label: "Quality Management" },
    { pattern: /risk\s*management/i, label: "Risk Management" },
    { pattern: /design\s*control/i, label: "Design Controls" },
    { pattern: /process\s*validation/i, label: "Process Validation" },
    { pattern: /corrective.*preventive/i, label: "CAPA" },
    { pattern: /labeling|labelling/i, label: "Labeling" },
    { pattern: /clinical.*evidence|clinical.*evaluation/i, label: "Clinical Evidence" },
    { pattern: /post.*market/i, label: "Post-Market Surveillance" },
    { pattern: /traceability/i, label: "Traceability" },
    { pattern: /document.*control/i, label: "Document Control" },
    { pattern: /training|competenc/i, label: "Training & Competence" },
    { pattern: /supplier|vendor/i, label: "Supplier Management" },
    { pattern: /complaint/i, label: "Complaint Handling" },
    { pattern: /audit/i, label: "Audit Management" },
    { pattern: /regulatory.*affairs/i, label: "Regulatory Affairs" },
    { pattern: /software.*validation/i, label: "Software Validation" },
    { pattern: /sterilization/i, label: "Sterilization" },
    { pattern: /biocompatibilit/i, label: "Biocompatibility" },
    { pattern: /usability/i, label: "Usability Engineering" },
    { pattern: /implant/i, label: "Implant Requirements" },
  ];

  categoryKeywords.forEach(({ pattern, label }) => {
    if (pattern.test(text) && !categories.includes(label)) {
      categories.push(label);
    }
  });

  return categories;
}
