/**
 * A Teams meeting transcript, made readable for the requirement (17 Nov).
 *
 * Teams hands back a WebVTT file: cue numbers, time ranges and `<v Name>text</v>`
 * lines. The model needs "Name: what they said", short enough to fit, and the
 * client's words kept apart from the recruiter's. Pure: text in, text out.
 */

/** "00:00:04.000 --> 00:00:09.500" and friends. */
const TIME = /^\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}\s+-->\s+\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}/;

export function vttToText(vtt: string): string {
  const lines: { who: string; said: string }[] = [];
  for (const raw of vtt.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || line === "WEBVTT" || /^NOTE\b/.test(line) || /^\d+$/.test(line) || TIME.test(line)) continue;
    if (/^[0-9a-f-]{20,}\/\d+-\d+$/i.test(line)) continue; // Teams' own cue ids

    const tagged = line.match(/^<v\s+([^>]+)>(.*?)(<\/v>)?$/);
    const who = tagged ? tagged[1].trim() : "";
    const said = (tagged ? tagged[2] : line).replace(/<[^>]+>/g, "").trim();
    if (!said) continue;

    // A speaker's next cue joins the last one: a sentence is not a line a second.
    const last = lines[lines.length - 1];
    if (last && last.who === who) last.said += " " + said;
    else lines.push({ who, said });
  }
  return lines.map((l) => (l.who ? l.who + ": " : "") + l.said).join("\n");
}

/** Keeps the start and the end when a call is longer than the model should read. */
export function trimForAi(text: string, max = 12_000): string {
  if (text.length <= max) return text;
  const keep = Math.floor((max - 40) / 2);
  return text.slice(0, keep) + "\n[... the middle of the call is left out ...]\n" + text.slice(text.length - keep);
}
