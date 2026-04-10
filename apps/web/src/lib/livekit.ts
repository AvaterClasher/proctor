import { env } from "@proctor/env/web";

export async function fetchLivekitToken(
  interviewId: string,
): Promise<{ token: string; roomName: string; serverUrl: string }> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_SERVER_URL}/api/livekit/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ interviewId }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to get LiveKit token");
  }

  return response.json();
}
