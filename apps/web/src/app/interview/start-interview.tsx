"use client";

import { Button } from "@proctor/ui/components/button";
import { Input } from "@proctor/ui/components/input";
import { Label } from "@proctor/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Headphones } from "lucide-react";
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
        const response = await fetch("/api/interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: value.name,
            email: value.email,
            phone: value.phone || undefined,
          }),
        });

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
    <div className="animate-in mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Before we begin
      </h1>
      <p className="mt-2 mb-8 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
        This voice interview takes about 10 minutes. You'll speak with an AI
        interviewer about your teaching approach and communication skills.
      </p>

      <div className="mb-8 flex items-center gap-3 rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
        <Headphones className="size-4 shrink-0 text-foreground/50" />
        Use headphones in a quiet environment for the best experience.
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
            <div className="space-y-1.5">
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
                <p key={error?.message} className="text-xs text-destructive">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <div className="space-y-1.5">
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
                <p key={error?.message} className="text-xs text-destructive">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="phone">
          {(field) => (
            <div className="space-y-1.5">
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
              className="mt-2 w-full"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Starting..." : "Begin Interview"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
