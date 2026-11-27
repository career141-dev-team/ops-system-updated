import assert from "node:assert/strict";
import test from "node:test";

import {
  CALENDAR_CATEGORY_FILTERS,
  CALENDAR_FILTERS,
  calendarItems,
  clockOf,
  dayWord,
  filterCalendarCards,
  filterCards,
  filterFrom,
  kindFrom,
  saturdayAfter,
  weekLabel,
  whoFrom,
} from "@/lib/calendarBoard";
import { DAY } from "@/lib/calendar";
import { seed } from "@/data/seed";

const mon = Date.UTC(2026, 10, 15, 18, 30); // Mon 16 Nov 00:00 in Colombo

test("each filter keeps its own cards, and Mine keeps the owner's", () => {
  const cards = [
    { kind: "client" as const, ownerId: "a" },
    { kind: "internal" as const, ownerId: "b" },
  ];
  assert.equal(filterCards(cards, "team", "a").length, 2);
  assert.equal(filterCards(cards, "mine", "a").length, 1);
  assert.equal(filterCards(cards, "client", "a")[0].ownerId, "a");
  assert.equal(filterCards(cards, "meetings", "a").length, 0);
  assert.equal(filterFrom("nonsense"), "team");
  assert.equal(filterFrom("mine"), "mine");
});

test("the week reads Monday to Saturday, across a month end too", () => {
  assert.equal(weekLabel(mon), "Mon 16 to Sat 21 Nov");
  assert.equal(weekLabel(Date.UTC(2026, 10, 29, 18, 30)), "Mon 30 Nov to Sat 5 Dec");
  assert.equal(clockOf(Date.UTC(2026, 10, 20, 5, 0)), "10:30");
  assert.equal(dayWord(Date.UTC(2026, 10, 20, 5, 0)), "Fri 20 Nov");
});

test("Saturday follows Friday and is today only on that day", () => {
  const sat = saturdayAfter(mon + 5 * DAY, mon + 5 * DAY + 3600_000);
  assert.equal(sat.dayNum, 21);
  assert.equal(sat.isToday, true);
  assert.equal(saturdayAfter(mon + 5 * DAY, mon).isToday, false);
});

test("PR 8: Client meetings label, combined Mine/Team + category filters, organiser ownership, and calendarItems", () => {
  assert.equal(CALENDAR_FILTERS.find((f) => f.key === "meetings")?.label, "Client meetings");
  assert.equal(CALENDAR_CATEGORY_FILTERS.find((f) => f.key === "meetings")?.label, "Client meetings");
  assert.equal(CALENDAR_FILTERS.some((f) => f.label === "Joining days"), false);
  assert.equal(CALENDAR_CATEGORY_FILTERS.some((f) => f.label === "Joining days"), false);
  assert.equal(kindFrom("joining"), "all");

  assert.equal(whoFrom("mine"), "mine");
  assert.equal(whoFrom(undefined, "mine"), "mine");
  assert.equal(whoFrom(undefined, "client"), "team");
  assert.equal(kindFrom("meetings"), "meetings");
  assert.equal(kindFrom(undefined, "meetings"), "meetings");
  assert.equal(kindFrom(undefined, "mine"), "all");

  const cards = [
    { kind: "meeting" as const, ownerId: "m_org" },
    { kind: "meeting" as const, ownerId: "m_other" },
    { kind: "client" as const, ownerId: "m_org" },
  ];
  assert.equal(filterCalendarCards(cards, { who: "mine", kind: "meetings" }, "m_org").length, 1);
  assert.equal(filterCalendarCards(cards, { who: "team", kind: "meetings" }, "m_org").length, 2);
  assert.equal(filterCalendarCards(cards, { who: "mine", kind: "all" }, "m_org").length, 2);

  // "Mine" for a meeting uses its organiserId rather than lead.ownerId.
  const db = seed(mon);
  db.leads = [
    {
      id: "l1",
      company: "Acme",
      nameKey: "acme",
      contactName: "A",
      contactEmail: "a@acme.test",
      contactPhone: "",
      source: "website",
      industry: "Tech",
      website: "",
      notes: "",
      industryFlagged: false,
      industryBecause: null,
      industryConfirmedBy: null,
      state: "intro",
      reason: null,
      doNotInvite: false,
      clientTaId: null,
      ownerId: "m_owner",
      createdBy: "m_owner",
      createdAt: mon,
      updatedAt: mon,
    },
  ];
  db.meetings = [
    {
      id: "mtg1",
      leadId: "l1",
      kind: "requirement",
      at: mon + DAY,
      state: "booked",
      taLeadId: "ta1",
      rebookCount: 0,
      brief: "",
      role: "Dev",
      packageSaid: "",
      reason: null,
      bookedBy: "m_owner",
      organiserId: "m_lead",
      heldAt: null,
      createdAt: mon,
      updatedAt: mon,
    },
  ];
  const items = calendarItems(db);
  const mtg = items.find((i) => i.id === "mtg_mtg1");
  assert(mtg);
  assert.equal(mtg.kind, "meeting");
  assert.equal(mtg.ownerId, "m_lead");
});
