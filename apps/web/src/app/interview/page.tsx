import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth-server";

import StartInterview from "./start-interview";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <StartInterview session={session} />;
}
