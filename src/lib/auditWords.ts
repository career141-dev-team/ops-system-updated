/**
 * Audit action codes in plain words (22 Nov): the lead's "what happened to it" list showed
 * `lead.created` and staff could not read it. Unknown codes fall back to the code
 * de-dotted and split at capitals, so a new action is readable before anyone adds a line here.
 */
const WORDS: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.ownerAssigned": "Owner assigned",
  "lead.introCallBooked": "Intro call booked",
  "lead.callHeld": "Intro call held",
  "lead.checkedNewClient": "Checked as a new client",
  "lead.linkedToClient": "Linked to an existing client",
  "lead.agreementDone": "Agreement done",
  "lead.openedEarly": "Marked to open without waiting",
  "lead.openedEarlyUndone": "Open without waiting taken back",
  "lead.handedOver": "Handed over to the TA System",
  "lead.declinedIndustry": "Declined: industry we do not serve",
  "lead.industryCleared": "Industry cleared",
  "lead.closed": "Closed",
  "lead.closedSilent": "Closed: they stopped answering",
  "lead.closedNoAgreement": "Closed: no agreement",
  "lead.closedImpractical": "Closed: role not practical",
  "lead.inviteBack": "Invite back set",
};

export function actionInWords(code: string): string {
  if (WORDS[code]) return WORDS[code];
  const text = code.replace(/\./g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
