/**
 * State panels (19 Nov, the v6 design): a screen's own states - find a time, write a result, add
 * a payment - open as a 680px drawer on the right. Which one is open is in the address, as
 * `?panel=<name>`, and `?on=<id>` says which record it is about, so Back closes it, a reload
 * keeps it, and a link opens it with no script at all.
 *
 * These are the only two helpers a page needs: one makes the link that opens a panel, the other
 * the link that closes it. Both keep every other query value (the view, the filters) as it was.
 */

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

/** The page's current query values, as a fresh URLSearchParams we may change. */
function copy(params: Params): URLSearchParams {
  if (params instanceof URLSearchParams) return new URLSearchParams(params);
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((one) => out.append(key, one));
    else if (value !== undefined) out.set(key, value);
  }
  return out;
}

const link = (path: string, query: URLSearchParams) => {
  const text = query.toString();
  return text ? path + "?" + text : path;
};

/** The link that opens `panel` on this page, about the record `on` if there is one. */
export function panelHref(path: string, params: Params, panel: string, on?: string): string {
  const query = copy(params);
  query.set("panel", panel);
  if (on) query.set("on", on);
  else query.delete("on");
  return link(path, query);
}

/** The link that closes whatever panel is open: the same page, `panel` and `on` gone. */
export function closeHref(path: string, params: Params): string {
  const query = copy(params);
  query.delete("panel");
  query.delete("on");
  return link(path, query);
}
