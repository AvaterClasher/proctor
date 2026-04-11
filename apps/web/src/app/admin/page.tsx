import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth-server";

import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <AdminDashboard session={session} />;
}
