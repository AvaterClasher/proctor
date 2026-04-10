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
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useVoiceAssistant,
  useAudioWaveform,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import AudioVisualizer from "@/components/audio-visualizer";
import { fetchLivekitToken } from "@/lib/livekit";

import InterviewComplete from "./interview-complete";

type InterviewState = "pre-connect" | "active" | "complete";

interface InterviewData {
  id: string;
  status: string;
}

export default function InterviewRoom({
  interview,
}: {
  interview: InterviewData;
}) {
  const [state, setState] = useState<InterviewState>(
    interview.status === "completed" ? "complete" : "pre-connect",
  );
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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
    if (state === "pre-connect") {
      requestMicPermission();
    }
  }, [state, requestMicPermission]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { token, serverUrl: url } = await fetchLivekitToken(interview.id);
      setLivekitToken(token);
      setServerUrl(url);
      setState("active");
    } catch {
      toast.error("Failed to connect to the interview. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [interview.id]);

  const handleDisconnect = useCallback(() => {
    setState("complete");
  }, []);

  if (state === "complete") {
    return <InterviewComplete />;
  }

  if (state === "pre-connect") {
    return (
      <PreConnectView
        micPermission={micPermission}
        isConnecting={isConnecting}
        onRequestMic={requestMicPermission}
        onConnect={handleConnect}
      />
    );
  }

  if (!livekitToken || !serverUrl) {
    return null;
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      onDisconnected={handleDisconnect}
      onError={(error) => {
        toast.error(`Connection error: ${error.message}`);
      }}
      className="flex h-full items-center justify-center"
    >
      <ActiveInterview onEnd={handleDisconnect} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function PreConnectView({
  micPermission,
  isConnecting,
  onRequestMic,
  onConnect,
}: {
  micPermission: "prompt" | "granted" | "denied";
  isConnecting: boolean;
  onRequestMic: () => void;
  onConnect: () => void;
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
            disabled={micPermission !== "granted" || isConnecting}
            onClick={onConnect}
          >
            {isConnecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="size-4" />
                I&apos;m Ready
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveInterview({ onEnd }: { onEnd: () => void }) {
  const connectionState = useConnectionState();
  const voiceAssistant = useVoiceAssistant();
  const [elapsed, setElapsed] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const startTimeRef = useRef(Date.now());

  const { bars: agentBars } = useAudioWaveform(voiceAssistant.audioTrack, {
    barCount: 7,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected) {
      onEnd();
    }
  }, [connectionState, onEnd]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const agentState = voiceAssistant.state;

  const stateLabel =
    agentState === "speaking"
      ? "Interviewer is speaking..."
      : agentState === "listening"
        ? "Listening to you..."
        : agentState === "thinking"
          ? "Processing..."
          : agentState === "connecting"
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

      {showTranscript && agentState !== "connecting" && (
        <Card className="w-full">
          <CardContent className="py-3">
            <p className="text-center text-xs text-muted-foreground">
              {agentState === "speaking"
                ? "The interviewer is speaking..."
                : agentState === "listening"
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
          onClick={() => setShowTranscript((prev) => !prev)}
        >
          {showTranscript ? "Hide Status" : "Show Status"}
        </Button>

        <Button variant="destructive" size="sm" onClick={onEnd}>
          <PhoneOff className="size-4" />
          End Interview
        </Button>
      </div>
    </div>
  );
}
