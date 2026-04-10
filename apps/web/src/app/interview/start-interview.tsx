"use client";

import { Button } from "@proctor/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@proctor/ui/components/card";
import { Input } from "@proctor/ui/components/input";
import { Label } from "@proctor/ui/components/label";
import { env } from "@proctor/env/web";
import { useForm } from "@tanstack/react-form";
import { Clock, Headphones, Mic, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function StartInterview({
  session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      phone: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const response = await fetch(
          `${env.NEXT_PUBLIC_SERVER_URL}/api/interviews`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: value.name,
              email: value.email,
              phone: value.phone || undefined,
            }),
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            body?.message ?? `Request failed with status ${response.status}`,
          );
        }

        const data = (await response.json()) as { id: string };
        router.push(`/interview/${data.id}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start interview",
        );
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, "Name is required"),
        email: z.email("Invalid email address"),
        phone: z.string(),
      }),
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to the Cuemath Tutor Screening
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are excited to learn more about you. This voice-based interview
          helps us understand your teaching skills and approach.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              ~10 Minutes
            </CardTitle>
            <CardDescription>
              The interview takes approximately 10 minutes to complete.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="size-4" />
              Voice-Based
            </CardTitle>
            <CardDescription>
              You will speak with an AI interviewer. Have your microphone ready.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              Topics Covered
            </CardTitle>
            <CardDescription>
              Math knowledge, teaching approach, and communication skills.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
          <CardDescription>
            Confirm your information before starting the interview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <Headphones className="size-4 shrink-0" />
            <span>
              Please use headphones for the best experience and find a quiet
              environment.
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Full Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="phone">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Phone Number{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Starting Interview..." : "Start Interview"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
