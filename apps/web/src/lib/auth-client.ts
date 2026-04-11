import { env } from "@proctor/env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  fetchOptions: {
    credentials: "include",
  },
});
