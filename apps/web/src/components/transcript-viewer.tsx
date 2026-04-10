"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@proctor/ui/components/card";
import { Mic, User } from "lucide-react";

interface TranscriptMessage {
  role: "agent" | "candidate";
  content: string;
  timestamp: string;
}

export default function TranscriptViewer({ transcript }: { transcript: TranscriptMessage[] }) {
  if (transcript.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No transcript available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex max-h-[600px] flex-col gap-3 overflow-y-auto pr-2">
          {transcript.map((message, index) => {
            const isAgent = message.role === "agent";
            return (
              <div
                key={index}
                className={`flex flex-col gap-1 ${isAgent ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isAgent ? <Mic className="size-3" /> : <User className="size-3" />}
                  <span className="font-medium">
                    {isAgent ? "Agent" : "Candidate"}
                  </span>
                  <span>{formatTimestamp(message.timestamp)}</span>
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs/relaxed ${
                    isAgent
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
}
