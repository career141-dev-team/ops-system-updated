/**
 * A panel is an address (19 Nov): opening and closing it must keep the rest of the page's query.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { closeHref, panelHref } from "@/lib/panel";

test("a panel opens with the page's own query kept", () => {
  assert.equal(panelHref("/positions/p1", { view: "interviews" }, "find-time", "iv1"), "/positions/p1?view=interviews&panel=find-time&on=iv1");
  assert.equal(panelHref("/", {}, "add-note"), "/?panel=add-note");
});

test("opening one panel replaces another and forgets its record", () => {
  assert.equal(panelHref("/x", { panel: "a", on: "1", view: "v" }, "b"), "/x?panel=b&view=v");
});

test("closing puts the page back as it was", () => {
  assert.equal(closeHref("/positions/p1", { view: "interviews", panel: "find-time", on: "iv1" }), "/positions/p1?view=interviews");
  assert.equal(closeHref("/", { panel: "add-note" }), "/");
});

test("it reads search params and repeated values", () => {
  const params = new URLSearchParams("stage=a&stage=b&panel=x");
  assert.equal(closeHref("/clients", params), "/clients?stage=a&stage=b");
  assert.equal(closeHref("/clients", { stage: ["a", "b"], q: undefined }), "/clients?stage=a&stage=b");
});

test("one-time banners are not carried into panel links", () => {
  assert.equal(panelHref("/x", { msg: "Saved", did: "d", at: "1", view: "v" }, "a"), "/x?view=v&panel=a");
  assert.equal(closeHref("/x", { msg: "Saved", panel: "a" }), "/x");
});
