import assert from "node:assert/strict";
import test from "node:test";

import { CHAT_WIDTH, chatWidthFrom } from "@/lib/chatWidth";

test("the AURA column's width: the cookie's number, kept inside what it can be", () => {
  assert.equal(chatWidthFrom(undefined), CHAT_WIDTH.start);
  assert.equal(chatWidthFrom("not a number"), CHAT_WIDTH.start);
  assert.equal(chatWidthFrom("0"), CHAT_WIDTH.start);
  assert.equal(chatWidthFrom("450"), 450);
  assert.equal(chatWidthFrom("100"), CHAT_WIDTH.min);
  assert.equal(chatWidthFrom("5000"), CHAT_WIDTH.max);
  assert.equal(chatWidthFrom("400.4"), 400);
});
