/**
 * What one pass of the clocks decides (15, Phase 1 step 13).
 *
 * The clocks are the whole point of the Ops system: they remember so that
 * nobody has to. This file decides, for a given moment, which clocks warn,
 * which fire, and what each one leaves behind for a person to do. It touches
 * no database, so every case can be tested.
 */

import type { OpsTask, OpsTimer } from "@/data/types";
import { nextState } from "./timers";

export interface TickAction {
  timerId: string;
  state: "warned" | "fired";
  /** A fired clock always leaves something a person can act on. */
  task: Pick<OpsTask, "kind" | "title" | "body" | "assigneeId" | "dueAt" | "subjectType" | "subjectId" | "link"> | null;
}

/** What a clock means when it goes off, in the words the task will carry. */
const WHEN_FIRED: Record<string, { kind: OpsTask["kind"]; title: string; body: string }> = {
  "esa.chase": {
    kind: "approve",
    title: "The agreement has not come back",
    body: "The next chase is drafted. Read it, change anything you want, then approve it.",
  },
  "esa.countersign": {
    kind: "remind",
    title: "The Director has not countersigned yet",
    body: "One day was the rule. The client is waiting for their copy back.",
  },
  "esa.decline": {
    kind: "decide",
    title: "Two weeks with no signed agreement",
    body: "Decide whether to mark the agreement declined. The search stays blocked until you do.",
  },
  "set.due": {
    kind: "approve",
    title: "A set is due at the client today",
    body: "The agreement promised it by now. Send it, or say on the set why it is late.",
  },
  "set.ownership": {
    kind: "check",
    title: "The CV ownership window has closed",
    body: "After today a claim on any CV in this set is refused. Nothing more to do unless the client claims one.",
  },
  "talentpulse.compile": {
    kind: "record",
    title: "Talent Pulse: it is Tuesday",
    body: "This week's issue is compiled. Each role needs its line from the TA, then it goes to marketing for tomorrow.",
  },
  "report.weekly": {
    kind: "record",
    title: "The weekly report: it is Monday",
    body: "This week's report is built from the TA System and our own rows. Read it, then approve it and the Director's email is drafted.",
  },
  "lead.inviteBack": {
    kind: "call",
    title: "Time to go back to a client we turned down",
    body: "The package was wrong for the role when we last spoke. Ask them whether anything has changed.",
  },
  "feedback.call": {
    kind: "call",
    title: "Still no feedback - ring them",
    body: "Asked in writing and heard nothing. Call today, then write down what they said.",
  },
  "silence.hold": {
    kind: "decide",
    title: "Two weeks of silence on a set",
    body: "The notice is drafted. Approve it and the position goes on hold; it never closes by itself.",
  },
  "hold.review": {
    kind: "decide",
    title: "A position has been on hold for thirty days",
    body: "The owner's rule: somebody looks at it every thirty days. Lift it, or leave it and be asked again.",
  },
  "hire.unreported": {
    kind: "decide",
    title: "Three months since the set went, and no hire reported",
    body: "If they hired somebody from it without telling us, the agreement adds a 50% surcharge. Check, then decide.",
  },
  "feedback.chase": {
    kind: "call",
    title: "No feedback from the client yet",
    body: "Call them today, then write down what they said.",
  },
  "invoice.chase": {
    kind: "approve",
    title: "The invoice is past its due date",
    body: "The chase is drafted, with the late charge added. Read it and approve it.",
  },
  "guarantee.warn": {
    kind: "check",
    title: "The guarantee has fifteen days left",
    body: "Check the person is still in the job, so a leaver is not a surprise on day ninety.",
  },
  "guarantee.end": {
    kind: "decide",
    title: "The guarantee ends today",
    body: "If nobody has left, tick a clean end and the close list is made for you.",
  },
  "interview.reconfirm": {
    kind: "check",
    title: "An interview is tomorrow",
    body: "The client's reminder has gone. The TA is reconfirming the candidate.",
  },
  "meeting.reminder.day": {
    kind: "remind",
    title: "A client meeting is tomorrow",
    body: "Check the client still means it, and that the TA lead knows.",
  },
  "meeting.reminder.hour": {
    kind: "remind",
    title: "A client meeting is in an hour",
    body: "Nothing to do unless it does not happen - then mark it not held.",
  },
  "meeting.rebook": {
    kind: "call",
    title: "A client meeting was not held",
    body: "Book it again and tell them. Three attempts with no reply closes the lead.",
  },
  "esa.send": {
    kind: "approve",
    title: "The agreement should be out by now",
    body: "It goes within two hours of the call, from the brief you wrote down.",
  },
  "test.clock": {
    kind: "check",
    title: "The test clock finished",
    body: "This is what every clock does when its time runs out: it leaves you something to do.",
  },
};

/** One pass. Nothing happens twice: a clock that already fired is left alone. */
export function tick(timers: OpsTimer[], now: number): TickAction[] {
  const actions: TickAction[] = [];
  for (const timer of timers) {
    const state = nextState(timer, now);
    // nextState only ever answers with one of these two, or nothing at all.
    if (state !== "warned" && state !== "fired") continue;
    if (state === "warned") {
      actions.push({ timerId: timer.id, state, task: null });
      continue;
    }
    const known = WHEN_FIRED[timer.kind];
    // A clock nobody has written words for still has to leave a usable task,
    // and its label is the whole title rather than an addition to one.
    const meaning = known ?? {
      kind: "check" as const,
      title: timer.payload.label || timer.kind,
      body: "This clock has run out.",
    };
    actions.push({
      timerId: timer.id,
      state,
      task: {
        kind: meaning.kind,
        title: known && timer.payload.label ? meaning.title + " · " + timer.payload.label : meaning.title,
        body: meaning.body,
        assigneeId: timer.ownerId,
        dueAt: now,
        subjectType: timer.subjectType,
        subjectId: timer.subjectId,
        link: null,
      },
    });
  }
  return actions;
}
