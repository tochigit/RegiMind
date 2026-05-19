import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Gather compliance context from the database
    const org = await db.organization.findFirst();

    let contextParts: string[] = [];

    if (org) {
      // Get recent regulations
      const regulations = await db.regulation.findMany({
        where: { organizationId: org.id },
        take: 5,
        orderBy: { publishedDate: 'desc' },
        select: { title: true, source: true, status: true },
      });

      // Get gap stats
      const assessments = await db.impactAssessment.findMany({
        where: { organizationId: org.id },
        select: { riskScore: true, status: true },
      });

      const highGaps = assessments.filter((a) => a.riskScore === 'High').length;
      const medGaps = assessments.filter((a) => a.riskScore === 'Medium').length;
      const lowGaps = assessments.filter((a) => a.riskScore === 'Low').length;
      const openGaps = assessments.filter((a) => a.status === 'open').length;

      // Get task stats
      const tasks = await db.task.findMany({
        where: { organizationId: org.id },
        select: { status: true, priority: true },
      });

      const todoTasks = tasks.filter((t) => t.status === 'todo').length;
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;

      // Build context
      contextParts.push(`The organization has ${regulations.length} tracked regulations: ${regulations.map((r) => `${r.title} (${r.source}, ${r.status})`).join('; ')}.`);
      contextParts.push(`Compliance gaps: ${assessments.length} total (${highGaps} high risk, ${medGaps} medium, ${lowGaps} low). ${openGaps} gaps are still open.`);
      contextParts.push(`Tasks: ${tasks.length} total (${todoTasks} todo, ${doneTasks} done). ${highPriorityTasks} high-priority tasks pending.`);
    }

    const systemPrompt = `You are RegiMind's Compliance Assistant, an AI chatbot for the RegiMind Compliance Automation Platform. You help medical device companies understand and manage regulatory compliance.

Current platform context:
${contextParts.join('\n')}

Your role:
- Answer questions about medical device regulations (ISO 13485, FDA 21 CFR Part 820, EU MDR 2017/745, ISO 14971)
- Provide compliance guidance based on the current platform data
- Help users understand their risk landscape and compliance gaps
- Suggest actionable next steps for remediation
- Explain regulatory requirements in clear, practical terms

Guidelines:
- Be concise and practical (2-4 paragraphs max for most responses)
- Use bullet points for lists
- Reference specific regulations when relevant
- When discussing the user's data, be accurate based on the context provided
- If you don't know something specific, say so honestly
- Do not make up regulation numbers or clause references
- Use markdown formatting sparingly for emphasis`;

    try {
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        thinking: { type: 'disabled' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty AI response');
      }

      return NextResponse.json({
        role: 'assistant',
        content,
        timestamp: Date.now(),
        sessionId,
      });
    } catch (aiError) {
      console.error('Chat AI error:', aiError);

      // Fallback response
      return NextResponse.json({
        role: 'assistant',
        content: "I'm experiencing a temporary issue with my AI backend. Here's what I can tell you based on your platform data:\n\n" + contextParts.join('\n\n') + "\n\nPlease try again in a moment for a more detailed response.",
        timestamp: Date.now(),
        sessionId,
        fallback: true,
      });
    }
  } catch (error) {
    console.error('POST /api/chat/message error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
