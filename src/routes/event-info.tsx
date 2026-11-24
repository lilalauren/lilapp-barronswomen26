import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Lines, Quiet } from "@/components/lilapp/ui";
import { tripQueryOptions } from "@/lib/trip";

export const Route = createFileRoute("/event-info")({
  head: () => ({ meta: [{ title: "Event Info — Barrons Women 2026 - LILApp" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripQueryOptions),
  component: EventInfoPage,
});

/** Event Info rows in "Sort" order: the Topic as a heading, Details exactly as typed. */
function EventInfoPage() {
  const { data } = useSuspenseQuery(tripQueryOptions);
  if (data.eventInfo.length === 0) {
    return (
      <Quiet>{data.loaded.EVENT_INFO ? "Nothing here yet." : "Event Info not loaded yet."}</Quiet>
    );
  }
  return (
    <div className="divide-y divide-border">
      {data.eventInfo.map((e) => (
        <section key={e.id} className="py-4 first:pt-1">
          <h2 className="ui-label mb-1.5 text-left font-bold text-foreground">{e.topic}</h2>
          <Lines text={e.details} />
        </section>
      ))}
    </div>
  );
}
