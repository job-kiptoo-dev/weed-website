export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Fail fast at boot with the names of missing or invalid variables.
  const { getServerEnv } = await import("@/lib/env");
  getServerEnv();
}
