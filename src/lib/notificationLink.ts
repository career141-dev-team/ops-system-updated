/**
 * Where a notification opens (19 Nov, v6). The old lists /sets, /placements, /guarantees and /interviews now
 * redirect, so each subject goes to the thing that replaced it: the role page's tab, the calendar, the
 * agreements board. Pure: the caller hands over just the rows it needs.
 */
interface Opening { openingTaId: string | null; positionId?: string | null }
export interface LinkDb {
  positions: { id: string; openingTaId: string | null }[];
  clientSets: { id: string; openingTaId: string }[];
  interviews: (Opening & { id: string })[];
  placements: (Opening & { id: string })[];
  guarantees: { id: string; openingTaId: string }[];
  references?: { id: string; openingTaId: string }[];
}

const TAB: Record<string, string> = { clientSet: "sets", interview: "interviews", placement: "offer", guarantee: "guarantee", reference: "interviews" };

export function hrefForSubject(db: LinkDb, subjectType: string, id: string): string {
  const role = (one: { positionId?: string | null; openingTaId: string | null } | undefined) => {
    const pos = one?.positionId ?? db.positions.find((p) => one?.openingTaId && p.openingTaId === one.openingTaId)?.id;
    return pos ? `/positions/${pos}?view=${TAB[subjectType] ?? "overview"}` : null;
  };
  switch (subjectType) {
    case "client": return `/clients/${id}`;
    case "lead": return `/leads/${id}`;
    case "position": return `/positions/${id}`;
    case "clientSet": return role(db.clientSets.find((x) => x.id === id)) ?? "/positions";
    case "interview": return role(db.interviews.find((x) => x.id === id)) ?? "/calendar";
    case "meeting": return "/calendar";
    case "placement": return role(db.placements.find((x) => x.id === id)) ?? "/positions";
    case "guarantee": return role(db.guarantees.find((x) => x.id === id)) ?? "/positions";
    case "reference": return role(db.references?.find((x) => x.id === id)) ?? "/positions";
    case "invoice": return `/invoices/${id}`;
    case "esa": return "/clients/agreements";
    case "hold": return `/holds/${id}`;
    case "ad": return `/adverts/${id}`;
    case "close": return "/closes";
    case "report": return "/positions?panel=weekly-report";
    case "talentPulse": return "/talent-pulse";
    case "message": return `/messages/${id}`;
    default: return "/";
  }
}
