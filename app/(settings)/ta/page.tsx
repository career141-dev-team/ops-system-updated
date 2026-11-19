import Link from "next/link";
import { redirect } from "next/navigation";

import { pushOutboxNow, queueTestWrite, readEventsNow } from "@/app/actions";
import { EVENTS_CURSOR, EVENTS_READ_AT, desk, eventsNewestFirst, outboxWaiting, settingValue } from "@/data/desk";
import { outboxInWords } from "@/lib/outbox";
import { can } from "@/lib/roles";
import { currentMember, devSignInAllowed } from "@/lib/session";
import { fakeTa, people, readsEnabled, windowInWords, writesEnabled } from "@/lib/ta";
import { cursorAgeInWords } from "@/lib/taEvents";

/**
 * The window to the TA System (15, Part E; Phase 1 steps 20 to 22).
 *
 * Three things on one page, because they are one question — is Ops and the TA
 * System talking: what we can read, what is waiting to be written, and what TA
 * has told us. A write is never sent from a screen; it is queued here and a
 * pass sends it, so nothing is lost when the other machine is down.
 *
 * While the TA side of the API does not exist, a stand-in answers with
 * recorded data and every part of this page says so.
 */
export default async function TaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { msg } = await searchParams;
  const mayTest = can(member, "settings.manage");

  const db = await desk();
  const read = await people();
  const waiting = outboxWaiting(db);
  const events = eventsNewestFirst(db).slice(0, 20);
  const cursor = settingValue(db, EVENTS_CURSOR);
  const readAt = settingValue(db, EVENTS_READ_AT);
  const calls = [...db.taCalls].sort((a, b) => b.at - a.at).slice(0, 8);
  const card = "rounded-[28px] bg-surface px-7 py-[26px] shadow-card";
  const button = "rounded-full border border-rule-strong bg-surface px-5 py-[11px] text-[14px] font-medium hover:bg-sunk";

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5 p-1">
        <h1 className="t-display">The TA System</h1>
        <p className="t-small text-ink-3">{windowInWords()}</p>
      </div>
      {fakeTa() && (
        <p className="mt-2 text-[12.5px] text-ink-faint">
          Nothing on this page is real: a stand-in is answering. The TA side exists now (its endpoints are in
          ta-system, docs/OPS-SYSTEM-API.md). To use it, set OPS_TA_BASE_URL and OPS_TA_TOKEN, turn
          OPS_TA_READS_ENABLED on, and turn OPS_TA_FAKE off.
        </p>
      )}
      {fakeTa() && devSignInAllowed() && (
        <p className="mt-2 text-[13.5px]">
          <Link href="/dev/ta" className="font-medium text-brand hover:underline">
            Pretend to be the TA System
          </Link>{" "}
          · load the Openings sample, move clocks, say what TA would say (laptop only).
        </p>
      )}
      {!fakeTa() && !writesEnabled() && (
        <p className="mt-2 text-[12.5px] text-ink-faint">
          Writes are queued, not sent. Both sides have to agree: OPS_TA_WRITES_ENABLED here, and
          OPS_API_WRITES_ENABLED on the TA server. Either one off and a write waits in the outbox rather than
          being lost.
        </p>
      )}

      {msg && <p className="rounded-[18px] bg-sunk px-4 py-3 t-small">{msg}</p>}

      <section className={card}>
        <h2 className="t-h2">Reading</h2>
        <p className="mt-2 text-[13.5px]">Reads: {readsEnabled() || fakeTa() ? "on" : "switched off"}</p>
        <p className="mt-1 text-[13.5px]">
          {read.ok ? read.data.length + " people read in " + read.ms + " ms" : read.reason}
        </p>
        {read.ok && (
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {read.data
              .slice(0, 4)
              .map((person) => person.fullName + (person.isActive ? "" : " (left)"))
              .join(" · ")}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="t-h2">Waiting to be written</h2>
        <p className="mt-2 text-[13.5px]">Writes: {writesEnabled() || fakeTa() ? "on" : "switched off"}</p>
        {waiting.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing waiting.</p>}
        {waiting.map((item) => (
          <div key={item.id} className="border-t border-rule py-2 first:border-t-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[13px] font-mono">{item.path}</span>
              <span className="ml-auto text-[12px] text-ink-faint">{item.idempotencyKey}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-soft">{outboxInWords(item)}</p>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={pushOutboxNow}>
            <button className={button}>Try the waiting writes now</button>
          </form>
          {mayTest && (
            <form action={queueTestWrite}>
              <button className={button}>Queue a test write</button>
            </form>
          )}
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">
          Every write carries a key, so asking twice cannot make two of anything. The scheduled pass tries them every
          five minutes and waits longer each time it cannot get through.
        </p>
      </section>

      <section className={card}>
        <h2 className="t-h2">What the TA System has told us</h2>
        <p className="mt-2 text-[13.5px]">{cursorAgeInWords(readAt ? Number(readAt) : null)}</p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {cursor ? "We have read up to " + cursor + "." : "We have not read any event yet."} The place we have read to
          only moves past events that were handled, so nothing is skipped.
        </p>
        {events.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {events.map((event) => (
          <div key={event.id} className="border-t border-rule py-2 first:border-t-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[13px]">{event.type}</span>
              <span className="text-[12px] text-ink-faint">{event.taEventId}</span>
              <span className="ml-auto text-[12px] text-ink-faint">
                {new Date(event.receivedAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-soft">{event.note}</p>
          </div>
        ))}
        <form action={readEventsNow} className="mt-3">
          <button className={button}>Read the events now</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="t-h2">The last few calls across</h2>
        {calls.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Nothing yet.</p>}
        {calls.map((call) => (
          <div key={call.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 first:border-t-0">
            <span className="text-[12.5px]">{call.ok ? "worked" : "did not work"}</span>
            <span className="text-[12.5px] font-mono">{call.path}</span>
            <span className="text-[12px] text-ink-faint">
              {call.ms} ms{call.status ? " · " + call.status : ""}
              {call.note ? " · " + call.note : ""}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
