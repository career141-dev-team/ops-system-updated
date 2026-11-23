import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PipelineHistory from "@/app/ui/PipelineHistory";
import { pipelineHistory } from "@/lib/pipelineHistory";
import { bookClientCall, approveTheHold, liftTheHold, moveClientOwner, moveClientStage, saveClientDetails, summariseClient } from "@/app/actions";
import AiOffer from "@/app/AiOffer";
import Icon from "@/app/Icon";
import { MeetingBookingForm } from "@/app/(clients)/leads/[id]/MeetingBookingForm";
import { teamsFake } from "@/lib/graphCalendar";
import { people as taPeople } from "@/lib/ta";
import { AgreementVersions, DraftDocument } from "@/app/ui/AgreementVersions";
import { Contacts } from "@/app/ui/Contacts";
import { Avatar, Card, EmptyState, PillTabs, StatusChip, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { meetingsForLead, switchedOn, activeMembers, agreementForLead, aiSwitches, clientIn, desk, leadIn, member as memberIn } from "@/data/desk";
import { aiOffReason, anyKeySet } from "@/lib/ai";
import { notSaidInWords, type Summary } from "@/lib/aiTasks";
import { STAGE_MEANINGS, type ClientStage, callKindFor, canMoveStage } from "@/lib/clients";
import { lastTalkWords } from "@/lib/clientsBoard";
import { checkInText, clientCards, dayWords, lastTalkAt, talksOf } from "@/lib/clientsView";
import { ESA_FIELDS, STATE_MEANINGS as ESA_STATES, agreementVersions, type EsaState } from "@/lib/esa";
import { buildThreads, threadInWords } from "@/lib/mailbox";
import { panelHref } from "@/lib/panel";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { byDay, subjectsOfClient, timeline } from "@/lib/timeline";
import { Msg, RailCard, ReachIcons, StandsCard } from "../../parts";

type SP = { msg?: string; tab?: string; view?: string; q?: string; summary?: string; panel?: string; on?: string };
type View = "overview" | "agreement" | "contacts" | "history";

/** Old links (?tab=, ?view=openings and so on) land on the nearest of the four views. */
const VIEW_OF: Record<string, View> = {
  overview: "overview",
  hold: "overview",
  openings: "overview",
  positions: "overview",
  agreement: "agreement",
  agreements: "agreement",
  contacts: "contacts",
  people: "contacts",
  history: "history",
  activity: "history",
  messages: "history",
  money: "history",
};

const label = "t-micro text-ink-3";
const iconFor = { call: "phone", chat: "chat", mail: "mail" } as const;

/** C4 · Client detail (v6 frame 180:695): the agreement, who we write to, the talks, the roles; and the rail. */
export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const me = await currentMember();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const sp = await searchParams;
  const { msg, tab, view: viewParam, q = "", summary: summaryJson } = sp;

  const db = await desk();
  const client = clientIn(db, id);
  if (!client) notFound();

  const now = Date.now();
  const path = "/clients/" + client.id;
  const owner = memberIn(db, client.ownerId);
  const ownerName = owner?.name ?? "Unassigned";
  const lead = client.leadId ? leadIn(db, client.leadId) : null;
  const esa = client.leadId ? agreementForLead(db, client.leadId) : null;
  const mayManage = can(me, "client.manage");
  const mayMoveOwner = can(me, "task.reassign");
  const stages = (Object.keys(STAGE_MEANINGS) as ClientStage[]).filter((s) => canMoveStage(client.stage as ClientStage, s));
  const activeHold = db.holds.filter((h) => h.clientId === client.id && h.state !== "lifted")[0] ?? null;
  const view: View = VIEW_OF[viewParam ?? tab ?? ""] ?? "overview";
  const href = (v: View) => path + (v === "overview" ? "" : "?view=" + v);

  const card = clientCards(db, now).find((c) => c.id === client.id)!;
  const contacts = client.contacts ?? [];
  const person = card.person;
  const talk = lastTalkAt(db, client);
  const roles = db.positions.filter((p) => p.clientId === client.id && p.stage !== "closed");
  const summary: Summary | null = summaryJson ? (JSON.parse(summaryJson) as Summary) : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const since = new Date(client.createdAt + 5.5 * 3_600_000).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const stageChip = activeHold || client.stage === "on_hold" ? { label: "On hold", tone: "warn" as const } : client.stage === "active" ? { label: "Active", tone: "brand" as const } : { label: STAGE_MEANINGS[client.stage as ClientStage]?.split(" — ")[0] ?? client.stage, tone: "neutral" as const };
  const fee = esa ? [esa.fields.feeMonths && esa.fields.feeMonths + (esa.fields.feeMonths === "1" ? " month" : " months") + " of salary", esa.fields.feeBasis ? "(" + esa.fields.feeBasis + ")" : ""].filter(Boolean).join(" ") : "";
  const dayOf = (t: number | null) => (t ? dayWords(t).replace(/^\w+ /, "") + " " + new Date(t + 5.5 * 3_600_000).getUTCFullYear() : "—");
  const checkIn = checkInText(person, ownerName);

  const threads = view === "history" ? buildThreads(db.inbound, db.messages).filter((t) => t.clientId === client.id) : [];
  const search = q.trim().toLowerCase();
  const history =
    view === "history"
      ? byDay(timeline(db, subjectsOfClient(db, client), (who) => (who ? (memberIn(db, who)?.name ?? null) : null)))
          .map((g) => ({ ...g, entries: g.entries.filter((e) => !search || (e.said + " " + e.about + " " + (e.because ?? "")).toLowerCase().includes(search)) }))
          .filter((g) => g.entries.length)
      : [];

  // The one call this client's page offers: intro for a new client, requirement for a new role (23 Nov).
  const calls = client.leadId ? meetingsForLead(db, client.leadId) : [];
  const callKind = callKindFor({ stage: client.stage, hasPosition: db.positions.some((p) => p.clientId === client.id), heldCall: calls.some((m) => m.heldAt !== null) });
  const taSide = view === "overview" && mayManage ? await taPeople() : null;
  const teamsOn = teamsFake() || switchedOn(db, "switch.teamsEnabled");
  const whenIn = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

  const holdForm = (
    <>
      {activeHold && mayManage && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {activeHold.state === "proposed" ? (
            <>
              <form action={approveTheHold}>
                <input type="hidden" name="holdId" value={activeHold.id} />
                <input type="hidden" name="reason" value={activeHold.reason} />
                <button type="submit" className={pillPrimary}>
                  Approve and send the hold notice
                </button>
              </form>
              <form action={liftTheHold}>
                <input type="hidden" name="holdId" value={activeHold.id} />
                <input type="hidden" name="reason" value="Keeping open: calling the client first." />
                <button type="submit" className={pillSecondary}>
                  Keep open: call them first
                </button>
              </form>
              {activeHold.noticeMessageId && (
                <Link href={"/messages/" + activeHold.noticeMessageId} className="t-body-m text-brand hover:underline">
                  Edit the notice
                </Link>
              )}
            </>
          ) : (
            <form action={liftTheHold} className="flex flex-wrap items-center gap-2.5">
              <input type="hidden" name="holdId" value={activeHold.id} />
              <input name="reason" required placeholder="What changed? (for example: the client replied)" className={panelInput + " sm:w-80"} />
              <button type="submit" className={pillPrimary}>
                Lift the hold
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Head: back, the name with its chip, and the call button */}
      <div className="flex items-center gap-4 p-1">
        <Link href="/clients" aria-label="Back to Clients" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-card hover:bg-sunk">
          <Icon name="chevron-left" size={18} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="t-display">{client.name}</h1>
            <StatusChip label={stageChip.label} tone={stageChip.tone} />
          </div>
          <p className="t-small text-ink-3">{[lead?.industry, "owner " + ownerName.split(" ")[0], "client since " + since].filter(Boolean).join(" · ")}</p>
        </div>
        {person?.phone && (
          <a href={"tel:" + person.phone.replace(/\s/g, "")} className={pillPrimary + " !gap-2"}>
            <Icon name="phone" size={16} />
            Call {person.name.split(" ")[0]}
          </a>
        )}
        <details className="relative">
          <summary aria-label="More about this client" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-surface shadow-card hover:bg-sunk [&::-webkit-details-marker]:hidden">
            <Icon name="more" size={18} />
          </summary>
          <div className="absolute right-0 top-12 z-20 flex w-56 flex-col gap-1 rounded-[18px] bg-surface p-2 shadow-float">
            <Link href={href("contacts")} className="t-small rounded-lg px-3 py-1.5 hover:bg-sunk">
              Details, stage and owner
            </Link>
            <Link href="/clients/owners" className="t-small rounded-lg px-3 py-1.5 text-brand hover:bg-sunk">
              Who owns what
            </Link>
            {lead && (
              <Link href={"/leads/" + lead.id} className="t-small rounded-lg px-3 py-1.5 hover:bg-sunk">
                The original enquiry
              </Link>
            )}
          </div>
        </details>
      </div>
      <PillTabs
        active={view}
        items={[
          { key: "overview", label: "Overview", href: href("overview") },
          { key: "agreement", label: "Agreement", href: href("agreement") },
          { key: "contacts", label: "Contacts", href: href("contacts") },
          { key: "history", label: "History", href: href("history") },
        ]}
      />
      <Msg msg={msg} />

      <div className="flex items-start gap-[22px] max-xl:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] max-xl:w-full">
          {view === "overview" && (
            <>
              {activeHold && (
                <Card title={activeHold.state === "proposed" ? "No feedback for 30 days: put " + client.name + " on hold?" : client.name + " is on hold"} sub={activeHold.reason}>
                  <p className="t-body text-ink-2">A hold pauses TA work and sends the client a polite notice. It never closes a role on its own: a person decides after the 30-day review. Any word from the client reopens them.</p>
                  {holdForm}
                </Card>
              )}
              <Card
                title={callKind === "intro" ? "Intro call" : "Requirement call"}
                sub={callKind === "intro" ? "A first meeting. The requirement is taken in the same call." : "For a new role: held before the position is made."}
                right={
                  <Link href={"/positions?panel=new-position&on=" + client.id} className={pillPrimary + " !px-3.5 !py-2 !text-[12px]"}>
                    <Icon name="plus" size={14} />
                    New position
                  </Link>
                }
              >
                {calls.length > 0 && (
                  <div className="flex flex-col">
                    {calls.map((m) => (
                      <div key={m.id} className="flex flex-wrap items-center gap-3 border-t border-rule py-2.5 first:border-t-0 first:pt-0">
                        <span className="t-body-m">{m.kind === "intro" ? "Intro call" : "Requirement call"}</span>
                        <span className="t-small text-ink-3">{whenIn(m.at)} · {m.state.replace(/_/g, " ")}</span>
                        <Link href={"/leads/" + client.leadId + "?step=" + (m.kind === "intro" ? "intro" : "requirement")} className="t-body-m ml-auto text-brand hover:underline">
                          {m.heldAt ? "Open" : "Mark held or rebook"}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {mayManage && (
                  <details open={calls.length === 0}>
                    <summary className="t-body-m cursor-pointer text-brand hover:underline">{callKind === "intro" ? "Book the intro call" : "Book the requirement call"}</summary>
                    <div className="pt-3">
                      <MeetingBookingForm
                        action={bookClientCall}
                        leadId=""
                        hidden={{ clientId: client.id }}
                        contact={{ name: person?.name ?? "", email: person?.email ?? "" }}
                        taPeople={taSide?.ok ? taSide.data.filter((p) => p.isActive) : []}
                        members={db.members}
                        organiserId={client.ownerId}
                        teamsOn={teamsOn}
                        submitLabel={callKind === "intro" ? "Book the intro call" : "Book the requirement call"}
                        primary
                        offerAlsoRequirement={callKind === "intro"}
                      />
                    </div>
                  </details>
                )}
              </Card>
              <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.05fr_1fr]">
                <Card title="Agreement" sub={esa ? (esa.state === "countersigned" || esa.state === "signed" ? "Signed and active" : (ESA_STATES[esa.state as EsaState] ?? esa.state)) : "No agreement on file here"} right={esa ? <StatusChip label={esa.state === "countersigned" ? "Signed" : (ESA_STATES[esa.state as EsaState]?.split(".")[0] ?? esa.state)} tone={esa.state === "signed" || esa.state === "countersigned" ? "brand" : "warn"} /> : undefined}>
                  {esa ? (
                    <>
                      <dl className="grid grid-cols-3 gap-x-4 gap-y-5">
                        {[
                          ["Version", String(esa.version), ""],
                          ["Signed", dayOf(esa.signedAt), ""],
                          ["Countersigned", dayOf(esa.countersignedAt), esa.countersignedAt ? "Director" : ""],
                          ["Fee", fee || "—", ""],
                          ["Guarantee", esa.fields.guaranteeDays ? esa.fields.guaranteeDays + " days" : "—", ""],
                          ["Payment", esa.fields.paymentDays ? esa.fields.paymentDays + " days" : "—", ""],
                        ].map(([k, v, s]) => (
                          <div key={k} className="flex flex-col gap-1">
                            <dt className={label}>{k.toUpperCase()}</dt>
                            <dd className="t-body-m">{v}</dd>
                            {s && <span className="t-small -mt-0.5 text-ink-3">{s}</span>}
                          </div>
                        ))}
                      </dl>
                      <Link href={href("agreement")} className={pillSecondary + " !px-3.5 !py-2 !text-[12px] self-start"}>
                        <Icon name="chevron-right" size={14} />
                        Open the agreement
                      </Link>
                    </>
                  ) : (
                    <p className="t-body text-ink-2">Standard Career 141 terms, signed before Ops or through the TA System ({client.taClientId || "not linked yet"}).</p>
                  )}
                </Card>
                <Card title="Contacts" sub="Who gets what">
                  {contacts.length === 0 && !person ? (
                    <EmptyState icon="user" title="Nobody written down">
                      <Link href={href("contacts")} className="text-brand underline">
                        Add the people we write to.
                      </Link>
                    </EmptyState>
                  ) : (
                    <div className="flex flex-col">
                      {(contacts.length ? contacts : person ? [person] : []).map((c) => (
                        <div key={c.email || c.name} className="flex items-center gap-3 border-t border-rule py-3 first:border-t-0 first:pt-0">
                          <Avatar name={c.name} size="40" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="t-body-m">{c.name}</span>
                            <span className="t-small text-ink-3">{c.role === "hr" ? "HR · gets the CV sets" : c.role || "Contact"}</span>
                          </div>
                          <ReachIcons phone={c.phone} email={c.email} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
              <Card
                title="Talks with the client"
                sub="The last 5"
                right={
                  <Link href={panelHref(path, sp, "add-call")} scroll={false} className="t-body-m text-brand hover:underline">
                    Add a call note
                  </Link>
                }
              >
                {talksOf(db, client, 5).length === 0 ? (
                  <EmptyState icon="phone" title="No talk written down yet">
                    Calls, mail and messages with this client show here once they are recorded.
                  </EmptyState>
                ) : (
                  <ul className="flex flex-col">
                    {talksOf(db, client, 5).map((t) => (
                      <li key={t.id} className="flex items-center gap-4 border-t border-rule py-4 first:border-t-0 first:pt-0 last:pb-0">
                        <span className="t-small w-[90px] shrink-0 text-ink-3">{dayWords(t.at).replace(/^\w+ /, "")}</span>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-3">
                          <Icon name={iconFor[t.kind]} size={14} />
                        </span>
                        <span className="t-body min-w-0 flex-1">{t.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Roles at this client" sub={roles.length + (roles.length === 1 ? " open role" : " open roles")}>
                {roles.length === 0 ? (
                  <EmptyState icon="briefcase" title="No open role">
                    A role appears here once a requirement meeting is held and the opening is made.
                  </EmptyState>
                ) : (
                  <ul className="flex flex-col">
                    {roles.map((p) => {
                      const sets = db.clientSets.filter((s) => s.openingTaId === p.openingTaId);
                      return (
                        <li key={p.id} className="border-t border-rule first:border-t-0">
                          <Link href={"/positions/" + p.id} className="flex items-center gap-3 py-4 hover:text-brand">
                            <span className="t-body-m">{p.title}</span>
                            <span className="t-small flex-1 text-ink-3">· {sets.length ? "SET " + sets.length + " with the client" : p.stage.replace(/_/g, " ")}</span>
                            <Icon name="chevron-right" size={16} className="text-ink-3" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </>
          )}

          {view === "agreement" && (
            <>
              <Card title="Terms" sub={esa ? "Version " + esa.version : undefined}>
                {esa ? (
                  <dl className="flex flex-col">
                    {ESA_FIELDS.map((f) => (
                      <div key={f.key} className="t-body flex items-center justify-between gap-6 border-t border-rule py-2.5 first:border-t-0">
                        <dt className="text-ink-2">{f.label}</dt>
                        <dd className="t-body-m text-right">{esa.fields[f.key] || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <EmptyState icon="file" title="No agreement file here">
                    Standard Career 141 terms, signed before Ops or through the TA System.
                  </EmptyState>
                )}
              </Card>
              {esa && (() => {
                const esaFiles = db.files.filter((f) => (f.subjectType === "esa" && f.subjectId === esa.id) || f.id === esa.signedFileId || f.id === esa.countersignedFileId);
                const newest = agreementVersions(esaFiles)[0] ?? null;
                const activeDoc =
                  (esa.countersignedFileId ? db.files.find((f) => f.id === esa.countersignedFileId) : null) ??
                  (esa.signedFileId ? db.files.find((f) => f.id === esa.signedFileId) : null) ??
                  newest?.file ??
                  null;
                return (
                  <Card title="Agreement document" right={<StatusChip label={ESA_STATES[esa.state as EsaState]?.split(".")[0] ?? esa.state} tone={esa.state === "signed" || esa.state === "countersigned" ? "brand" : "warn"} />}>
                    {activeDoc && <DraftDocument file={activeDoc} version={newest?.version ?? esa.version} />}
                    <AgreementVersions esa={esa} files={esaFiles} />
                    {lead && (
                      <Link href={"/leads/" + lead.id + "?step=agreement"} className={pillSecondary + " self-start"}>
                        Open the full agreement view
                      </Link>
                    )}
                  </Card>
                );
              })()}
            </>
          )}

          {view === "contacts" && (
            <>
              <Contacts
                scope="client"
                id={client.id}
                contacts={contacts}
                mayManage={mayManage}
                heading="PEOPLE WE WRITE TO"
                hint="Their standard contacts get everything: CV sets, interview times, meeting invites. A person marked hr receives the CV sets."
              />
              <Card title="Billing and details" sub="Who we invoice and which WhatsApp group is theirs">
                {mayManage ? (
                  <form action={saveClientDetails} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input type="hidden" name="clientId" value={client.id} />
                    {(
                      [
                        ["name", "Client name", client.name],
                        ["billingName", "Billing name", client.billingName],
                        ["billingEmail", "Invoice email", client.billingEmail],
                        ["billingAddress", "Billing address", client.billingAddress ?? ""],
                        ["groupName", "WhatsApp group", client.groupName],
                        ["notes", "Anything worth knowing", client.notes],
                      ] as const
                    ).map(([name, text, value]) => (
                      <label key={name} className="flex flex-col gap-1.5">
                        <span className="t-small text-ink-3">{text}</span>
                        <input name={name} defaultValue={value} className={panelInput} />
                      </label>
                    ))}
                    <div className="sm:col-span-2">
                      <button type="submit" className={pillPrimary}>
                        Save the details
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="t-body text-ink-2">{[client.billingName, client.billingEmail, client.billingAddress, client.groupName].filter(Boolean).join(" · ") || "Nothing written down."}</p>
                )}
              </Card>
              {(mayManage || mayMoveOwner) && (
                <Card title="Stage and owner" sub={(STAGE_MEANINGS[client.stage as ClientStage] ?? client.stage) + " · " + ownerName + " owns them"}>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {mayManage && stages.length > 0 && (
                      <form action={moveClientStage} className="flex flex-col gap-3">
                        <input type="hidden" name="clientId" value={client.id} />
                        <span className="t-small text-ink-3">Move stage</span>
                        <select name="stage" defaultValue={stages[0]} className={panelInput}>
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_MEANINGS[s]}
                            </option>
                          ))}
                        </select>
                        <input name="reason" placeholder="Why are they moving?" className={panelInput} />
                        <button type="submit" className={pillSecondary + " self-start"}>
                          Move them
                        </button>
                      </form>
                    )}
                    {mayMoveOwner && (
                      <form action={moveClientOwner} className="flex flex-col gap-3">
                        <input type="hidden" name="clientId" value={client.id} />
                        <span className="t-small text-ink-3">Move owner</span>
                        <select name="ownerId" defaultValue="" className={panelInput}>
                          <option value="">Pick the new owner</option>
                          {activeMembers(db)
                            .filter((m) => m.id !== client.ownerId)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                        </select>
                        <input name="reason" placeholder="Why is the owner changing?" className={panelInput} />
                        <button type="submit" className={pillSecondary + " self-start"}>
                          Move the owner
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}

          {view === "history" && (
            <>
              <PipelineHistory rows={pipelineHistory(db, { clientId: client.id })} showPosition title="Pipeline history across this client's positions" />
              <Card
                title="Everything that happened"
                sub={history.length ? undefined : "Nothing recorded yet"}
                right={
                  <form action={path} className="flex h-10 w-[260px] items-center gap-2.5 rounded-full border border-rule px-4">
                    <input type="hidden" name="view" value="history" />
                    <Icon name="search" size={16} className="text-ink-3" />
                    <input name="q" defaultValue={q} autoComplete="off" placeholder="Search what happened" aria-label="Search what happened" className="t-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3" />
                  </form>
                }
              >
                {history.length === 0 ? (
                  <EmptyState icon="clock" title="Nothing matches">
                    {q ? "Try another word." : "What happens with this client is written here as it happens."}
                  </EmptyState>
                ) : (
                  history.map((g) => (
                    <div key={g.day} className="flex flex-col gap-3">
                      <span className={label}>{g.day}</span>
                      <ul className="flex flex-col">
                        {g.entries.map((e) => (
                          <li key={e.id} className="flex flex-col gap-0.5 border-t border-rule py-3 first:border-t-0">
                            <span className="t-small text-ink-3">{new Date(e.at + 5.5 * 3_600_000).toISOString().slice(11, 16)}</span>
                            <span className="t-body">{e.said}</span>
                            <span className="t-small text-ink-3">
                              {e.about}
                              {e.by ? " · " + e.by : " · automatic"}
                              {e.because && !e.said.includes(e.because) ? " · " + e.because : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </Card>
              {threads.length > 0 && (
                <Card title="Email and WhatsApp" sub={threads.length + (threads.length === 1 ? " conversation" : " conversations")}>
                  <ul className="flex flex-col">
                    {threads.map((t) => (
                      <li key={t.key} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule py-3 first:border-t-0">
                        <Link href={"/mail/" + encodeURIComponent(t.key)} className="t-body-m text-brand hover:underline">
                          {t.subject}
                        </Link>
                        <span className="t-small text-ink-3">
                          {t.withName} · {threadInWords(t, now)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              <Card title="Where this client stands" sub="Agreements, roles, sets, invoices and holds in one paragraph">
                {aiOn ? (
                  <form action={summariseClient}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <button type="submit" className={pillSecondary}>
                      Summarise their history
                    </button>
                  </form>
                ) : (
                  <AiOffer label="Summarise their history" why={aiOffReason(anyKeySet(), aiSwitches(db).on) ?? ""} />
                )}
                {summary && (
                  <div className="flex flex-col gap-1.5">
                    <p className="t-body whitespace-pre-wrap">{summary.summary}</p>
                    {summary.points?.map((p, i) => (
                      <p key={i} className="t-small text-ink-2">
                        · {p}
                      </p>
                    ))}
                    {notSaidInWords(summary.notSaid ?? []) && <p className="t-small text-warn">{notSaidInWords(summary.notSaid ?? [])}</p>}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col gap-5 max-xl:w-full">
          <StandsCard
            head={card.needsYou ? card.status.text + "." : activeHold ? "On hold." : "Good."}
            body={(talk ? "Last contact " + lastTalkWords(talk, now).replace("last talk ", "") + "." : "No talk is written down yet.") + (card.status.tone === "info" || card.needsYou ? " " + card.status.text + "." : "")}
            copies={[{ label: "Copy a check-in", text: checkIn }]}
            links={[{ label: "Add a call note", href: panelHref(path, sp, "add-call") }]}
          />
          <RailCard title="Client details">
            {[
              ["Billing name", client.billingName],
              ["Billing address", client.billingAddress],
              ["Invoice email", client.billingEmail],
              ["WhatsApp group", client.groupName],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className={label}>{k.toUpperCase()}</span>
                <span className="t-body-m">{v || "Not written down"}</span>
              </div>
            ))}
          </RailCard>
        </aside>
      </div>
    </div>
  );
}
