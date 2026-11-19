import { NextResponse } from "next/server";

import { findAll } from "@/app/find/search";
import { desk } from "@/data/desk";
import { currentMember } from "@/lib/session";

export type { FindItem } from "@/app/find/search";

export async function GET(req: Request) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ ok: true, ...findAll(me, await desk(), q) });
}
