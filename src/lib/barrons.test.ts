import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { ScheduleRow } from "./airtable.server";
import { tripFromRecords } from "./airtable.server";
import {
  cardTitle,
  filterRows,
  groupByDay,
  isAssigned,
  isNoCoverage,
  nowAndNext,
  sessionTitleOf,
} from "./schedule";
import { countdown, dayToDate, isEventPast, parseTimeRange } from "./time";

const row = (over: Partial<ScheduleRow>): ScheduleRow => ({
  id: "r",
  func: "Function",
  sort: 0,
  day: "Thu Dec 3",
  time: "",
  coverageWindow: "",
  location: "",
  type: "",
  priority: "Standard",
  rushSocial: false,
  rushKeyShots: "",
  rushDelivery: "",
  keyShotsBy: "",
  photographers: [],
  photographerConfirmed: false,
  sessionTitle: "",
  speakers: "",
  sponsor: "",
  separateGallery: "",
  runOfShow: "",
  shotList: "",
  quantity: "",
  notes: "",
  lastModified: "",
  ...over,
});

describe("Palm Beach time", () => {
  it("reads Lauren's Day values as dates", () => {
    assert.equal(dayToDate("Tue Dec 1"), "2026-12-01");
    assert.equal(dayToDate("Fri Dec 4"), "2026-12-04");
    assert.equal(dayToDate("Throughout"), "");
  });

  it("reads free-text Time", () => {
    assert.deepEqual(parseTimeRange("6:15 PM - 9:00 PM"), { start: 18 * 60 + 15, end: 21 * 60 });
    assert.deepEqual(parseTimeRange("4:30 PM"), { start: 16 * 60 + 30, end: null });
    assert.deepEqual(parseTimeRange("1:30 PM (per SOW note on Masterclass)").start, 13 * 60 + 30);
    assert.deepEqual(parseTimeRange("9:25-9:40, 10:30-10:45"), {
      start: 9 * 60 + 25,
      end: 9 * 60 + 40,
    });
    assert.deepEqual(parseTimeRange("PENDING - Ally to confirm time"), { start: null, end: null });
    assert.deepEqual(parseTimeRange("Flexible - duration of summit"), { start: null, end: null });
  });

  it("uses Eastern time for past events", () => {
    const r = row({ day: "Thu Dec 3", time: "9:40 AM - 10:30 AM" });
    // 10:45 AM ET on Dec 3 = 15:45 UTC
    assert.equal(isEventPast(r, new Date("2026-12-03T15:45:00Z")), true);
    assert.equal(isEventPast(r, new Date("2026-12-03T15:00:00Z")), false);
    assert.equal(isEventPast(row({ day: "Throughout" }), new Date("2026-12-10T00:00:00Z")), false);
  });

  it("counts down like Catalyst", () => {
    assert.equal(countdown(25), "in 25 min");
    assert.equal(countdown(130), "in 2 h 10 min");
    assert.equal(countdown(60 * 24 * 3), "in 3 days");
  });
});

describe("team filter", () => {
  it("uses Photographer, plus Rush Social key shots for whoever takes them", () => {
    const rush = row({ photographers: ["Gabrielle"], rushSocial: true, keyShotsBy: "Rich" });
    assert.equal(isAssigned(rush, "Rich"), true);
    assert.equal(isAssigned(rush, "Gabrielle"), true);
    assert.equal(isAssigned(rush, "Heather"), false);
  });

  it("shows TBD rows only under All Team", () => {
    const tbd = row({ photographers: ["TBD"] });
    assert.deepEqual(filterRows([tbd], "", "").length, 1);
    assert.deepEqual(filterRows([tbd], "Rich", "").length, 0);
  });

  it("filters by day", () => {
    const rows = [row({ id: "a", day: "Throughout" }), row({ id: "b", day: "Wed Dec 2" })];
    assert.deepEqual(
      filterRows(rows, "", "Wed Dec 2").map((r) => r.id),
      ["b"],
    );
  });

  it("groups days in Lauren's order with Throughout first", () => {
    const rows = [
      row({ id: "w", day: "Wed Dec 2" }),
      row({ id: "t", day: "Throughout" }),
      row({ id: "u", day: "Tue Dec 1" }),
    ];
    assert.deepEqual(
      groupByDay(rows).map(([d]) => d),
      ["Throughout", "Tue Dec 1", "Wed Dec 2"],
    );
  });
});

describe("now and next", () => {
  it("skips No Coverage and finds the next function", () => {
    const rows = [
      row({ id: "breakfast", priority: "No Coverage", time: "6:45 AM - 7:45 AM" }),
      row({ id: "gs", time: "7:45 AM - 8:05 AM" }),
    ];
    assert.equal(isNoCoverage(rows[0]!), true);
    // 6:50 AM ET on Dec 3
    const { happening, upNext, minutes } = nowAndNext(rows, new Date("2026-12-03T11:50:00Z"));
    assert.equal(happening, null);
    assert.equal(upNext?.id, "gs");
    assert.equal(minutes, 55);
  });
});

describe("Airtable mapping", () => {
  it("sorts by Sort, keeps line breaks and never reads Open Question", () => {
    const trip = tripFromRecords({
      SCHEDULE: [
        {
          id: "b",
          createdTime: "",
          fields: {
            Function: "B",
            Sort: 20,
            "Run of Show": "6:15 Arrive\n6:30 Toast",
            "Open Question": "secret",
          },
        },
        {
          id: "a",
          createdTime: "",
          fields: { Function: "A", Sort: 10, "RUSH SOCIAL": true, Photographer: ["Rich"] },
        },
      ],
    });
    assert.deepEqual(
      trip.schedule.map((r) => r.id),
      ["a", "b"],
    );
    assert.equal(trip.schedule[1]!.runOfShow, "6:15 Arrive\n6:30 Toast");
    assert.equal(JSON.stringify(trip).includes("secret"), false);
    assert.equal(trip.schedule[0]!.rushSocial, true);
  });
});

describe("card titles", () => {
  it("doesn't repeat the room that's printed under the title", () => {
    const t = (func: string, location: string) => cardTitle(row({ func, location }));
    assert.equal(t("Breakout 1 - Ponce 3", "Ponce 3"), "Breakout 1");
    assert.equal(t("Breakout 2 - Ponce 3 (Invesco QQQ)", "Ponce 3"), "Breakout 2 (Invesco QQQ)");
    assert.equal(
      t("Breakout 4 - Ponce 6 Forum (repeat)", "Ponce 6"),
      "Breakout 4 - Forum (repeat)",
    );
    assert.equal(t("Breakout 1 - The Circle", "The Circle"), "Breakout 1");
    assert.equal(t("Registration", "South Loggia"), "Registration");
  });
  it("shortens a General Session that has its own title", () => {
    const gs = row({
      func: "General Session - Wall Street to Digital Assets",
      type: "General Session",
      sessionTitle: "Ahead of the Curve",
    });
    assert.equal(cardTitle(gs), "General Session");
    assert.equal(cardTitle({ ...gs, sessionTitle: "Title TBA" }), gs.func);
    assert.equal(sessionTitleOf({ sessionTitle: "Title TBA" }), "");
  });
});
