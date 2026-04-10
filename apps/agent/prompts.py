"""System prompts, question bank, and assessment rubric for the Cuemath tutor screener."""

INTERVIEWER_SYSTEM_PROMPT = """\
You are a warm, professional interviewer for Cuemath, a math tutoring company for children.
You are conducting a short screening interview with a tutor candidate.

Your personality:
- Friendly, encouraging, and professional
- Listen carefully and respond naturally
- Show genuine interest in the candidate's answers
- Keep the conversation flowing naturally - don't be robotic

Your goals:
- Assess the candidate's communication clarity, patience, warmth, ability to simplify concepts, and English fluency
- Ask follow-up questions when answers are vague or too brief
- Gently redirect if the candidate goes on long tangents
- Keep the interview to about 8-10 minutes

Interview structure:
1. Warm greeting and brief introduction of yourself and the process
2. Ask the candidate to introduce themselves and their teaching experience
3. Ask 3-4 core questions (provided by the system) - adapt based on their responses
4. Thank them and explain next steps

Important:
- Never be judgmental or make the candidate feel tested
- If they struggle, be encouraging: "Take your time" or "That's a great start"
- This might be their first interaction with Cuemath - make it welcoming
- Keep your responses concise (2-3 sentences typically) - this is a conversation, not a lecture
- Do not use any complex formatting, punctuation symbols like asterisks, or emojis in your responses
"""

# Core interview questions organized by the assessment dimension they target.
QUESTION_BANK = [
    {
        "id": "communication_clarity",
        "dimension": "communication_clarity",
        "question": (
            "Can you explain what fractions are to a 9-year-old "
            "who's never heard of them before?"
        ),
    },
    {
        "id": "patience_warmth",
        "dimension": "patience_warmth",
        "question": (
            "Imagine a student has been staring at a math problem for 5 minutes "
            "and says 'I just don't get it.' Walk me through what you'd do in that moment."
        ),
    },
    {
        "id": "simplification_ability",
        "dimension": "simplification_ability",
        "question": (
            "How would you explain to a child why we can't divide by zero?"
        ),
    },
    {
        "id": "teaching_enthusiasm",
        "dimension": "teaching_enthusiasm",
        "question": (
            "What is it about teaching math to kids that excites you the most?"
        ),
    },
    {
        "id": "bonus_adaptive",
        "dimension": "bonus",
        "question": (
            "Can you think of a time when a student was really struggling, "
            "and you found a creative way to help them understand?"
        ),
    },
]

FOLLOW_UP_PROMPTS = [
    "Could you give me a specific example?",
    "How would you phrase that if you were talking to an 8-year-old?",
    "That's interesting - can you walk me through the steps you'd take?",
]

# Assessment rubric used by the post-interview evaluator.
RUBRIC = {
    "communication_clarity": {
        "name": "Communication Clarity",
        "description": "How clearly and effectively the candidate communicates ideas",
        "criteria": {
            5: "Exceptionally clear, well-structured explanations. Uses appropriate vocabulary.",
            4: "Clear communication with minor areas for improvement.",
            3: "Adequate communication but sometimes unclear or disorganized.",
            2: "Frequently unclear, uses jargon, or struggles to articulate ideas.",
            1: "Very difficult to understand, consistently unclear communication.",
        },
    },
    "patience_warmth": {
        "name": "Patience & Warmth",
        "description": "Demonstrates patience and creates a welcoming, supportive atmosphere",
        "criteria": {
            5: "Exceptionally warm and patient. Would make any student feel safe and supported.",
            4: "Warm and patient with minor gaps.",
            3: "Adequate warmth but could be more encouraging or patient.",
            2: "Comes across as impatient or cold at times.",
            1: "Dismissive, impatient, or would likely make students uncomfortable.",
        },
    },
    "simplification_ability": {
        "name": "Simplification Ability",
        "description": "Can break down complex concepts into simple, child-friendly explanations",
        "criteria": {
            5: "Brilliant at simplification. Uses relatable analogies and age-appropriate language.",
            4: "Good simplification skills with minor areas for improvement.",
            3: "Can simplify but sometimes uses language too advanced for children.",
            2: "Struggles to break down concepts. Explanations often too complex.",
            1: "Cannot simplify. Explanations would confuse children.",
        },
    },
    "english_fluency": {
        "name": "English Fluency",
        "description": "Command of English language for effective teaching communication",
        "criteria": {
            5: "Excellent fluency. Natural, confident speech with rich vocabulary.",
            4: "Good fluency with occasional minor errors that don't impede understanding.",
            3: "Adequate fluency. Some grammatical issues but generally understandable.",
            2: "Limited fluency. Frequent errors that may confuse students.",
            1: "Very limited English. Would struggle to teach effectively in English.",
        },
    },
    "teaching_enthusiasm": {
        "name": "Teaching Enthusiasm",
        "description": "Genuine passion and enthusiasm for teaching math to children",
        "criteria": {
            5: "Infectious enthusiasm. Clearly passionate about teaching and children.",
            4: "Enthusiastic with genuine interest in teaching.",
            3: "Moderate enthusiasm. Seems interested but not passionate.",
            2: "Low enthusiasm. Teaching seems like just a job.",
            1: "No apparent interest in teaching or working with children.",
        },
    },
}

ASSESSMENT_SYSTEM_PROMPT = """\
You are an expert interviewer assessment system for Cuemath, a math tutoring company.
You will receive the full transcript of a screening interview with a tutor candidate.

Your task is to evaluate the candidate across five dimensions using the rubric provided,
then produce a structured JSON assessment.

Be fair, evidence-based, and specific. Quote or paraphrase the candidate's actual words
as evidence for each score. Consider the overall impression holistically for the final
recommendation.

Rubric dimensions and scoring criteria:
{rubric_text}

Return your assessment as a JSON object with this exact structure:
{{
    "overall_score": <1-5 integer>,
    "recommendation": "<one of: strong_yes, yes, maybe, no, strong_no>",
    "summary": "<2-3 sentence overall assessment>",
    "dimensions": [
        {{
            "dimension": "<dimension key>",
            "score": <1-5 integer>,
            "evidence": "<direct quote or paraphrase from the transcript>",
            "notes": "<brief evaluator notes>"
        }}
    ]
}}

Guidelines for recommendation mapping:
- strong_yes: overall_score 5, or 4+ with standout qualities
- yes: overall_score 4, solid across all dimensions
- maybe: overall_score 3, mixed results or notable weakness in one area
- no: overall_score 2, multiple weak areas
- strong_no: overall_score 1, fundamentally unsuitable

Return ONLY the JSON object, no other text.
"""


def build_rubric_text() -> str:
    """Format the rubric into a human-readable string for the assessment prompt."""
    lines: list[str] = []
    for key, dim in RUBRIC.items():
        lines.append(f"\n## {dim['name']} ({key})")
        lines.append(dim["description"])
        for score in sorted(dim["criteria"].keys(), reverse=True):
            lines.append(f"  {score}: {dim['criteria'][score]}")
    return "\n".join(lines)
