/**
 * Shared GSAP motion tokens for the v6 Ops System UI.
 *
 * Crisp, quiet, and fast: built for an operations desk used all day, with zero bouncy overshoot
 * and automatic opt-out when `prefers-reduced-motion: reduce` is enabled.
 */

export const EASE_OUT = "power3.out";
export const EASE_IN = "power2.in";
export const EASE_SMOOTH = "expo.out";

export const DUR = {
  fast: 0.16,
  base: 0.28,
  panel: 0.34,
  stagger: 0.035,
} as const;

/** SSR-safe check for user reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
