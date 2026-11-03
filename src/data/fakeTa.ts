import { nameKey } from "@/lib/leads";

/**
 * A stand-in TA System (15, Phase 1 step 3).
 *
 * The TA side of the API is a TA pull request that does not exist yet, and the
 * Ops side cannot wait for it: the screens, the outbox and the events reader
 * all have to be built and shown now. So this answers the same shapes from
 * recorded data, with `OPS_TA_FAKE=on`.
 *
 * Everything in here is obviously invented — SAMPLE CLIENT, nobody real — so a
 * screen reading it can never be mistaken for the live desk. The real API
 * replaces this by switching the flag off; nothing above it changes.
 */

const PEOPLE = [
  { id: "ta_u1", fullName: "SAMPLE TA LEAD", email: "ta.lead@example.test", taRole: "ta_lead", isActive: true },
  { id: "ta_u2", fullName: "SAMPLE TA", email: "ta.one@example.test", taRole: "ta", isActive: true },
  { id: "ta_u3", fullName: "SAMPLE TA TWO", email: "ta.two@example.test", taRole: "ta", isActive: false },
];

const CLIENTS = [
  {
    id: "ta_c1",
    name: "SAMPLE CLIENT",
    // Computed, not typed: the key had been written by hand as "sampleclient"
    // while the TA System's own rule gives "sample client", so a lead for a
    // company we already had came back as new. Found in the browser, 2 Nov.
    nameKey: nameKey("SAMPLE CLIENT"),
    industry: "Manufacturing",
    esaSignedAt: Date.UTC(2026, 9, 1),
    status: "active",
    opsOwnerId: null,
  },
];

const OPENINGS = [
  {
    id: "ta_j1",
    title: "Head of finance",
    clientId: "ta_c1",
    status: "open",
    primaryRecruiterId: "ta_u2",
    taLeadId: "ta_u1",
    headcount: 1,
    assignedAt: Date.UTC(2026, 9, 20),
  },
];

/** Events the reader can be shown working on, oldest first. */
const EVENTS = [
  { id: "ta_ev_1", type: "opening.created", at: Date.UTC(2026, 9, 20, 4), data: { openingId: "ta_j1", clientId: "ta_c1" } },
  { id: "ta_ev_2", type: "client_set.ready", at: Date.UTC(2026, 9, 28, 9), data: { openingId: "ta_j1", setNumber: 1 } },
  { id: "ta_ev_3", type: "placement.created", at: Date.UTC(2026, 10, 1, 6), data: { openingId: "ta_j1", placementId: "ta_p1" } },
  { id: "ta_ev_4", type: "something.we.do.not.know", at: Date.UTC(2026, 10, 1, 7), data: {} },
];

export type FakeAnswer<T> = { ok: true; data: T } | { ok: false; reason: string };

export function fakeAnswer<T>(path: string, method = "GET"): FakeAnswer<T> {
  const [where, query] = path.split("?");
  const give = (data: unknown) => ({ ok: true as const, data: data as T });

  if (where.endsWith("/people")) return give(PEOPLE);
  if (where.endsWith("/clients")) return give(CLIENTS);
  if (/\/openings\/[^/]+$/.test(where)) return give(OPENINGS[0]);
  if (where.endsWith("/openings")) return give(OPENINGS);
  if (where.endsWith("/client-sets")) return give([]);
  if (where.endsWith("/events")) {
    const after = new URLSearchParams(query ?? "").get("after") ?? "";
    // The cursor is the last event's id, exactly as the real API works.
    const from = after ? EVENTS.findIndex((e) => e.id === after) + 1 : 0;
    const events = EVENTS.slice(from < 0 ? 0 : from);
    return give({ events, nextCursor: events.length ? events[events.length - 1].id : after });
  }
  // A write is accepted and nothing is kept. The stand-in cannot pretend to
  // have created an opening, but it must accept the write, or the outbox could
  // never be shown draining before the real API exists.
  if (method !== "GET") return give({ accepted: true, standIn: true });
  return { ok: false, reason: "The stand-in TA System has no answer for " + where + "." };
}
