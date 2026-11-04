"use client";

import { useEffect, useRef, useState } from "react";

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
export default function Dictate({ into, label = "Dictate" }: { into: string; label?: string }) {
  const [listening, setListening] = useState(false);
  const [can, setCan] = useState(false);
  const [said, setSaid] = useState("");
  const recognition = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const window_ = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const Recognition = (window_.SpeechRecognition ?? window_.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: (event: { results: { transcript: string }[][] }) => void;
          onend: () => void;
          onerror: () => void;
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
      const field = document.querySelector<HTMLTextAreaElement | HTMLInputElement>('[name="' + into + '"]');
      if (field) {
        field.value = (field.value ? field.value.trim() + " " : "") + heard.trim();
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setSaid((before) => (before + " " + heard).trim());
    };
    engine.onend = () => setListening(false);
    engine.onerror = () => setListening(false);
    recognition.current = engine;
    return () => engine.stop();
  }, [into]);

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
        onClick={() => {
          if (listening) {
            recognition.current?.stop();
            setListening(false);
            return;
          }
          setListening(true);
          recognition.current?.start();
        }}
        className={
          "rounded-full border px-3 py-1 text-[12px] " +
          (listening ? "border-warning text-warning" : "border-rule-strong hover:bg-paper")
        }
      >
        {listening ? "Listening — press to stop" : label}
      </button>
      {said && <span className="text-[12px] text-ink-faint">{said.split(/\s+/).length} words heard</span>}
    </span>
  );
}
