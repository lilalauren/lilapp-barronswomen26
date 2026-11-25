// Time helpers. Every comparison uses Palm Beach wall-clock time (America/New_York),
// whatever timezone the phone happens to be in. Times are displayed exactly as typed
// in Airtable; parsing is only used for ordering, "now", "next" and the countdown.

export const EVENT_TZ = "America/New_York";
export const TIME_LABEL = "Palm Beach event time (ET)";
export const EVENT_YEAR = 2026;

// The Schedule's Day choices, in order. "Throughout" has no date.
export const THROUGHOUT = "Throughout";

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** "Thu Dec 3" → "2026-12-03"; "Throughout" or anything else → "". */
export function dayToDate(day: string): string {
  const m = day.trim().match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})$/);
  const month = m ? MONTH_INDEX[m[1]!.toLowerCase()] : undefined;
  if (!m || !month) return "";
  return `${EVENT_YEAR}-${String(month).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
}

const CLOCK = /(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?/i;

function toMinutes(h: number, min: number, ap?: string): number | null {
  if (h > 23 || min > 59) return null;
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  return h * 60 + min;
}

/** Day-time guess for a bare "9:25": 7–11 → morning, 12 and 1–6 → afternoon. */
function guessAp(h: number): "a" | "p" {
  return h >= 7 && h <= 11 ? "a" : "p";
}

/**
 * Start and end minutes from Lauren's free-text Time, e.g. "6:15 PM - 9:00 PM",
 * "4:30 PM", "1:30 PM (per SOW…)" or "9:25-9:40, 10:30-10:45" (first window).
 * Free text such as "PENDING - Ally to confirm time" or "Flexible…" returns nulls.
 */
export function parseTimeRange(input?: string): { start: number | null; end: number | null } {
  const textIn = (input ?? "").replace(/[–—]/g, "-").trim();
  if (!/^\d/.test(textIn)) return { start: null, end: null };
  const first = textIn.split(",")[0]!;
  const [a, b] = first.split("-").map((s) => s.trim());
  const ma = a?.match(CLOCK);
  if (!ma) return { start: null, end: null };
  const mb = b?.match(/^\d/) ? b.match(CLOCK) : null;
  const apB = mb?.[3]?.toLowerCase();
  const ha = parseInt(ma[1]!, 10);
  const apA = ma[3]?.toLowerCase() ?? apB ?? guessAp(ha);
  const start = toMinutes(ha, ma[2] ? parseInt(ma[2], 10) : 0, apA);
  let end: number | null = null;
  if (mb) {
    const hb = parseInt(mb[1]!, 10);
    end = toMinutes(hb, mb[2] ? parseInt(mb[2], 10) : 0, apB ?? guessAp(hb));
  }
  return { start, end };
}

/** Current date + minutes past midnight in Palm Beach. */
export function nowAtEvent(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

type Timed = { day: string; time: string };

/** Finished once its end time (or start, or end of day) has passed. "Throughout" never finishes. */
export function isEventPast(row: Timed, now: Date = new Date()): boolean {
  const date = dayToDate(row.day);
  if (!date) return false;
  const here = nowAtEvent(now);
  if (date !== here.date) return date < here.date;
  const { start, end } = parseTimeRange(row.time);
  return (end ?? start ?? 24 * 60 - 1) < here.minutes;
}

/** Running right now (between start and end) at the event. */
export function isHappeningNow(row: Timed, now: Date = new Date()): boolean {
  const here = nowAtEvent(now);
  if (dayToDate(row.day) !== here.date) return false;
  const { start } = parseTimeRange(row.time);
  if (start == null || start > here.minutes) return false;
  return !isEventPast(row, now);
}

/** Minutes from now until a row starts (negative once started); null when untimed. */
export function minutesUntil(row: Timed, now: Date = new Date()): number | null {
  const date = dayToDate(row.day);
  const { start } = parseTimeRange(row.time);
  if (!date || start == null) return null;
  const here = nowAtEvent(now);
  const dayDiff = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${here.date}T00:00:00Z`)) / 864e5,
  );
  return dayDiff * 24 * 60 + start - here.minutes;
}

/** Catalyst's countdown: "in 25 min", "in 2 h 10 min", "in 3 days". */
export function countdown(minutes: number): string {
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `in ${h} h ${m} min` : `in ${h} h`;
  const d = Math.round(h / 24);
  return `in ${d} ${d === 1 ? "day" : "days"}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Day heading: "Tuesday, December 1"; "Throughout" stays as written. */
export function formatDayHeading(day: string): string {
  const date = dayToDate(day);
  if (!date) return day;
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "6:42 PM", "Yesterday 4:15 PM" or "Nov 6 4:15 PM" in Palm Beach time. */
export function formatChangeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ }).format(x);
  if (day(d) === day(now)) return clock;
  if (day(d) === day(new Date(now.getTime() - 864e5))) return `Yesterday ${clock}`;
  const md = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TZ,
    month: "short",
    day: "numeric",
  }).format(d);
  return `${md} ${clock}`;
}
