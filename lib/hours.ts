/**
 * Midnight-deal window helpers.
 *
 * Midnight deals go live at 22:30 local time and run through the night.
 * These read the *client's* clock, so anything that calls them must run
 * after mount (inside useEffect) — never during SSR, or the server and the
 * browser can disagree and React will report a hydration mismatch.
 */

export const MIDNIGHT_DEAL_START_HOUR = 22;
export const MIDNIGHT_DEAL_START_MINUTE = 30;

/** True once the local clock has passed 22:30 (and until midnight rolls over). */
export function isMidnightDealTime(now: Date = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = MIDNIGHT_DEAL_START_HOUR * 60 + MIDNIGHT_DEAL_START_MINUTE;
  // 22:30 -> 23:59, plus the small hours (00:00 -> 03:59) when the kitchen is still on.
  return minutes >= start || minutes < 4 * 60;
}

/** Human label for the midnight-deals badge. */
export function midnightDealLabel(now: Date = new Date()): string {
  return isMidnightDealTime(now) ? "Available now" : "Available after 10:30 PM";
}
