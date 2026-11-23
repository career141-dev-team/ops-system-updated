import { editContact, removeContact, saveContact } from "@/app/actions";
import { figmaField, figmaLabel, pillSecondary } from "@/app/ui/figma";
import type { ContactRow } from "@/lib/contacts";

/**
 * Who we write to at a client, or for one position only (17 Nov). Edited in
 * place: a list, a remove link on each row, and one row to add another.
 */
export function Contacts({
  scope,
  id,
  contacts,
  mayManage,
  heading,
  hint,
}: {
  scope: "client" | "position";
  id: string;
  contacts: ContactRow[];
  mayManage: boolean;
  heading: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-sunk px-6 py-5">
      <div className="flex flex-col gap-0.5">
        <span className={figmaLabel}>{heading}</span>
        <p className="text-[13px] text-ink-soft">{hint}</p>
      </div>
      {contacts.length === 0 ? (
        <p className="text-[14px] text-ink-soft">Nobody yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-rule">
          {contacts.map((c) => (
            <li key={c.email} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
              <span className="text-ink">
                {c.name} <span className="text-ink-soft">· {c.email}{c.phone ? " · " + c.phone : ""}{c.role ? " · " + c.role : ""}</span>
              </span>
              {mayManage && (
                <details className="w-full">
                  <summary className="cursor-pointer text-[13px] text-brand hover:underline">Edit</summary>
                  <form action={editContact} className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-[1fr_1.3fr_1fr_110px_auto]">
                    <input type="hidden" name="scope" value={scope} />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="oldEmail" value={c.email} />
                    <input name="name" required defaultValue={c.name} className={figmaField} />
                    <input type="email" name="email" required defaultValue={c.email} className={figmaField} />
                    <input name="phone" defaultValue={c.phone} className={figmaField} />
                    <input name="role" defaultValue={c.role} className={figmaField} />
                    <button type="submit" className={pillSecondary}>
                      Save
                    </button>
                  </form>
                </details>
              )}
              {mayManage && (
                <form action={removeContact}>
                  <input type="hidden" name="scope" value={scope} />
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="email" value={c.email} />
                  <button type="submit" className="text-[13px] text-ink-faint hover:text-danger">
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {mayManage && (
        <form action={saveContact} className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-[1fr_1.3fr_1fr_110px_auto]">
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="id" value={id} />
          <input name="name" required placeholder="Name" className={figmaField} />
          <input type="email" name="email" required placeholder="email@client.com" className={figmaField} />
          <input name="phone" placeholder="Phone" className={figmaField} />
          <input name="role" placeholder="hr" defaultValue={scope === "client" ? "hr" : "other"} className={figmaField} />
          <button type="submit" className={pillSecondary}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}
