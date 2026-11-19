/**
 * Where an action sends the person afterwards (v6 UI, 19 Nov). A form can post `back`, the page it
 * was on (tab and panel included), so a save never throws the person to another screen. Pure, so the
 * door-guard and the join are tested.
 */

/** `back` only if it is one of our own paths: a redirect to wherever a form said is an open door. */
export function safeBack(raw: unknown, fallback: string): string {
  const back = String(raw ?? "").trim();
  return back.startsWith("/") && !back.startsWith("//") && !back.includes("\\") && !/[\u0000-\u001f]/.test(back) ? back : fallback;
}

/** Add the message with ? or & as the url needs, ahead of any #fragment. */
export function withMsg(url: string, msg: string): string {
  const [path, hash] = url.split(/(?=#)/);
  return path + (path.includes("?") ? "&" : "?") + "msg=" + encodeURIComponent(msg) + (hash ?? "");
}
