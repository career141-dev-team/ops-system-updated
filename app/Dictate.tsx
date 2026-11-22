"use client";

import { useEffect, useRef, useState } from "react";

import Icon from "@/app/Icon";
import { dictationProblem } from "@/lib/dictation";

/**
 * The microphone beside a field (15, Phase 9 steps 5 and 6).
 *
 * The speaking itself is the browser's own speech recognition: no model, no
 * key, no cost, and nothing leaves the laptop until a person presses the
 * button that sends the text on. That is deliberate - dictation is the piece
 * the desk will use fifty times a day, and it must not spend anything or
 * depend on anybody's API being up.
 *
 * It writes into the field beside it, and the person edits what it heard.
 * Nothing saves itself.
 */
export default function Dictate({ into, label = "Dictate", round = false }: { into: string; label?: string; round?: boolean }) {
  const [listening, setListening] = useState(false);
  const [can, setCan] = useState(false);
  const [said, setSaid] = useState("");
  const [problem, setProblem] = useState("");
  const recognition = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Click to start, click to stop. start() throws if it is already running or the page may not listen.
  const toggle = () => {
    setProblem("");
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    try {
      recognition.current?.start();
      setListening(true);
    } catch {
      setListening(false);
      setProblem("Could not start listening. Press again, or type it instead.");
    }
  };

  useEffect(() => {
    const window_ = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const Recognition = (window_.SpeechRecognition ?? window_.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: (event: { results: { transcript: string }[][] }) => void;
          onend: () => void;
          onerror: (event: { error: string }) => void;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Recognition) return;
    setCan(true);

    const engine = new Recognition();
    // English first; Sinhala and Tamil when each has been proved (step 5).
    engine.lang = "en-LK";
    engine.continuous = true;
    engine.interimResults = false;
    engine.onresult = (event) => {
      let heard = "";
      for (const result of Array.from(event.results)) heard += (result[0]?.transcript ?? "") + " ";
      // By id first (13 Nov): AURA's composer shares the name "text" with the
      // quick-add note in the top bar, which comes earlier on the page.
      const field =
        (document.getElementById(into) as HTMLTextAreaElement | HTMLInputElement | null) ??
        document.querySelector<HTMLTextAreaElement | HTMLInputElement>('[name="' + into + '"]');
      if (field) {
        field.value = (field.value ? field.value.trim() + " " : "") + heard.trim();
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setSaid((before) => (before + " " + heard).trim());
    };
    engine.onend = () => setListening(false);
    engine.onerror = (event) => {
      setListening(false);
      setProblem(dictationProblem(event.error));
    };
    recognition.current = engine;
    return () => engine.stop();
  }, [into]);

  // AURA's composer (13 Nov): the design's round microphone, and nothing at
  // all where the browser cannot listen - the box is still there to type in.
  if (round) {
    if (!can) return null;
    return (
      <button
        type="button"
        aria-pressed={listening}
        aria-label={listening ? "Listening - press to stop" : label}
        title={listening ? "Listening - press to stop" : label}
        onClick={toggle}
        className={
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors " +
          (listening ? "bg-bg-warning text-warning" : "text-ink-soft hover:bg-sunk hover:text-ink")
        }
      >
        <Icon name="mic" size={18} />
      </button>
    );
  }

  if (!can) {
    return (
      <span className="text-[12px] text-ink-faint">
        This browser cannot listen. Type it instead — nothing here needs the microphone.
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={
          "rounded-full border px-3 py-1 text-[12px] " +
          (listening ? "border-warning text-warning" : "border-rule-strong hover:bg-paper")
        }
      >
        {listening ? "Listening — press to stop" : label}
      </button>
      {problem && <span className="text-[12px] text-warn">{problem}</span>}
      {said && <span className="text-[12px] text-ink-faint">{said.split(/\s+/).length} words heard</span>}
    </span>
  );
}
