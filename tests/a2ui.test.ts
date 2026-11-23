import assert from "node:assert/strict";
import test from "node:test";

import { parseSurface } from "@/lib/a2ui";

const ok = (components: unknown) => {
  const got = parseSurface(components);
  assert.ok(got.ok, got.ok ? "" : got.why);
  return got.surface;
};

test("a v1.0 list of cards with a say button is kept as sent", () => {
  const s = ok([
    { id: "root", component: "Column", children: ["c1", "b1"] },
    { id: "c1", component: "Card", child: "t1" },
    { id: "t1", component: "Text", text: "Nippon - Sales Manager", variant: "caption" },
    { id: "b1", component: "Button", child: "bt", variant: "primary", action: { event: { name: "say", context: { text: "open Nippon" } } } },
    { id: "bt", component: "Text", text: "Open Nippon" },
  ]);
  assert.deepEqual(s.root, { id: "root", component: "Column", children: ["c1", "b1"] });
  assert.deepEqual(s.t1, { id: "t1", component: "Text", text: "Nippon - Sales Manager", variant: "caption" });
  assert.deepEqual(s.b1, { id: "b1", component: "Button", child: "bt", say: "open Nippon", primary: true });
});

test("unknown components, other actions and outside pictures are dropped, and so are children pointing at them", () => {
  const s = ok([
    { id: "root", component: "Column", children: ["t", "x", "go", "img", "pic"] },
    { id: "t", component: "Text", text: "Two clients" },
    { id: "x", component: "Script", src: "evil.js" },
    { id: "go", component: "Button", child: "gt", action: { event: { name: "approve_invoice", context: { id: "1" } } } },
    { id: "gt", component: "Text", text: "Approve" },
    { id: "img", component: "Image", url: "https://elsewhere.example/a.png" },
    { id: "pic", component: "Image", url: "//elsewhere.example/a.png" },
  ]);
  assert.deepEqual(s.root, { id: "root", component: "Column", children: ["t"] });
  assert.equal(s.x, undefined);
  assert.equal(s.go, undefined);
});

test("a data binding is not drawn: literal words only", () => {
  const s = ok([
    { id: "root", component: "Column", children: ["a", "b"] },
    { id: "a", component: "Text", text: { "@path": "/name" } },
    { id: "b", component: "Text", text: "Shown" },
  ]);
  assert.deepEqual(s.root, { id: "root", component: "Column", children: ["b"] });
});

test("no root, a loop, a button in a button, or too much is refused whole", () => {
  assert.equal(parseSurface([{ id: "a", component: "Text", text: "hi" }]).ok, false);
  assert.equal(parseSurface([]).ok, false);
  assert.equal(parseSurface("not a list").ok, false);
  assert.equal(
    parseSurface([
      { id: "root", component: "Column", children: ["b"] },
      { id: "b", component: "Row", children: ["root"] },
    ]).ok,
    false,
  );
  assert.equal(
    parseSurface([
      { id: "root", component: "Button", child: "inner", action: { event: { name: "say", context: { text: "a" } } } },
      { id: "inner", component: "Button", child: "t", action: { event: { name: "say", context: { text: "b" } } } },
      { id: "t", component: "Text", text: "x" },
    ]).ok,
    false,
  );
  const many = [{ id: "root", component: "Column", children: [] }, ...Array.from({ length: 70 }, (_, i) => ({ id: "t" + i, component: "Text", text: "x" }))];
  assert.equal(parseSurface(many).ok, false);
  const deep = Array.from({ length: 10 }, (_, i) => ({ id: i ? "n" + i : "root", component: "Column", children: ["n" + (i + 1)] }));
  assert.equal(parseSurface(deep).ok, false);
});

test("a card whose only child cannot be drawn goes too", () => {
  assert.equal(parseSurface([{ id: "root", component: "Card", child: "gone" }]).ok, false);
});
