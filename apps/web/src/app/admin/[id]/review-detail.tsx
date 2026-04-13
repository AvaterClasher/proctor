"use client";

import { Button } from "@proctor/ui/components/button";
import { Skeleton } from "@proctor/ui/components/skeleton";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AssessmentCard from "@/components/assessment-card";
import ScoreBadge from "@/components/score-badge";
import TranscriptViewer from "@/components/transcript-viewer";

interface InterviewDetail {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  livekitRoom: string;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  startedAt: string | null;
  endedAt: string | null;
  durationSecs: number | null;
  createdAt: string;
  overallScore: number | null;
  recommendation: string | null;
  transcript: Array<{
    role: "agent" | "candidate";
    content: string;
    timestamp: string;
  }> | null;
  assessment: {
    id: string;
    overallScore: number;
    recommendation: string;
    summary: string;
    dimensions: Array<{
      dimension: string;
      score: number;
      evidence: string;
      notes: string;
    }>;
  } | null;
}

const dimensionLabels: Record<string, string> = {
  communication_clarity: "Communication Clarity",
  patience_warmth: "Patience & Warmth",
  simplification_ability: "Simplification Ability",
  english_fluency: "English Fluency",
  teaching_enthusiasm: "Teaching Enthusiasm",
};

export default function ReviewDetail({
  interviewId,
}: {
  interviewId: string;
}) {
  const router = useRouter();
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInterview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/interviews/${interviewId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch interview");
      const raw = (await res.json()) as {
        interview: {
          id: string;
          candidateId: string;
          livekitRoom: string;
          status: "scheduled" | "in_progress" | "completed" | "failed";
          startedAt: string | null;
          endedAt: string | null;
          durationSecs: number | null;
          createdAt: string;
          transcript: Array<{
            role: "agent" | "candidate";
            content: string;
            timestamp: string;
          }> | null;
        };
        candidate: { name: string; email: string } | null;
        assessment: {
          id: string;
          overallScore: number;
          recommendation: string;
          summary: string;
          dimensions: string | null;
        } | null;
      };

      type Dimension = NonNullable<
        InterviewDetail["assessment"]
      >["dimensions"][number];
      let parsedDimensions: Dimension[] = [];
      if (raw.assessment?.dimensions) {
        try {
          parsedDimensions = JSON.parse(
            raw.assessment.dimensions,
          ) as Dimension[];
        } catch {
          parsedDimensions = [];
        }
      }

      setInterview({
        id: raw.interview.id,
        candidateId: raw.interview.candidateId,
        candidateName: raw.candidate?.name ?? "Unknown",
        candidateEmail: raw.candidate?.email ?? "",
        livekitRoom: raw.interview.livekitRoom,
        status: raw.interview.status,
        startedAt: raw.interview.startedAt,
        endedAt: raw.interview.endedAt,
        durationSecs: raw.interview.durationSecs,
        createdAt: raw.interview.createdAt,
        overallScore: raw.assessment?.overallScore ?? null,
        recommendation: raw.assessment?.recommendation ?? null,
        transcript: raw.interview.transcript,
        assessment: raw.assessment
          ? {
              id: raw.assessment.id,
              overallScore: raw.assessment.overallScore,
              recommendation: raw.assessment.recommendation,
              summary: raw.assessment.summary,
              dimensions: parsedDimensions,
            }
          : null,
      });
    } catch (err) {
      toast.error("Failed to load interview details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    fetchInterview();
  }, [fetchInterview]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Skeleton className="mb-8 h-6 w-32" />
        <Skeleton className="mb-4 h-32 w-full" />
        <Skeleton className="mb-4 h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Interview not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto w-full max-w-3xl px-6 py-8">
      <button
        onClick={() => router.push("/admin")}
        className="mb-8 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to interviews
      </button>

      {interview.assessment ? (
        <div className="mb-10">
          <AssessmentCard
            assessment={interview.assessment}
            candidate={{
              name: interview.candidateName,
              email: interview.candidateEmail,
            }}
            interview={{
              createdAt: interview.createdAt,
              durationSecs: interview.durationSecs,
            }}
          />
        </div>
      ) : (
        <div className="mb-10 rounded-md border border-border px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Assessment not yet available for this interview.
          </p>
        </div>
      )}

      {interview.assessment?.dimensions &&
        interview.assessment.dimensions.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Dimensions
            </h2>
            <div className="mt-4 space-y-6">
              {interview.assessment.dimensions.map((dim) => (
                <div
                  key={dim.dimension}
                  className="border-b border-border pb-5 last:border-0 last:pb-0"
                >
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <h3 className="text-sm font-medium">
                      {dimensionLabels[dim.dimension] ?? dim.dimension}
                    </h3>
                    <ScoreBadge score={dim.score} />
                  </div>
                  {dim.evidence && (
                    <p className="mb-1 max-w-prose text-sm italic leading-relaxed text-muted-foreground">
                      &ldquo;{dim.evidence}&rdquo;
                    </p>
                  )}
                  {dim.notes && (
                    <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                      {dim.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      {interview.transcript && interview.transcript.length > 0 && (
        <TranscriptViewer transcript={interview.transcript} />
      )}
    </div>
  );
}
