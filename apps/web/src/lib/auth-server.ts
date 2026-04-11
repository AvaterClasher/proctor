import "server-only";

import { createAuth } from "@proctor/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  return createAuth({
    db: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CORS_ORIGIN],
  });
}
