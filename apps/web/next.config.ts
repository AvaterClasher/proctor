import "@proctor/env/web";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  async rewrites() {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    return [
      {
        source: "/api/livekit",
        destination: `${serverUrl}/api/livekit`,
      },
      {
        source: "/api/livekit/:path+",
        destination: `${serverUrl}/api/livekit/:path+`,
      },
      {
        source: "/api/interviews",
        destination: `${serverUrl}/api/interviews`,
      },
      {
        source: "/api/interviews/:path+",
        destination: `${serverUrl}/api/interviews/:path+`,
      },
      {
        source: "/api/assessments",
        destination: `${serverUrl}/api/assessments`,
      },
      {
        source: "/api/assessments/:path+",
        destination: `${serverUrl}/api/assessments/:path+`,
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
