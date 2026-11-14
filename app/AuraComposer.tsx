import Link from "next/link";

import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { chatSay } from "@/app/actions";

/**
 * AURA's composer at the foot of My Work (13 Nov, the approved Figma "AURA
 * composer").
 *
 * "+", the box, the microphone and send. It posts the chat's own action
 * (`chatSay`), so what is typed here is exactly what typing in the AURA
 * column does - the same rules, the same buttons, nothing run without one
 * being pressed - and the column opens beside the page with the answer.
 *
 * The "+" opens AURA on its own page - its chats, files and history - since
 * the top bar's own "+" is already quick-add. The microphone is the
 * browser's own listening (Dictate): nothing leaves the laptop until send is
 * pressed.
 */
export default function AuraComposer() {
  return (
    <form
      action={chatSay}
      className="flex h-[60px] items-center gap-2 rounded-full bg-surface pl-2.5 pr-2.5 shadow-float"
    >
      <input type="hidden" name="back" value="/" />
      <input type="hidden" name="openColumn" value="1" />
      <Link
        href="/chat"
        title="Open AURA on its own page"
        aria-label="Open AURA on its own page"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunk text-ink-soft hover:text-ink"
      >
        <Icon name="plus" size={18} />
      </Link>
      <input
        id="aura-text"
        name="text"
        required
        autoComplete="off"
        placeholder="Tell AURA what happened, or ask anything"
        aria-label="Tell AURA what happened, or ask anything"
        className="min-w-0 flex-1 bg-transparent px-2 text-[16px] leading-[26px] text-ink outline-none placeholder:text-ink-faint"
      />
      <Dictate into="aura-text" label="Speak to AURA" round />
      <button
        aria-label="Send to AURA"
        title="Send to AURA"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-ink-inverse transition-transform active:scale-[0.96]"
      >
        <Icon name="send" size={18} />
      </button>
    </form>
  );
}
