"use client";

const scoreColors: Record<number, string> = {
  1: "text-red-700 dark:text-red-400",
  2: "text-orange-700 dark:text-orange-400",
  3: "text-yellow-700 dark:text-yellow-500",
  4: "text-green-700 dark:text-green-400",
  5: "text-emerald-700 dark:text-emerald-400",
};

export default function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  const colorClass = scoreColors[clamped] ?? scoreColors[3];

  return (
    <span className="text-sm tabular-nums">
      <span className={`font-semibold ${colorClass}`}>{score}</span>
      <span className="text-muted-foreground">/5</span>
    </span>
  );
}
