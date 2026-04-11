"""HTTP client for posting interview results to the Hono backend."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("tutor-screener.api")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return a shared async HTTP client, creating it on first use."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=os.environ.get("PROCTOR_API_URL", "http://localhost:3000"),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": os.environ.get("AGENT_API_KEY", ""),
            },
            timeout=30.0,
        )
    return _client


async def post_assessment(interview_id: str, assessment: dict[str, Any]) -> bool:
    """POST the assessment payload to the backend.

    Returns True on success, False on failure (errors are logged, not raised).
    """
    body = {
        "interviewId": interview_id,
        "overallScore": assessment.get("overall_score"),
        "recommendation": assessment.get("recommendation"),
        "summary": assessment.get("summary"),
        "dimensions": assessment.get("dimensions", []),
    }
    try:
        resp = await _get_client().post("/api/assessments", json=body)
        resp.raise_for_status()
        logger.info("Assessment posted for interview %s", interview_id)
        return True
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Backend returned %s when posting assessment for %s: %s",
            exc.response.status_code,
            interview_id,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("Failed to post assessment for %s: %s", interview_id, exc)
    return False


async def update_interview_status(
    interview_id: str,
    status: str,
    transcript: str | None = None,
) -> bool:
    """PATCH the interview status on the backend.

    Valid statuses typically include: in_progress, completed, failed.
    When ``transcript`` is provided it should be a JSON-encoded list of
    ``{role, content, timestamp}`` items and will be persisted alongside
    the status change.

    Returns True on success, False on failure.
    """
    body: dict[str, Any] = {"status": status}
    if transcript is not None:
        body["transcript"] = transcript
    try:
        resp = await _get_client().patch(
            f"/api/interviews/{interview_id}/status",
            json=body,
        )
        resp.raise_for_status()
        logger.info("Interview %s status updated to %s", interview_id, status)
        return True
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Backend returned %s when updating status for %s: %s",
            exc.response.status_code,
            interview_id,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("Failed to update status for %s: %s", interview_id, exc)
    return False
