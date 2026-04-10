import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@proctor/env/web";

import { authClient } from "@/lib/auth-client";

import InterviewRoom from "./interview-room";

export default async function InterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestHeaders = await headers();

  const session = await authClient.getSession({
    fetchOptions: {
      headers: requestHeaders,
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const response = await fetch(
    `${env.NEXT_PUBLIC_SERVER_URL}/api/interviews/${id}`,
    {
      headers: Object.fromEntries(requestHeaders.entries()),
    },
  );

  if (!response.ok) {
    redirect("/interview");
  }

  const data = (await response.json()) as {
    interview: { id: string; status: string };
    candidate: { userId: string | null } | null;
  };

  // Backend already checks ownership, but double-check here
  if (data.candidate?.userId && data.candidate.userId !== session.user.id) {
    redirect("/interview");
  }

  return <InterviewRoom interview={data.interview} />;
}
