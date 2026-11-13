/**
 * When the top bar shows (13 Nov, the approved Figma "My Work" design).
 *
 * The owner asked for the bar to get out of the way and come back when the
 * pointer reaches the top of the page. On My Work it is in its place at the
 * top, and slides up once the page is scrolled; on every other page the
 * sidebar is the way around, so the bar starts out of sight. Either way it
 * comes back for the pointer at the top edge.
 *
 * Three people must never lose it: somebody on the keyboard (focus inside it,
 * so Tab and / still reach the search), somebody on a touch screen (there is
 * no pointer to bring it back), and somebody whose pointer is on it already.
 */

/** How close to the top edge, in pixels, the pointer has to come. */
export const REVEAL_ZONE = 16;

/** Scrolled less than this is still "at the top". */
export const TOP_SLACK = 8;

export interface BarState {
  /**
   * The page keeps the bar in place at its top: My Work, where the bar is
   * the header. Everywhere else the sidebar is the navigation, and the bar
   * waits out of sight until it is called (the owner, 13 Nov).
   */
  pinnedAtTop: boolean;
  /** window.scrollY. */
  scrollY: number;
  /** The pointer's distance from the top of the window; null before it has moved. */
  pointerY: number | null;
  /** The pointer is over the bar itself. */
  overBar: boolean;
  /** Keyboard focus is inside the bar. */
  focusWithin: boolean;
  /** No hover on this device (a phone or a tablet). */
  touch: boolean;
}

export function barShown(state: BarState): boolean {
  if (state.touch || state.focusWithin || state.overBar) return true;
  if (state.pinnedAtTop && state.scrollY <= TOP_SLACK) return true;
  return state.pointerY !== null && state.pointerY <= REVEAL_ZONE;
}
