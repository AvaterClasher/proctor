"use client";

interface AudioVisualizerProps {
  frequencies: number[];
  isAgent?: boolean;
  className?: string;
}

export default function AudioVisualizer({
  frequencies,
  className = "",
}: AudioVisualizerProps) {
  const barCount = Math.max(frequencies.length, 7);

  return (
    <div className={`flex items-center justify-center gap-[5px] ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        const value = frequencies[i] ?? 0;
        const height = Math.max(6, value * 64);
        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-primary/50 transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
