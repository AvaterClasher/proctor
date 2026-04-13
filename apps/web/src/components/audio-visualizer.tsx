"use client";

interface AudioVisualizerProps {
  /** Array of frequency values (0-1) to visualize */
  frequencies: number[];
  /** Whether this is the agent (true) or candidate (false) speaking */
  isAgent?: boolean;
  /** CSS class overrides */
  className?: string;
}

export default function AudioVisualizer({
  frequencies,
  isAgent = false,
  className = "",
}: AudioVisualizerProps) {
  const barCount = Math.max(frequencies.length, 5);
  const barColor = isAgent
    ? "bg-blue-500 dark:bg-blue-400"
    : "bg-emerald-500 dark:bg-emerald-400";

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        const value = frequencies[i] ?? 0;
        const height = Math.max(4, value * 48);
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${barColor}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
