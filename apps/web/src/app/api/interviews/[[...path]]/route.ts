import { type NextRequest } from "next/server";

import { proxyToServer } from "@/lib/api-proxy";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxyToServer(request, "/api/interviews", path);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
