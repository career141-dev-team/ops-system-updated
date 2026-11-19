import { NextResponse } from "next/server";

import { clientIn, desk } from "@/data/desk";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

export interface FindItem {
  id: string;
  title: string;
  sub: string;
  href: string;
  initials?: string;
}

const STATIC_ACTIONS: (FindItem & { keywords: string; needs?: "money.manage" | "settings.manage" })[] = [
  { id: "act-doj", title: "Move the DOJ", sub: "pick a placement", href: "/positions", keywords: "move doj joining date placement" },
  { id: "act-interview", title: "Book an interview", sub: "open interviews calendar", href: "/calendar", keywords: "book interview schedule slot time" },
  { id: "act-enquiry", title: "Add an enquiry", sub: "new client lead", href: "/leads?panel=add-enquiry", keywords: "add new enquiry lead client" },
  { id: "act-weekly", title: "Weekly report", sub: "preview and send to Mr Azeem", href: "/positions?send=weekly-report", keywords: "weekly report azeem director" },
  { id: "act-invoice", title: "Send an invoice", sub: "accounts · invoices to send", href: "/invoices", keywords: "invoice send billing money", needs: "money.manage" },
  { id: "act-payment", title: "Record a payment", sub: "match bank transfer or refund", href: "/invoices/payment", keywords: "payment refund match bank", needs: "money.manage" },
  { id: "act-settings", title: "Change a rule or template", sub: "settings · rules & wording", href: "/settings", keywords: "settings rule template chase cover", needs: "settings.manage" },
];

export async function GET(req: Request) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const matches = (...fields: (string | null | undefined)[]) => {
    if (!words.length) return true;
    const hay = fields.filter(Boolean).join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  };

  const db = await desk();

  const actions: FindItem[] = STATIC_ACTIONS.filter(
    (a) => (!a.needs || can(me, a.needs)) && matches(a.title, a.sub, a.keywords),
  )
    .slice(0, 4)
    .map(({ id, title, sub, href }) => ({ id, title, sub, href }));

  // People: placements + live interviews
  const peopleMap = new Map<string, FindItem>();
  for (const pl of db.placements) {
    const pos = pl.positionId ? db.positions.find((p) => p.id === pl.positionId) : null;
    const client = pl.clientId ? clientIn(db, pl.clientId) : null;
    if (!matches(pl.candidateName, client?.name, pos?.title, "doj", "joining", "placement")) continue;
    const key = "pl_" + pl.id;
    const init = pl.candidateName.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
    peopleMap.set(key, {
      id: key,
      title: pl.candidateName,
      sub: [pl.state, client?.name, pos?.title].filter(Boolean).join(" · "),
      href: pos ? `/positions/${pos.id}?view=offer` : `/placements/${pl.id}`,
      initials: init,
    });
    if (peopleMap.size >= 4) break;
  }
  if (peopleMap.size < 4) {
    for (const iv of db.interviews) {
      const pos = iv.positionId ? db.positions.find((p) => p.id === iv.positionId) : null;
      const client = iv.clientId ? clientIn(db, iv.clientId) : null;
      if (!matches(iv.candidateName, client?.name, pos?.title, "interview")) continue;
      const key = "iv_" + iv.id;
      const init = iv.candidateName.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
      peopleMap.set(key, {
        id: key,
        title: iv.candidateName,
        sub: [`Round ${iv.round}`, client?.name, pos?.title].filter(Boolean).join(" · "),
        href: pos ? `/positions/${pos.id}?view=interviews` : `/interviews/${iv.id}`,
        initials: init,
      });
      if (peopleMap.size >= 4) break;
    }
  }

  // Roles: open positions
  const roles: FindItem[] = db.positions
    .filter((p) => p.stage !== "closed")
    .filter((p) => {
      const client = p.clientId ? clientIn(db, p.clientId) : null;
      return matches(p.title, client?.name, p.stage);
    })
    .slice(0, 4)
    .map((p) => {
      const client = p.clientId ? clientIn(db, p.clientId) : null;
      return {
        id: "pos_" + p.id,
        title: p.title,
        sub: [client?.name, p.stage].filter(Boolean).join(" · "),
        href: `/positions/${p.id}`,
      };
    });

  // Recent: clients + active sets
  const recent: FindItem[] = [];
  for (const s of db.clientSets) {
    if (!matches(s.name, s.role, `set ${s.setNumber}`)) continue;
    const pos = db.positions.find((p) => p.openingTaId === s.openingTaId);
    recent.push({
      id: "set_" + s.id,
      title: `SET ${s.setNumber}`,
      sub: `${s.name} · ${s.state}`,
      href: pos ? `/positions/${pos.id}?view=sets` : `/sets/${s.id}`,
    });
    if (recent.length >= 2) break;
  }
  for (const c of db.clients) {
    if (!matches(c.name, c.stage)) continue;
    recent.push({
      id: "cli_" + c.id,
      title: c.name,
      sub: `Client · ${c.stage}`,
      href: `/clients/${c.id}`,
    });
    if (recent.length >= 4) break;
  }

  return NextResponse.json({
    ok: true,
    actions,
    people: [...peopleMap.values()],
    roles,
    recent,
  });
}
