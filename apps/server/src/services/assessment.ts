import { env } from "@proctor/env/server";

export type TranscriptItem = {
  role: "agent" | "candidate";
  content: string;
  timestamp: string;
};

export type AssessmentDimension = {
  dimension: string;
  score: number;
  evidence: string;
  notes: string;
};

export type GeneratedAssessment = {
  overallScore: number;
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  summary: string;
  dimensions: AssessmentDimension[];
};

const RUBRIC: Record<
  string,
  { name: string; description: string; criteria: Record<number, string> }
> = {
  communication_clarity: {
    name: "Communication Clarity",
    description: "How clearly and effectively the candidate communicates ideas",
    criteria: {
      5: "Exceptionally clear, well-structured explanations. Uses appropriate vocabulary.",
      4: "Clear communication with minor areas for improvement.",
      3: "Adequate communication but sometimes unclear or disorganized.",
      2: "Frequently unclear, uses jargon, or struggles to articulate ideas.",
      1: "Very difficult to understand, consistently unclear communication.",
    },
  },
  patience_warmth: {
    name: "Patience & Warmth",
    description:
      "Demonstrates patience and creates a welcoming, supportive atmosphere",
    criteria: {
      5: "Exceptionally warm and patient. Would make any student feel safe and supported.",
      4: "Warm and patient with minor gaps.",
      3: "Adequate warmth but could be more encouraging or patient.",
      2: "Comes across as impatient or cold at times.",
      1: "Dismissive, impatient, or would likely make students uncomfortable.",
    },
  },
  simplification_ability: {
    name: "Simplification Ability",
    description:
      "Can break down complex concepts into simple, child-friendly explanations",
    criteria: {
      5: "Brilliant at simplification. Uses relatable analogies and age-appropriate language.",
      4: "Good simplification skills with minor areas for improvement.",
      3: "Can simplify but sometimes uses language too advanced for children.",
      2: "Struggles to break down concepts. Explanations often too complex.",
      1: "Cannot simplify. Explanations would confuse children.",
    },
  },
  english_fluency: {
    name: "English Fluency",
    description:
      "Command of English language for effective teaching communication",
    criteria: {
      5: "Excellent fluency. Natural, confident speech with rich vocabulary.",
      4: "Good fluency with occasional minor errors that don't impede understanding.",
      3: "Adequate fluency. Some grammatical issues but generally understandable.",
      2: "Limited fluency. Frequent errors that may confuse students.",
      1: "Very limited English. Would struggle to teach effectively in English.",
    },
  },
  teaching_enthusiasm: {
    name: "Teaching Enthusiasm",
    description: "Genuine passion and enthusiasm for teaching math to children",
    criteria: {
      5: "Infectious enthusiasm. Clearly passionate about teaching and children.",
      4: "Enthusiastic with genuine interest in teaching.",
      3: "Moderate enthusiasm. Seems interested but not passionate.",
      2: "Low enthusiasm. Teaching seems like just a job.",
      1: "No apparent interest in teaching or working with children.",
    },
  },
};

const ASSESSMENT_SYSTEM_PROMPT_TEMPLATE = `You are an expert interviewer assessment system for Cuemath, a math tutoring company.
You will receive the full transcript of a screening interview with a tutor candidate.

Your task is to evaluate the candidate across five dimensions using the rubric provided,
then produce a structured JSON assessment.

Be fair, evidence-based, and specific. Quote or paraphrase the candidate's actual words
as evidence for each score. Consider the overall impression holistically for the final
recommendation.

Rubric dimensions and scoring criteria:
{{RUBRIC_TEXT}}

Return your assessment as a JSON object with this exact structure:
{
    "overall_score": <1-5 integer>,
    "recommendation": "<one of: strong_yes, yes, maybe, no, strong_no>",
    "summary": "<2-3 sentence overall assessment>",
    "dimensions": [
        {
            "dimension": "<dimension key>",
            "score": <1-5 integer>,
            "evidence": "<direct quote or paraphrase from the transcript>",
            "notes": "<brief evaluator notes>"
        }
    ]
}

Guidelines for recommendation mapping:
- strong_yes: overall_score 5, or 4+ with standout qualities
- yes: overall_score 4, solid across all dimensions
- maybe: overall_score 3, mixed results or notable weakness in one area
- no: overall_score 2, multiple weak areas
- strong_no: overall_score 1, fundamentally unsuitable

Return ONLY the JSON object, no other text.`;

const VALID_RECOMMENDATIONS = [
  "strong_yes",
  "yes",
  "maybe",
  "no",
  "strong_no",
] as const;

function buildRubricText(): string {
  const lines: string[] = [];
  for (const [key, dim] of Object.entries(RUBRIC)) {
    lines.push(`\n## ${dim.name} (${key})`);
    lines.push(dim.description);
    const scores = Object.keys(dim.criteria)
      .map(Number)
      .sort((a, b) => b - a);
    for (const score of scores) {
      lines.push(`  ${score}: ${dim.criteria[score]}`);
    }
  }
  return lines.join("\n");
}

export function formatTranscript(items: TranscriptItem[]): string {
  return items
    .map((item) => {
      const speaker = item.role === "agent" ? "Interviewer" : "Candidate";
      return `${speaker}: ${item.content}`;
    })
    .join("\n\n");
}

export async function generateAssessment(
  transcript: string,
): Promise<GeneratedAssessment> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorAssessment("Missing OpenAI API key");
  }

  const systemPrompt = ASSESSMENT_SYSTEM_PROMPT_TEMPLATE.replace(
    "{{RUBRIC_TEXT}}",
    buildRubricText(),
  );

  const payload = {
    model: env.ASSESSMENT_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the full interview transcript:\n\n${transcript}\n\nPlease provide your assessment as JSON.`,
      },
    ],
    temperature: 0.3,
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI API error:", resp.status, text.slice(0, 200));
      return errorAssessment(`OpenAI API returned ${resp.status}`);
    }

    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message.content;
    if (!content) {
      return errorAssessment("Empty response from OpenAI");
    }

    const raw = JSON.parse(content) as {
      overall_score?: number;
      recommendation?: string;
      summary?: string;
      dimensions?: AssessmentDimension[];
    };

    const overallScore = clampScore(raw.overall_score);
    const recommendation = VALID_RECOMMENDATIONS.includes(
      raw.recommendation as (typeof VALID_RECOMMENDATIONS)[number],
    )
      ? (raw.recommendation as (typeof VALID_RECOMMENDATIONS)[number])
      : "maybe";

    return {
      overallScore,
      recommendation,
      summary: raw.summary ?? "No summary provided.",
      dimensions: Array.isArray(raw.dimensions) ? raw.dimensions : [],
    };
  } catch (err) {
    console.error("Unexpected error generating assessment:", err);
    return errorAssessment(err instanceof Error ? err.message : String(err));
  }
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function errorAssessment(reason: string): GeneratedAssessment {
  return {
    overallScore: 0,
    recommendation: "maybe",
    summary: `Assessment could not be generated: ${reason}`,
    dimensions: [],
  };
}
