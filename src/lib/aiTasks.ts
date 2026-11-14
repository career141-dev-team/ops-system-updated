/**
 * What each AI task asks for, and what shape the answer must be
 * (15, Phase 9 steps 5 to 15).
 *
 * The prompts live here, away from the plumbing, because they are the part a
 * person reads and argues with. Three rules run through every one of them:
 *
 *   - **Never invent.** What was not said is reported as not said. A field
 *     the model did not hear is left empty with a line saying so, which is
 *     the whole difference between a help and a liability.
 *   - **The client's own words.** Where the owner's rules require a reason -
 *     a rejection, a decline - the reason is the client's wording, quoted,
 *     not our summary of it.
 *   - **No decisions.** Nothing here asks a model whether to reject, hold,
 *     refund or spend. It reads, it drafts, it proposes; the buttons belong
 *     to a person.
 *
 * Nothing here touches a database or calls a model.
 */

import type { AiTask } from "@/lib/ai";

/** The one line every prompt starts with. */
const HOUSE =
  "You work inside a recruitment agency's own system, helping its staff. " +
  "Answer only with JSON of the shape asked for, and nothing else - no prose, no code fences. " +
  "Never invent a fact: if something was not said or is not in what you were given, leave it empty and say so in the notSaid list. " +
  "Keep the client's or candidate's own words where you are asked for a reason. " +
  "Write plain simple English, short sentences, no jargon.";

export interface PromptFor {
  system: string;
  prompt: string;
  /** How long the reply may be, when the default 1,200 is not enough. */
  maxTokens?: number;
}

/* ── Dictation into our own fields (steps 5 to 7) ───────────────── */

export interface DictatedRequirement {
  title: string;
  level: string;
  salary: string;
  locations: string;
  headcount: string;
  jdNotes: string;
  notSaid: string[];
}

export function dictateRequirementPrompt(said: string): PromptFor {
  return {
    system:
      HOUSE +
      " You are turning what an ops person dictated after a meeting into the fields of a requirement." +
      ' Shape: {"title":"","level":"","salary":"","locations":"","headcount":"","jdNotes":"","notSaid":[]}.' +
      " jdNotes holds everything said about the role that does not fit another field, in the speaker's own words." +
      " headcount is a number as text. Put the name of every field you could not fill into notSaid.",
    prompt: "This is what was dictated:\n\n" + said,
  };
}

export interface DictatedNote {
  text: string;
  notSaid: string[];
}

export function dictateNotePrompt(said: string, about: string): PromptFor {
  return {
    system:
      HOUSE +
      " You are tidying dictation into one short written note: punctuation, paragraphs, and the speaker's own words." +
      " Do not summarise, do not add, do not remove anything said." +
      ' Shape: {"text":"","notSaid":[]}.',
    prompt: "The note is about: " + about + "\n\nWhat was dictated:\n\n" + said,
  };
}

/* ── Reading what the client sent (step 8) ──────────────────────── */

export interface InboundRead {
  /** One of: agreement_signed, changes_wanted, declined, decisions, slots, cv_claim, cancellation, something_else. */
  kind: string;
  /** Per candidate, when the kind is decisions. */
  decisions: { name: string; decision: string; theirWords: string }[];
  /** Times offered, as the client wrote them. */
  slots: string[];
  /** What they said, quoted, for a decline or a change. */
  theirWords: string;
  /** One line for the person who has to confirm it. */
  summary: string;
  notSaid: string[];
}

export function inboundReadPrompt(email: string, about: string, candidates: string[]): PromptFor {
  return {
    system:
      HOUSE +
      " You are reading one email a client sent to a recruitment agency and saying what it means, so a person can" +
      " confirm it in one press. You never decide anything: you report what the client said." +
      ' Shape: {"kind":"","decisions":[{"name":"","decision":"","theirWords":""}],"slots":[],"theirWords":"","summary":"","notSaid":[]}.' +
      " kind is one of: agreement_signed, changes_wanted, declined, decisions, slots, cv_claim, cancellation, something_else." +
      " decision is one of: shortlisted, rejected, on_hold. theirWords is the client's own sentence, quoted exactly." +
      " Only use candidate names from the list you are given; if the client mentions somebody else, put that in notSaid.",
    prompt:
      "The email is about: " +
      about +
      "\n\nThe candidates in it are: " +
      (candidates.join(", ") || "none given") +
      "\n\nThe email:\n\n" +
      email,
  };
}

/* ── Improving a draft we already wrote (step 9) ────────────────── */

export type ImproveHow = "rewrite" | "shorter" | "warmer" | "formal" | "sinhala";

export const IMPROVE_WORDS: Record<ImproveHow, string> = {
  rewrite: "Say the same thing better",
  shorter: "Shorter",
  warmer: "Warmer",
  formal: "More formal",
  sinhala: "In Sinhala",
};

export interface ImprovedDraft {
  subject: string;
  body: string;
  /** What it changed, in one line, so a person can see the point. */
  changed: string;
  notSaid: string[];
}

export function improveDraftPrompt(subject: string, body: string, how: ImproveHow): PromptFor {
  const what: Record<ImproveHow, string> = {
    rewrite: "Say exactly the same things more clearly.",
    shorter: "Cut it to the shortest version that still says everything.",
    warmer: "Make it warmer and more human, without being familiar.",
    formal: "Make it more formal, as a contract covering letter would read.",
    sinhala: "Write it in Sinhala, saying the same things. Keep names, numbers and dates as they are.",
  };
  return {
    system:
      HOUSE +
      " You are improving a message an agency has already drafted to a client." +
      " " +
      what[how] +
      " Change no fact, no name, no number, no date, and add nothing that is not already there." +
      " Keep any {{placeholder}} exactly as it is." +
      ' Shape: {"subject":"","body":"","changed":"","notSaid":[]}.',
    prompt: "Subject: " + subject + "\n\nBody:\n\n" + body,
  };
}

/* ── Drafting a reply (step 10) ─────────────────────────────────── */

export interface DraftedReply {
  subject: string;
  body: string;
  /** The facts it used, so they can be checked before it goes. */
  usedFacts: string[];
  notSaid: string[];
}

export function replyPrompt(email: string, facts: string[]): PromptFor {
  return {
    system:
      HOUSE +
      " You are drafting a reply for an ops person to read, edit and approve - it is never sent as it is." +
      " Use only the facts you are given; if the client asks something the facts do not answer, say in the body that" +
      " we will come back to them on that point, and put the question into notSaid." +
      ' Shape: {"subject":"","body":"","usedFacts":[],"notSaid":[]}.' +
      " Sign off as Career 141 without inventing a person's name.",
    prompt: "What we know:\n- " + facts.join("\n- ") + "\n\nTheir email:\n\n" + email,
  };
}

/* ── Summaries (step 11) ────────────────────────────────────────── */

export interface Summary {
  summary: string;
  /** The three or four things that matter now. */
  points: string[];
  notSaid: string[];
}

export function summarisePrompt(what: string, rows: string[]): PromptFor {
  return {
    system:
      HOUSE +
      " You are summarising a client's own history for the ops person who has to deal with them today." +
      " Say what happened, where it stands, and what is waiting on whom. No advice, no opinion about the client." +
      ' Shape: {"summary":"","points":[],"notSaid":[]}. Four points at most.',
    prompt: "Summarise: " + what + "\n\nThe record:\n\n" + rows.join("\n"),
  };
}

/* ── Why this is first (step 12) ───────────────────────────────── */

export interface WhyFirst {
  /** One line about the first task, which the rules already chose. */
  because: string;
  notSaid: string[];
}

export function whyFirstPrompt(task: string, others: string[], today?: string): PromptFor {
  return {
    system:
      HOUSE +
      " The order of the day's work is already decided by the system's rules. You are writing one short line" +
      " saying why the first one matters today - you are not re-ordering anything and you must not suggest a" +
      " different order. Dates in the list are the dates of the things themselves, not today's date." +
      ' Shape: {"because":"","notSaid":[]}. One sentence, under twenty words.',
    // Today's date goes in (8 Nov): without it the model called tomorrow's
    // interview "today's interview", which is the one thing the line must not get wrong.
    prompt: (today ? "Today is " + today + ".\n\n" : "") + "First: " + task + "\n\nAlso waiting:\n- " + others.join("\n- "),
  };
}

/* ── The desk assistant (docs/31) ──────────────────────────────── */

export interface AgentSaid {
  /** One of the catalogue's intent names, or "question". */
  intent: string;
  /** The fields the intent asks for, each as the person's own words. */
  fields: Record<string, string>;
  /** When the words do not say enough: the one question to ask back. */
  question: string;
  notSaid: string[];
}

/**
 * Words into an intent and its fields - and nothing else. The model does
 * not pick rows, check permissions or decide; the rules in
 * src/lib/agent.ts do that from what it returns.
 */
export function agentPrompt(said: string, catalogue: string[], context: string[]): PromptFor {
  return {
    system:
      HOUSE +
      " You are the desk's assistant inside a recruitment agency's own system. A person has typed what they want" +
      " done. Pick ONE intent from the list, or \"question\" when they are asking rather than telling, and copy the" +
      " fields from their words - their words, not yours; a missing field is an empty string, and its name goes in notSaid." +
      " For a field that names a thing (a draft, an email, a task, a client, an invoice) copy the words that name it," +
      " such as \"the last one\" or \"Nippon\" - never invent an id or a number." +
      " You never run anything and never decide anything; a person presses the button." +
      ' Shape: {"intent":"","fields":{},"question":"","notSaid":[]}.' +
      "\n\nIntents:\n- " + catalogue.join("\n- "),
    prompt: (context.length ? context.join("\n") + "\n\n" : "") + "They typed: " + said,
  };
}

/* ── The ask box (step 13) ─────────────────────────────────────── */

export interface Answer {
  answer: string;
  /** Which rows it used, by the name they were given. */
  used: string[];
  notSaid: string[];
}

export function askPrompt(question: string, rows: string[]): PromptFor {
  return {
    system:
      HOUSE +
      " You answer questions about an agency's own desk from the rows you are given, and from nothing else." +
      " If the rows do not answer it, say so plainly and put what is missing into notSaid - never guess a number." +
      ' Shape: {"answer":"","used":[],"notSaid":[]}. Keep the answer under sixty words.' +
      // 11 Nov: "what is late for me today?" on a desk of twenty late tasks ran
      // past the reply limit and came back cut off - "no JSON in it". used
      // names its sources; it does not repeat them.
      ' used holds at most five short labels such as "Your open tasks", never the rows themselves.',
    prompt: "The question: " + question + "\n\nWhat you may use:\n\n" + rows.join("\n"),
    maxTokens: 2_500,
  };
}

/** Every task's own words for the screens. */
export const TASK_BUTTONS: Record<AiTask, string> = {
  "dictate.fields": "Dictate",
  "inbound.read": "Read what they sent",
  "draft.improve": "Improve this draft",
  "draft.reply": "Draft a reply",
  summarise: "Summarise",
  whatfirst: "Why this first",
  agent: "Do it",
  ask: "Ask",
};

/**
 * What a proposal is worth showing as, in one line.
 *
 * A proposal with an empty notSaid list is the usual case; one with things in
 * it is the interesting case, and the screen says so before a person presses
 * use it.
 */
export function notSaidInWords(notSaid: string[]): string | null {
  if (!notSaid.length) return null;
  return "It did not find: " + notSaid.join(", ") + ". Nothing was invented for those.";
}
