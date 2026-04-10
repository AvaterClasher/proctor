"use client";

import Link from "next/link";
import { Button } from "@proctor/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@proctor/ui/components/card";
import {
  Mic,
  MessageCircle,
  CheckCircle,
  Heart,
  Sparkles,
  Languages,
  GraduationCap,
} from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    title: "Sign In",
    description: "Create your account or sign in",
  },
  {
    icon: Mic,
    title: "Voice Interview",
    description: "Have a short conversation with our AI interviewer",
  },
  {
    icon: CheckCircle,
    title: "Get Results",
    description: "We'll review your interview and get back to you",
  },
] as const;

const qualities = [
  { icon: MessageCircle, label: "Communication Clarity" },
  { icon: Heart, label: "Patience & Warmth" },
  { icon: Sparkles, label: "Ability to Simplify Concepts" },
  { icon: GraduationCap, label: "Teaching Enthusiasm" },
  { icon: Languages, label: "English Fluency" },
] as const;

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-2">
      {/* Hero Section */}
      <section className="py-12 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Cuemath Tutor Screening</h1>
        <p className="mb-6 text-base text-muted-foreground">
          Complete your tutor screening interview in just 10 minutes
        </p>
        <Button size="lg" render={<Link href="/interview" />}>
          Start Your Interview
        </Button>
      </section>

      {/* How It Works */}
      <section className="py-8">
        <h2 className="mb-4 text-center text-xl font-semibold">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-start gap-2">
                <step.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{step.description}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* What We're Looking For */}
      <section className="py-8">
        <h2 className="mb-4 text-center text-xl font-semibold">What We&apos;re Looking For</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {qualities.map((q) => (
            <Card key={q.label} size="sm">
              <CardContent className="flex items-center gap-3">
                <q.icon className="size-5 text-primary" />
                <span className="font-medium">{q.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
