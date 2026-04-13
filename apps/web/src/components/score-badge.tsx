"use client";

const scoreColors: Record<number, string> = {
  1: "bg-red-500/15 text-red-700 dark:text-red-400",
  2: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  3: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  4: "bg-green-500/15 text-green-700 dark:text-green-400",
  5: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export default function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  const colorClass = scoreColors[clamped] ?? scoreColors[3];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${colorClass}`}
    >
      {score}/5
    </span>
  );
}
