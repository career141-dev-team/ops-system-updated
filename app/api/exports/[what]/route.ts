import { NextResponse } from "next/server";

import { clientIn, desk, invoicesNewestFirst, member as memberIn, placementIn } from "@/data/desk";
import { invoicesCsv, paymentsCsv } from "@/lib/exports";
import { balanceOf, paidSoFar } from "@/lib/money";
import { can } from "@/lib/roles";
import { currentMember } from "@/lib/session";

/**
 * The money as a file (15, Phase 6 step 17).
 *
 * Two files, for accounts: what was invoiced, and what came in. Signed in and
 * `money.manage` only - this is every client's fee in one place, and a link
 * anybody could fetch would be the easiest leak in the system.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ what: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!can(member, "money.manage")) {
    return NextResponse.json({ error: "Invoices and payments are kept by accounts." }, { status: 403 });
  }

  const { what } = await params;
  const db = await desk();
  const invoices = invoicesNewestFirst(db);
  const nameOf = (clientId: string | null) => (clientId ? clientIn(db, clientId)?.name ?? "" : "");

  if (what === "invoices.csv") {
    const csv = invoicesCsv(
      invoices.map((i) => ({
        number: i.number,
        kind: i.kind,
        state: i.state,
        about: i.about,
        clientName: nameOf(i.clientId),
        candidateName: i.placementId ? placementIn(db, i.placementId)?.candidateName ?? "" : "",
        amount: i.amount,
        lateCharge: i.lateCharge,
        paid: paidSoFar(i),
        balance: balanceOf(i),
        currency: i.currency,
        sentAt: i.sentAt,
        dueAt: i.dueAt,
        paidAt: i.paidAt,
        writtenOffAt: i.writtenOffAt,
        disputed: i.disputed,
      })),
    );
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="career141-invoices.csv"',
        "cache-control": "no-store",
      },
    });
  }

  if (what === "payments.csv") {
    const rows = invoices.flatMap((i) =>
      i.payments.map((p) => ({
        invoiceNumber: i.number,
        clientName: nameOf(i.clientId),
        amount: p.amount,
        currency: i.currency,
        paidAt: p.paidAt,
        method: p.method,
        recordedBy: p.by ? memberIn(db, p.by)?.name ?? "" : "",
        note: p.note,
      })),
    );
    return new NextResponse(paymentsCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="career141-payments.csv"',
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "There are two: invoices.csv and payments.csv." }, { status: 404 });
}
