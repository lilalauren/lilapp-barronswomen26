import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { RefCard } from "@/components/lilapp/reference";
import { Field, LinesBlock, Quiet } from "@/components/lilapp/ui";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/sponsors")({
  head: () => ({ meta: [{ title: "Sponsors — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: SponsorsPage,
});

function SponsorsPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  if (data.sponsors.length === 0) {
    return <Quiet>{data.loaded.SPONSORS ? "No sponsors yet." : "Sponsors not loaded yet."}</Quiet>;
  }
  return (
    <div className="space-y-3">
      {data.sponsors.map((s) => (
        <RefCard
          key={s.id}
          title={s.sponsor}
          label={s.tier}
          lines={[
            s.turnaround ? `Turnaround: ${s.turnaround}` : "",
            s.separateGallery ? `Separate Gallery: ${s.separateGallery}` : "",
          ]}
        >
          {s.coverage || s.teamPhoto || s.notes ? (
            <>
              <section className="space-y-0.5">
                <Field label="Tier" value={s.tier} />
                <Field label="Separate Gallery" value={s.separateGallery} />
                <Field label="Turnaround" value={s.turnaround} />
                <Field label="Team Photo" value={s.teamPhoto} />
              </section>
              <LinesBlock label="Coverage" text={s.coverage} />
              <LinesBlock label="Notes" text={s.notes} />
            </>
          ) : null}
        </RefCard>
      ))}
    </div>
  );
}
