"""Post-interview assessment generation.

Takes the full conversation transcript and calls OpenAI to produce a
structured JSON evaluation against the Cuemath rubric.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

_assessment_client: httpx.AsyncClient | None = None


def _get_assessment_client() -> httpx.AsyncClient:
    """Shared HTTP client for OpenAI API calls."""
    global _assessment_client
    if _assessment_client is None or _assessment_client.is_closed:
        _assessment_client = httpx.AsyncClient(timeout=60.0)
    return _assessment_client

from prompts import ASSESSMENT_SYSTEM_PROMPT, build_rubric_text

logger = logging.getLogger("tutor-screener.assessment")

# Default model for assessment -- can be overridden via env var.
ASSESSMENT_MODEL = os.getenv("ASSESSMENT_MODEL", "gpt-4o-mini")


async def generate_assessment(transcript: str) -> dict[str, Any]:
    """Evaluate the interview transcript and return a structured assessment.

    The function calls the OpenAI Chat Completions API directly via httpx
    (rather than through the LiveKit plugin) so it can use JSON mode and
    operate independently of the voice pipeline.

    Returns a dict matching the assessment schema, or a fallback error dict
    if the API call or parsing fails.
    """
    rubric_text = build_rubric_text()
    system_prompt = ASSESSMENT_SYSTEM_PROMPT.format(rubric_text=rubric_text)

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.error("OPENAI_API_KEY is not set; cannot generate assessment")
        return _error_assessment("Missing OpenAI API key")

    payload = {
        "model": ASSESSMENT_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    "Here is the full interview transcript:\n\n"
                    f"{transcript}\n\n"
                    "Please provide your assessment as JSON."
                ),
            },
        ],
        "temperature": 0.3,
    }

    try:
        client = _get_assessment_client()
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        content = data["choices"][0]["message"]["content"]
        assessment: dict[str, Any] = json.loads(content)
        _validate_assessment(assessment)
        logger.info("Assessment generated successfully (score=%s)", assessment.get("overall_score"))
        return assessment

    except httpx.HTTPStatusError as exc:
        logger.error("OpenAI API error: %s %s", exc.response.status_code, exc.response.text[:200])
        return _error_assessment(f"OpenAI API returned {exc.response.status_code}")
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("Failed to parse assessment response: %s", exc)
        return _error_assessment("Invalid response format from OpenAI")
    except Exception as exc:
        logger.error("Unexpected error generating assessment: %s", exc)
        return _error_assessment(str(exc))


def _validate_assessment(assessment: dict[str, Any]) -> None:
    """Light validation -- log warnings for missing fields but don't crash."""
    required_keys = {"overall_score", "recommendation", "summary", "dimensions"}
    missing = required_keys - set(assessment.keys())
    if missing:
        logger.warning("Assessment missing keys: %s", missing)

    score = assessment.get("overall_score")
    if score is not None and not (1 <= int(score) <= 5):
        logger.warning("overall_score out of range: %s", score)

    valid_recs = {"strong_yes", "yes", "maybe", "no", "strong_no"}
    rec = assessment.get("recommendation")
    if rec and rec not in valid_recs:
        logger.warning("Unexpected recommendation value: %s", rec)


def _error_assessment(reason: str) -> dict[str, Any]:
    """Return a minimal assessment dict when generation fails."""
    return {
        "overall_score": 0,
        "recommendation": "error",
        "summary": f"Assessment could not be generated: {reason}",
        "dimensions": [],
    }
