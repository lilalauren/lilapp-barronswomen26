import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Lines, Quiet } from "@/components/lilapp/ui";
import type { TeamRow } from "@/lib/airtable.server";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: TeamPage,
});

// Lauren's Company choices, in her order.
const COMPANIES = ["LILA PHOTO", "Barron's", "The Breakers"];

function TeamPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  if (data.team.length === 0) {
    return <Quiet>{data.loaded.TEAM ? "No team yet." : "Team not loaded yet."}</Quiet>;
  }
  const companies = [
    ...COMPANIES.filter((c) => data.team.some((t) => t.company === c)),
    ...Array.from(new Set(data.team.map((t) => t.company))).filter((c) => !COMPANIES.includes(c)),
  ];
  return (
    <>
      {companies.map((c) => (
        <section key={c || "other"} className="mb-6">
          <h2 className="ui-label mb-1 text-left">{c || "Team"}</h2>
          <ul className="divide-y divide-border">
            {data.team
              .filter((t) => t.company === c)
              .map((t) => (
                <Person key={t.id} person={t} />
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Plain rows, no boxes: name, role, then tap-to-call and tap-to-email. */
function Person({ person: t }: { person: TeamRow }) {
  return (
    <li className="py-3">
      <p className="text-[16px] font-semibold text-foreground">{t.name}</p>
      {t.role ? <p className="ui-body text-muted-foreground">{t.role}</p> : null}
      <div className="flex flex-wrap gap-x-4">
        {t.phone ? (
          <a
            href={`tel:${t.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex min-h-10 items-center text-sm font-semibold text-primary"
          >
            {t.phone}
          </a>
        ) : null}
        {t.email ? (
          <a
            href={`mailto:${t.email}`}
            className="inline-flex min-h-10 items-center text-sm font-semibold break-all text-primary"
          >
            {t.email}
          </a>
        ) : null}
      </div>
      <Lines text={t.notes} className="text-muted-foreground" />
    </li>
  );
}
