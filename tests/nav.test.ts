/**
 * The bar points at pages that exist (6 Nov, kept for the v6 bar).
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

import { COVERS, NAV, PHONE_ONLY, PHONE_PAGES, isHere, pageAndSectionFor } from "@/lib/nav";

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

test("every bar entry has a page behind it", () => {
  for (const section of NAV) {
    for (const entry of section.pages) {
      assert.equal(hasPage(entry.href), true, entry.what + " points at " + entry.href + ", which has no page");
    }
  }
});

test("the bar is the eight of the v6 design, in its order", () => {
  assert.equal(NAV.length, 1);
  assert.deepEqual(
    NAV[0].pages.map((p) => p.what),
    ["My work", "Inbox", "Calendar", "Clients", "Positions", "Internal interview", "Accounts", "Settings"],
  );
  assert.deepEqual(
    NAV[0].pages.filter((p) => p.needs).map((p) => [p.href, p.needs]),
    [
      ["/invoices", "money.manage"],
      ["/settings", "settings.manage"],
    ],
  );
});

test("every bar entry knows which pages it covers", () => {
  for (const entry of NAV.flatMap((s) => s.pages)) {
    assert.ok(COVERS[entry.href], entry.what + " is in the bar with nothing in COVERS, so it can never count its work");
  }
});

test("a covered page belongs to the entry that covers it", () => {
  for (const [href, covered] of Object.entries(COVERS)) {
    for (const path of covered) {
      const found = pageAndSectionFor(path);
      assert.ok(found, path + " is covered by " + href + " but belongs to no entry");
      assert.equal(found.page.href, href, path + " counts against " + found.page.href + ", not " + href);
    }
  }
});

test("an old route stays attached to an entry", () => {
  for (const [path, entry] of [
    ["/sets/abc", "/positions"],
    ["/placements/p1", "/positions"],
    ["/guarantees/g1", "/positions"],
    ["/reports", "/positions"],
    ["/interviews/i1", "/calendar"],
    ["/calls", "/"],
    ["/tasks/t1", "/"],
    ["/messages/m1", "/mail"],
    ["/closes/c1", "/invoices"],
    ["/money", "/invoices"],
    ["/templates", "/settings"],
    ["/leads/new", "/clients"],
  ] as const) {
    assert.equal(pageAndSectionFor(path)?.page.href, entry, path);
    assert.equal(isHere(path, entry), true, path);
  }
  assert.equal(isHere("/leads", "/"), false, "the day is only the day");
});

test("the phone's bar is My work, Inbox, Search and Add (PH1)", () => {
  const hrefs = NAV.flatMap((s) => s.pages.map((p) => p.href));
  for (const href of PHONE_PAGES) {
    assert.ok(hrefs.includes(href) || PHONE_ONLY[href], href + " is on the phone bar but not in the bar, and not named as phone-only");
  }
  // Three pages and the Add button make the four tabs the frame draws.
  assert.equal(PHONE_PAGES.length, 3);
});
