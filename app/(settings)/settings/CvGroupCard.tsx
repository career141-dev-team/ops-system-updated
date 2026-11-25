import { answerCvJoinRequest, createCvGroup, refreshCvGroupLink, chooseCvGroup } from "@/app/actions";
import CopyButton from "@/app/hiring/CopyButton";
import { figmaField, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { cvGroupState } from "@/data/desk";
import type { OpsDatabase } from "@/data/types";
import { listGroupJoinRequests } from "@/lib/senders";

/**
 * The WhatsApp group CVs are posted in (25 Nov). Made from here through Meta's Groups API; Meta reports the group's id
 * and invite link by webhook, so the card first says it is waiting. Join requests are read live, only once a group
 * is set up and the token is there. Shown to everyone; the buttons only to those who may change settings.
 */
export default async function CvGroupCard({ db, mayChange }: { db: OpsDatabase; mayChange: boolean }) {
  const { groupId, link, problem, asked } = cvGroupState(db);
  const hasToken = Boolean((process.env.OPS_WHATSAPP_TOKEN ?? "").trim());
  const requests = mayChange && groupId && hasToken ? await listGroupJoinRequests(groupId) : null;

  return (
    <div className="border-t border-rule pt-5">
      <p className="t-micro mb-3 text-ink-3">WhatsApp CV group</p>
      <div className="flex flex-col gap-2.5">
        {problem && <p className="t-small text-ink">{problem}</p>}

        {!groupId && (
          <>
            <p className="t-small text-ink-3">
              {asked
                ? "Asked WhatsApp to make the group; the link appears here when WhatsApp confirms."
                : "No CV group yet. CVs posted in the group are read like a Scoop."}
            </p>
            {mayChange ? (
              <div className="flex flex-wrap items-end gap-3">
                <form action={createCvGroup}>
                  <button type="submit" className={pillPrimary}>{asked ? "Ask again" : "Create group"}</button>
                </form>
                <form action={chooseCvGroup} className="flex flex-wrap items-center gap-2">
                  <input name="groupId" placeholder="Or the id of a group made elsewhere" className={figmaField + " min-w-[240px] bg-sunk"} />
                  <button type="submit" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>Use this group</button>
                </form>
              </div>
            ) : (
              <p className="t-small text-ink-3">Only the ops lead can create it.</p>
            )}
          </>
        )}

        {groupId && !mayChange && <p className="t-small text-ink-3">A CV group is set up.</p>}

        {groupId && mayChange && (
          <>
            <p className="t-body text-ink">Group {groupId}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="t-small min-w-0 break-all text-ink-2">{link || "No invite link kept yet."}</p>
              {link && <CopyButton text={link} label="Copy link" />}
              {mayChange && (
                <form action={refreshCvGroupLink}>
                  <button type="submit" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>Refresh link</button>
                </form>
              )}
            </div>
            <p className="t-small text-ink-3">A group holds 8 people, us included.</p>

            <p className="t-label mt-1 text-ink">People asking to join</p>
            {!requests && <p className="t-small text-ink-3">Needs the Ops WhatsApp token (OPS_WHATSAPP_TOKEN) to ask WhatsApp.</p>}
            {requests && !requests.ok && <p className="t-small text-ink-3">{requests.reason}</p>}
            {requests?.ok && requests.requests.length === 0 && <p className="t-small text-ink-3">Nobody is waiting.</p>}
            {requests?.ok &&
              requests.requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-rule px-4 py-2">
                  <span className="t-small text-ink">{r.waId ? "+" + r.waId : r.username || r.userId}</span>
                  {mayChange && (
                    <form action={answerCvJoinRequest} className="flex gap-2">
                      <input type="hidden" name="requestId" value={r.id} />
                      <button name="answer" value="approve" className={pillPrimary + " !px-3.5 !py-1.5 !text-[12px]"}>Approve</button>
                      <button name="answer" value="reject" className={pillSecondary + " !px-3.5 !py-1.5 !text-[12px]"}>Reject</button>
                    </form>
                  )}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
