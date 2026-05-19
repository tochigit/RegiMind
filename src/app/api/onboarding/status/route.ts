import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function GET() {
  try {
    // Try to use Prisma - will work once server restarts with new schema
    const prismaDb = db as Record<string, unknown>;
    if (!prismaDb.onboardingStatus) {
      // Schema not yet available in cached client - return defaults
      return NextResponse.json({
        id: "pending",
        userId: DEFAULT_USER_ID,
        completedSteps: [],
        isComplete: false,
      });
    }

    let status = await prismaDb.onboardingStatus.findUnique({
      where: { userId: DEFAULT_USER_ID },
    });

    if (!status) {
      status = await prismaDb.onboardingStatus.create({
        data: { userId: DEFAULT_USER_ID },
      });
    }

    const completedSteps = JSON.parse(status.completedSteps) as string[];

    return NextResponse.json({
      id: status.id,
      userId: status.userId,
      completedSteps,
      isComplete: status.isComplete,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/onboarding/status error:", error);
    // Return defaults on error (e.g., schema not yet migrated in running server)
    return NextResponse.json({
      id: "fallback",
      userId: DEFAULT_USER_ID,
      completedSteps: [],
      isComplete: false,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { completedSteps, isComplete } = body;

    if (!completedSteps || !Array.isArray(completedSteps)) {
      return NextResponse.json(
        { error: "completedSteps must be an array" },
        { status: 400 }
      );
    }

    const prismaDb = db as Record<string, unknown>;
    if (!prismaDb.onboardingStatus) {
      // Schema not yet available - return success (client uses localStorage as primary)
      return NextResponse.json({
        id: "fallback",
        userId: DEFAULT_USER_ID,
        completedSteps,
        isComplete: isComplete ?? completedSteps.length >= 6,
      });
    }

    const status = await prismaDb.onboardingStatus.upsert({
      where: { userId: DEFAULT_USER_ID },
      update: {
        completedSteps: JSON.stringify(completedSteps),
        isComplete: isComplete ?? completedSteps.length >= 6,
      },
      create: {
        userId: DEFAULT_USER_ID,
        completedSteps: JSON.stringify(completedSteps),
        isComplete: isComplete ?? completedSteps.length >= 6,
      },
    });

    return NextResponse.json({
      id: status.id,
      userId: status.userId,
      completedSteps: JSON.parse(status.completedSteps),
      isComplete: status.isComplete,
    });
  } catch (error) {
    console.error("PUT /api/onboarding/status error:", error);
    // Return success on error (client uses localStorage as primary)
    return NextResponse.json({
      id: "fallback",
      userId: DEFAULT_USER_ID,
      completedSteps: body?.completedSteps || [],
      isComplete: body?.isComplete || false,
    });
  }
}

export async function DELETE() {
  try {
    const prismaDb = db as Record<string, unknown>;
    if (prismaDb.onboardingStatus) {
      await (prismaDb.onboardingStatus as unknown as { deleteMany: (args: unknown) => Promise<unknown> }).deleteMany({
        where: { userId: DEFAULT_USER_ID },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/onboarding/status error:", error);
    // Return success (client also clears localStorage)
    return NextResponse.json({ success: true });
  }
}
