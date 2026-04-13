"use client";

import Link from "next/link";
import { Button } from "@proctor/ui/components/button";

const qualities = [
  "Communication clarity",
  "Patience & warmth",
  "Simplification ability",
  "Teaching enthusiasm",
  "English fluency",
] as const;

export default function Home() {
  return (
    <main className="animate-in mx-auto flex w-full max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Tutor Screening
      </h1>
      <p className="mt-3 max-w-[50ch] text-base leading-relaxed text-muted-foreground">
        Complete a 10-minute voice conversation with our AI interviewer. We
        evaluate communication, patience, and teaching ability.
      </p>
      <div className="mt-8">
        <Button size="lg" render={<Link href="/interview" />}>
          Begin Interview
        </Button>
      </div>

      <div className="mt-20 w-full border-t border-border pt-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          What we evaluate
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {qualities.map((q) => (
            <p key={q} className="text-sm text-muted-foreground">
              {q}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
