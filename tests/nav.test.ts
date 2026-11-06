/**
 * The sidebar points at pages that exist (6 Nov).
 *
 * Money was in the sidebar with `href: "/money"` and no page behind it, so
 * clicking it gave a 404. Nothing caught it: the walk-throughs always reached
 * an invoice from a record, never from the entry above it. A list of links in
 * a rule file is a promise about the filesystem, so the filesystem is what
 * this checks.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { COVERS, NAV, pageAndSectionFor } from "@/lib/nav";

const APP = join(process.cwd(), "app");

/**
 * Is there a page for this URL?
 *
 * A route group - `app/(money)/invoices` - is a folder in brackets that the
 * URL never shows, so "/invoices" may sit at its own name or inside any one
 * of them.
 */
function hasPage(href: string): boolean {
  const rest = href === "/" ? [] : href.replace(/^\//, "").split("/");
  const groups = readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => entry.name);
  return [".", ...groups].some((group) => existsSync(join(APP, group, ...rest, "page.tsx")));
}

test("every sidebar entry has a page behind it", () => {
  for (const section of NAV) {
    for (const entry of section.pages) {
      assert.equal(hasPage(entry.href), true, entry.what + " points at " + entry.href + ", which has no page");
    }
  }
});

test("every sidebar entry knows which pages it covers", () => {
  for (const section of NAV) {
    for (const entry of section.pages) {
      if (entry.href === "/") continue;
      assert.ok(COVERS[entry.href], entry.what + " is in the sidebar with nothing in COVERS, so it can never count its work");
    }
  }
});

test("a covered page belongs to the entry that covers it", () => {
  for (const [href, covered] of Object.entries(COVERS)) {
    for (const path of covered) {
      // /messages and /tasks are reached from the thing they are about, so
      // they are covered for the counts without being pages of their own.
      const found = pageAndSectionFor(path);
      assert.ok(found, path + " is covered by " + href + " but belongs to no entry");
      assert.equal(found.page.href, href, path + " counts against " + found.page.href + ", not " + href);
    }
  }
});
