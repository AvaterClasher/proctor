"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@proctor/ui/components/dropdown-menu";
import { Skeleton } from "@proctor/ui/components/skeleton";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { formatDate, formatDuration, titleCase } from "@/lib/format";
import { recommendationStyles, statusStyles } from "@/lib/styles";
import ScoreBadge from "@/components/score-badge";

interface InterviewListItem {
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
}

type StatusFilter =
  | "all"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "failed";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
};

export default function AdminDashboard({
  session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/interviews?page=1&limit=20", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch interviews");
      const payload = (await res.json()) as {
        data: Array<{
          interview: {
            id: string;
            candidateId: string;
            livekitRoom: string;
            status: InterviewListItem["status"];
            startedAt: string | null;
            endedAt: string | null;
            durationSecs: number | null;
            createdAt: string;
          };
          candidate: { name: string; email: string } | null;
          assessment: {
            overallScore: number;
            recommendation: string;
          } | null;
        }>;
      };
      setInterviews(
        payload.data.map((row) => ({
          id: row.interview.id,
          candidateId: row.interview.candidateId,
          candidateName: row.candidate?.name ?? "Unknown",
          candidateEmail: row.candidate?.email ?? "",
          livekitRoom: row.interview.livekitRoom,
          status: row.interview.status,
          startedAt: row.interview.startedAt,
          endedAt: row.interview.endedAt,
          durationSecs: row.interview.durationSecs,
          createdAt: row.interview.createdAt,
          overallScore: row.assessment?.overallScore ?? null,
          recommendation: row.assessment?.recommendation ?? null,
        })),
      );
    } catch (err) {
      toast.error("Failed to load interviews");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const filtered =
    filter === "all"
      ? interviews
      : interviews.filter((i) => i.status === filter);

  return (
    <div className="animate-in mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Interviews
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review candidate interviews and assessments
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            {statusLabels[filter]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(statusLabels) as StatusFilter[]).map((key) => (
              <DropdownMenuItem key={key} onSelect={() => setFilter(key)}>
                {statusLabels[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="flex flex-col gap-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No interviews yet</p>
        </div>
      ) : (
        <div>
          <div className="hidden grid-cols-[1fr_7rem_4.5rem_5.5rem_3.5rem_6rem] items-center gap-4 border-b border-border px-4 pb-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Candidate</span>
            <span>Date</span>
            <span className="text-right">Duration</span>
            <span className="text-center">Status</span>
            <span className="text-center">Score</span>
            <span className="text-right">Recommendation</span>
          </div>

          {filtered.map((interview) => (
            <button
              key={interview.id}
              type="button"
              onClick={() => router.push(`/admin/${interview.id}`)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50 sm:grid-cols-[1fr_7rem_4.5rem_5.5rem_3.5rem_6rem]"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {interview.candidateName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {interview.candidateEmail}
                </span>
              </div>

              <span className="hidden text-xs text-muted-foreground sm:block">
                {formatDate(interview.createdAt)}
              </span>

              <span className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                {formatDuration(interview.durationSecs)}
              </span>

              <span className="hidden sm:block">
                <span
                  className={`text-xs font-medium ${statusStyles[interview.status] ?? statusStyles.scheduled}`}
                >
                  {titleCase(interview.status)}
                </span>
              </span>

              <span className="hidden text-center sm:block">
                {interview.overallScore != null ? (
                  <ScoreBadge score={interview.overallScore} />
                ) : (
                  <span className="text-xs text-muted-foreground">&ndash;</span>
                )}
              </span>

              <span className="hidden text-right sm:block">
                {interview.recommendation ? (
                  <span
                    className={`text-xs font-medium ${recommendationStyles[interview.recommendation] ?? ""}`}
                  >
                    {titleCase(interview.recommendation)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">&ndash;</span>
                )}
              </span>

              {/* Mobile: show key info inline */}
              <div className="flex items-center gap-3 sm:hidden">
                {interview.overallScore != null && (
                  <ScoreBadge score={interview.overallScore} />
                )}
                <span
                  className={`text-xs ${statusStyles[interview.status] ?? ""}`}
                >
                  {titleCase(interview.status)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
