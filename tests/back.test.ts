import { safeBack, withMsg } from "@/lib/back";
import assert from "node:assert/strict";
import { test } from "node:test";

test("back is accepted when it is our own path, tab and panel included", () => {
  assert.equal(safeBack("/positions/p1?view=sets&panel=x", "/f"), "/positions/p1?view=sets&panel=x");
});
test("back is rejected when it could leave the site", () => {
  for (const bad of ["//evil.com", "https://evil.com", "/a\\b", "/\\evil.com", "/a\bb", "evil", "", "/a\nb"]) assert.equal(safeBack(bad, "/f"), "/f");
  assert.equal(safeBack(null, "/f"), "/f");
});
test("no back means the old target, and the message joins it as before", () => {
  assert.equal(withMsg(safeBack(undefined, "/sets/s1"), "Saved"), "/sets/s1?msg=Saved");
});
test("msg joins with & when the page already has a query, and keeps the fragment last", () => {
  assert.equal(withMsg("/positions/p1?view=sets", "a b"), "/positions/p1?view=sets&msg=a%20b");
  assert.equal(withMsg("/x?y=1#z", "m"), "/x?y=1&msg=m#z");
});
