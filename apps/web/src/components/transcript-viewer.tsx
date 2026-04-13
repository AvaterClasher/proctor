"use client";

interface TranscriptMessage {
  role: "agent" | "candidate";
  content: string;
  timestamp: string;
}

export default function TranscriptViewer({
  transcript,
}: {
  transcript: TranscriptMessage[];
}) {
  if (transcript.length === 0) {
    return (
      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Transcript
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No transcript available.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Transcript
      </h2>
      <div className="mt-4 max-h-[600px] space-y-5 overflow-y-auto pr-2">
        {transcript.map((message, index) => {
          const isAgent = message.role === "agent";
          return (
            <div key={index}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/70">
                  {isAgent ? "Interviewer" : "Candidate"}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-foreground/85">
                {message.content}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}
