import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  bookIntroCall,
  dictateRequirement,
  bookRequirementMeeting,
  handOverToTa,
  markRoleImpractical,
  saveRequirement,
  declineAgreement,
  draftNextChase,
  recordAgreementCountersigned,
  recordChangesWanted,
  recordAgreementSigned,
  saveAgreementFields,
  sendAgreement,
  startAgreement,
  checkLeadDuplicate,
  closeLead,
  decideLeadIndustry,
  markMeetingHeld,
  markMeetingNotHeld,
} from "@/app/actions";
import { agreementForLead, aiSwitches, desk, leadIn, meetingsForLead, requirementForLead } from "@/data/desk";
import { anyKeySet } from "@/lib/ai";
import { notSaidInWords, type DictatedRequirement } from "@/lib/aiTasks";
import Dictate from "@/app/Dictate";
import { SOURCE_MEANINGS, STATE_MEANINGS, type LeadState } from "@/lib/leads";
import {
  KIND_MEANINGS,
  MAX_REBOOKS,
  STATE_MEANINGS as MEETING_STATES,
  type MeetingKind,
  type MeetingState,
} from "@/lib/meetings";
import { people as taPeople } from "@/lib/ta";
import {
  REQUIREMENT_FIELDS,
  missingFields as requirementBlanksOf,
} from "@/lib/requirements";
import {
  ESA_FIELDS,
  type EsaState,
  STATE_MEANINGS as ESA_STATES,
  chaseStep,
  missingFields,
  whereItStands,
} from "@/lib/esa";
import { can, refusal } from "@/lib/roles";
import { currentMember } from "@/lib/session";
import { fakeTa } from "@/lib/ta";

/**
 * One lead, and the decisions it is waiting on (15, Phase 2 steps 3 and 4).
 *
 * Edited in place, no overlays: what we know, then the two questions that have
 * to be answered before any work starts — are they already our client, and are
 * they banking or finance. Each answer says plainly what it will do before it
 * is given, because declining for the industry is permanent.
 */
export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; proposed?: string; runId?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sign-in");
  const { id } = await params;
  const { msg, proposed: proposedJson } = await searchParams;

  const db = await desk();
  const lead = leadIn(db, id);
  if (!lead) notFound();

  const mayManage = can(member, "client.manage");
  const card = "mt-4 rounded-2xl border border-rule bg-surface px-5 py-4";
  const field_cls = "rounded-lg border border-rule bg-paper px-3 py-2 text-[13.5px]";
  const field_wide = field_cls + " sm:col-span-2";
  const plain = "self-start rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";
  // What dictation proposed, which fills the fields in for correction and is
  // saved by nothing until a person presses save (Phase 9 step 7).
  const dictated: DictatedRequirement | null = proposedJson
    ? (JSON.parse(proposedJson) as DictatedRequirement)
    : null;
  const aiOn = anyKeySet() && aiSwitches(db).on;
  const button = "rounded-full border border-rule-strong px-3.5 py-1.5 text-[12.5px] hover:bg-paper";
  const nameOf = (who: string | null) => (who ? db.members.find((m) => m.id === who)?.name ?? "somebody" : "nobody");
  const closed = lead.state.startsWith("closed") || lead.state === "declined_industry";
  const meetings = meetingsForLead(db, lead.id);
  const next = meetings.find((m) => m.state === "booked") ?? null;
  const taSide = await taPeople();
  const taLeads = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];
  const whenLocal = (at: number) =>
    new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  const esa = agreementForLead(db, lead.id);
  const esaMissing = esa ? missingFields(esa.fields) : [];
  const esaTemplate = db.files.find((f) => f.kind === "esa_draft" && f.subjectType === null) ?? null;
  const nextChase = esa ? chaseStep(esa.chaseStep + 1) : null;
  // Phase 3: the requirement, and whether it has gone to TA yet.
  const agreementDone = esa?.state === "signed" || esa?.state === "countersigned";
  const requirementMeeting = meetingsForLead(db, lead.id).find((m) => m.kind === "requirement") ?? null;
  const requirement = requirementForLead(db, lead.id);
  const requirementBlanks = requirement ? requirementBlanksOf(requirement.fields) : [];
  const position = requirement
    ? db.positions.find((p) => p.requirementId === requirement.id) ?? null
    : null;
  const taPeopleList = taSide.ok ? taSide.data.filter((p) => p.isActive) : [];
  const signedFiles = db.files.filter((f) => f.kind === "esa_signed");
  const countersignedFiles = db.files.filter((f) => f.kind === "esa_countersigned");
  const when = (at: number) => new Date(at).toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="max-w-[760px]">
      <Link href="/leads" className="text-[12.5px] text-brand hover:underline">
        Back to leads
      </Link>
      <h1 className="mt-2 text-[17px] font-medium">{lead.company}</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft">
        {STATE_MEANINGS[lead.state as LeadState] ?? lead.state} · {SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source} ·{" "}
        {nameOf(lead.ownerId)} owns it · came in {when(lead.createdAt)}
      </p>

      {msg && <p className="mt-3 rounded-lg border border-rule bg-surface px-3 py-2 text-[13px]">{msg}</p>}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What we know</h2>
        <div className="mt-2 flex flex-col gap-1 text-[13.5px]">
          <p>{lead.contactName || "No name given"}</p>
          <p className="text-ink-soft">
            {lead.contactEmail || "no email"} · {lead.contactPhone || "no number"}
          </p>
          <p className="text-ink-soft">
            {lead.industry || "industry not said"}
            {lead.website ? " · " + lead.website : ""}
          </p>
          {lead.notes && <p className="mt-1 whitespace-pre-wrap">{lead.notes}</p>}
          {lead.clientTaId && (
            <p className="mt-1 text-ink-soft">Already our client in the TA System ({lead.clientTaId}).</p>
          )}
          {lead.reason && <p className="mt-1">Reason recorded: {lead.reason}</p>}
        </div>
      </section>

      {!closed && (
        <>
          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Are they already our client?</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              Asks the TA System for a company with this name. An exact match is linked and the lead skips straight to
              where it belongs; anything that only looks similar is listed for you to decide, because two client records
              for one company means two owners and two agreements.
            </p>
            {fakeTa() && (
              <p className="mt-1 text-[12px] text-ink-faint">
                The TA System is still a stand-in, so it answers with sample clients.
              </p>
            )}
            {mayManage ? (
              <form action={checkLeadDuplicate} className="mt-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <button className={button}>Check the TA System</button>
              </form>
            ) : (
              <p className="mt-2 text-[13px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Banking or finance?</h2>
            {lead.industryFlagged ? (
              <p className="mt-1 text-[13px]">
                This looks like banking or finance, because of the word <strong>{lead.industryBecause}</strong>. We do
                not work in that industry, whatever the role.
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-ink-soft">
                Nothing about this one looks like banking or finance.
                {lead.industryConfirmedBy ? " " + nameOf(lead.industryConfirmedBy) + " looked and cleared it." : ""}
              </p>
            )}
            {mayManage && lead.industryFlagged && (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <button className={button}>Yes — decline them</button>
                </form>
                <form action={decideLeadIndustry}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="decision" value="clear" />
                  <button className={button}>No — they are not</button>
                </form>
              </div>
            )}
            {lead.industryFlagged && (
              <p className="mt-2 text-[12px] text-ink-faint">
                Declining is permanent: the reason is saved and they are never invited back.
              </p>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">The intro call</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              A TA lead is on every intro call. Booking it starts two reminders: the day before at nine, and an hour
              before.
            </p>

            {meetings.length === 0 && <p className="mt-2 text-[13px] text-ink-soft">Not booked yet.</p>}

            {meetings.map((meeting) => (
              <div key={meeting.id} className="mt-3 border-t border-rule pt-3 first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[13.5px]">{KIND_MEANINGS[meeting.kind as MeetingKind] ?? meeting.kind}</span>
                  <span className="text-[13.5px]">{whenLocal(meeting.at)}</span>
                  <span className="text-[12px] text-ink-faint">
                    {MEETING_STATES[meeting.state as MeetingState] ?? meeting.state}
                    {meeting.rebookCount > 0 ? " · attempt " + meeting.rebookCount + " of " + MAX_REBOOKS : ""}
                  </span>
                </div>
                {meeting.reason && <p className="mt-1 text-[12.5px] text-ink-soft">{meeting.reason}</p>}
                {meeting.brief && (
                  <p className="mt-1 whitespace-pre-wrap text-[13px]">
                    <span className="text-ink-soft">What they said: </span>
                    {meeting.brief}
                  </p>
                )}
                {(meeting.role || meeting.packageSaid) && (
                  <p className="mt-1 text-[12.5px] text-ink-soft">
                    {meeting.role || "position not said"} · {meeting.packageSaid || "package not said"}
                  </p>
                )}

                {mayManage && meeting.state === "booked" && (
                  <div className="mt-3 flex flex-col gap-4">
                    <form action={markMeetingHeld} className="flex flex-col gap-2">
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        It happened — what did they say?
                        <textarea name="brief" rows={3} className={field_cls} />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          The position
                          <input name="role" className={field_cls} />
                        </label>
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          The package they mentioned
                          <input name="packageSaid" className={field_cls} />
                        </label>
                      </div>
                      <button className={button}>It was held</button>
                      <p className="text-[12px] text-ink-faint">
                        This is the only record of the brief until the opening exists, so it cannot be left empty. The
                        agreement clock starts when you save.
                      </p>
                    </form>

                    <form action={markMeetingNotHeld} className="flex flex-col gap-2 border-t border-rule pt-3">
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        It did not happen — why?
                        <input name="reason" className={field_cls} />
                      </label>
                      <label className="flex items-start gap-2 text-[13px]">
                        <input type="checkbox" name="clientReplied" className="mt-0.5" />
                        <span>
                          The client is still answering us
                          <span className="block text-[12px] text-ink-faint">
                            Leave this unticked if they have gone quiet. {MAX_REBOOKS} attempts with no reply closes the
                            lead.
                          </span>
                        </span>
                      </label>
                      <button className={button}>It was not held</button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {mayManage && !next && (
              <form action={bookIntroCall} className="mt-3 flex flex-col gap-3 border-t border-rule pt-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    When (Colombo time)
                    <input type="datetime-local" name="at" required className={field_cls} />
                  </label>
                  <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                    Which TA lead is joining
                    {taLeads.length > 0 ? (
                      <select name="taLeadId" className={field_cls}>
                        {taLeads.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input name="taLeadId" placeholder="their name" className={field_cls} />
                    )}
                  </label>
                </div>
                <button className={button}>{meetings.length ? "Book it again" : "Book the intro call"}</button>
                {!taSide.ok && (
                  <p className="text-[12px] text-ink-faint">
                    The TA System could not be asked for its people ({taSide.reason}), so type the name.
                  </p>
                )}
              </form>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">The agreement</h2>

            {!esa && (
              <>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Not started. It goes out within {db.settings.find((x) => x.key === "esa.sendHours")?.value ?? 2} hours
                  of the intro call, and the numbers come from the settings.
                </p>
                {mayManage && (
                  <form action={startAgreement} className="mt-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className={button}>Start the agreement</button>
                  </form>
                )}
              </>
            )}

            {esa && (
              <>
                <p className="mt-1 text-[13.5px]">
                  {ESA_STATES[esa.state as EsaState] ?? esa.state} · version {esa.version}
                </p>
                <p className="mt-1 text-[13px] text-ink-soft">{whereItStands({ ...esa, state: esa.state as EsaState }, Date.now())}</p>
                {esa.reason && <p className="mt-1 text-[13px]">{esa.reason}</p>}

                {(esa.state === "draft" || esa.state === "negotiating") && (
                  <>
                    {!esaTemplate && (
                      <p className="mt-3 rounded-lg border border-rule bg-paper px-3 py-2 text-[13px]">
                        <span className="font-medium">Waiting on one thing:</span> the agreement itself, as a Word file
                        with its variable fields. Upload it on the Files screen as “Agreement, drafted” and leave it
                        unattached to anything, and it becomes the template every client&apos;s agreement is filled
                        from.
                      </p>
                    )}
                    {mayManage && (
                      <form action={saveAgreementFields} className="mt-3 flex flex-col gap-3">
                        <input type="hidden" name="esaId" value={esa.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          {ESA_FIELDS.map((field) => (
                            <label key={field.key} className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                              {field.label}
                              {field.required ? "" : " (optional)"}
                              <input
                                name={"field." + field.key}
                                defaultValue={esa.fields[field.key] ?? ""}
                                className={field.key === "notes" ? field_wide : field_cls}
                              />
                              <span className="text-[11.5px] text-ink-faint">{field.why}</span>
                            </label>
                          ))}
                        </div>
                        <button className={button}>Save the fields</button>
                      </form>
                    )}
                    {esaMissing.length > 0 && (
                      <p className="mt-2 text-[12.5px] text-ink-faint">
                        Still blank: {esaMissing.map((f) => f.label.toLowerCase()).join(", ")}. It cannot be sent until
                        these are in — a draft went to a client with placeholders in it once.
                      </p>
                    )}
                    {mayManage && (
                      <form action={sendAgreement} className="mt-3">
                        <input type="hidden" name="esaId" value={esa.id} />
                        <button className={button}>
                          {esa.state === "negotiating"
                            ? "Draft the cover email and send version " + (esa.version + 1)
                            : "Draft the cover email and send"}
                        </button>
                        {esa.state === "negotiating" && (
                          <p className="mt-2 text-[12px] text-ink-faint">
                            The version number moves on, the chase starts from the beginning, and the two weeks start
                            again from this send.
                          </p>
                        )}
                      </form>
                    )}
                  </>
                )}

                {(esa.state === "sent" || esa.state === "chasing") && mayManage && (
                  <div className="mt-3 flex flex-col gap-4">
                    <form action={draftNextChase}>
                      <input type="hidden" name="esaId" value={esa.id} />
                      <button className={button}>
                        {nextChase ? "Draft: " + nextChase.what.toLowerCase() : "The chase has run out"}
                      </button>
                    </form>

                    <form action={recordAgreementSigned} className="flex flex-col gap-2 border-t border-rule pt-3">
                      <input type="hidden" name="esaId" value={esa.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        The signed copy came back — which file is it?
                        <select name="fileId" className={field_cls} defaultValue="">
                          <option value="">— pick the uploaded file —</option>
                          {signedFiles.map((file) => (
                            <option key={file.id} value={file.id}>
                              {file.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-start gap-2 text-[13px]">
                        <input type="checkbox" name="checked" className="mt-0.5" />
                        <span>
                          I have looked at it: signed, dated and sealed
                          <span className="block text-[12px] text-ink-faint">
                            A copy came back unsealed once and had to be resent.
                          </span>
                        </span>
                      </label>
                      <button className={button}>It is signed</button>
                    </form>

                    <form action={recordChangesWanted} className="flex flex-col gap-2 border-t border-rule pt-3">
                      <input type="hidden" name="esaId" value={esa.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        They want changes before signing — what, exactly?
                        <textarea name="what" rows={2} className={field_wide} />
                      </label>
                      <button className={button}>They want changes</button>
                      <p className="text-[12px] text-ink-faint">
                        The chasing stops, a meeting goes on your list, and the two weeks keep running.
                      </p>
                    </form>

                    <form action={declineAgreement} className="flex flex-col gap-2 border-t border-rule pt-3">
                      <input type="hidden" name="esaId" value={esa.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        They will not sign — why?
                        <input name="reason" className={field_cls} />
                      </label>
                      <button className={button}>No agreement</button>
                      <p className="text-[12px] text-ink-faint">
                        The team is told the search is blocked, and the lead closes.
                      </p>
                    </form>
                  </div>
                )}

                {esa.state === "signed" && mayManage && (
                  <form action={recordAgreementCountersigned} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="esaId" value={esa.id} />
                    <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                      The Director has countersigned — which file is it?
                      <select name="fileId" className={field_cls} defaultValue="">
                        <option value="">— pick the uploaded file —</option>
                        {countersignedFiles.map((file) => (
                          <option key={file.id} value={file.id}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className={button}>It is countersigned</button>
                    <p className="text-[12px] text-ink-faint">
                      Their copy goes back to them, and the requirement meeting is next.
                    </p>
                  </form>
                )}
              </>
            )}
          </section>

          <section className={card}>
            <h2 className="text-[14.5px] font-medium">The requirement, and handing it over</h2>

            {!agreementDone && (
              <p className="mt-1 text-[13px] text-ink-soft">
                Nothing starts here until the agreement is signed. That is the owner&apos;s rule, and it is also what
                stops us working for nothing.
              </p>
            )}

            {agreementDone && (
              <>
                {!requirementMeeting && (
                  <>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      The requirement meeting is next, with a TA lead on it. No work starts on a position until it has
                      actually happened.
                    </p>
                    {mayManage && (
                      <form action={bookRequirementMeeting} className="mt-3 flex flex-wrap items-end gap-3">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          When (Colombo time)
                          <input type="datetime-local" name="at" required className={field_cls} />
                        </label>
                        <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          Which TA lead is joining
                          <select name="taLeadId" className={field_cls}>
                            {taPeopleList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className={button}>Book the requirement meeting</button>
                      </form>
                    )}
                  </>
                )}

                {requirementMeeting && (
                  <p className="mt-1 text-[13px] text-ink-soft">
                    The requirement meeting is {MEETING_STATES[requirementMeeting.state as MeetingState] ?? requirementMeeting.state}
                    {" · "}
                    {whenLocal(requirementMeeting.at)}
                    {requirementMeeting.brief ? " · the brief is written down" : ""}
                  </p>
                )}

                {mayManage && aiOn && (
                  <form action={dictateRequirement} className="mt-3 flex flex-col gap-2 border-t border-rule pt-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                      Say the brief instead of typing it
                      <textarea name="said" rows={3} className={field_wide} />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Dictate into="said" label="Hold a moment and speak" />
                      <button className={plain}>Put it into the fields</button>
                    </div>
                    <p className="text-[12px] text-ink-faint">
                      The listening is your browser&rsquo;s own, so it costs nothing and nothing leaves this machine
                      until you press the button. The fields are filled in for you to correct; nothing saves itself,
                      and what was not said is left empty and named.
                    </p>
                  </form>
                )}

                {mayManage && (
                  <form action={saveRequirement} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {REQUIREMENT_FIELDS.map((f) => (
                        <label key={f.key} className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                          {f.label}
                          {f.required ? "" : " (optional)"}
                          {f.key === "jdNotes" || f.key === "insights" ? (
                            <textarea
                              name={"field." + f.key}
                              rows={3}
                              defaultValue={requirement?.fields[f.key] ?? dictated?.[f.key as keyof typeof dictated] ?? ""}
                              className={field_wide}
                            />
                          ) : (
                            <input
                              name={"field." + f.key}
                              defaultValue={requirement?.fields[f.key] ?? dictated?.[f.key as keyof typeof dictated] ?? ""}
                              className={field_cls}
                            />
                          )}
                          <span className="text-[11.5px] text-ink-faint">{f.why}</span>
                        </label>
                      ))}
                    </div>
                    <button className={button}>Save the requirement</button>
                    <p className="text-[12px] text-ink-faint">
                      The opening in the TA System is built from these fields and nothing else. &ldquo;The requirement
                      was in the TA lead&apos;s head&rdquo; is the fault this exists for.
                    </p>
                  </form>
                )}

                {requirementBlanks.length > 0 && (
                  <p className="mt-2 text-[12.5px] text-ink-faint">
                    Still blank: {requirementBlanks.map((f) => f.label.toLowerCase()).join(", ")}. It cannot go to the
                    TA System until these are in.
                  </p>
                )}

                {requirement && !requirement.practical && (
                  <p className="mt-2 text-[13px]">
                    Not practical at that package: {requirement.reason}
                    {requirement.inviteBackAt ? " · inviting them back on " + whenLocal(requirement.inviteBackAt) : ""}
                  </p>
                )}

                {requirement && requirement.openedAt === null && requirement.practical && mayManage && (
                  <>
                    <form action={handOverToTa} className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-3">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        Primary TA (the TA lead decides)
                        <select name="primaryTaId" className={field_cls} defaultValue="">
                          <option value="">— not yet —</option>
                          {taPeopleList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                        The 100% day
                        <input type="date" name="hundredPercentDay" className={field_cls} />
                      </label>
                      <button className={button}>Hand it to the TA System</button>
                    </form>
                    <p className="mt-2 text-[12px] text-ink-faint">
                      The opening is queued for the TA System, not created here: TA owns openings, and its own event
                      tells us the opening id. The brief goes exactly as written above.
                    </p>
                  </>
                )}

                {requirement?.openedAt && (
                  <p className="mt-3 text-[13px]">
                    Handed over on {whenLocal(requirement.openedAt)}
                    {position && (
                      <>
                        {" · "}
                        <Link href={"/positions/" + position.id} className="text-brand hover:underline">
                          the position
                        </Link>
                      </>
                    )}
                  </p>
                )}

                {requirement && requirement.practical && requirement.openedAt === null && mayManage && (
                  <form action={markRoleImpractical} className="mt-4 flex flex-col gap-2 border-t border-rule pt-3">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                      Or: the role cannot be filled at that package — why?
                      <textarea name="reason" rows={2} className={field_wide} />
                    </label>
                    <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                      Ask them again on
                      <input type="date" name="inviteBackAt" className={field_cls} />
                    </label>
                    <button className={button}>Not practical at that package</button>
                    <p className="text-[12px] text-ink-faint">
                      A polite reply is drafted, the lead closes with its reason, and we are reminded to go back to
                      them. A no today is not a no for ever.
                    </p>
                  </form>
                )}
              </>
            )}
          </section>
          <section className={card}>
            <h2 className="text-[14.5px] font-medium">Close this lead</h2>
            {mayManage ? (
              <form action={closeLead} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  Why it is closing
                  <select name="state" className={field_cls} defaultValue="closed_other">
                    <option value="closed_silent">They stopped answering</option>
                    <option value="closed_other">Something else</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                  In your own words
                  <input name="reason" className={field_cls} />
                </label>
                <button className={button}>Close it</button>
                <p className="text-[12px] text-ink-faint">Nothing closes without a reason written down.</p>
              </form>
            ) : (
              <p className="mt-2 text-[13px] text-ink-faint">{refusal("client.manage")}</p>
            )}
          </section>
        </>
      )}

      <section className={card}>
        <h2 className="text-[14.5px] font-medium">What happened to it</h2>
        {db.audit
          .filter((entry) => entry.subjectType === "lead" && entry.subjectId === lead.id)
          .sort((a, b) => b.at - a.at)
          .map((entry) => (
            <div key={entry.id} className="border-t border-rule py-2 text-[13px] first:border-t-0">
              <span>{entry.action}</span>{" "}
              <span className="text-ink-soft">
                {nameOf(entry.actorId)} · {when(entry.at)}
                {entry.reason ? " · " + entry.reason : ""}
              </span>
            </div>
          ))}
      </section>
    </div>
  );
}
