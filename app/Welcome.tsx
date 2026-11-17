"use client";

import { useEffect } from "react";

/**
 * The welcome (17 Nov, the owner): after signing in, the top bar and the page arrive with a small animation.
 *
 * Signing in leaves a thirty-second cookie, `ops_welcome`. The first page that loads takes it, puts `welcome` on the
 * body for a second so the CSS in globals.css plays once, and deletes it - so a reload, or moving between pages, does
 * not play it again.
 */
export default function Welcome() {
  useEffect(() => {
    if (!document.cookie.split("; ").includes("ops_welcome=1")) return;
    document.cookie = "ops_welcome=; Max-Age=0; path=/";
    document.body.classList.add("welcome");
    // No cleanup on purpose: the second run React makes in development must not lose this timer.
    window.setTimeout(() => document.body.classList.remove("welcome"), 1200);
  }, []);
  return null;
}
