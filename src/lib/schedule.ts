import type { ScheduleRow } from "./airtable.server";
import { isEventPast, isHappeningNow, minutesUntil } from "./time";

/** Team dropdown, in Lauren's order. "All Team" is the empty value. */
export const TEAM = ["Rich", "Gabrielle", "Heather"] as const;

/** Day dropdown, in Lauren's order. */
export const DAYS = ["Throughout", "Tue Dec 1", "Wed Dec 2", "Thu Dec 3", "Fri Dec 4"] as const;

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Team filter. A person sees rows where the Photographer field names them, plus every
 * RUSH SOCIAL row whose "Key Shots By" is them (Rich takes all Rush Social key shots).
 * TBD rows only appear under All Team.
 */
export function isAssigned(row: ScheduleRow, person: string): boolean {
  const p = norm(person);
  if (!p) return true;
  if (row.photographers.some((n) => norm(n) === p)) return true;
  return row.rushSocial && norm(row.keyShotsBy) === p;
}

export function filterRows(rows: ScheduleRow[], person: string, day: string): ScheduleRow[] {
  return rows.filter((r) => isAssigned(r, person) && (!day || r.day === day));
}

export function isNoCoverage(row: Pick<ScheduleRow, "priority">): boolean {
  return norm(row.priority) === "no coverage";
}

/** Rows grouped by Day, days in Lauren's order, rows in "Sort" order. */
export function groupByDay(rows: ScheduleRow[]): Array<[string, ScheduleRow[]]> {
  const known = DAYS as readonly string[];
  const days = [
    ...known.filter((d) => rows.some((r) => r.day === d)),
    ...Array.from(new Set(rows.map((r) => r.day))).filter((d) => !known.includes(d)),
  ];
  return days.map((d) => [d, rows.filter((r) => r.day === d)]);
}

/** What's on now and the next timed function to start (skipping No Coverage rows). */
export function nowAndNext(
  rows: ScheduleRow[],
  now: Date = new Date(),
): { happening: ScheduleRow | null; upNext: ScheduleRow | null; minutes: number | null } {
  const covered = rows.filter((r) => !isNoCoverage(r));
  const happening = covered.find((r) => isHappeningNow(r, now)) ?? null;
  let upNext: ScheduleRow | null = null;
  let best: number | null = null;
  for (const r of covered) {
    const m = minutesUntil(r, now);
    if (m != null && m > 0 && (best == null || m < best)) {
      best = m;
      upNext = r;
    }
  }
  return { happening, upNext, minutes: best };
}

export { isEventPast };
