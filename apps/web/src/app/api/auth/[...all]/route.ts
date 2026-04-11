import { getAuth } from "@/lib/auth-server";

const handler = async (request: Request) => (await getAuth()).handler(request);

export { handler as GET, handler as POST };
