export const NEON_TARGET_FLAG = "--target=neon";

/** True when a database script was explicitly pointed at Neon. */
export function hasNeonTargetFlag(argv: readonly string[]): boolean {
  return argv.includes(NEON_TARGET_FLAG);
}
