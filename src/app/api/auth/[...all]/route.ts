import { getAuth } from "@/lib/auth/server";

// Better Auth's endpoints (/api/auth/*). The instance is created lazily
// because the database handle is async (in-memory PGlite in development).
export const GET = async (request: Request) =>
  (await getAuth()).handler(request);

export const POST = async (request: Request) =>
  (await getAuth()).handler(request);
