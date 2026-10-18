export function sessionTtlSeconds(value = process.env.SESSION_TTL_SECONDS): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 60 ? parsed : 7 * 24 * 60 * 60;
}

export function isSessionActive(expiresAt: Date, revokedAt: Date | null, now = new Date()): boolean {
  return !revokedAt && expiresAt.getTime() > now.getTime();
}
