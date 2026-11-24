// Server-only Airtable REST client. Never import from client code.
// Reads env at call time (Netlify injects it per request). The token never ships to phones.

const API = "https://api.airtable.com/v0";

// LILApp_2026BarronsWomen. Overridable so a copy of the base can be pointed at.
const DEFAULT_BASE_ID = "applOVak1FCQ4oAAU";

// Table IDs (stable, safe from renames). Field names below are Lauren's own.
// "Open Questions" is deliberately NOT here: it's Lauren's internal list and never
// reaches the app, and neither does the Schedule's "Open Question" column.
export const TABLES = {
  SCHEDULE: "tblgHssfjQDA3jjFx",
  GROUP_PHOTOS: "tblqAfcEIOYt20tEo",
  SPONSORS: "tblg0rB99ieFELcWc",
  TEAM: "tblNBP43DeFLfmKEr",
  EVENT_INFO: "tblQ0LMxcM0g1VdnC",
} as const;

export type TableKey = keyof typeof TABLES;

type AirtableRecord = { id: string; createdTime: string; fields: Record<string, unknown> };
type AirtableList = { records: AirtableRecord[]; offset?: string };

function token(): string {
  const pat = process.env.AIRTABLE_TOKEN;
  if (!pat) throw new Error("AIRTABLE_TOKEN missing");
  return pat;
}

async function listAll(table: string): Promise<AirtableRecord[]> {
  const pat = token();
  const baseId = process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
  const out: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (offset) qs.set("offset", offset);
    // Cache-buster so the app always sees the latest Airtable state within one poll.
    qs.set("_ts", String(Date.now()));
    const res = await fetch(`${API}/${baseId}/${table}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${pat}`, "Cache-Control": "no-cache" },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AirtableList;
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

// ---- Field mappers ----

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && "name" in (v as Record<string, unknown>)) {
    return String((v as { name: unknown }).name ?? "").trim();
  }
  return String(v).trim();
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(str(v));
  return Number.isFinite(n) && str(v) !== "" ? n : null;
}

/** Multi-line text exactly as typed (line breaks kept), only trimmed at the ends. */
function text(v: unknown): string {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : str(v);
}

// ---- DTOs (only fields the app shows) ----

export type ScheduleRow = {
  id: string;
  func: string;
  sort: number | null;
  day: string; // "Throughout" | "Tue Dec 1" | …
  time: string;
  coverageWindow: string;
  location: string;
  type: string;
  priority: string;
  rushSocial: boolean;
  rushKeyShots: string;
  rushDelivery: string;
  keyShotsBy: string;
  photographers: string[];
  photographerConfirmed: boolean;
  sessionTitle: string;
  speakers: string;
  sponsor: string;
  separateGallery: string;
  runOfShow: string;
  shotList: string;
  quantity: string;
  notes: string;
  lastModified: string;
};

export type GroupPhotoRow = {
  id: string;
  firm: string;
  order: number | null;
  time: string;
  attendees: number | null;
  location: string;
  firmContact: string;
  firmDinnerAfter: string;
  status: string;
  photographers: string[];
  notes: string;
  lastModified: string;
};

export type SponsorRow = {
  id: string;
  sponsor: string;
  tier: string;
  separateGallery: string;
  turnaround: string;
  coverage: string;
  teamPhoto: string;
  notes: string;
};

export type TeamRow = {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

export type EventInfoRow = { id: string; topic: string; sort: number | null; details: string };

export type TripData = {
  schedule: ScheduleRow[];
  groupPhotos: GroupPhotoRow[];
  sponsors: SponsorRow[];
  team: TeamRow[];
  eventInfo: EventInfoRow[];
  /** Which tables actually loaded this time. A table that failed comes back empty. */
  loaded: Record<TableKey, boolean>;
};

/** Each table loads independently: one failing table must not take down the rest. */
async function listSafe(key: TableKey): Promise<{ key: TableKey; rows: AirtableRecord[] | null }> {
  try {
    return { key, rows: await listAll(TABLES[key]) };
  } catch (error) {
    console.error(`Airtable table ${key} failed to load; continuing without it.`, error);
    return { key, rows: null };
  }
}

export async function fetchTrip(): Promise<TripData> {
  const results = await Promise.all((Object.keys(TABLES) as TableKey[]).map(listSafe));
  return tripFromRecords(Object.fromEntries(results.map((r) => [r.key, r.rows])));
}

const bySort = <T extends { sort?: number | null; order?: number | null }>(a: T, b: T) =>
  (a.sort ?? a.order ?? 9999) - (b.sort ?? b.order ?? 9999);

/** Map raw Airtable records (null = table failed to load) into the app's shapes. */
export function tripFromRecords(raw: Partial<Record<TableKey, AirtableRecord[] | null>>): TripData {
  const keys = Object.keys(TABLES) as TableKey[];
  const rows = Object.fromEntries(keys.map((k) => [k, raw[k] ?? []])) as Record<
    TableKey,
    AirtableRecord[]
  >;
  const loaded = Object.fromEntries(keys.map((k) => [k, Array.isArray(raw[k])])) as Record<
    TableKey,
    boolean
  >;

  return {
    loaded,
    schedule: rows.SCHEDULE.map(({ id, fields: f }) => ({
      id,
      func: str(f["Function"]),
      sort: num(f["Sort"]),
      day: str(f["Day"]),
      time: str(f["Time"]),
      coverageWindow: str(f["Coverage Window"]),
      location: str(f["Location"]),
      type: str(f["Type"]),
      priority: str(f["Priority"]),
      rushSocial: f["RUSH SOCIAL"] === true,
      rushKeyShots: text(f["Rush Social Key Shots"]),
      rushDelivery: str(f["Rush Delivery"]),
      keyShotsBy: str(f["Key Shots By"]),
      photographers: list(f["Photographer"]),
      photographerConfirmed: f["Photographer Confirmed"] === true,
      sessionTitle: str(f["Session Title"]),
      speakers: text(f["Speakers"]),
      sponsor: str(f["Sponsor"]),
      separateGallery: str(f["Separate Gallery"]),
      runOfShow: text(f["Run of Show"]),
      shotList: text(f["Shot List"]),
      quantity: str(f["Quantity"]),
      notes: text(f["Notes"]),
      lastModified: str(f["Last modified"]),
    }))
      .filter((r) => r.func)
      .sort(bySort),
    groupPhotos: rows.GROUP_PHOTOS.map(({ id, fields: f }) => ({
      id,
      firm: str(f["Firm"]),
      order: num(f["Order"]),
      time: str(f["Time"]),
      attendees: num(f["Attendees"]),
      location: str(f["Location"]),
      firmContact: str(f["Firm Contact"]),
      firmDinnerAfter: str(f["Firm Dinner After"]),
      status: str(f["Status"]),
      photographers: list(f["Photographer"]),
      notes: text(f["Notes"]),
      lastModified: str(f["Last modified"]),
    }))
      .filter((r) => r.firm)
      .sort(bySort),
    sponsors: rows.SPONSORS.map(({ id, fields: f }) => ({
      id,
      sponsor: str(f["Sponsor"]),
      tier: str(f["Tier"]),
      separateGallery: str(f["Separate Gallery"]),
      turnaround: str(f["Turnaround"]),
      coverage: text(f["Coverage"]),
      teamPhoto: str(f["Team Photo"]),
      notes: text(f["Notes"]),
    })).filter((r) => r.sponsor),
    team: rows.TEAM.map(({ id, fields: f }) => ({
      id,
      name: str(f["Name"]),
      company: str(f["Company"]),
      role: str(f["Role"]),
      email: str(f["Email"]),
      phone: str(f["Phone"]),
      notes: text(f["Notes"]),
    })).filter((r) => r.name),
    eventInfo: rows.EVENT_INFO.map(({ id, fields: f }) => ({
      id,
      topic: str(f["Topic"]),
      sort: num(f["Sort"]),
      details: text(f["Details"]),
    }))
      .filter((r) => r.topic || r.details)
      .sort(bySort),
  };
}
