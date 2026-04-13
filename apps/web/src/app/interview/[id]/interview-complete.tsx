"use client";

import { Button } from "@proctor/ui/components/button";
import { useRouter } from "next/navigation";

export default function InterviewComplete() {
  const router = useRouter();

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="animate-in max-w-sm text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Interview complete
        </h2>
        <p className="mt-3 mb-8 text-sm leading-relaxed text-muted-foreground">
          Your responses have been recorded. We'll review them and get back to
          you within 3&ndash;5 business days.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Return to dashboard
        </Button>
      </div>
    </div>
  );
}
