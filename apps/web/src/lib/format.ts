export function formatDuration(secs: number | null): string {
  if (secs == null) return "--:--";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Date(dateStr).toLocaleDateString(
      undefined,
      options ?? {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  } catch {
    return dateStr;
  }
}

export function titleCase(snakeStr: string): string {
  return snakeStr.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
