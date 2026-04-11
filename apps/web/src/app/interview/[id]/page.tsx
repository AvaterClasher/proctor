import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@proctor/env/web";

import { getAuth } from "@/lib/auth-server";

import InterviewRoom from "./interview-room";

export const dynamic = "force-dynamic";

export default async function InterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestHeaders = await headers();

  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: requestHeaders,
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

  if (data.candidate?.userId && data.candidate.userId !== session.user.id) {
    redirect("/interview");
  }

  return <InterviewRoom interview={data.interview} />;
}
