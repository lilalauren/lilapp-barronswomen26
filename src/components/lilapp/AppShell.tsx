import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Camera, Info, Star, Users } from "lucide-react";

import { OfflineBanner } from "./OfflineBanner";
import { UpdatesBell } from "./UpdatesBell";

// One tab per Airtable table, named as in Airtable. (Open Questions never appears.)
const tabs = [
  { to: "/", label: "Schedule", icon: CalendarDays },
  { to: "/group-photos", label: "Group Photos", icon: Camera },
  { to: "/sponsors", label: "Sponsors", icon: Star },
  { to: "/team", label: "Team", icon: Users },
  { to: "/event-info", label: "Event Info", icon: Info },
] as const;

const TITLES: Record<string, string> = {
  "/": "Schedule",
  "/group-photos": "Group Photos",
  "/sponsors": "Sponsors",
  "/team": "Team",
  "/event-info": "Event Info",
};

export const roundButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-[var(--card-shadow)] outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Print and name-picking pages render without the app chrome.
  if (pathname.startsWith("/print") || pathname.startsWith("/pick-name")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">
              LILApp · Barron's Women 2026
            </p>
            <h1 className="mt-0.5 truncate font-serif text-[1.65rem] leading-tight tracking-[0.06em] text-foreground uppercase">
              {TITLES[pathname] ?? "LILApp"}
            </h1>
          </div>
          <UpdatesBell />
        </div>
        <OfflineBanner />
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-8">{children}</main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 mx-auto max-w-2xl touch-manipulation rounded-full bg-sage p-1.5 shadow-[0_6px_18px_rgb(26_33_24/0.22)]"
      >
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              preload="render"
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-center text-[9.5px] leading-tight font-semibold tracking-[0.04em] text-foreground/75 uppercase select-none"
              activeOptions={{ exact: to === "/", includeSearch: false }}
              activeProps={{ className: "bg-white/60 text-foreground" }}
            >
              <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
