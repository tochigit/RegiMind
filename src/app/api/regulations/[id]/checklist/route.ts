import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Return all checklist items for a regulation, grouped by category with completion stats
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify regulation exists
    const regulation = await db.regulation.findUnique({
      where: { id },
    });

    if (!regulation) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    const items = await db.checklistItem.findMany({
      where: { regulationId: id },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    // Compute stats
    const total = items.length;
    const completed = items.filter((i) => i.isCompleted).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Category-level stats
    const categoryStats = Object.entries(grouped).map(([category, catItems]) => {
      const catTotal = catItems.length;
      const catCompleted = catItems.filter((i) => i.isCompleted).length;
      return {
        category,
        total: catTotal,
        completed: catCompleted,
        pending: catTotal - catCompleted,
        percentage: catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0,
      };
    });

    return NextResponse.json({
      items,
      grouped,
      stats: { total, completed, pending, percentage },
      categoryStats,
    });
  } catch (error) {
    console.error('GET /api/regulations/[id]/checklist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist items' },
      { status: 500 }
    );
  }
}

// POST: Create a new checklist item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, category } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Verify regulation exists
    const regulation = await db.regulation.findUnique({
      where: { id },
    });

    if (!regulation) {
      return NextResponse.json({ error: 'Regulation not found' }, { status: 404 });
    }

    const item = await db.checklistItem.create({
      data: {
        regulationId: id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category.trim(),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/regulations/[id]/checklist error:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist item' },
      { status: 500 }
    );
  }
}

// PATCH: Update checklist item (toggle isCompleted, update title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { itemId, isCompleted, title, description } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    // Verify the checklist item belongs to this regulation
    const existing = await db.checklistItem.findFirst({
      where: { id: itemId, regulationId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isCompleted === 'boolean') {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }
    if (typeof title === 'string' && title.trim().length > 0) {
      updateData.title = title.trim();
    }
    if (typeof description === 'string') {
      updateData.description = description.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updated = await db.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/regulations/[id]/checklist error:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify the checklist item belongs to this regulation
    const existing = await db.checklistItem.findFirst({
      where: { id: itemId, regulationId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      );
    }

    await db.checklistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/regulations/[id]/checklist error:', error);
    return NextResponse.json(
      { error: 'Failed to delete checklist item' },
      { status: 500 }
    );
  }
}
