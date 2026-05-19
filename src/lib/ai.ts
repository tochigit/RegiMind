import ZAI from 'z-ai-web-dev-sdk';

interface AssessmentResult {
  riskScore: 'High' | 'Medium' | 'Low';
  gapDescription: string;
  requiredAction: string;
  aiRecommendation: string;
}

interface RegulationData {
  id: string;
  title: string;
  source: string;
  rawText: string;
  deltaJson?: string | null;
}

interface DocumentData {
  id: string;
  title: string;
  docType: string;
  scope?: string | null;
  clause?: string | null;
  fileContent?: string | null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createZAI(): Promise<ReturnType<typeof ZAI.create> extends Promise<infer T> ? T : never> {
  return await ZAI.create();
}

export async function analyzeRegulation(
  regulation: RegulationData,
  documents: DocumentData[]
): Promise<AssessmentResult[]> {
  const zai = await createZAI();
  const results: AssessmentResult[] = [];

  const deltas = regulation.deltaJson
    ? JSON.parse(regulation.deltaJson)
    : null;

  const deltaSummary = deltas
    ? deltas
        .map(
          (d: { section: string; previous: string; updated: string; impact: string }) =>
            `Section: ${d.section}\nPrevious: ${d.previous}\nUpdated: ${d.updated}\nImpact: ${d.impact}`
        )
        .join('\n\n---\n\n')
    : regulation.rawText;

  for (const doc of documents) {
    const docContent = doc.fileContent || 'No content available for this document.';
    const prompt = `You are a regulatory compliance expert specializing in medical device regulations. 
Perform a gap analysis between a regulatory change and an internal document.

REGULATION: ${regulation.title}
SOURCE: ${regulation.source}

REGULATORY DELTA / CHANGE DETAILS:
${deltaSummary}

INTERNAL DOCUMENT: ${doc.title}
Document Type: ${doc.docType}
Scope: ${doc.scope || 'N/A'}
Applicable Clause: ${doc.clause || 'N/A'}

DOCUMENT CONTENT:
${docContent}

Analyze the gap between this regulatory change and the internal document. Respond ONLY with a valid JSON object (no markdown, no backticks, no explanation) with exactly these fields:
{
  "riskScore": "High" | "Medium" | "Low",
  "gapDescription": "A clear description of the gap between the regulation and the current document",
  "requiredAction": "Specific actions required to bring the document into compliance",
  "aiRecommendation": "Detailed recommendation for addressing this gap"
}

Risk score guidance:
- High: The regulation introduces fundamentally new requirements not addressed in the document, or existing procedures are directly contradicted.
- Medium: The regulation requires modifications or additions to existing procedures, but the general framework is compatible.
- Low: The regulation is largely aligned with current practices, requiring only minor documentation updates or clarifications.`;

    let success = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await sleep(RETRY_DELAY_MS * attempt);
        }

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content:
                'You are a regulatory compliance expert for medical device manufacturers. You analyze regulatory changes and assess their impact on internal documents. Always respond with valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          thinking: { type: 'disabled' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) {
          throw new Error('Empty response from AI');
        }

        // Strip markdown fences if present
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Validate fields
        const riskScore = ['High', 'Medium', 'Low'].includes(parsed.riskScore)
          ? parsed.riskScore
          : 'Medium';
        const gapDescription = typeof parsed.gapDescription === 'string' ? parsed.gapDescription : 'Unable to determine gap.';
        const requiredAction = typeof parsed.requiredAction === 'string' ? parsed.requiredAction : 'Review required.';
        const aiRecommendation = typeof parsed.aiRecommendation === 'string' ? parsed.aiRecommendation : 'Manual review recommended.';

        results.push({
          documentId: doc.id,
          riskScore,
          gapDescription,
          requiredAction,
          aiRecommendation,
        } as AssessmentResult & { documentId: string });

        success = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `AI analysis attempt ${attempt + 1} failed for document "${doc.title}":`,
          lastError.message
        );
      }
    }

    if (!success) {
      results.push({
        documentId: doc.id,
        riskScore: 'Medium',
        gapDescription: `AI analysis failed: ${lastError?.message || 'Unknown error'}. Manual review required.`,
        requiredAction: 'Manual gap analysis required due to AI processing failure.',
        aiRecommendation: 'Flag this assessment for manual review by a compliance specialist.',
      } as AssessmentResult & { documentId: string });
    }
  }

  return results;
}

export async function generateTaskDescription(
  regulation: RegulationData,
  document: DocumentData,
  assessment: { riskScore: string; gapDescription?: string | null; requiredAction?: string | null; aiRecommendation?: string | null }
): Promise<string> {
  const zai = await createZAI();

  const prompt = `You are a regulatory compliance project manager. Generate a clear, actionable task description for a compliance remediation task.

Context:
- Regulation: ${regulation.title} (${regulation.source})
- Internal Document: ${document.title} (${document.docType})
- Risk Score: ${assessment.riskScore}
- Gap: ${assessment.gapDescription || 'Not specified'}
- Required Action: ${assessment.requiredAction || 'Not specified'}
- AI Recommendation: ${assessment.aiRecommendation || 'Not specified'}

Generate a concise but thorough task description (2-4 sentences) that a compliance team member can follow to address this gap. Include what needs to be done, which document to update, and any key considerations. Do not include any JSON formatting or special characters.`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS * attempt);
      }

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content:
              'You are a compliance project manager who writes clear, actionable task descriptions for regulatory remediation work.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        thinking: { type: 'disabled' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      return content.trim();
    } catch (error) {
      const lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Task description generation attempt ${attempt + 1} failed:`,
        lastError.message
      );

      if (attempt === MAX_RETRIES) {
        return `Update ${document.title} to address the gap identified in ${regulation.title}. Risk level: ${assessment.riskScore}. ${assessment.requiredAction || 'Perform a detailed review and update the document accordingly.'}`;
      }
    }
  }

  return `Update ${document.title} to address the gap identified in ${regulation.title}.`;
}
