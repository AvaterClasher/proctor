"use client";

import { Button } from "@proctor/ui/components/button";
import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useAudioWaveform,
  useSession,
  useSessionContext,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AudioVisualizer from "@/components/audio-visualizer";

import InterviewComplete from "./interview-complete";

interface InterviewData {
  id: string;
  status: string;
}

export default function InterviewRoom({
  interview,
}: {
  interview: InterviewData;
}) {
  if (interview.status === "completed") {
    return <InterviewComplete />;
  }

  return <LiveInterviewView interviewId={interview.id} />;
}

function LiveInterviewView({ interviewId }: { interviewId: string }) {
  const tokenSource = useMemo(
    () =>
      TokenSource.custom(async () => {
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ interviewId }),
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch LiveKit token (${response.status})`);
        }
        const data = (await response.json()) as {
          token: string;
          serverUrl: string;
        };
        return {
          serverUrl: data.serverUrl,
          participantToken: data.token,
        };
      }),
    [interviewId],
  );

  const session = useSession(tokenSource);

  return (
    <SessionProvider session={session}>
      <ViewController />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function ViewController() {
  const session = useSessionContext();
  const hasConnectedRef = useRef(false);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (session.isConnected) {
      hasConnectedRef.current = true;
    } else if (
      hasConnectedRef.current &&
      session.connectionState === "disconnected"
    ) {
      setShowComplete(true);
    }
  }, [session.isConnected, session.connectionState]);

  const handleEnd = useCallback(() => {
    session.end().catch(() => {});
    setShowComplete(true);
  }, [session]);

  if (showComplete) {
    return <InterviewComplete />;
  }

  if (!session.isConnected) {
    return <WelcomeView onStart={session.start} />;
  }

  return <InterviewActive onEnd={handleEnd} />;
}

function WelcomeView({
  onStart,
}: {
  onStart: (
    options?: Parameters<ReturnType<typeof useSession>["start"]>[0],
  ) => Promise<void>;
}) {
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [isStarting, setIsStarting] = useState(false);

  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
    } catch {
      setMicPermission("denied");
      toast.error(
        "Microphone access is required for the interview. Please allow microphone access in your browser settings.",
      );
    }
  }, []);

  useEffect(() => {
    requestMicPermission();
  }, [requestMicPermission]);

  const handleBegin = useCallback(async () => {
    setIsStarting(true);
    try {
      await onStart({ tracks: { microphone: { enabled: true } } });
    } catch (e) {
      console.error("Failed to start LiveKit session:", e);
      toast.error("Failed to connect to the interview. Please try again.");
      setIsStarting(false);
    }
  }, [onStart]);

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="animate-in w-full max-w-sm text-center">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Ready?
        </h2>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Make sure your microphone is working before we start.
        </p>

        <div className="mb-8 flex items-center justify-center gap-2.5 text-sm">
          {micPermission === "granted" ? (
            <>
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Microphone ready</span>
            </>
          ) : micPermission === "denied" ? (
            <>
              <span className="size-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Microphone blocked</span>
              <button
                onClick={requestMicPermission}
                className="ml-2 text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">
                Requesting access...
              </span>
            </>
          )}
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={micPermission !== "granted" || isStarting}
          onClick={handleBegin}
        >
          {isStarting ? "Connecting..." : "Start Interview"}
        </Button>

        <ul className="mt-8 space-y-1.5 text-left text-xs text-muted-foreground">
          <li>Speak clearly at a natural pace</li>
          <li>About 10 minutes total</li>
          <li>You can end early if needed</li>
        </ul>
      </div>
    </div>
  );
}

function InterviewActive({ onEnd }: { onEnd: () => void }) {
  const agent = useAgent();
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  const audioTrack =
    "microphoneTrack" in agent ? agent.microphoneTrack : undefined;
  const { bars: agentBars } = useAudioWaveform(audioTrack, { barCount: 9 });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const stateLabel =
    agent.state === "speaking"
      ? "Interviewer is speaking"
      : agent.state === "listening"
        ? "Listening"
        : agent.state === "thinking"
          ? "Processing"
          : agent.state === "connecting" ||
              agent.state === "pre-connect-buffering"
            ? "Connecting to interviewer"
            : "Ready";

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="mb-16 flex items-center gap-3">
        <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {timeDisplay}
        </span>
      </div>

      <AudioVisualizer
        frequencies={agentBars}
        isAgent={true}
        className="mb-6 h-20"
      />

      <p className="mb-16 text-sm text-muted-foreground">{stateLabel}</p>

      <button
        onClick={onEnd}
        className="text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        End interview
      </button>
    </div>
  );
}
