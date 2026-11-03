/**
 * The numbers we measure before changing anything (15, Phase 1 step 0).
 *
 * The owner's instruction was "strategy first: measure today's numbers" - how
 * long an agreement takes to come back, how long a client waits for a set, how
 * many hires slip. Without them the weekly report in Phase 7 can say what is
 * happening but never what changed.
 */

export const MEASURES: Record<string, { name: string; unit: string; why: string }> = {
  "esa.returnDays": {
    name: "Agreement return time",
    unit: "days",
    why: "From sending the agreement to the client sending it back signed.",
  },
  "set.clientWaitDays": {
    name: "Client wait for a set",
    unit: "days",
    why: "From the requirement meeting to the first set of CVs reaching the client.",
  },
  "feedback.waitDays": {
    name: "Wait for client feedback",
    unit: "days",
    why: "From a set reaching the client to their first answer about it.",
  },
  "hire.slippedCount": {
    name: "Hires that slipped",
    unit: "positions",
    why: "Positions we lost or that went quiet after a set was sent.",
  },
  "invoice.paidDays": {
    name: "Time to be paid",
    unit: "days",
    why: "From the invoice going out to the money arriving.",
  },
};
