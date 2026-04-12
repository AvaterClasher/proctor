"""Cuemath AI Tutor Screener -- LiveKit voice agent.

This is the main entry point. It joins LiveKit rooms whose names start with
``interview-`` and conducts a structured screening interview via voice. When
the interview ends the agent POSTs the full transcript to the Proctor backend
which is responsible for generating and persisting the assessment.
"""

from __future__ import annotations

import asyncio
import logging

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, AgentServer
from livekit.agents import ConversationItemAddedEvent
from livekit.plugins import openai, silero

from api_client import finalize_interview, update_interview_status
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
    finalize_started = asyncio.Event()

    async def _do_finalize(reason: str) -> None:
        """Fire the backend finalize call exactly once."""
        if finalize_started.is_set():
            return
        finalize_started.set()

        transcript_items = agent.state.get_transcript_items()
        duration_secs = int(agent.state.elapsed_seconds)
        status = "completed" if agent.state.phase == Phase.ENDED else "failed"

        logger.info(
            "Finalizing interview %s (reason=%s, status=%s, turns=%d)",
            interview_id,
            reason,
            status,
            len(transcript_items),
        )
        await finalize_interview(
            interview_id,
            status=status,
            transcript_items=transcript_items,
            duration_secs=duration_secs,
        )
        interview_done.set()

    @ctx.room.on("participant_disconnected")
    def _on_disconnect(participant: rtc.RemoteParticipant) -> None:
        logger.info("Participant %s disconnected", participant.identity)
        asyncio.create_task(_do_finalize("participant_disconnect"))

    # Also end when the agent flow reaches the ENDED phase. Finalize BEFORE
    # tearing down the session so the assessment is persisted while we still
    # own the transcript.
    async def _wait_ended() -> None:
        await agent.ended_event.wait()
        # Give the final TTS a moment to play out.
        await asyncio.sleep(3)
        await _do_finalize("flow_ended")

    asyncio.create_task(_wait_ended())

    # Block until the interview is done (disconnect or flow ended).
    await interview_done.wait()
    agent.stop()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agents.cli.run_app(server)
