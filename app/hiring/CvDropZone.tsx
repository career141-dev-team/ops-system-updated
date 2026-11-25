"use client";

import { useRef, useState } from "react";

import Icon from "@/app/Icon";

const OK = /\.(pdf|docx?)$/i;
const LIMIT = 25 * 1024 * 1024;
const size = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

/**
 * The Scoop's CV files: a box to drop them on, or click to choose (25 Nov, the owner). The real file input
 * (`name="cvs"`) stays in the form, so the server action reads the files exactly as before; dropping only
 * fills that input. PDF and Word only, up to 25 MB in all, the same as the words say.
 */
export default function CvDropZone() {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");

  const take = (picked: File[]) => {
    const good = picked.filter((f) => OK.test(f.name));
    const skipped = picked.length - good.length;
    let total = 0;
    const fits = good.filter((f) => (total += f.size) <= LIMIT);
    const parts = [skipped ? skipped + (skipped === 1 ? " file is not a PDF or Word file" : " files are not PDF or Word files") : "", good.length - fits.length ? good.length - fits.length + " left out: over 25 MB in all" : ""].filter(Boolean);
    setNote(parts.length ? parts.join(", ") + "." : "");
    const dt = new DataTransfer();
    fits.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setFiles(fits);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(Array.from(e.dataTransfer.files));
        }}
        className={"flex flex-col items-center gap-2 rounded-[16px] border-2 border-dashed px-5 py-8 text-center transition-colors " + (over ? "border-ink bg-sunk" : "border-rule-strong bg-sunk/50")}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-surface text-ink-2 shadow-card">
          <Icon name="file" size={20} />
        </span>
        <p className="t-body-m text-ink">Drag and drop CVs here</p>
        <p className="t-small text-ink-3">PDF or Word, up to 25 MB in all</p>
        <button type="button" onClick={() => input.current?.click()} className="t-label mt-1 cursor-pointer rounded-full border border-rule-strong bg-surface px-4 py-2 text-ink hover:bg-sunk">
          Choose files
        </button>
        {/* The real input: hidden from sight, still the one the form submits and checks. */}
        <input ref={input} type="file" name="cvs" multiple required accept=".pdf,.doc,.docx" aria-label="CV files" onChange={(e) => take(Array.from(e.target.files ?? []))} className="sr-only" tabIndex={-1} />
      </div>
      {note && <p className="t-small text-warn">{note}</p>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          <li className="t-micro text-ink-3">
            {files.length} {files.length === 1 ? "FILE" : "FILES"} READY
          </li>
          {files.map((f) => (
            <li key={f.name + f.size} className="t-small flex items-center gap-2.5 rounded-[10px] bg-sunk px-3 py-2 text-ink">
              <Icon name="file" size={14} className="shrink-0 text-danger" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-ink-3">{size(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
