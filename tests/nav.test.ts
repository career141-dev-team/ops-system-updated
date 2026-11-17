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

import { COVERS, NAV, PHONE_ONLY, PHONE_PAGES, pageAndSectionFor, tabFor, workspaceTitle } from "@/lib/nav";

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

test("every page on the phone's bar is a real sidebar entry", () => {
  const hrefs = NAV.flatMap((s) => s.pages.map((p) => p.href));
  for (const href of PHONE_PAGES) {
    // The chat is the column on the desk, not a ninth sidebar entry (docs/25: eight, never more).
    assert.ok(hrefs.includes(href) || PHONE_ONLY[href], href + " is on the phone bar but not in the sidebar, and not named as phone-only");
  }
  assert.equal(PHONE_PAGES.length, 4, "four fit a thumb; five do not");
});

test("the tab above the page names the entry the bar marks, or the page itself", () => {
  assert.equal(workspaceTitle("/"), "My Work");
  assert.equal(workspaceTitle("/clients/abc"), "Clients");
  assert.equal(workspaceTitle("/sets/abc"), "Openings", "a CV set is a face of a position");
  assert.equal(workspaceTitle("/guarantees/x"), "Placements");
  assert.equal(workspaceTitle("/invoices"), "Finance");
  assert.equal(workspaceTitle("/account"), "Profile");
  assert.equal(workspaceTitle("/notifications"), "Notifications");
  assert.equal(workspaceTitle("/chat"), "AURA");
  assert.equal(workspaceTitle("/sign-in"), null);
  for (const section of NAV) for (const page of section.pages) assert.equal(workspaceTitle(page.href), page.what === "Reports" ? "Report" : page.what, "the frames call it Report");
});

test("the tab is only drawn where a frame has one", () => {
  assert.equal(tabFor("/clients/abc"), "Clients");
  assert.equal(tabFor("/leads/new"), null);
  assert.equal(tabFor("/notifications"), null);
  assert.equal(tabFor("/account"), "Profile");
  assert.equal(tabFor("/settings"), null);
  assert.equal(tabFor("/templates"), null, "a Settings face");
  assert.equal(tabFor("/find"), null);
  assert.equal(tabFor("/leads/ld1"), "Clients", "a lead is still a Clients page");
});
