"""Interview flow manager.

Tracks which questions have been asked, manages phase transitions, provides
adaptive follow-up logic, and enforces the time budget (~8-10 min).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum

from prompts import FOLLOW_UP_PROMPTS, QUESTION_BANK

# Target interview length in seconds (10 minutes hard cap).
MAX_INTERVIEW_SECONDS = 10 * 60
# Soft target -- start wrapping up around 8 minutes.
WRAP_UP_SECONDS = 8 * 60
# If the candidate says very little, we ask a follow-up.
SHORT_ANSWER_WORD_THRESHOLD = 15
# Silence longer than this (seconds) triggers a gentle nudge.
SILENCE_TIMEOUT_SECONDS = 30


class Phase(str, Enum):
    GREETING = "greeting"
    INTRODUCTION = "introduction"
    CORE_QUESTIONS = "core_questions"
    WRAP_UP = "wrap_up"
    ENDED = "ended"


@dataclass
class InterviewState:
    """Mutable state tracking the progress of a single interview."""

    phase: Phase = Phase.GREETING
    start_time: float = field(default_factory=time.time)
    questions_asked: list[str] = field(default_factory=list)
    follow_ups_used: int = 0
    last_activity_time: float = field(default_factory=time.time)
    transcript_items: list[dict[str, str]] = field(default_factory=list)

    # ---- helpers ----

    @property
    def elapsed_seconds(self) -> float:
        return time.time() - self.start_time

    @property
    def should_wrap_up(self) -> bool:
        return self.elapsed_seconds >= WRAP_UP_SECONDS

    @property
    def is_over_time(self) -> bool:
        return self.elapsed_seconds >= MAX_INTERVIEW_SECONDS

    @property
    def silence_duration(self) -> float:
        return time.time() - self.last_activity_time

    def record_activity(self) -> None:
        self.last_activity_time = time.time()

    def add_transcript(self, role: str, text: str) -> None:
        self.transcript_items.append({"role": role, "text": text})
        self.record_activity()

    def get_full_transcript(self) -> str:
        lines: list[str] = []
        for item in self.transcript_items:
            speaker = "Interviewer" if item["role"] == "agent" else "Candidate"
            lines.append(f"{speaker}: {item['text']}")
        return "\n\n".join(lines)


def get_next_question(state: InterviewState) -> str | None:
    """Return the next unasked core question, or None if all have been asked."""
    for q in QUESTION_BANK:
        if q["id"] not in state.questions_asked:
            return q["id"]
    return None


def get_question_text(question_id: str) -> str:
    """Look up the display text for a question by its id."""
    for q in QUESTION_BANK:
        if q["id"] == question_id:
            return q["question"]
    return ""


def needs_follow_up(answer_text: str) -> bool:
    """Decide whether the candidate's answer was too brief."""
    return len(answer_text.split()) < SHORT_ANSWER_WORD_THRESHOLD


def pick_follow_up(state: InterviewState) -> str:
    """Return a follow-up prompt, cycling through the bank."""
    prompt = FOLLOW_UP_PROMPTS[state.follow_ups_used % len(FOLLOW_UP_PROMPTS)]
    state.follow_ups_used += 1
    return prompt


def build_phase_instructions(state: InterviewState) -> str:
    """Build dynamic LLM instructions based on the current interview phase.

    These instructions are passed to ``session.generate_reply(instructions=...)``
    and are *not* recorded in chat history -- they steer the LLM's next turn
    without polluting the conversation context.
    """
    if state.phase == Phase.GREETING:
        state.phase = Phase.INTRODUCTION
        return (
            "Greet the candidate warmly. Introduce yourself as a Cuemath interviewer. "
            "Briefly explain this is a short, friendly chat to learn about their "
            "teaching style -- about 8 to 10 minutes. Then ask them to introduce "
            "themselves and share a bit about their teaching experience."
        )

    if state.phase == Phase.INTRODUCTION:
        state.phase = Phase.CORE_QUESTIONS
        next_id = get_next_question(state)
        if next_id:
            state.questions_asked.append(next_id)
            return (
                "Thank the candidate for that introduction. Now transition naturally "
                f"into the first core question: {get_question_text(next_id)}"
            )

    if state.phase == Phase.CORE_QUESTIONS:
        if state.should_wrap_up or state.is_over_time:
            state.phase = Phase.WRAP_UP
            return (
                "We are running close to time. Wrap up gracefully -- thank the "
                "candidate for their answers, tell them the team will review their "
                "interview and be in touch soon. Wish them well."
            )

        next_id = get_next_question(state)
        if next_id is None:
            state.phase = Phase.WRAP_UP
            return (
                "All questions have been covered. Thank the candidate sincerely, "
                "let them know the team will review the interview, and wish them "
                "a great day."
            )

        state.questions_asked.append(next_id)
        return (
            "Acknowledge their answer positively, then ask the next question: "
            f"{get_question_text(next_id)}"
        )

    if state.phase == Phase.WRAP_UP:
        state.phase = Phase.ENDED
        return (
            "Say a final warm goodbye. Let them know they will hear back soon."
        )

    # ENDED -- no more instructions
    return ""


def build_silence_nudge() -> str:
    """Return an instruction for the LLM to gently nudge a silent candidate."""
    return (
        "The candidate has been quiet for a while. Gently check in -- "
        "say something like 'Take your time, there is no rush' or "
        "'Would you like me to repeat the question?'"
    )


def build_short_answer_nudge(state: InterviewState) -> str:
    """Return an instruction asking the LLM to probe for more detail."""
    follow_up = pick_follow_up(state)
    return (
        "The candidate's answer was quite brief. Ask a natural follow-up to "
        f"draw out more detail. You could say something like: '{follow_up}'"
    )
