import { createAuth } from "@proctor/auth";
import { env } from "@proctor/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import assessmentRoutes from "./routes/assessment";
import interviewRoutes from "./routes/interview";
import livekitRoutes from "./routes/livekit";

function auth() {
  return createAuth({
    db: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CORS_ORIGIN],
  });
}

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth().handler(c.req.raw));

app.route("/api/livekit", livekitRoutes);
app.route("/api/interviews", interviewRoutes);
app.route("/api/assessments", assessmentRoutes);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
