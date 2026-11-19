/**
 * Preview-and-send modals (19 Nov, the v6 design): the 1600px two-column overlay that shows the
 * exact calendar invite, email, PDF or WhatsApp message before anything leaves the system.
 *
 * Driven by `?send=<kind>&on=<id>`, just like `?panel=` drives the 680px work drawers. Opening a
 * send modal clears any open `?panel=` so the two never stack, while preserving the page's tab
 * (`?view=`) and filters.
 */

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

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

const spent = ["msg", "did", "at"];

/** The link that opens a `send` modal on this page, replacing any open work panel. */
export function sendHref(path: string, params: Params, kind: string, on?: string): string {
  const query = copy(params);
  spent.forEach((key) => query.delete(key));
  query.delete("panel");
  query.delete("on");
  query.set("send", kind);
  if (on) query.set("on", on);
  return link(path, query);
}

/** The link that closes whatever `send` modal is open, keeping the page's tab and filters. */
export function closeSendHref(path: string, params: Params): string {
  const query = copy(params);
  spent.forEach((key) => query.delete(key));
  query.delete("send");
  query.delete("on");
  return link(path, query);
}
