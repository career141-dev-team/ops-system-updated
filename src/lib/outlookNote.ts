/**
 * Where a booked call is in Outlook (22 Nov): the card claimed "NOT in anyone's Outlook" even
 * when a stand-in event was made, and "in X's Outlook" for a fake one. This says only what the
 * calendar event is; whether the emailed invite went is left to the invite line.
 */
export function outlookNote(input: {
  graphEventId?: string | null;
  teamsProblem?: string | null;
  organiserName?: string | null;
}): string {
  const id = input.graphEventId ?? "";
  if (id.startsWith("fake-")) return "Test mode: no Outlook event was made.";
  if (id) return "It is also in " + (input.organiserName ? input.organiserName + "'s " : "the organiser's ") + "Outlook calendar.";
  return "No Outlook event was made for this call" + (input.teamsProblem ? ": " + input.teamsProblem : ".");
}
