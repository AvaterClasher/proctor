import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest } from "next/server";

export async function proxyToServer(
  request: NextRequest,
  apiPrefix: string,
  pathSegments: string[] = [],
) {
  const { env } = await getCloudflareContext({ async: true });
  const serverUrl = env.NEXT_PUBLIC_SERVER_URL;

  const suffix = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";
  const search = request.nextUrl.search;
  const url = `${serverUrl}${apiPrefix}${suffix}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error — duplex is required for streaming request bodies
    duplex: "half",
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
