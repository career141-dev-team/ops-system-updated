import assert from "node:assert/strict";
import test from "node:test";

import { closeSendHref, sendHref } from "../src/lib/sendModal";

test("sendHref sets send and on, drops panel and spent banners, keeps view and filters", () => {
  const href = sendHref(
    "/positions/pos_1",
    { view: "interviews", panel: "find-a-time", on: "old_1", msg: "Saved.", did: "ok", at: "123" },
    "book-interview",
    "iv_42",
  );
  assert.equal(href, "/positions/pos_1?view=interviews&send=book-interview&on=iv_42");
});

test("sendHref omits on when not given", () => {
  const href = sendHref("/positions", { on: "stale" }, "weekly-report");
  assert.equal(href, "/positions?send=weekly-report");
});

test("closeSendHref removes send, on and spent banners while keeping view", () => {
  const href = closeSendHref("/positions/pos_1", { view: "sets", send: "send-set", on: "set_4", msg: "Sent." });
  assert.equal(href, "/positions/pos_1?view=sets");
});
