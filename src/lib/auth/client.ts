import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser auth SDK. Same origin, so no baseURL. Auth forms call it directly
 * (not server actions) so every request passes Better Auth's rate limiter
 * and origin checks at /api/auth/*.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
