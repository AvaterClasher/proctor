import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth-server";

import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Welcome, {session.user.name}
      </p>
      <Dashboard session={session} />
    </div>
  );
}
