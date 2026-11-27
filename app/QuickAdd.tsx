"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { quickAdd } from "@/app/actions";
import Icon, { type IconName } from "@/app/Icon";
import { panelInput } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import Popover from "@/app/ui/Popover";
import { LEAD_SOURCES, SOURCE_MEANINGS } from "@/lib/leads";
import { closeHref, panelHref } from "@/lib/panel";

/**
 * Add, from anywhere (v6 frame G3, 19 Nov; first made 7 Nov, UX order 5).
 *
 * The round black + opens a card of what can be added. The three that save on the spot - a note,
 * a call note and an enquiry - open a state panel (`?panel=add-note`, `add-call`, `add-enquiry`)
 * drawn by <AddPanel> in the layout, so they work from any page. They post to the same
 * `quickAdd` action as before, which sends you back to the page you were on with the
 * three-second line. The rest are links to where that thing is added.
 *
 * The browser refuses an empty required field before anything is sent; the server's own rules
 * stand behind it, and a refusal comes back as the same three-second line.
 */
export default function QuickAdd({ phone = false }: { phone?: boolean }) {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const open = (name: string) => panelHref(path, params, name);

  const items: ({ icon: IconName; what: string; href: string } | "line")[] = [
    { icon: "pen", what: "Note", href: open("add-note") },
    { icon: "phone", what: "Call note", href: open("add-call") },
    { icon: "check", what: "Task", href: "/?view=tasks" },
    { icon: "calendar", what: "Meeting", href: "/calendar" },
    { icon: "file", what: "File", href: "/files" },
    { icon: "inbox", what: "Enquiry", href: open("add-enquiry") },
    { icon: "briefcase", what: "Role", href: "/positions" },
    { icon: "user", what: "Candidate", href: "/candidates/add" },
    "line",
    { icon: "building", what: "Vacancy (internal)", href: "/hiring" },
  ];

  return (
    <Popover
      label="Add a note, a call, an enquiry and more"
      width={400}
      above={phone}
      triggerClass={
        phone
          ? "flex flex-1 cursor-pointer flex-col items-center gap-[3px] text-ink-3"
          : "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sunk text-ink transition-colors hover:bg-shell active:scale-[0.96]"
      }
      trigger={
        phone ? (
          <>
            <Icon name="plus" size={22} />
            <span className="t-micro !normal-case">Add</span>
          </>
        ) : (
          <Icon name="plus" size={20} />
        )
      }
    >
      <div className="flex flex-col gap-0.5 p-3">
        <p className="t-micro pb-1.5 text-ink-3">Add</p>
        {items.map((one, i) =>
          one === "line" ? (
            <div key={i} className="px-3.5 py-1.5">
              <div className="h-px bg-rule" />
            </div>
          ) : (
            <Link key={one.what} href={one.href} scroll={false} className="t-body flex items-center gap-3.5 rounded-[12px] px-3.5 py-3 hover:bg-sunk">
              <Icon name={one.icon} size={20} className="shrink-0" />
              <span className="flex-1">{one.what}</span>
            </Link>
          ),
        )}
      </div>
    </Popover>
  );
}

const field = panelInput;
const label = "t-small text-ink-3";
const save = "t-body-m inline-flex w-fit cursor-pointer items-center rounded-full bg-ink px-5 py-[11px] text-ink-inverse active:scale-[0.98]";

/**
 * The three Add panels, for the layout to draw: it reads `?panel=` and shows one of `add-note`,
 * `add-call`, `add-enquiry`, or nothing. Pages never use these names, so they keep their own.
 */
export function AddPanel({ clients }: { clients: { id: string; name: string }[] }) {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const which = params.get("panel");
  if (which !== "add-note" && which !== "add-call" && which !== "add-enquiry") return null;
  const close = closeHref(path, params);
  const contextClient = which === "add-call" ? clients.find((client) => client.id === params.get("on")) ?? null : null;

  const about = (
    <label className="flex flex-col gap-1.5">
      <span className={label}>Which client (optional)</span>
      <input name="about" list="quick-clients" className={field} />
    </label>
  );

  const title = which === "add-note" ? "A note" : which === "add-call" ? "A call note" : "An enquiry";
  const sub =
    which === "add-note"
      ? "It becomes a task for you, due tomorrow morning."
      : which === "add-call"
        ? "Write down a call you made or took."
        : "A company that has asked about us. The two checks wait on its page.";

  return (
    <Panel kicker="Add" closeHref={close} title={title} sub={sub} boxed>
      <datalist id="quick-clients">
        {clients.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <form action={quickAdd} className="flex flex-col">
        <input type="hidden" name="back" value={close} />
        {which === "add-note" && (
          <>
            <input type="hidden" name="kind" value="note" />
            <PanelSection title="The note">
              <label className="flex flex-col gap-1.5">
                <span className={label}>The note (the first line is the title)</span>
                <textarea name="text" required rows={5} className={field} />
              </label>
            </PanelSection>
            <PanelSection title="What it is about">
              {about}
              <button type="submit" className={save}>Keep it</button>
            </PanelSection>
          </>
        )}
        {which === "add-call" && (
          <>
            <input type="hidden" name="kind" value="call" />
            <PanelSection title="Who">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Their number</span>
                <input name="to" required placeholder="077 123 4567" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Who you spoke to</span>
                <input name="spokeTo" required className={field} />
              </label>
              {contextClient ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <span className={label}>Client</span>
                    <span className="t-body-m">{contextClient.name}</span>
                  </div>
                  <input type="hidden" name="clientId" value={contextClient.id} />
                </>
              ) : about}
            </PanelSection>
            <PanelSection title="What was said">
              <label className="flex flex-col gap-1.5">
                <span className={label}>What was said</span>
                <textarea name="outcome" required rows={4} className={field} />
              </label>
              <button type="submit" className={save}>Write it down</button>
            </PanelSection>
          </>
        )}
        {which === "add-enquiry" && (
          <>
            <input type="hidden" name="kind" value="enquiry" />
            <PanelSection title="The company">
              <label className="flex flex-col gap-1.5">
                <span className={label}>The company</span>
                <input name="company" required className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Who rang</span>
                <input name="contactName" className={field} />
              </label>
            </PanelSection>
            <PanelSection title="How to reach them">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Their number</span>
                <input name="contactPhone" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Or their email</span>
                <input name="contactEmail" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Where it came from</span>
                <select name="source" defaultValue="call" className={field}>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_MEANINGS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={save}>Save the enquiry</button>
            </PanelSection>
          </>
        )}
      </form>
    </Panel>
  );
}
