/**
 * Reading a CV for the five things internal hiring needs (23 Nov, the ops team's feedback): name, email,
 * contact number, NIC and the position applied for. A Scoop is fifty or sixty PDFs in one email, and typing
 * those five things from each was the work.
 *
 * Exception to docs/21 (decision in docs/09, 23 Nov): the TA System reads the CVs of the people it sources; Ops
 * reads the CVs of the people who apply to Career 141's own vacancies, which TA never sees.
 *
 * What is certain is found by pattern and never by a model: an email, a number and an NIC have a shape. What
 * is a judgment (which line is the name, which position they mean) may be read by the model, and is accepted
 * only when it is really in the text. A person confirms before anything is kept as fact: the fields land
 * editable, and what could not be found is named.
 *
 * Pure: it takes the text of the CV and returns what it found. Reading the PDF is in src/data/cvText.ts.
 */

export interface CvFields {
  name: string;
  email: string;
  /** Local form, "077 123 4567". */
  phone: string;
  /** Old (nine digits and V or X) or new (twelve digits), upper case. */
  nic: string;
  targetPosition: string;
}

export interface CvRead {
  fields: CvFields;
  /** The fields that were not found, in the words a person reads. */
  missing: string[];
  /** Almost no text came out: a scan or a picture. A person has to type it. */
  scanned: boolean;
}

/** Fewer characters than this and the file is a picture of a page, not a page. */
export const MIN_TEXT = 40;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const NIC_OLD = /\b\d{9}[VvXx]\b/;
const NIC_NEW = /\b(?:19|20)\d{10}\b/;

export function findEmail(text: string): string {
  return (text.match(EMAIL)?.[0] ?? "").toLowerCase();
}

export function findNic(text: string): string {
  return (text.match(NIC_OLD)?.[0] ?? text.match(NIC_NEW)?.[0] ?? "").toUpperCase();
}

/** "077 123 4567" from whatever was typed: +94 77 123 4567, 0771234567, (077) 123-4567. Empty when there is none. */
export function findPhone(text: string): string {
  // The NIC would otherwise look like a number, so it is taken out first.
  const clean = text.replace(NIC_OLD, " ").replace(NIC_NEW, " ").replace(EMAIL, " ");
  for (const match of clean.matchAll(/\+?\d[\d\s\-().]{7,17}\d/g)) {
    let digits = match[0].replace(/\D/g, "");
    if (digits.startsWith("0094")) digits = digits.slice(2);
    if (digits.startsWith("94") && digits.length === 11) digits = "0" + digits.slice(2);
    if (digits.length === 9 && !digits.startsWith("0")) digits = "0" + digits;
    // Ten digits starting 0 and then a real area or mobile code (1 to 9).
    if (/^0[1-9]\d{8}$/.test(digits)) return digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6);
  }
  return "";
}

const NOT_A_NAME = /^(curriculum|resume|résumé|cv|profile|personal|contact|objective|summary|education|experience|skills|references|declaration|address|page|date|name|nic|email|mobile|phone|tel|telephone)\b/i;

/**
 * The name, when nothing better is known: the first short line of letters near the top. A name has two to four
 * words and no digits or @. It is a guess, and the screen says it is one; the model's reading wins when it can be checked.
 */
export function guessName(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 14);
  for (const raw of lines) {
    const line = raw.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "").replace(/^name\s*[:\-]\s*/i, "");
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4 || line.length > 40) continue;
    if (/[\d@:/\\]/.test(line) || NOT_A_NAME.test(line)) continue;
    if (!words.every((w) => /^[A-Za-z][A-Za-z.'’-]*$/.test(w))) continue;
    return words.map((w) => (w === w.toUpperCase() && w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w)).join(" ");
  }
  return "";
}

/** The position, from a labelled line: "Applying for: ...", "Position: ...", "Post applied for ...". */
export function guessPosition(text: string): string {
  for (const raw of text.split(/\r?\n/).slice(0, 60)) {
    const m = raw.trim().match(/^(?:post|position|role|vacancy|job)?\s*(?:applying for|applied for|apply for|position applied|post applied for|position|post|vacancy|role)\s*[:\-–]\s*(.{3,80})$/i);
    if (m) return m[1].trim().replace(/[.;,]+$/, "");
  }
  return "";
}

const KNOWN_DEMONYMS = [
  "Sri Lankan",
  "Indian",
  "Pakistani",
  "Bangladeshi",
  "British",
  "American",
  "Australian",
  "Canadian",
  "Emirati",
  "Filipino",
  "Indonesian",
  "Kenyan",
  "Malaysian",
  "Maldivian",
  "Nepalese",
  "Nepali",
  "Nigerian",
  "Omani",
  "Qatari",
  "Saudi",
  "Singaporean",
  "South African",
  "Thai",
  "Vietnamese",
  "Chinese",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Dutch",
  "Italian",
  "Spanish",
  "Irish",
  "New Zealander",
  "Russian",
  "Egyptian",
  "Jordanian",
  "Lebanese",
  "Bahraini",
  "Kuwaiti",
] as const;

/**
 * The candidate's nationality from their CV (26 Nov, Nov 25 ops meeting).
 *
 * Looks first for a labelled line ("Nationality: Indian", "Citizenship - Sri Lankan"),
 * then falls back to a known demonym anywhere in the CV. A person still confirms it
 * before the fee invoice can go out, because an expat placement is billed at the expat rate.
 */
export function nationalityOf(text: string): string {
  if (!text) return "";
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^(?:nationality|citizenship)\s*[:\-–]\s*([A-Za-z][A-Za-z\s'-]{1,35}?)(?:\s*[|,;.(].*)?$/i);
    if (m) {
      const cleaned = m[1].trim().replace(/[.;,]+$/, "");
      const words = cleaned.split(/\s+/);
      if (words.length >= 1 && words.length <= 3) {
        return words
          .map((w) => (w === w.toUpperCase() && w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1)))
          .join(" ");
      }
    }
  }
  for (const demonym of KNOWN_DEMONYMS) {
    const re = new RegExp("\\b" + demonym.replace(/\s+/g, "\\s+") + "\\b", "i");
    if (re.test(text)) return demonym;
  }
  return "";
}

/** What the pattern finds on its own, without a model. */
export function readByPattern(text: string): CvFields {
  return { name: guessName(text), email: findEmail(text), phone: findPhone(text), nic: findNic(text), targetPosition: guessPosition(text) };
}

/**
 * The model's name and position are taken only when they can be seen in the text itself: a name that is not on
 * the page, or a position none of whose words appear, is an invention and is dropped (the house rule: never invent).
 */
export function checkedAiFields(text: string, ai: { name?: string; targetPosition?: string } | null): { name: string; targetPosition: string } {
  const hay = text.toLowerCase();
  const name = (ai?.name ?? "").trim();
  const position = (ai?.targetPosition ?? "").trim();
  const nameOk = name.length >= 3 && name.split(/\s+/).every((w) => hay.includes(w.toLowerCase().replace(/[.,]/g, "")));
  const positionOk = position.length >= 3 && position.toLowerCase().split(/\s+/).filter((w) => w.length > 2).some((w) => hay.includes(w));
  return { name: nameOk ? name : "", targetPosition: positionOk ? position : "" };
}

const LABEL: Record<keyof CvFields, string> = { name: "name", email: "email", phone: "contact number", nic: "NIC", targetPosition: "position applied for" };

/** Put the pieces together: certain things by pattern, judgment from the model when it checks out, else the guess. */
export function readCv(text: string, ai: { name?: string; targetPosition?: string } | null = null): CvRead {
  const scanned = text.replace(/\s+/g, "").length < MIN_TEXT;
  if (scanned) return { fields: { name: "", email: "", phone: "", nic: "", targetPosition: "" }, missing: Object.values(LABEL), scanned: true };
  const found = readByPattern(text);
  const checked = checkedAiFields(text, ai);
  const fields: CvFields = { ...found, name: checked.name || found.name, targetPosition: checked.targetPosition || found.targetPosition };
  const missing = (Object.keys(LABEL) as (keyof CvFields)[]).filter((k) => !fields[k]).map((k) => LABEL[k]);
  return { fields, missing, scanned: false };
}

/* ── Which vacancy, and who we already have ─────────────────────── */

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2);

/**
 * The vacancy a position applied for points at: the one whose title shares the most words, when at least half
 * of that title's words are there and no other vacancy ties. Otherwise null, and the person decides.
 */
export function matchVacancy(target: string, vacancies: { id: string; title: string }[]): string | null {
  const want = new Set(words(target));
  if (!want.size) return null;
  const scored = vacancies
    .map((v) => {
      const title = words(v.title);
      return { id: v.id, score: title.length ? title.filter((w) => want.has(w)).length / title.length : 0 };
    })
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return null;
  return scored[0].id;
}

/** The last nine digits of a number, which is the same person whether it was typed 077... or +9477.... */
export const phoneKey = (phone: string): string => phone.replace(/\D/g, "").slice(-9);

/** The applicant already on file for this CV, by email, NIC or number. Null when the person is new. */
export function duplicateOf<T extends { id: string; email: string | null; phone: string | null; nic?: string | null }>(fields: CvFields, applicants: T[]): T | null {
  const email = fields.email.toLowerCase();
  const nic = fields.nic.toUpperCase();
  const phone = phoneKey(fields.phone);
  return (
    applicants.find(
      (a) =>
        (email && (a.email ?? "").toLowerCase() === email) ||
        (nic && (a.nic ?? "").toUpperCase() === nic) ||
        (phone.length === 9 && phoneKey(a.phone ?? "") === phone),
    ) ?? null
  );
}
