/** Reading a Teams transcript for the requirement. */
import assert from "node:assert/strict";
import test from "node:test";

import { trimForAi, vttToText } from "@/lib/transcript";

const VTT = `WEBVTT

NOTE Recorded by Teams

1
00:00:01.000 --> 00:00:04.000
<v Nimali (Career 141)>Thanks for joining. Tell me about the role.</v>

2
00:00:05.000 --> 00:00:09.000
<v Kasun (Client)>We need two drivers for the Colombo office,</v>

3
00:00:09.500 --> 00:00:13.000
<v Kasun (Client)>starting in January, around 90 thousand a month.</v>

4
00:00:14.000 --> 00:00:16.000
<v Nimali (Career 141)>And who do they report to?</v>
`;

test("cues, numbers and times are dropped and each speaker's run is one line", () => {
  assert.equal(
    vttToText(VTT),
    [
      "Nimali (Career 141): Thanks for joining. Tell me about the role.",
      "Kasun (Client): We need two drivers for the Colombo office, starting in January, around 90 thousand a month.",
      "Nimali (Career 141): And who do they report to?",
    ].join("\n"),
  );
});

test("plain text with no speaker tags is kept as it is", () => {
  assert.equal(vttToText("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello there\n"), "Hello there");
});

test("a long call keeps its start and its end, and says the middle is left out", () => {
  const long = "a".repeat(20_000) + "END";
  const out = trimForAi(long, 1000);
  assert.ok(out.length <= 1100);
  assert.match(out, /middle of the call is left out/);
  assert.ok(out.endsWith("END"));
  assert.equal(trimForAi("short"), "short");
});
