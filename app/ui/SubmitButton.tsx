"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form's button that answers in place (17 Nov).
 *
 * The owner's complaint: every button reloaded the page at the top, so they
 * scrolled back down after each click. While the action runs this shows a
 * spinner and cannot be pressed twice; when the page comes back with
 * `?at=<id>` (see `leadBack` in app/actions.ts) the answer is written beside
 * this button and the page is scrolled to it.
 */
export function SubmitButton({
  id,
  className,
  children,
  name,
  value,
  formNoValidate,
  answerAt,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  id: string;
  /** Where the answer is shown when this button will not be on the page afterwards (an <Answer id>). */
  answerAt?: string;
  className: string;
  children: ReactNode;
  name?: string;
  value?: string;
  formNoValidate?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const { pending, data } = useFormStatus();
  const params = useSearchParams();
  const at = answerAt ?? id;
  const answer = params.get("at") === id ? params.get("msg") : null;
  const mine = !!data && data.get("at") === at;
  const here = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (answer) here.current?.scrollIntoView({ block: "center" });
  }, [answer]);

  return (
    <span ref={here} id={id} className="inline-flex flex-wrap items-center gap-2.5">
      {/* The id goes with the form only when this button is the one pressed. */}
      <button
        type="submit"
        name={name ?? "at"}
        value={name ? value : at}
        formNoValidate={formNoValidate}
        disabled={pending || disabled}
        aria-label={ariaLabel}
        aria-busy={pending && mine}
        className={className + " inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"}
        onClick={(e) => {
          // A named button (makeDraft, reset) also has to say which button it was.
          if (!name) return;
          const form = e.currentTarget.form;
          if (!form) return;
          form.querySelector('input[name="at"][data-pressed]')?.remove();
          const field = document.createElement("input");
          field.type = "hidden";
          field.name = "at";
          field.value = at;
          field.dataset.pressed = "1";
          form.appendChild(field);
        }}
      >
        {pending && mine && (
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        )}
        {children}
      </button>
      {answer && !pending && (
        <span role="status" className="text-[13px] text-ink">
          {answer}
        </span>
      )}
    </span>
  );
}

/**
 * The answer to a button that is gone once it worked ("It was held" hides its own
 * meeting form): shown here instead, and the page is scrolled to it.
 */
export function Answer({ id }: { id: string }) {
  const params = useSearchParams();
  const answer = params.get("at") === id ? params.get("msg") : null;
  const here = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (answer) here.current?.scrollIntoView({ block: "center" });
  }, [answer]);
  if (!answer) return null;
  return (
    <p ref={here} id={id} role="status" className="rounded-[12px] bg-surface px-3 py-2 text-[13.5px] text-ink">
      {answer}
    </p>
  );
}
