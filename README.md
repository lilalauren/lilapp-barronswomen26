# Barrons Women 2026 - LILApp

Crew app for LILA PHOTO at Barron's Advisor Women 2026, The Breakers, Palm Beach (Dec 1–4, 2026).
Built from the Four Seasons Venice LILApp (lilalauren/lilapp-fsvenice). Read-only: Airtable is the
single source of truth.

## Data

Airtable base **LILApp_2026BarronsWomen** (`applOVak1FCQ4oAAU`). Tables shown in the app:
Schedule (sorted by "Sort"), Group Photos (sorted by "Order"; the Order 0 room setup row comes
first), Sponsors, Team, Event Info (sorted by "Sort").

**Open Questions is never read**, and neither is the Schedule's "Open Question" column.

For the updates bell, add a "Last modified time" field named **Last modified** to Schedule and
Group Photos.

## Environment (Netlify)

| Variable           | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| `AIRTABLE_TOKEN`   | The existing "LILApp" Airtable token (data.records:read) |
| `AIRTABLE_BASE_ID` | Optional; defaults to `applOVak1FCQ4oAAU`                |

The token is read on the server only; it never reaches phones and is never in the code.

## Develop

```bash
bun install
bun run dev
bun run test
bun run build
```
