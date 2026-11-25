import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { ScheduleCard } from "@/components/lilapp/cards";
import { Quiet, SelectBox } from "@/components/lilapp/ui";
import type { ScheduleRow, TripData } from "@/lib/airtable.server";
import { DAYS, filterRows, groupByDay, isEventPast, nowAndNext, TEAM } from "@/lib/schedule";
import { countdown, dayLabel, formatDayHeading, TIME_LABEL } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";
import { useDisplayName } from "@/lib/use-display-name";

type ScheduleSearch = { day?: string; who?: string; view?: "mine" | "full" };

const pick = (search: Record<string, unknown>, key: string) =>
  typeof search[key] === "string" && search[key] ? (search[key] as string) : undefined;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => ({
    day: pick(search, "day"),
    who: pick(search, "who"),
    view: search.view === "mine" || search.view === "full" ? search.view : undefined,
  }),
  head: () => ({ meta: [{ title: "Schedule — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: SchedulePage,
});

/** Re-render every 30 s so Now / Next and the countdown stay current. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function SchedulePage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const setSearch = (next: ScheduleSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  // Like Sabbatical: once you've picked your name, the app opens on your day.
  const [name] = useDisplayName();
  const view = search.view ?? (name ? "mine" : "full");

  return (
    <>
      <div className="mb-3 grid grid-cols-2 rounded-[13px] bg-secondary p-1 text-sm">
        {(["full", "mine"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSearch({ view: v })}
            aria-pressed={view === v}
            className={
              view === v
                ? "min-h-11 rounded-[10px] bg-sage font-semibold text-foreground"
                : "min-h-11 rounded-[10px] font-medium text-muted-foreground"
            }
          >
            {v === "full" ? "Full Schedule" : "My Schedule"}
          </button>
        ))}
      </div>
      {view === "mine" ? (
        <MySchedule data={data} />
      ) : (
        <FullSchedule
          data={data}
          day={search.day ?? ""}
          who={search.who ?? ""}
          onDay={(d) => setSearch({ day: d || undefined })}
          onWho={(w) => setSearch({ who: w || undefined })}
        />
      )}
    </>
  );
}

/** Catalyst's line at the top: what's on now, or what's next and how long until it. */
function NextUp({ rows, now }: { rows: ScheduleRow[]; now: Date }) {
  const { happening, upNext, minutes } = nowAndNext(rows, now);
  if (!happening && !upNext) return null;
  // A quiet line under the filters, not a box: what's on now and what's next.
  return (
    <div className="mt-1 space-y-0.5 text-[15px] leading-snug text-muted-foreground">
      {happening ? (
        <p>
          Now: <span className="font-semibold text-foreground">{happening.func}</span>
        </p>
      ) : null}
      {upNext && minutes != null ? (
        <p>
          Next: <span className="font-semibold text-foreground">{upNext.func}</span> ·{" "}
          {countdown(minutes)}
        </p>
      ) : null}
    </div>
  );
}

function FullSchedule({
  data,
  day,
  who,
  onDay,
  onWho,
}: {
  data: TripData;
  day: string;
  who: string;
  onDay: (d: string) => void;
  onWho: (w: string) => void;
}) {
  const now = useNow();
  const rows = useMemo(() => filterRows(data.schedule, who, day), [data.schedule, who, day]);
  const grouped = useMemo(() => groupByDay(rows), [rows]);

  // Open on the function happening now, or the next one up.
  const target = useMemo(() => {
    const { happening, upNext } = nowAndNext(rows, now);
    return (happening ?? upNext)?.id ?? null;
  }, [rows, now]);
  const targetRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!target) return;
    const id = window.setTimeout(
      () => targetRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }),
      150,
    );
    return () => window.clearTimeout(id);
  }, [target]);

  return (
    <>
      <div className="flex gap-2">
        <SelectBox label="Team member" value={who} onChange={onWho}>
          <option value="">All Team</option>
          {TEAM.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectBox>
        <SelectBox label="Day" value={day} onChange={onDay}>
          <option value="">All days</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </SelectBox>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{TIME_LABEL}</p>
      <NextUp rows={rows} now={now} />

      {!data.loaded.SCHEDULE && data.schedule.length === 0 ? (
        <Quiet>Schedule not loaded yet.</Quiet>
      ) : grouped.length === 0 ? (
        <Quiet>Nothing scheduled for {who || "this filter"}.</Quiet>
      ) : (
        grouped.map(([d, dayRows]) => (
          <section key={d} className="mt-4">
            <h2 className="ui-day-title mb-2 text-left">{formatDayHeading(d)}</h2>
            <div className="space-y-3">
              {dayRows.map((row) => (
                <ScheduleCard
                  key={row.id}
                  row={row}
                  past={isEventPast(row, now)}
                  cardRef={row.id === target ? targetRef : undefined}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

/** Sabbatical's My Schedule: Happening Now (opens itself) and Up Next with a countdown. */
function MySchedule({ data }: { data: TripData }) {
  const [name, , hydrated] = useDisplayName();
  const now = useNow();
  if (!hydrated) return null;
  if (!name) {
    return (
      <div className="py-8 text-center">
        <p className="ui-body text-muted-foreground">
          Pick your name so LILApp knows whose schedule to show.
        </p>
        <Link
          to="/pick-name"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Pick your name
        </Link>
      </div>
    );
  }
  const mine = filterRows(data.schedule, name, "");
  const { happening, upNext, minutes } = nowAndNext(mine, now);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="ui-page-title text-left">{name}</h2>
        <Link to="/pick-name" className="ui-label shrink-0 text-[11px]">
          Change
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{TIME_LABEL}</p>
      {happening ? (
        <section className="mt-4">
          <h3 className="ui-label mb-2">Happening Now</h3>
          <ScheduleCard row={happening} past={false} autoOpen />
        </section>
      ) : null}
      {upNext ? (
        <section className="mt-4">
          <h3 className="ui-label mb-2">
            Up Next{minutes != null ? ` · ${countdown(minutes)}` : ""}
          </h3>
          <ScheduleCard row={upNext} past={false} />
        </section>
      ) : null}
      {!happening && !upNext ? <Quiet>Nothing else scheduled for you.</Quiet> : null}
      <Link
        to="/"
        search={{ view: "full", who: name }}
        className="mt-6 flex min-h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary"
      >
        See all my functions
      </Link>
    </div>
  );
}
