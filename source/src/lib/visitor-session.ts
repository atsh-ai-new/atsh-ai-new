const SESSION_KEY = "atsh-journey-session";
export const VISITOR_IDLE_MS = 30 * 60_000;

// One visitor ID and one active session per browser profile and origin.
// Only real activity extends the session, never a background timer.
export function visitorSession(storage: Storage, now: number, makeId: () => string, touch = false): string | null {
  let state: { id?: string; at?: number } | null = null;
  try { state = JSON.parse(storage.getItem(SESSION_KEY) ?? "null"); } catch {}
  const isCurrent = typeof state?.id === "string" && typeof state.at === "number"
    && now >= state.at && now - state.at < VISITOR_IDLE_MS;
  if (!touch) return isCurrent ? state!.id! : null;
  const id = isCurrent ? state!.id! : makeId();
  if (!isCurrent || state!.at !== now) storage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
  return id;
}
