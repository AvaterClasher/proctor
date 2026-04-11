"""Cuemath AI Tutor Screener -- LiveKit voice agent.

This is the main entry point. It joins LiveKit rooms whose names start with
``interview-``, conducts a structured screening interview via voice, and
posts a rubric-based assessment to the Proctor backend when done.
"""

from __future__ import annotations

import asyncio
import json
import logging

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, AgentServer
from livekit.agents import ConversationItemAddedEvent
from livekit.plugins import openai, silero

from api_client import post_assessment, update_interview_status
from assessment import generate_assessment
from interview_flow import (
    InterviewState,
    Phase,
    build_phase_instructions,
    build_short_answer_nudge,
    build_silence_nudge,
    needs_follow_up,
    SILENCE_TIMEOUT_SECONDS,
)
from prompts import INTERVIEWER_SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger("tutor-screener")
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

class TutorScreener(Agent):
    """Voice agent that conducts a Cuemath tutor screening interview."""

    def __init__(self, interview_id: str) -> None:
        super().__init__(instructions=INTERVIEWER_SYSTEM_PROMPT)
        self.interview_id = interview_id
        self.state = InterviewState()
        self._silence_task: asyncio.Task | None = None
        self.ended_event = asyncio.Event()

    # -- lifecycle -----------------------------------------------------------

    async def on_enter(self) -> None:
        """Called when the agent becomes active in the session."""
        # Start the interview with a warm greeting.
        instructions = build_phase_instructions(self.state)
        if instructions:
            self.session.generate_reply(instructions=instructions)

        # Wire up transcript collection.
        self._register_transcript_listener()

        # Begin background silence monitor.
        self._silence_task = asyncio.create_task(self._monitor_silence())

    # -- transcript collection -----------------------------------------------

    def _register_transcript_listener(self) -> None:
        @self.session.on("conversation_item_added")
        def _on_item(event: ConversationItemAddedEvent) -> None:
            text = event.item.text_content
            if not text:
                return
            role = event.item.role  # "user" or "agent"

            # Map to our internal roles.
            internal_role = "candidate" if role == "user" else "agent"
            self.state.add_transcript(internal_role, text)

            # Drive interview flow when the candidate speaks.
            if internal_role == "candidate":
                if self.state.phase == Phase.CORE_QUESTIONS and needs_follow_up(text):
                    nudge = build_short_answer_nudge(self.state)
                    self.session.generate_reply(instructions=nudge)
                    return

                # Advance to the next phase / question.
                instructions = build_phase_instructions(self.state)
                if instructions:
                    self.session.generate_reply(instructions=instructions)

                if self.state.phase == Phase.ENDED:
                    self.ended_event.set()

    # -- silence monitoring --------------------------------------------------

    async def _monitor_silence(self) -> None:
        """Periodically check if the candidate has gone quiet."""
        try:
            while self.state.phase != Phase.ENDED:
                await asyncio.sleep(5)
                if (
                    self.state.silence_duration >= SILENCE_TIMEOUT_SECONDS
                    and self.state.phase
                    in (Phase.INTRODUCTION, Phase.CORE_QUESTIONS)
                ):
                    logger.info("Silence detected, nudging candidate")
                    nudge = build_silence_nudge()
                    self.session.generate_reply(instructions=nudge)
                    self.state.record_activity()  # reset timer
        except asyncio.CancelledError:
            pass

    # -- cleanup -------------------------------------------------------------

    def stop(self) -> None:
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()


# ---------------------------------------------------------------------------
# Session entrypoint
# ---------------------------------------------------------------------------

server = AgentServer()


@server.rtc_session(agent_name="tutor-screener")
async def entrypoint(ctx: agents.JobContext) -> None:
    """Entrypoint called when a new interview room is created."""
    await ctx.connect()

    # Derive the interview ID from the room name (e.g. "interview-abc123").
    room_name: str = ctx.room.name or ""
    interview_id = room_name.removeprefix("interview-")
    logger.info("Joining room %s (interview_id=%s)", room_name, interview_id)

    # Mark interview as in progress.
    await update_interview_status(interview_id, "in_progress")

    agent = TutorScreener(interview_id=interview_id)

    session = AgentSession(
        stt=openai.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(voice="nova"),
        vad=silero.VAD.load(),
    )

    await session.start(
        agent=agent,
        room=ctx.room,
    )

    # ---- Wait for the interview to end ------------------------------------

    # We track participant presence so we can handle early disconnects.
    interview_done = asyncio.Event()

    @ctx.room.on("participant_disconnected")
    def _on_disconnect(participant: rtc.RemoteParticipant) -> None:
        logger.info("Participant %s disconnected", participant.identity)
        interview_done.set()

    # Also end when the agent flow reaches the ENDED phase.
    async def _wait_ended() -> None:
        await agent.ended_event.wait()
        # Give the final TTS a moment to play out.
        await asyncio.sleep(3)
        interview_done.set()

    asyncio.create_task(_wait_ended())

    # Block until the interview is done (disconnect or flow ended).
    await interview_done.wait()
    agent.stop()

    # ---- Post-interview processing ----------------------------------------

    transcript = agent.state.get_full_transcript()
    transcript_json = json.dumps(agent.state.get_transcript_items())

    if not transcript.strip():
        logger.warning("No transcript collected for %s", interview_id)
        await update_interview_status(
            interview_id, "failed", transcript=transcript_json
        )
        return

    was_completed = agent.state.phase == Phase.ENDED
    status = "completed" if was_completed else "failed"

    logger.info("Interview %s finished (status=%s). Generating assessment...", interview_id, status)
    assessment = await generate_assessment(transcript)
    await post_assessment(interview_id, assessment)
    await update_interview_status(interview_id, status, transcript=transcript_json)
    logger.info("Assessment posted for %s", interview_id)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agents.cli.run_app(server)
