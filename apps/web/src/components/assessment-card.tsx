"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proctor/ui/components/card";
import { Calendar, Mail, Timer, User } from "lucide-react";

import { formatDate, formatDuration, titleCase } from "@/lib/format";
import { recommendationStyles } from "@/lib/styles";
import ScoreBadge from "./score-badge";

interface AssessmentCardProps {
  assessment: {
    overallScore: number;
    recommendation: string;
    summary: string;
  };
  candidate: {
    name: string;
    email: string;
  };
  interview: {
    createdAt: string;
    durationSecs: number | null;
  };
}

export default function AssessmentCard({
  assessment,
  candidate,
  interview,
}: AssessmentCardProps) {
  const recStyle = recommendationStyles[assessment.recommendation] ?? recommendationStyles.maybe;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Summary</CardTitle>
        <CardDescription>AI-generated evaluation of the interview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold tabular-nums">
                {assessment.overallScore}
              </span>
              <ScoreBadge score={assessment.overallScore} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Recommendation</span>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${recStyle}`}
              >
                {titleCase(assessment.recommendation)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-3.5" />
              <span>{candidate.name}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5" />
              <span>{candidate.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>
                {formatDate(interview.createdAt, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="size-3.5" />
              <span>{formatDuration(interview.durationSecs)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-xs/relaxed text-muted-foreground">{assessment.summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
