import { useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { DetailSheet } from "./cards";

/**
 * A plain reference card (Group Photos, Sponsors): a few lines on the card, the rest in
 * the same bottom sheet the Schedule uses. Cards with nothing more to show don't open.
 */
export function RefCard({
  eyebrow,
  title,
  lines,
  label,
  dim,
  accent,
  children,
}: {
  eyebrow?: string;
  title: string;
  lines?: ReactNode[];
  label?: string;
  dim?: boolean;
  /** Sage left edge, e.g. the Group Photos room setup card. */
  accent?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasMore = Boolean(children);
  const face = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[14px] leading-snug font-semibold text-foreground">{eyebrow}</p>
          ) : null}
          <h3
            className={cn(
              "text-[17px] leading-snug font-semibold text-foreground",
              eyebrow && "mt-1",
            )}
          >
            {title}
          </h3>
        </div>
        {label ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] whitespace-nowrap text-primary uppercase">
            {label}
          </span>
        ) : null}
      </div>
      {lines?.filter(Boolean).map((l, i) => (
        <div key={i} className="mt-0.5 text-[15px] leading-snug text-muted-foreground">
          {l}
        </div>
      ))}
    </>
  );
  return (
    <article className={cn("card", accent && "border-l-4 border-l-sage-line", dim && "opacity-55")}>
      {hasMore ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="block w-full p-4 pb-2 text-left"
          >
            {face}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Open details for ${title}`}
            className="flex min-h-10 w-full items-center justify-center gap-1 pb-2 text-[13px] font-semibold text-primary"
          >
            Details
            <ChevronUp aria-hidden className="size-4" strokeWidth={2.5} />
          </button>
          <DetailSheet open={open} onClose={() => setOpen(false)} title={title}>
            {children}
          </DetailSheet>
        </>
      ) : (
        <div className="p-4">{face}</div>
      )}
    </article>
  );
}
