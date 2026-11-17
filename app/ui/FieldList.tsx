/**
 * A finished step's data, shown and not editable (owner, 17 Nov evening): the same
 * fields its form had, label above value, "—" where nothing was written. Used for the
 * agreement's details and the requirement once their steps are done.
 */
export function FieldList({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <dt className="text-[12.5px] text-ink-soft">{item.label}</dt>
          <dd className="whitespace-pre-wrap text-ink">{item.value?.trim() || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
