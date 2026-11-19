import type { OpsDatabase } from "@/data/types";

/** Who a task, draft or conversation is about, by name: the client line. */
export function aboutWhom(db: OpsDatabase, type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  if (type === "lead") return db.leads.find((l) => l.id === id)?.company ?? null;
  if (type === "client") return db.clients.find((c) => c.id === id)?.name ?? null;
  if (type === "clientSet") return db.clientSets.find((s) => s.id === id)?.name.split(">")[0]?.trim() || null;
  return null;
}

/** What a conversation is filed to, in words and where it opens. */
export function filedTo(db: OpsDatabase, about: { type: string; id: string }): { said: string; href: string } {
  const { type, id } = about;
  const named = (word: string, name: string | null | undefined) => (name ? word + " · " + name : word);
  if (type === "clientSet") return { said: named("CV set", db.clientSets.find((s) => s.id === id)?.name), href: "/sets/" + id };
  if (type === "client") return { said: named("Client", aboutWhom(db, type, id)), href: "/clients/" + id };
  if (type === "lead") return { said: named("Lead", aboutWhom(db, type, id)), href: "/leads/" + id };
  if (type === "invoice") return { said: named("Invoice", db.invoices.find((i) => i.id === id)?.number), href: "/invoices/" + id };
  if (type === "esa") return { said: "the agreement", href: "/mail" };
  return { said: "the " + type, href: "/" + type + "s/" + id };
}
