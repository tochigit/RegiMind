import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Fetch all checklist items grouped by category
    const items = await db.checklistItem.findMany({
      select: {
        category: true,
        isCompleted: true,
      },
    });

    // Define the 5 radar axes
    const axes = [
      "Quality System",
      "Design Controls",
      "Risk Management",
      "Labeling",
      "Clinical Evidence",
    ];

    // Map categories to axes (fuzzy matching)
    const categoryMapping: Record<string, string> = {
      "Quality System": "Quality System",
      "Quality Management": "Quality System",
      "Document Control": "Quality System",
      "Design Controls": "Design Controls",
      "Design Control": "Design Controls",
      "Process Validation": "Design Controls",
      "Risk Management": "Risk Management",
      "Clinical Evidence": "Clinical Evidence",
      "Clinical Evaluation": "Clinical Evidence",
      "Labeling": "Labeling",
      "Labeling Requirements": "Labeling",
      "CAPA": "Quality System",
      "Corrective and Preventive Action": "Quality System",
      "Post-Market Surveillance": "Risk Management",
      "Traceability": "Quality System",
      "Training": "Quality System",
      "Supplier Management": "Quality System",
      "Complaint Handling": "Risk Management",
      "Audit Management": "Quality System",
      "Regulatory Affairs": "Quality System",
      "Software Validation": "Design Controls",
      "Sterilization": "Risk Management",
      "Biocompatibility": "Risk Management",
      "Usability Engineering": "Design Controls",
      "Implant Requirements": "Clinical Evidence",
    };

    // Calculate scores per axis
    const scores = axes.map((axis) => {
      const matchingCategories = Object.entries(categoryMapping).filter(
        ([, mappedAxis]) => mappedAxis === axis
      ).map(([cat]) => cat);

      const axisItems = items.filter((item) =>
        matchingCategories.some((cat) => item.category === cat)
      );

      const total = axisItems.length;
      const completed = axisItems.filter((i) => i.isCompleted).length;
      const score = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        axis,
        score,
        total,
        completed,
        pending: total - completed,
      };
    });

    // Calculate overall score
    const allTotal = items.length;
    const allCompleted = items.filter((i) => i.isCompleted).length;
    const overallScore = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

    return NextResponse.json({
      scores,
      overallScore,
      totalItems: allTotal,
      completedItems: allCompleted,
    });
  } catch (error) {
    console.error("GET /api/stats/compliance-radar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance radar data" },
      { status: 500 }
    );
  }
}
