"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@proctor/ui/components/button";

export default function Dashboard({
  session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  return (
    <div className="rounded-md border border-border px-5 py-6">
      <p className="mb-4 text-sm text-muted-foreground">
        You haven&apos;t started your screening interview yet.
      </p>
      <Button render={<Link href="/interview" />}>Start Interview</Button>
    </div>
  );
}
