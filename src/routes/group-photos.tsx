import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Photographers } from "@/components/lilapp/cards";
import { RefCard } from "@/components/lilapp/reference";
import { Field, LinesBlock, Quiet } from "@/components/lilapp/ui";
import type { GroupPhotoRow } from "@/lib/airtable.server";
import { TIME_LABEL } from "@/lib/time";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/group-photos")({
  head: () => ({ meta: [{ title: "Group Photos — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: GroupPhotosPage,
});

/** Sorted by "Order": the ROOM SETUP row (Order 0) comes first as the setup card. */
function GroupPhotosPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  if (data.groupPhotos.length === 0) {
    return (
      <Quiet>
        {data.loaded.GROUP_PHOTOS ? "No group photos yet." : "Group Photos not loaded yet."}
      </Quiet>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{TIME_LABEL}</p>
      <div className="space-y-3">
        {data.groupPhotos.map((g) => (
          <GroupCard key={g.id} group={g} setup={g.order === 0} />
        ))}
      </div>
    </>
  );
}

function GroupCard({ group: g, setup }: { group: GroupPhotoRow; setup: boolean }) {
  const hasMore = Boolean(g.notes || g.firmContact || g.firmDinnerAfter);
  return (
    <RefCard
      eyebrow={g.time}
      title={g.firm}
      label={setup ? "Setup" : g.status}
      accent={setup}
      dim={g.status === "Dropped"}
      lines={[
        [g.attendees != null ? `${g.attendees} attendees` : "", g.location]
          .filter(Boolean)
          .join(" · "),
        g.photographers.length ? (
          <Photographers names={g.photographers} className="mt-1.5" />
        ) : null,
      ]}
    >
      {hasMore ? (
        <>
          <section className="space-y-0.5">
            <Field label="Time" value={g.time} />
            <Field label="Location" value={g.location} />
            <Field label="Attendees" value={g.attendees != null ? String(g.attendees) : ""} />
            <Field label="Status" value={g.status} />
            <Field label="Firm Dinner After" value={g.firmDinnerAfter} />
            {g.firmContact ? (
              <p className="ui-body text-muted-foreground">
                <span className="label-caps mr-1.5">Firm Contact</span>
                <a href={`mailto:${g.firmContact}`} className="text-primary underline">
                  {g.firmContact}
                </a>
              </p>
            ) : null}
          </section>
          <LinesBlock label="Notes" text={g.notes} />
        </>
      ) : null}
    </RefCard>
  );
}
