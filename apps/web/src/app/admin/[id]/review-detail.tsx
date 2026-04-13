"use client";

import { Button } from "@proctor/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@proctor/ui/components/card";
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
  transcript: Array<{ role: "agent" | "candidate"; content: string; timestamp: string }> | null;
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
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchInterview = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setLoadError(false);
      const res = await fetch(`/api/interviews/${interviewId}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        setInterview(null);
        setNotFound(true);
        return;
      }
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

      type Dimension = NonNullable<InterviewDetail["assessment"]>["dimensions"][number];
      let parsedDimensions: Dimension[] = [];
      if (raw.assessment?.dimensions) {
        try {
          parsedDimensions = JSON.parse(raw.assessment.dimensions) as Dimension[];
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
      setInterview(null);
      setLoadError(true);
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
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="mb-4 h-48 w-full" />
        <Skeleton className="mb-4 h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Interview not found.</p>
        </div>
      </div>
    );
  }

  if (loadError || !interview) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load interview details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin")}
        className="mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Button>

      {interview.assessment ? (
        <div className="mb-6">
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
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Assessment not yet available for this interview.
            </p>
          </CardContent>
        </Card>
      )}

      {interview.assessment?.dimensions && interview.assessment.dimensions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">Dimension Breakdown</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {interview.assessment.dimensions.map((dim) => (
              <Card key={dim.dimension}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {dimensionLabels[dim.dimension] ?? dim.dimension}
                    </CardTitle>
                    <ScoreBadge score={dim.score} />
                  </div>
                </CardHeader>
                <CardContent>
                  {dim.evidence && (
                    <p className="mb-2 text-xs/relaxed italic text-muted-foreground">
                      &ldquo;{dim.evidence}&rdquo;
                    </p>
                  )}
                  {dim.notes && (
                    <p className="text-xs/relaxed text-muted-foreground">{dim.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {interview.transcript && interview.transcript.length > 0 && (
        <TranscriptViewer transcript={interview.transcript} />
      )}
    </div>
  );
}
