"use client";

import { formatDate, formatDuration, titleCase } from "@/lib/format";
import { recommendationStyles } from "@/lib/styles";

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

const scoreColors: Record<number, string> = {
  1: "text-red-700 dark:text-red-400",
  2: "text-orange-700 dark:text-orange-400",
  3: "text-yellow-700 dark:text-yellow-500",
  4: "text-green-700 dark:text-green-400",
  5: "text-emerald-700 dark:text-emerald-400",
};

export default function AssessmentCard({
  assessment,
  candidate,
  interview,
}: AssessmentCardProps) {
  const recStyle =
    recommendationStyles[assessment.recommendation] ??
    recommendationStyles.maybe;
  const clamped = Math.max(1, Math.min(5, Math.round(assessment.overallScore)));
  const scoreColor = scoreColors[clamped] ?? scoreColors[3];

  return (
    <section>
      <div className="mb-4 flex items-baseline gap-6">
        <div className="tabular-nums">
          <span className={`font-display text-4xl font-bold ${scoreColor}`}>
            {assessment.overallScore}
          </span>
          <span className="text-lg text-muted-foreground">/5</span>
        </div>
        <span className={`text-sm font-medium ${recStyle}`}>
          {titleCase(assessment.recommendation)}
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>{candidate.name}</span>
        <span>{candidate.email}</span>
        <span>
          {formatDate(interview.createdAt, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span>{formatDuration(interview.durationSecs)}</span>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        {assessment.summary}
      </p>
    </section>
  );
}
