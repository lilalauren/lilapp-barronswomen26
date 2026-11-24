import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { tripQueryOptions } from "@/lib/trip";
import { useDisplayName } from "@/lib/use-display-name";
import { TEAM } from "@/lib/schedule";

// LILA's crew, with each role from the Team table when it's there.

export const Route = createFileRoute("/pick-name")({
  head: () => ({ meta: [{ title: "Choose your name — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: PickName,
});

function PickName() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  const [current, setName] = useDisplayName();
  const nav = useNavigate();
  const LILA_TEAM = TEAM.map((name) => ({
    name,
    role: data.team.find((t) => t.name.split(" ")[0]?.toLowerCase() === name.toLowerCase())?.role,
  }));

  return (
    <div className="min-h-screen bg-background px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-10">
      <div className="mx-auto max-w-md">
        <div
          className="text-center font-serif text-[15px] leading-none font-semibold text-foreground uppercase"
          style={{ letterSpacing: "0.22em" }}
        >
          LILAPP
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Barron's Advisor Women 2026
        </p>
        <h1 className="mt-8 text-center text-2xl font-semibold text-foreground">Who's this?</h1>
        <p className="ui-body mt-1 text-center text-muted-foreground">
          Pick your name so LILApp knows whose schedule to show.
        </p>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {LILA_TEAM.map((t) => (
            <li key={t.name}>
              <button
                type="button"
                onClick={() => {
                  setName(t.name);
                  nav({ to: "/", search: { view: "mine" } });
                }}
                className="flex min-h-14 w-full items-center justify-between px-1 py-3 text-left hover:bg-accent"
              >
                <span>
                  <span className="block font-medium text-foreground">{t.name}</span>
                  {t.role ? (
                    <span className="ui-body block text-muted-foreground">{t.role}</span>
                  ) : null}
                </span>
                {current === t.name ? <span className="label-caps">You</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => nav({ to: "/" })}
          className="mt-6 flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground"
        >
          Back to schedule
        </button>
      </div>
    </div>
  );
}
