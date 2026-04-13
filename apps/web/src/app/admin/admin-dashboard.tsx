"use client";

import { Card, CardContent } from "@proctor/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@proctor/ui/components/dropdown-menu";
import { Skeleton } from "@proctor/ui/components/skeleton";
import { ChevronRight, Mic } from "lucide-react";
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

type StatusFilter = "all" | "scheduled" | "in_progress" | "completed" | "failed";

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
    filter === "all" ? interviews : interviews.filter((i) => i.status === filter);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Interview Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Review candidate interviews and assessments
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 items-center gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            Status: {statusLabels[filter]}
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
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mic className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No interviews yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto_auto_24px] items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Candidate</span>
            <span className="w-28">Date</span>
            <span className="w-16 text-right">Duration</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-16 text-center">Score</span>
            <span className="w-24 text-center">Recommendation</span>
            <span />
          </div>

          {filtered.map((interview) => (
            <button
              key={interview.id}
              type="button"
              onClick={() => router.push(`/admin/${interview.id}`)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-none border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:grid-cols-[1fr_auto_auto_auto_auto_auto_24px]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium">{interview.candidateName}</span>
                <span className="text-xs text-muted-foreground">
                  {interview.candidateEmail}
                </span>
              </div>

              <span className="hidden w-28 text-xs text-muted-foreground sm:block">
                {formatDate(interview.createdAt)}
              </span>

              <span className="hidden w-16 text-right text-xs tabular-nums text-muted-foreground sm:block">
                {formatDuration(interview.durationSecs)}
              </span>

              <span className="hidden w-24 sm:flex sm:justify-center">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[interview.status] ?? statusStyles.scheduled}`}
                >
                  {titleCase(interview.status)}
                </span>
              </span>

              <span className="hidden w-16 sm:flex sm:justify-center">
                {interview.overallScore != null ? (
                  <ScoreBadge score={interview.overallScore} />
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </span>

              <span className="hidden w-24 sm:flex sm:justify-center">
                {interview.recommendation ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${recommendationStyles[interview.recommendation] ?? ""}`}
                  >
                    {titleCase(interview.recommendation)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </span>

              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
