import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Turn bare links in Airtable text into tappable links. */
export function Linkify({ text }: { text: string }) {
  // split() with a capture group puts the matched links at the odd indexes.
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2"
          >
            {part.replace(/^https?:\/\//, "").split(/[/?]/)[0]}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** Airtable long text as clean lines: one per row, bullets stripped. */
export function noteLines(notes: string): string[] {
  return notes
    .split(/\r?\n/)
    .map((l) =>
      l
        .trim()
        .replace(/^[-–—•*·]+\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

/** Multi-line Airtable notes as a tidy list (each line its own row). */
export function NotesList({ notes, className }: { notes: string; className?: string }) {
  const lines = noteLines(notes);
  if (lines.length === 0) return null;
  if (lines.length === 1) {
    return (
      <p className={cn("ui-body text-foreground/85", className)}>
        <Linkify text={lines[0]!} />
      </p>
    );
  }
  return (
    <ul className={cn("space-y-1.5", className)}>
      {lines.map((line, i) => (
        <li key={i} className="ui-body flex gap-2 text-foreground/85">
          <span aria-hidden="true" className="mt-[0.6em] size-1 shrink-0 rounded-full bg-subtle" />
          <span className="min-w-0">
            <Linkify text={line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Label value" on one line; hidden when empty. */
export function Field({
  label,
  value,
  strong,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  if (!value) return null;
  return (
    <p className="ui-body text-muted-foreground">
      <span className="label-caps mr-1.5 align-[0.08em]">{label}</span>
      <span className={cn("text-foreground", strong && "font-semibold")}>{value}</span>
    </p>
  );
}

/** A labelled block of notes; hidden when empty. */
export function Block({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <section>
      <h4 className="label-caps mb-1 font-bold text-foreground">{label}</h4>
      <NotesList notes={text} />
    </section>
  );
}

export function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full appearance-none truncate rounded-[13px] bg-card py-2 pr-9 pl-4 text-sm font-semibold tracking-[0.04em] text-foreground uppercase shadow-[var(--card-shadow)] focus:outline-2 focus:outline-primary"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
      />
    </label>
  );
}

/** Text exactly as typed in Airtable, line breaks kept (Run of Show, Speakers, Notes). */
export function Lines({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn("ui-body whitespace-pre-line text-foreground/90", className)}>
      <Linkify text={text} />
    </p>
  );
}

/** A bold heading over text that keeps its line breaks; hidden when empty. */
export function LinesBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <section>
      <h4 className="label-caps mb-1 font-bold text-foreground">{label}</h4>
      <Lines text={text} />
    </section>
  );
}

/** Small uppercase heading above a list, left-aligned. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="ui-page-title mb-3">{children}</h2>;
}

export function Quiet({ children }: { children: ReactNode }) {
  return <p className="ui-body py-6 text-center text-muted-foreground">{children}</p>;
}
