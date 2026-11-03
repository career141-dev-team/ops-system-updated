import { addLead, createTask, desk, leadsNewestFirst } from "@/data/desk";
import { HOUR } from "@/lib/calendar";
import { flagIndustry, nameKey } from "@/lib/leads";
import {
  alreadyArrived,
  keyAccepted,
  looksLikeABot,
  problemWithWebLead,
  readWebLead,
  whoTakesIt,
  type WebLeadIn,
} from "@/lib/webLead";

/**
 * The door the website knocks on (15, Phase 2 step 6; owner's decision 2).
 *
 * The contact form on career141.com posts here and the lead is on the Leads
 * screen a second later, with an owner and a task - instead of an email to
 * hello@ that somebody has to notice and type in.
 *
 *   curl -X POST https://<ops>/api/leads/website \
 *     -H "x-ops-lead-key: <the key>" -H "content-type: application/json" \
 *     -d '{"company":"Sample Ltd","contactEmail":"hr@sample.lk","notes":"Need a finance manager"}'
 *
 * The key goes in a header, never in the address, so it cannot end up in a web
 * server log. The website keeps emailing hello@ as well if it likes: nothing
 * here stops that, and the two together are how we tell whether this works.
 *
 * What it answers, and why: 401 with no key, 400 for a form that cannot be
 * used (the website logs the reason), 200 for a lead written down, and 200 for
 * the same form sent twice - with the id of the lead that already arrived,
 * because a double-click is not an error for the website to retry.
 */
export async function POST(request: Request): Promise<Response> {
  if (!keyAccepted(request.headers.get("x-ops-lead-key"))) {
    return Response.json({ ok: false, reason: "This needs the website key in the x-ops-lead-key header." }, { status: 401 });
  }

  let body: WebLeadIn;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      body = (await request.json()) as WebLeadIn;
    } else {
      // A plain HTML form posts this way, which is the simplest thing for a
      // website to do and so the thing it will probably do.
      body = Object.fromEntries(await request.formData()) as WebLeadIn;
    }
  } catch {
    return Response.json({ ok: false, reason: "The body was neither JSON nor a form." }, { status: 400 });
  }

  const lead = readWebLead(body);

  // A bot is answered exactly as a person is, and nothing is written down.
  // Telling a bot it was caught only teaches whoever wrote it.
  const bot = looksLikeABot(body, lead);
  if (bot) return Response.json({ ok: true, leadId: null }, { status: 200 });

  const problem = problemWithWebLead(lead);
  if (problem) return Response.json({ ok: false, reason: problem }, { status: 400 });

  const db = await desk();
  const now = Date.now();
  const key = nameKey(lead.company);

  const again = alreadyArrived(leadsNewestFirst(db), { ...lead, nameKey: key }, now);
  if (again) return Response.json({ ok: true, leadId: again.id, already: true }, { status: 200 });

  const owner = whoTakesIt(db.members, db.leads);
  if (!owner) {
    // Nobody to give it to is our problem, not the website's: it should keep
    // the form and try again, so 503 rather than a refusal.
    return Response.json({ ok: false, reason: "Nobody is here to take it." }, { status: 503 });
  }

  const flag = flagIndustry({ company: lead.company, industry: lead.industry, website: lead.website, notes: lead.notes });
  const written = await addLead({
    ...lead,
    nameKey: key,
    source: "website",
    industryFlagged: flag.flagged,
    industryBecause: flag.because,
    industryConfirmedBy: null,
    state: "new",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    ownerId: owner.id,
    // Nobody typed it, so nobody is named as having created it.
    createdBy: null,
  });

  await createTask({
    kind: "check",
    title: "New lead from the website: " + lead.company,
    body:
      "It arrived by itself, so nobody has read it yet.\n\n" +
      [lead.contactName, lead.contactEmail, lead.contactPhone].filter(Boolean).join(" · ") +
      (lead.notes ? "\n\nWhat they asked for: " + lead.notes : ""),
    assigneeId: owner.id,
    // Due within the hour, not this instant: a lead that has just arrived
    // showed as "0 minutes late" on the owner's day, which is not what late
    // means (3 Nov).
    dueAt: now + HOUR,
    subjectType: "lead",
    subjectId: written.id,
    link: "/leads/" + written.id,
  });

  return Response.json({ ok: true, leadId: written.id }, { status: 200 });
}

/** A browser opening the address should learn what it is, not see a crash. */
export function GET(): Response {
  return Response.json(
    { ok: false, reason: "Post the website form here, with the key in the x-ops-lead-key header." },
    { status: 405 },
  );
}
