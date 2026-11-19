import Link from "next/link";
import { openCloseByHand, setOpeningPeople, setPositionTeam } from "@/app/actions";
import Icon from "@/app/Icon";
import { Contacts } from "@/app/ui/Contacts";
import { Avatar, FoldRow, RelatedLinks, NextStepCard, StatTile, figmaField, figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { numberOf } from "@/data/desk";
import { OWNERSHIP_WORKING_DAYS, ownershipWindow } from "@/lib/clientFeedback";
import { depthInWords } from "@/lib/depth";
import { handoverInWords } from "@/lib/requirements";
import { can } from "@/lib/roles";

import type { RoleCtx, TabProps } from "./ctx";
export default function Overview({ c, sp }: TabProps) {
  const { db, position, now, mayManage, client, clientName, queued, taPeopleList, primaryTaPerson, taName, ad, hold, checklist, itsSets, waitingSet, readySet, guarantee, step, allCandidates, related, waitingOn, whenDate, daysOpen, stage } = c;
  return (
        <div className="flex flex-col gap-6">
          <RelatedLinks items={related} active="opening" />

          {waitingSet ? (
            (() => {
              const silentDays = waitingSet.receivedAt
                ? Math.floor((now - waitingSet.receivedAt) / 86_400_000)
                : 0;
              const undecided = waitingSet.candidates.filter((c) => !c.decision).length;
              // Late only past the feedback-chase setting (18 Nov: it said "late" after one day whatever the setting).
              const isLate = silentDays > numberOf(db, "feedback.chaseDays", 1);
              return (
                <NextStepCard
                  eyebrow="WHOSE MOVE · THE CLIENT’S"
                  clock={silentDays === 0 ? "Sent today" : silentDays === 1 ? "Sent a day ago" : `Sent ${silentDays} days ago`}
                  clockTone={isLate ? "danger" : "warn"}
                  title={`${clientName} hasn’t replied on ${waitingSet.name}`}
                  body={`Sent ${waitingSet.sentAt ? whenDate(waitingSet.sentAt) : "recently"} · ${waitingSet.candidates.length} CVs · ${undecided} still waiting for a yes or no.`}
                  actions={
                    <>
                      {client && (
                        <Link href={`/clients/${client.id}?view=activity`} className={pillSecondary}>
                          Call {client.billingName || clientName}
                        </Link>
                      )}
                      <Link href={`/sets/${waitingSet.id}`} className={pillPrimary}>
                        Open {waitingSet.name}
                        <Icon name="arrow-right" size={16} />
                      </Link>
                    </>
                  }
                />
              );
            })()
          ) : (
            <NextStepCard
              eyebrow={
                step.where.toLowerCase().includes("ta")
                  ? "WHOSE MOVE · THE TA’S"
                  : step.where.toLowerCase().includes("client")
                    ? "WHOSE MOVE · THE CLIENT’S"
                    : "WHOSE MOVE · OURS"
              }
              clock={step.clock ?? `Open ${daysOpen} ${daysOpen === 1 ? "day" : "days"}`}
              clockTone={hold?.state === "proposed" ? "danger" : "warn"}
              title={
                ad?.state === "flyer"
                  ? `${taName} is searching — one thing for you`
                  : step.waiting
              }
              body={
                ad?.state === "flyer"
                  ? "Marketing made the TopJobs flyer. Ops sends it; the ad closes by itself after two weeks."
                  : handoverInWords(position, queued)
              }
              actions={
                <>
                  {ad?.state === "flyer" ? (
                    <Link href={`/adverts/${ad.id}`} className={pillPrimary}>
                      Send the TopJobs flyer
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : !position.jdApprovedAt ? (
                    <Link href={`/positions/${position.id}?view=jd`} className={pillPrimary}>
                      Review & approve the JD
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : readySet ? (
                    <Link href={`/sets/${readySet.id}`} className={pillPrimary}>
                      Open {readySet.name}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : !position.linkedInUrl ? (
                    <Link href={`/positions/${position.id}?view=advertising`} className={pillPrimary}>
                      Record LinkedIn post
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : (
                    <Link href={`/positions/${position.id}?view=candidates`} className={pillPrimary}>
                      View candidates ({allCandidates.length})
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  )}
                  <Link href={`/positions/${position.id}?view=advertising`} className={pillSecondary}>
                    Advertising
                  </Link>
                </>
              }
            />
          )}

          {/* Metric StatTiles row: 4 tiles when with client (1:950), 3 tiles + lock note when with TA (1:3752) */}
          {waitingSet ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                value={String(waitingSet.candidates.length)}
                caption="CVs with the client"
              />
              {(() => {
                // The real window, in working days with holidays (18 Nov: was a calendar "Day n of 7").
                const closesAt = waitingSet.receivedAt
                  ? ownershipWindow(waitingSet.receivedAt, db.holidays.map((h) => h.date), numberOf(db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS)).closesAt
                  : null;
                return (
                  <StatTile
                    value={closesAt === null ? "Not received" : closesAt < now ? "Closed" : "To " + whenDate(closesAt)}
                    caption="client owns these CVs"
                  />
                );
              })()}
              <StatTile
                value={String(
                  itsSets.reduce(
                    (sum, s) => sum + s.candidates.filter((c) => c.decision === "shortlisted").length,
                    0,
                  ),
                )}
                caption="shortlisted so far"
              />
              <StatTile
                value={String(allCandidates.filter((c) => !c.setId && c.level !== "out").length)}
                caption="not in a set yet"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <StatTile
                  value={String(allCandidates.length)}
                  caption="candidates so far"
                />
                <StatTile
                  value={String(allCandidates.filter((c) => c.setId).length)}
                  caption="in a CV set"
                />
                <StatTile
                  value={position.linkedInUrl ? "LinkedIn live" : "LinkedIn pending"}
                  caption={
                    position.linkedInPostedAt
                      ? `since ${whenDate(position.linkedInPostedAt)}`
                      : "TA posts before going Live"
                  }
                />
              </div>

              <div className="flex items-center gap-2 px-1 text-[12px] font-medium tracking-[0.4px] text-ink-faint">
                <Icon name="lock" size={14} />
                <span>
                  Search details live in the TA System. You’ll see the first CV set here when the Director has chosen it.
                </span>
              </div>
            </>
          )}

          {waitingOn.length > 0 && (
            <div className="flex flex-col gap-2 rounded-[24px] bg-sunk px-6 py-5">
              <span className={figmaLabel}>WAITING ON · REMINDERS, CHASES AND TASKS</span>
              <ul className="flex flex-col gap-1 text-[14px] text-ink-soft">
                {waitingOn.slice(0, 8).map((w) => (
                  <li key={w.key}>
                    <span className="text-ink">{w.text}</span> · {w.when}
                  </li>
                ))}
              </ul>
            </div>
          )}


          <Contacts
            scope="position"
            id={position.id}
            contacts={position.contacts ?? []}
            mayManage={mayManage}
            heading="EXTRA PEOPLE FOR THIS POSITION"
            hint={
              "Anyone about this role only, such as the team lead who is hiring. They are written to as well as " +
              clientName +
              "'s standard contacts, who are on the client's page."
            }
          />

          {/* Collapsible FoldRows (1:964) */}
          <div className="flex flex-col gap-2.5">
            <FoldRow
              title="Closing checklist"
              summary={
                checklist
                  ? checklist.completedAt
                    ? `Closed ${whenDate(checklist.completedAt)}`
                    : "Checklist open — close the posts"
                  : "Starts when the fee is in"
              }
            >
              {checklist ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[14px] text-ink-soft">
                    The closing checklist is open for this role ({checklist.items.filter((i) => i.doneAt).length} of{" "}
                    {checklist.items.length} done).
                  </p>
                  <Link href={`/closes/${checklist.id}`} className={pillPrimary}>
                    Open closing checklist
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              ) : position.stage !== "closed" && position.openingTaId && mayManage ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[14px] text-ink-soft">
                    A guarantee ending, a refund, or a write-off opens the close list by itself. If the client has
                    stopped or the role was never practical, you can open the close checklist here.
                  </p>
                  <form action={openCloseByHand} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="positionId" value={position.id} />
                    <label className="flex min-w-[260px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Why it is closing
                      <select name="trigger" className={figmaField} defaultValue="client_stopped">
                        <option value="client_stopped">The client stopped the search</option>
                        <option value="impractical">The role was not practical at that salary</option>
                      </select>
                    </label>
                    <button type="submit" className={pillSecondary}>
                      Open the close list
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-[14px] text-ink-soft">
                  {position.openingTaId
                    ? "Closing checklist opens automatically when the guarantee completes or a role is stopped."
                    : "Waiting for TA to confirm the opening ID before a closing checklist can be opened."}
                </p>
              )}
            </FoldRow>

            <FoldRow
              title="People on this opening & the 100% day"
              summary={`Primary TA: ${primaryTaPerson?.fullName ?? (position.primaryTaId || "not set")}${(position.team ?? []).length ? ` + ${(position.team ?? []).length} more` : ""} · 100% day: ${position.hundredPercentDay || "not set"}`}
              defaultOpen
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className={figmaLabel}>PEOPLE ON THIS OPENING</span>
                  <ul className="flex flex-col divide-y divide-rule text-[14px]">
                    <li className="flex items-center gap-2 py-1.5">
                      <Avatar name={primaryTaPerson?.fullName ?? taName} size="28" tone="info" />
                      <span className="text-ink">{primaryTaPerson?.fullName ?? (position.primaryTaId || "Not set")}</span>
                      <span className="text-ink-soft">· Primary TA</span>
                    </li>
                    {(position.team ?? []).map((t) => {
                      const person = taPeopleList.find((p) => p.id === t.taId);
                      return (
                        <li key={t.taId} className="flex items-center gap-2 py-1.5">
                          <Avatar name={person?.fullName ?? t.taId} size="28" tone="neutral" />
                          <span className="text-ink">{person?.fullName ?? t.taId}</span>
                          {mayManage && (
                            <form action={setOpeningPeople} className="ml-auto">
                              <input type="hidden" name="positionId" value={position.id} />
                              <input type="hidden" name="op" value="remove" />
                              <input type="hidden" name="taId" value={t.taId} />
                              <button type="submit" className="text-[13px] text-ink-faint hover:text-danger">
                                Remove
                              </button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {mayManage && (
                    <form action={setOpeningPeople} className="flex flex-col gap-2 pt-2">
                      <input type="hidden" name="positionId" value={position.id} />
                      <input type="hidden" name="op" value="add" />
                      <span className="text-[12.5px] text-ink-soft">Add people (pick as many as you like, and add more later):</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {taPeopleList
                          .filter((p) => p.id !== position.primaryTaId && !(position.team ?? []).some((t) => t.taId === p.id))
                          .map((p) => (
                            <label key={p.id} className="flex items-center gap-1.5 text-[14px] text-ink">
                              <input type="checkbox" name="taId" value={p.id} />
                              {p.fullName}
                            </label>
                          ))}
                      </div>
                      <button type="submit" className={pillSecondary + " self-start"}>
                        Add them to the opening
                      </button>
                    </form>
                  )}
                </div>
                <p className="text-[14px] text-ink-soft">
                  {position.openingTaId
                    ? `Opening ${position.openingTaId}${position.taStatus ? ` · TA says: ${position.taStatus}` : ""}`
                    : "No opening ID yet — queued for the TA System."}
                </p>
                {mayManage && (
                  <form action={setPositionTeam} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="positionId" value={position.id} />
                    <input type="hidden" name="back" value={`/positions/${position.id}?view=overview`} />
                    <label className="flex min-w-[220px] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      Primary TA
                      <select name="primaryTaId" className={figmaField} defaultValue={position.primaryTaId ?? ""}>
                        <option value="">— leave as it is —</option>
                        {taPeopleList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-soft">
                      The 100% day
                      <input
                        type="date"
                        name="hundredPercentDay"
                        defaultValue={position.hundredPercentDay ?? ""}
                        className={figmaField}
                      />
                    </label>
                    <button type="submit" className={pillSecondary}>
                      Record it
                    </button>
                  </form>
                )}
              </div>
            </FoldRow>

            <FoldRow
              title="Shortlist depth"
              summary={depthInWords(position)}
            >
              <div className="flex flex-col gap-2 text-[14px] text-ink-soft">
                <p>{depthInWords(position)}</p>
                {position.depthStage === "hold_at_five" && (
                  <p className="font-medium text-warn">
                    No more CVs go to this client until they interview some of the five. Only the Ops Lead can send a set anyway.
                  </p>
                )}
              </div>
            </FoldRow>
          </div>
        </div>
  );
}
