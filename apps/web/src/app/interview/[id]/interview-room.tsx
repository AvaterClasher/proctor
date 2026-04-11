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
  useSessionContext,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff, Radio } from "lucide-react";
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
  onStart: (options?: Parameters<ReturnType<typeof useSession>["start"]>[0]) => Promise<void>;
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
              <Button variant="outline" size="sm" onClick={requestMicPermission}>
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
            disabled={micPermission !== "granted" || isStarting}
            onClick={handleBegin}
          >
            <Phone className="size-4" />
            {isStarting ? "Connecting..." : "I'm Ready"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InterviewActive({ onEnd }: { onEnd: () => void }) {
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

      {showStatus && (
        <Card className="w-full">
          <CardContent className="py-3">
            <p className="text-center text-xs text-muted-foreground">
              Agent state: {agent.state}
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

        <Button variant="destructive" size="sm" onClick={onEnd}>
          <PhoneOff className="size-4" />
          End Interview
        </Button>
      </div>
    </div>
  );
}
