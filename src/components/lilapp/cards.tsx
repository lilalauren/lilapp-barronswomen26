import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Check, ChevronRight, ChevronUp, X } from "lucide-react";

import type { ScheduleRow } from "@/lib/airtable.server";
import { isNoCoverage } from "@/lib/schedule";
import { gotShots, toggleShot } from "@/lib/shots";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Field, Lines, LinesBlock } from "./ui";

/** Photographer names: bold caps; "TBD" stays as written. */
export function Photographers({ names, className }: { names: string[]; className?: string }) {
  if (names.length === 0) return null;
  return (
    <p className={cn("text-[13px] font-bold tracking-[0.08em] text-primary uppercase", className)}>
      {names.join(" · ")}
    </p>
  );
}

/** Priority as a small quiet label, using Lauren's Airtable values word for word. */
export function PriorityLabel({ priority }: { priority: string }) {
  if (!priority) return null;
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] whitespace-nowrap text-primary uppercase">
      {priority}
    </span>
  );
}

/** The one loud thing on the screen: RUSH SOCIAL, its deadline and who takes the key shots. */
export function RushSocial({ row, className }: { row: ScheduleRow; className?: string }) {
  if (!row.rushSocial) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className="rounded-full bg-rush px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em] text-white uppercase">
        Rush Social
      </span>
      {row.rushDelivery ? (
        <span className="text-[13px] font-semibold text-rush">Deliver {row.rushDelivery}</span>
      ) : null}
      {row.keyShotsBy ? (
        <span className="text-[13px] text-foreground/80">
          Key Shots By <strong className="font-semibold">{row.keyShotsBy}</strong>
        </span>
      ) : null}
    </div>
  );
}

/** One-line version of a finished card: chevron, time, function. */
function PastLine({
  time,
  title,
  onOpen,
  cardRef,
}: {
  time: string;
  title: string;
  onOpen: () => void;
  cardRef?: Ref<HTMLElement>;
}) {
  return (
    <article ref={cardRef} className="card scroll-mt-44 opacity-60">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded="false"
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left"
      >
        <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
        <span className="ui-body shrink-0 font-semibold text-foreground">{time}</span>
        <span className="ui-body min-w-0 flex-1 truncate text-foreground">{title}</span>
      </button>
    </article>
  );
}

/** Past cards start folded and fold again when they become past. */
function usePastToggle(past: boolean) {
  const [open, setOpen] = useState(!past);
  useEffect(() => setOpen(!past), [past]);
  return [open, setOpen] as const;
}

/**
 * A Schedule card. Closed it shows only Time, Function, Location, Photographer and the
 * Rush Social marker; tapping opens the details sheet. "No Coverage" rows are dimmed.
 */
export function ScheduleCard({
  row,
  past,
  autoOpen,
  cardRef,
}: {
  row: ScheduleRow;
  past: boolean;
  /** Sabbatical's "Happening Now": open the details by themselves (once per function). */
  autoOpen?: boolean;
  cardRef?: Ref<HTMLElement>;
}) {
  const [shown, setShown] = usePastToggle(past);
  const [open, setOpen] = useState(false);
  const dismissed = useRef(false);
  useEffect(() => {
    if (autoOpen && !dismissed.current) setOpen(true);
  }, [autoOpen, row.id]);
  const noCoverage = isNoCoverage(row);
  // The red marker already says it; don't repeat "Rush Social" as a label.
  const label = row.rushSocial && row.priority === "Rush Social" ? "" : row.priority;

  if (past && !shown) {
    return (
      <PastLine cardRef={cardRef} time={row.time} title={row.func} onOpen={() => setShown(true)} />
    );
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        "card scroll-mt-44",
        row.rushSocial && "border-l-4 border-l-rush",
        (past || noCoverage) && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="block w-full p-4 pb-2 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] leading-snug font-semibold text-foreground tabular-nums">
            {row.time || "Time TBD"}
          </p>
          {label ? <PriorityLabel priority={label} /> : null}
        </div>
        <h3 className="mt-1.5 text-[17px] leading-snug font-semibold text-foreground">
          {row.func}
        </h3>
        {row.location ? (
          <p className="mt-0.5 text-[15px] leading-snug text-muted-foreground">{row.location}</p>
        ) : null}
        <Photographers names={row.photographers} className="mt-2" />
        <RushSocial row={row} className="mt-2.5" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Open details for ${row.func}`}
        className="flex min-h-10 w-full items-center justify-center gap-1 pb-2 text-[13px] font-semibold text-primary"
      >
        Details
        <ChevronUp aria-hidden className="size-4" strokeWidth={2.5} />
      </button>
      <ScheduleSheet
        open={open}
        onClose={() => {
          dismissed.current = true;
          setOpen(false);
        }}
        row={row}
      />
    </article>
  );
}

/** M Financial's bottom sheet. Rush Social Key Shots come first, then everything else. */
function ScheduleSheet({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: ScheduleRow;
}) {
  const named = row.photographers.filter((n) => n.toUpperCase() !== "TBD");
  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title={row.func}
      header={
        <>
          {row.location ? (
            <p className="mt-1 text-[15px] leading-snug text-muted-foreground">{row.location}</p>
          ) : null}
          <p className="mt-3 text-[15px] font-semibold text-foreground">{row.time}</p>
          <Photographers names={row.photographers} className="mt-1.5" />
          {named.length && !row.photographerConfirmed ? (
            <p className="mt-0.5 text-[12px] text-subtle">Photographer not yet confirmed</p>
          ) : null}
          <RushSocial row={row} className="mt-2.5" />
        </>
      }
    >
      {row.rushSocial && row.rushKeyShots ? (
        <section className="rounded-[13px] bg-rush-soft p-3.5">
          <ShotList
            id={`${row.id}:rush`}
            label="Rush Social Key Shots"
            text={row.rushKeyShots}
            tone="rush"
          />
        </section>
      ) : null}
      {row.coverageWindow || row.priority || row.type ? (
        <section className="space-y-0.5">
          <Field label="Coverage Window" value={row.coverageWindow} />
          <Field label="Priority" value={row.priority} />
          <Field label="Type" value={row.type} />
        </section>
      ) : null}
      {row.sessionTitle || row.sponsor || row.separateGallery || row.quantity ? (
        <section className="space-y-0.5">
          <Field label="Session Title" value={row.sessionTitle} />
          <Field label="Sponsor" value={row.sponsor} />
          <Field label="Separate Gallery" value={row.separateGallery} />
          <Field label="Quantity" value={row.quantity} />
        </section>
      ) : null}
      <LinesBlock label="Speakers" text={row.speakers} />
      <LinesBlock label="Run of Show" text={row.runOfShow} />
      {row.shotList ? <ShotList id={row.id} label="Shot List" text={row.shotList} /> : null}
      <LinesBlock label="Notes" text={row.notes} />
    </DetailSheet>
  );
}

/** Bottom sheet shell shared by every tab: fixed header, scrolling body. */
export function DetailSheet({
  open,
  onClose,
  title,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col border-0 bg-background">
        <header className="shrink-0 border-b border-border px-4 pt-2 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[19px] leading-snug font-semibold text-foreground">
                {title}
              </DrawerTitle>
              {header}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-[var(--card-shadow)]"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="space-y-6">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * A shot list kept exactly as typed, line by line, with a tick for each shot (saved on
 * this phone). Headings such as "All breakouts:" and "Qty 3-4:" stay plain text.
 */
function ShotList({
  id,
  label,
  text,
  tone,
}: {
  id: string;
  label: string;
  text: string;
  tone?: "rush";
}) {
  const lines = text.split("\n");
  const [got, setGot] = useState<string[]>([]);
  useEffect(() => setGot(gotShots(id)), [id]);
  const shots = lines.map((l) => l.trim()).filter((l) => l && !l.endsWith(":"));
  const done = shots.filter((l) => got.includes(l)).length;
  return (
    <section>
      <h4
        className={cn(
          "label-caps mb-1.5 flex justify-between font-bold",
          tone === "rush" ? "text-rush" : "text-foreground",
        )}
      >
        <span>{label}</span>
        {shots.length ? (
          <span className="font-semibold text-subtle">
            {done} of {shots.length}
          </span>
        ) : null}
      </h4>
      <ul>
        {lines.map((raw, i) => {
          const line = raw.trim();
          if (!line) return <li key={i} aria-hidden className="h-2" />;
          if (line.endsWith(":")) {
            return (
              <li key={i}>
                <Lines text={line} className="pt-1 font-semibold" />
              </li>
            );
          }
          const checked = got.includes(line);
          return (
            <li key={i}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => setGot(toggleShot(id, line))}
                className="flex min-h-10 w-full items-start gap-3 py-1.5 text-left"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-sage-line",
                  )}
                >
                  {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    "ui-body min-w-0",
                    checked ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {line.replace(/^[-–—•*·]\s*/, "")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Panattoni's collapsible section: title, count and chevron; starts closed. */
export function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-2 text-left"
      >
        <span className="ui-label min-w-0 flex-1">{title}</span>
        {count !== undefined ? <span className="ui-label">{count}</span> : null}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-5 text-primary transition-transform",
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>
      {open ? <div className="space-y-3 pb-4">{children}</div> : null}
    </section>
  );
}
