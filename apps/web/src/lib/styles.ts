export const recommendationStyles: Record<string, string> = {
  strong_yes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  yes: "bg-green-500/15 text-green-700 dark:text-green-400",
  maybe: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  no: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  strong_no: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const statusStyles: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
};
