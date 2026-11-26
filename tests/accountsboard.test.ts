/** The Accounts board (v6 A1): which column an invoice is in, and the numbers beside it. */
import assert from "node:assert/strict";
import test from "node:test";

import { boardSummary, columnOf, columnsForFilter, matchesFilter, reminderText, statusWords, type BoardInvoice } from "@/lib/accountsBoard";

const DAY = 86_400_000;
const now = Date.parse("2026-11-19T10:00:00+05:30");
const inv = (o: Partial<BoardInvoice>): BoardInvoice => ({
  id: "i", number: "INV-1", kind: "fee", state: "sent", amount: 100, lateCharge: 0, payments: [],
  dueAt: now + 10 * DAY, sentAt: now - DAY, paidAt: null, disputed: false, ...o,
});

test("a draft is to send, even when its due date has passed", () => {
  assert.equal(columnOf(inv({ state: "draft", dueAt: now - 5 * DAY }), now), "to_send");
});

test("late, sent, disputed and closed ones land where they stand", () => {
  assert.equal(columnOf(inv({ dueAt: now - DAY }), now), "late");
  assert.equal(columnOf(inv({ dueAt: now - DAY, disputed: true }), now), "sent");
  assert.equal(columnOf(inv({}), now), "sent");
  assert.equal(columnOf(inv({ kind: "credit_note" }), now), null);
  assert.equal(columnOf(inv({ state: "written_off" }), now), null);
});

test("one invoice's status reads in the board's words", () => {
  assert.equal(statusWords(inv({ state: "draft", dueAt: now - DAY }), now), "To be sent");
  assert.equal(statusWords(inv({}), now), "Sent");
  assert.equal(statusWords(inv({ dueAt: now - DAY }), now), "Late payment");
  assert.equal(statusWords(inv({ state: "paid", paidAt: now - 40 * DAY }), now), "Paid");
  assert.equal(statusWords(inv({ state: "written_off" }), now), "Written off");
});

test("paid shows only for the month it was paid", () => {
  assert.equal(columnOf(inv({ state: "paid", paidAt: now - DAY }), now), "paid");
  assert.equal(columnOf(inv({ state: "paid", paidAt: now - 40 * DAY }), now), null);
});

test("the numbers add up", () => {
  const s = boardSummary(
    [
      inv({ id: "a", state: "draft" }),
      inv({ id: "b", dueAt: now + 3 * DAY, amount: 50 }),
      inv({ id: "c", dueAt: now - 9 * DAY, amount: 200, payments: [{ amount: 50, paidAt: now - 2 * DAY }] }),
      inv({ id: "d", state: "paid", paidAt: now - DAY, payments: [{ amount: 100, paidAt: now - DAY }] }),
    ],
    now,
  );
  assert.equal(s.toSend, 1);
  assert.equal(s.sent, 1);
  assert.equal(s.dueThisWeek, 1);
  assert.equal(s.late, 1);
  assert.equal(s.oldestLateDays, 9);
  assert.equal(s.lateSum, 150);
  assert.equal(s.paidCount, 1);
  assert.equal(s.paidSum, 150);
});

test("the reminder names the invoice and the late charge", () => {
  const t = reminderText({ firstName: "Sunil", number: "INV-9", amount: "LKR 1", due: "17 Dec", pctPerMonth: 5 });
  assert.match(t, /^Hello Sunil, invoice INV-9 for LKR 1 was due on 17 Dec\. A late charge of 5% a month/);
});

test("a day is written as 17 Nov, in Colombo", async () => {
  const { dayShort } = await import("@/lib/accountsBoard");
  assert.equal(dayShort(Date.parse("2026-11-17T23:00:00+05:30")), "17 Nov");
  assert.equal(dayShort(null), "no date");
});

test("show filters (paid, unpaid, late) pick the right columns and rows (26 Nov)", () => {
  assert.deepEqual(columnsForFilter("all"), ["to_send", "sent", "late", "paid"]);
  assert.deepEqual(columnsForFilter("unpaid"), ["to_send", "sent", "late"]);
  assert.deepEqual(columnsForFilter("late"), ["late"]);
  assert.deepEqual(columnsForFilter("paid"), ["paid"]);

  const draft = inv({ state: "draft" });
  const sent = inv({ state: "sent", dueAt: now + 5 * DAY });
  const late = inv({ state: "sent", dueAt: now - 2 * DAY });
  const paidRecent = inv({ state: "paid", paidAt: now - DAY });
  const paidOld = inv({ state: "paid", paidAt: now - 45 * DAY });

  assert.equal(matchesFilter(draft, "unpaid", now), true);
  assert.equal(matchesFilter(sent, "unpaid", now), true);
  assert.equal(matchesFilter(late, "unpaid", now), true);
  assert.equal(matchesFilter(paidRecent, "unpaid", now), false);

  assert.equal(matchesFilter(late, "late", now), true);
  assert.equal(matchesFilter(sent, "late", now), false);

  assert.equal(matchesFilter(paidRecent, "paid", now), true);
  assert.equal(matchesFilter(paidOld, "paid", now), true, "paid filter shows older settled invoices too");
  assert.equal(matchesFilter(draft, "paid", now), false);
});
