/**
 * What the AI would do here, while it cannot (24, section 5).
 *
 * Every screen that has an AI offer shows it even when the layer is off. It
 * is deliberately not a button: a disabled button is a thing you try to press.
 * It is the name of the help, and the reason it is not available, in the same
 * place the real offer sits - so a person learns the system can do this, and
 * what has to happen for it to.
 */
export default function AiOffer({ label, why }: { label: string; why: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="rounded-full border border-dashed border-rule-strong px-3 py-1 text-[12px] text-ink-faint">
        {label}
      </span>
      <span className="text-[12px] text-ink-faint">{why}</span>
    </div>
  );
}
