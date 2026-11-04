/**
 * The first-day import (15, Phase 8 step 11).
 *
 * On day one Ops has to know the clients it already has, who owns each of
 * them, which placements are inside their ninety days, and the holiday list.
 * None of that is in the system yet; it is in the team's sheets.
 *
 * Two rules, both from how the TA System does its migrations:
 *
 *   - **A dry run first, always.** Nothing is written until the same rows
 *     have been read, counted and looked at. The dry run and the real run use
 *     the same code, so what you looked at is what lands.
 *   - **A bad row stops itself, not the import.** Every row is checked and
 *     the ones that cannot be read are listed with their line number, so the
 *     sheet can be fixed and the file run again - the rows that were fine are
 *     recognised the second time and not doubled.
 *
 * Nothing here touches a database.
 */

/** What can be imported. One shape each, named the way the sheet is. */
export type ImportKind = "clients" | "holidays" | "members";

export const IMPORT_KINDS: Record<ImportKind, { what: string; columns: string[] }> = {
  clients: {
    what: "The clients we already have, and who owns each one",
    columns: ["company", "taClientId", "ownerEmail", "billingName", "billingEmail", "stage"],
  },
  holidays: {
    what: "The holiday list, so a working-day clock means the same as the TA System's",
    columns: ["date", "name"],
  },
  members: {
    what: "The ops people and their roles",
    columns: ["name", "email", "role"],
  },
};

export interface ImportRow {
  /** The line in the file, counted as a person counts them. */
  line: number;
  values: Record<string, string>;
}

export interface ImportProblem {
  line: number;
  what: string;
}

/**
 * Read a pasted sheet.
 *
 * Commas or tabs, because a sheet copied out of Excel is tab-separated and a
 * file saved from it is comma-separated, and nobody should have to know which
 * they have. Quoted commas are kept whole.
 */
export function readSheet(text: string): { header: string[]; rows: ImportRow[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { header: [], rows: [] };
  const split = (line: string): string[] => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') {
        quoted = !quoted;
        continue;
      }
      if (!quoted && (ch === "," || ch === "\t")) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }
      cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };

  const header = split(lines[0]).map((cell) => cell.replace(/\s+/g, "").toLowerCase());
  const rows = lines.slice(1).map((line, i) => {
    const cells = split(line);
    const values: Record<string, string> = {};
    header.forEach((key, at) => {
      values[key] = cells[at] ?? "";
    });
    // The line number as a person counts them: the header is line 1.
    return { line: i + 2, values };
  });
  return { header, rows };
}

/** The columns a kind needs, in the header's own spelling. */
export function missingColumns(kind: ImportKind, header: string[]): string[] {
  const wanted = IMPORT_KINDS[kind].columns.map((c) => c.toLowerCase());
  const required = kind === "clients" ? ["company", "taclientid", "owneremail"] : wanted;
  return required.filter((c) => !header.includes(c));
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const ROLES = [
  "ops_owner",
  "ops_lead",
  "accounts",
  "director_ops",
  "marketing",
  "director_ro",
  "ta_lead_ro",
];

/** What is wrong with one row, in words the person pasting it can act on. */
export function problemWithRow(kind: ImportKind, row: ImportRow): string | null {
  const v = row.values;
  if (kind === "clients") {
    if (!v.company) return "No company name.";
    if (!v.taclientid) return "No TA client id - without it nothing can be matched to the TA System.";
    if (!EMAIL.test(v.owneremail ?? "")) return "The owner's email does not look like an address.";
    if (v.billingemail && !EMAIL.test(v.billingemail)) return "The billing email does not look like an address.";
    return null;
  }
  if (kind === "holidays") {
    if (!DATE.test(v.date ?? "")) return "The date is not 2026-11-24 shaped.";
    if (!v.name) return "No name for the holiday.";
    return null;
  }
  if (!v.name) return "No name.";
  if (!EMAIL.test(v.email ?? "")) return "The email does not look like an address.";
  if (!ROLES.includes(v.role ?? "")) return "The role has to be one of: " + ROLES.join(", ") + ".";
  return null;
}

export interface ImportPlan {
  kind: ImportKind;
  /** Rows that will be made. */
  toAdd: ImportRow[];
  /** Rows that are already here, matched on their own key. */
  already: ImportRow[];
  problems: ImportProblem[];
}

/** The key a row is recognised by, so running a file twice adds nothing. */
export function keyOf(kind: ImportKind, row: ImportRow): string {
  if (kind === "clients") return (row.values.taclientid ?? "").toLowerCase();
  if (kind === "holidays") return row.values.date ?? "";
  return (row.values.email ?? "").toLowerCase();
}

/**
 * What the import would do, which is also what it does do.
 *
 * `existing` is the keys already in the database. The same function builds
 * the dry run and the real run, so there is no second code path to be wrong.
 */
export function planImport(kind: ImportKind, text: string, existing: string[]): ImportPlan {
  const { header, rows } = readSheet(text);
  const missing = missingColumns(kind, header);
  if (missing.length) {
    return {
      kind,
      toAdd: [],
      already: [],
      problems: [{ line: 1, what: "The file has no " + missing.join(", ") + " column." }],
    };
  }

  const known = new Set(existing.map((key) => key.toLowerCase()));
  const seen = new Set<string>();
  const plan: ImportPlan = { kind, toAdd: [], already: [], problems: [] };
  for (const row of rows) {
    const problem = problemWithRow(kind, row);
    if (problem) {
      plan.problems.push({ line: row.line, what: problem });
      continue;
    }
    const key = keyOf(kind, row).toLowerCase();
    if (known.has(key) || seen.has(key)) {
      plan.already.push(row);
      continue;
    }
    seen.add(key);
    plan.toAdd.push(row);
  }
  return plan;
}

/** The plan in words, which is what a dry run shows. */
export function planInWords(plan: ImportPlan): string {
  const bits = [
    plan.toAdd.length + (plan.toAdd.length === 1 ? " row to add" : " rows to add"),
    plan.already.length + " already here",
  ];
  if (plan.problems.length) bits.push(plan.problems.length + " that cannot be read");
  return bits.join(" · ");
}

/** Nothing is written on a file nobody has looked at, or that is all wrong. */
export function problemWithImport(plan: ImportPlan, lookedAt: boolean): string | null {
  // The problems first: "nothing could be read" is true of a file with every
  // row wrong, but it tells the person less than naming the first fault.
  if (!plan.toAdd.length && plan.problems.length) {
    return (
      "Every row has something wrong with it, so nothing would be added. Line " +
      plan.problems[0].line +
      ": " +
      plan.problems[0].what
    );
  }
  if (!plan.toAdd.length && !plan.already.length) {
    return "Nothing in this file could be read. Fix the columns and try again.";
  }
  if (!lookedAt) {
    return "Run it as a dry run first and read what it would do. Nothing is written until you have.";
  }
  return null;
}
