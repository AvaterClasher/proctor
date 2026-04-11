"use client";

import { Button } from "@proctor/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proctor/ui/components/card";
import {
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useAudioWaveform,
  useSession,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff, Radio } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AudioVisualizer from "@/components/audio-visualizer";

import InterviewComplete from "./interview-complete";

type InterviewStage = "pre-connect" | "active" | "complete";

interface InterviewData {
  id: string;
  status: string;
}

export default function InterviewRoom({
  interview,
}: {
  interview: InterviewData;
}) {
  const [stage, setStage] = useState<InterviewStage>(
    interview.status === "completed" ? "complete" : "pre-connect",
  );
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");

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
    if (stage === "pre-connect") {
      requestMicPermission();
    }
  }, [stage, requestMicPermission]);

  const handleBegin = useCallback(() => {
    setStage("active");
  }, []);

  const handleComplete = useCallback(() => {
    setStage("complete");
  }, []);

  if (stage === "complete") {
    return <InterviewComplete />;
  }

  if (stage === "pre-connect") {
    return (
      <PreConnectView
        micPermission={micPermission}
        onRequestMic={requestMicPermission}
        onBegin={handleBegin}
      />
    );
  }

  return (
    <ActiveInterviewSession
      interviewId={interview.id}
      onEnd={handleComplete}
    />
  );
}

function ActiveInterviewSession({
  interviewId,
  onEnd,
}: {
  interviewId: string;
  onEnd: () => void;
}) {
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

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    session.start({ tracks: { microphone: { enabled: true } } }).catch((e) => {
      console.error("Failed to start LiveKit session:", e);
      toast.error("Failed to connect to the interview. Please try again.");
      onEnd();
    });
    return () => {
      session.end().catch(() => {});
    };
    // Intentionally run once: session identity is stable for the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionProvider session={session}>
      <ActiveInterview onEnd={onEnd} />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function PreConnectView({
  micPermission,
  onRequestMic,
  onBegin,
}: {
  micPermission: "prompt" | "granted" | "denied";
  onRequestMic: () => void;
  onBegin: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg items-center justify-center px-4 py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Ready to Begin?</CardTitle>
          <CardDescription>
            Make sure your microphone is working before we start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              {micPermission === "granted" ? (
                <Mic className="size-5 text-emerald-500" />
              ) : (
                <MicOff className="size-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">Microphone</p>
                <p className="text-xs text-muted-foreground">
                  {micPermission === "granted"
                    ? "Access granted"
                    : micPermission === "denied"
                      ? "Access denied"
                      : "Requesting access..."}
                </p>
              </div>
            </div>
            {micPermission === "denied" && (
              <Button variant="outline" size="sm" onClick={onRequestMic}>
                Retry
              </Button>
            )}
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Before you begin:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Find a quiet environment</li>
              <li>Speak clearly and at a natural pace</li>
              <li>The interview will last approximately 10 minutes</li>
              <li>You can end the interview early if needed</li>
            </ul>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={micPermission !== "granted"}
            onClick={onBegin}
          >
            <Phone className="size-4" />
            I&apos;m Ready
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveInterview({ onEnd }: { onEnd: () => void }) {
  const agent = useAgent();
  const [elapsed, setElapsed] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const startTimeRef = useRef(Date.now());

  const audioTrack =
    "microphoneTrack" in agent ? agent.microphoneTrack : undefined;
  const { bars: agentBars } = useAudioWaveform(audioTrack, { barCount: 7 });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (agent.state === "disconnected" || agent.state === "failed") {
      onEnd();
    }
  }, [agent.state, onEnd]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const stateLabel =
    agent.state === "speaking"
      ? "Interviewer is speaking..."
      : agent.state === "listening"
        ? "Listening to you..."
        : agent.state === "thinking"
          ? "Processing..."
          : agent.state === "connecting" ||
              agent.state === "pre-connect-buffering"
            ? "Connecting to interviewer..."
            : "Ready";

  const handleEnd = useCallback(() => {
    onEnd();
  }, [onEnd]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 px-4 py-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className="size-3 animate-pulse text-red-500" />
        <span>Interview in Progress</span>
        <span className="ml-2 font-mono">{timeDisplay}</span>
      </div>

      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="text-xs font-medium text-muted-foreground">
            {stateLabel}
          </div>
          <AudioVisualizer
            frequencies={agentBars}
            isAgent={true}
            className="h-12"
          />
        </CardContent>
      </Card>

      {showStatus && agent.state !== "connecting" && (
        <Card className="w-full">
          <CardContent className="py-3">
            <p className="text-center text-xs text-muted-foreground">
              {agent.state === "speaking"
                ? "The interviewer is speaking..."
                : agent.state === "listening"
                  ? "Go ahead, speak your answer..."
                  : "..."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStatus((prev) => !prev)}
        >
          {showStatus ? "Hide Status" : "Show Status"}
        </Button>

        <Button variant="destructive" size="sm" onClick={handleEnd}>
          <PhoneOff className="size-4" />
          End Interview
        </Button>
      </div>
    </div>
  );
}

