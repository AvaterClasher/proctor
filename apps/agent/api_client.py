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


async def update_interview_status(interview_id: str, status: str) -> bool:
    """PATCH the interview status on the backend (used for in_progress marker).

    Returns True on success, False on failure.
    """
    try:
        resp = await _get_client().patch(
            f"/api/interviews/{interview_id}/status",
            json={"status": status},
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


async def finalize_interview(
    interview_id: str,
    status: str,
    transcript_items: list[dict[str, Any]],
    duration_secs: int | None = None,
) -> bool:
    """POST the transcript to the backend so it can generate the assessment
    and persist the final interview state in one call.

    ``status`` is one of ``completed`` or ``failed``. ``transcript_items`` is a
    list of ``{role, content, timestamp}`` dicts.

    Returns True on success, False on failure.
    """
    body: dict[str, Any] = {
        "status": status,
        "transcript": transcript_items,
    }
    if duration_secs is not None:
        body["durationSecs"] = duration_secs
    try:
        resp = await _get_client().post(
            f"/api/interviews/{interview_id}/finalize",
            json=body,
        )
        resp.raise_for_status()
        logger.info("Interview %s finalized with status %s", interview_id, status)
        return True
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Backend returned %s when finalizing %s: %s",
            exc.response.status_code,
            interview_id,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("Failed to finalize %s: %s", interview_id, exc)
    return False
