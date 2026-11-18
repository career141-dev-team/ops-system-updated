"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createLead } from "@/app/actions";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";

type DirectClient = {
  id: string;
  name: string;
  about: string;
  contacts: { name: string; email: string; phone: string; role: string }[];
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

type ExistingCompany = {
  id: string;
  name: string;
  owner: string;
  status: string;
  href: string;
};

const PATHS = [
  {
    key: "enquiry",
    title: "Enquiry",
    sub: "A company asked us",
    defaultSource: "website",
  },
  {
    key: "direct",
    title: "Direct client",
    sub: "We already work with them",
    defaultSource: "director",
  },
  {
    key: "discovery",
    title: "Client discovery",
    sub: "A first meeting to explore",
    defaultSource: "linkedin",
  },
] as const;

const SOURCES = [
  { value: "website", label: "Website" },
  { value: "director", label: "Director" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export default function LeadCaptureForm({
  existingCompanies,
  directClients,
}: {
  existingCompanies: ExistingCompany[];
  directClients: DirectClient[];
}) {
  const [pathKey, setPathKey] = useState<(typeof PATHS)[number]["key"]>("enquiry");
  const [source, setSource] = useState<string>("website");
  const [company, setCompany] = useState<string>("");
  const [dismissedMatch, setDismissedMatch] = useState<string | null>(null);

  // Direct client (Figma 331:2976): search our own clients, pick one, then pick who to write to.
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [hot, setHot] = useState(0);
  const [picked, setPicked] = useState<DirectClient | null>(null);
  // -1 is "a new contact"; a client with nobody on file starts there.
  const [contactAt, setContactAt] = useState(0);
  const [fresh, setFresh] = useState({ name: "", email: "", phone: "" });
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directClients.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [directClients, query]);
  const pick = (client: DirectClient) => {
    setPicked(client);
    setContactAt(client.contacts.length > 0 ? 0 : -1);
    setFresh({ name: "", email: "", phone: "" });
    setListOpen(false);
  };
  const direct = pathKey === "direct";
  const contact = picked && contactAt >= 0 ? picked.contacts[contactAt] : null;
  const typed = contactAt === -1 ? fresh : null;
  // A direct client needs a client, and one way to reach them (the same rule the server holds).
  const reach = contact ? contact.email || contact.phone : typed ? typed.email || typed.phone : "";
  const canSave = !direct || Boolean(picked && reach.trim());

  const trimmed = company.trim().toLowerCase();
  const similar =
    trimmed.length >= 2
      ? existingCompanies.find((c) => {
          const lower = c.name.toLowerCase();
          if (lower.includes(trimmed) || trimmed.includes(lower)) return true;
          const firstWord = trimmed.split(/\s+/)[0];
          return firstWord && firstWord.length >= 3 && lower.includes(firstWord);
        }) ?? existingCompanies[0]
      : existingCompanies[0];

  const showBanner = Boolean(
    (trimmed.length >= 2 || existingCompanies.length > 0) &&
      similar &&
      dismissedMatch !== (company.trim() || "default"),
  );

  return (
    <form action={createLead} className="flex flex-col gap-7">
      <input type="hidden" name="back" value="/leads/new" />
      {!direct && <input type="hidden" name="source" value={source} />}

      {/* 3 Path Choice Cards (Figma 1:1875) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {PATHS.map((p) => {
          const active = pathKey === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPathKey(p.key);
                setSource(p.defaultSource);
              }}
              className={
                "flex flex-col gap-1.5 rounded-[24px] px-[18px] py-4 text-left transition-colors " +
                (active
                  ? "border-2 border-brand bg-brand-tint"
                  : "border-2 border-transparent bg-sunk hover:bg-rule/40")
              }
            >
              <span className="text-[16px] font-medium leading-[26px] text-ink">{p.title}</span>
              <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
                {p.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Source pills (Figma 1:1903), right under the three paths (18 Nov, the owner): the first thing to say about a lead, before its fields. */}
      {!direct && (
      <div className="flex flex-col gap-2">
        <span className={figmaLabel}>Source</span>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const active = source === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                className={
                  "rounded-full px-3.5 py-2 text-[14px] leading-[21px] transition-colors " +
                  (active
                    ? "bg-sunk font-medium text-ink"
                    : "font-normal text-ink-soft hover:text-ink")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {direct && (
        <div className="flex flex-col gap-4">
          {!picked ? (
            <div className="relative flex flex-col gap-1.5">
              <span className={figmaLabel}>Client</span>
              <div className="flex items-center gap-2.5 rounded-[16px] border-[1.5px] border-brand bg-surface px-4 py-3">
                <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
                <input
                  value={query}
                  autoFocus
                  autoComplete="off"
                  placeholder="Search your clients"
                  aria-label="Search your clients"
                  role="combobox"
                  aria-expanded={listOpen}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setListOpen(true);
                    setHot(0);
                  }}
                  onFocus={() => setListOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setListOpen(true);
                      setHot((h) => Math.min(h + 1, matches.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHot((h) => Math.max(h - 1, 0));
                    } else if (e.key === "Enter" && listOpen && matches[hot]) {
                      e.preventDefault();
                      pick(matches[hot]);
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-[16px] leading-[26px] text-ink outline-none focus-visible:!outline-none placeholder:text-ink-faint"
                />
                <span className="shrink-0 text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">Existing clients only</span>
              </div>
              {listOpen && (
                <div role="listbox" className="rounded-[20px] bg-surface p-2 shadow-float">
                  {matches.length === 0 ? (
                    <p className="px-3 py-3 text-[14px] leading-[21px] text-ink-soft">
                      {directClients.length === 0
                        ? "You have no clients yet. Use Enquiry for a company that has not worked with us."
                        : "No client of yours matches that. Is it a company we have not worked with? Use Enquiry."}
                    </p>
                  ) : (
                    matches.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={i === hot}
                        onMouseEnter={() => setHot(i)}
                        onClick={() => pick(c)}
                        className={"flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left " + (i === hot ? "bg-brand-tint" : "")}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-medium text-brand">
                          {initialsOf(c.name)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px] font-medium leading-[21px] text-ink">{c.name}</span>
                          <span className="truncate text-[12px] leading-4 text-ink-faint">{c.about}</span>
                        </span>
                        {i === hot && <Icon name="check" size={16} className="shrink-0 text-brand" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <input type="hidden" name="clientId" value={picked.id} />
              <input type="hidden" name="company" value={picked.name} />
              <input type="hidden" name="contactName" value={contact ? contact.name : (typed?.name ?? "")} />
              <input type="hidden" name="contactEmail" value={contact ? contact.email : (typed?.email ?? "")} />
              <input type="hidden" name="contactPhone" value={contact ? contact.phone : (typed?.phone ?? "")} />
              <input type="hidden" name="source" value={source} />

              <div className="flex flex-col gap-1.5">
                <span className={figmaLabel}>Client</span>
                <div className="flex items-center gap-3 rounded-[16px] bg-sunk px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-medium text-brand">
                    {initialsOf(picked.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[16px] font-medium leading-[26px] text-ink">{picked.name}</span>
                    <span className="truncate text-[12px] leading-4 text-ink-faint">{picked.about}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(null);
                      setQuery("");
                    }}
                    className="shrink-0 px-2 text-[14px] leading-[21px] text-ink underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={figmaLabel}>Contact</span>
                <div className="flex flex-wrap gap-2">
                  {picked.contacts.map((p, i) => (
                    <button
                      key={p.email + p.name + i}
                      type="button"
                      aria-pressed={contactAt === i}
                      onClick={() => setContactAt(i)}
                      className={
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] leading-[21px] " +
                        (contactAt === i ? "border-brand bg-brand-tint text-ink" : "border-rule text-ink-soft hover:text-ink")
                      }
                    >
                      <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-medium text-brand">
                        {initialsOf(p.name || picked.name)}
                      </span>
                      {p.name || p.email}
                      {p.role ? " · " + p.role : ""}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={contactAt === -1}
                    onClick={() => setContactAt(-1)}
                    className={
                      "flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-[14px] leading-[21px] " +
                      (contactAt === -1 ? "border-brand bg-brand-tint text-ink" : "border-rule-strong text-ink-soft hover:text-ink")
                    }
                  >
                    <Icon name="plus" size={14} />
                    New contact
                  </button>
                </div>
                {contactAt === -1 && (
                  <div className="grid grid-cols-1 gap-3.5 pt-1.5 sm:grid-cols-3">
                    <input
                      value={fresh.name}
                      onChange={(e) => setFresh({ ...fresh, name: e.target.value })}
                      placeholder="Who to write to"
                      aria-label="Contact name"
                      className={figmaField}
                    />
                    <input
                      value={fresh.email}
                      onChange={(e) => setFresh({ ...fresh, email: e.target.value })}
                      type="email"
                      placeholder="Their email"
                      aria-label="Contact email"
                      className={figmaField}
                    />
                    <input
                      value={fresh.phone}
                      onChange={(e) => setFresh({ ...fresh, phone: e.target.value })}
                      placeholder="Their number"
                      aria-label="Contact number"
                      className={figmaField}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className={figmaLabel}>What do they need?</span>
                  <Dictate into="notes" label="Speak" />
                </div>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="A second showroom manager for Kandy…"
                  className={figmaField}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Form Fields (Figma 1:1888): an enquiry and a client discovery are the same form */}
      {!direct && (
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>Company</span>
            <input
              name="company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ceylon Cold Stores"
              className={figmaField}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>Contact</span>
            <input
              name="contactName"
              placeholder="Roshan Perera · Head of HR"
              className={figmaField}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>Their email</span>
            <input
              name="contactEmail"
              type="email"
              placeholder="r.perera@els.lk"
              className={figmaField}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>Their number</span>
            <input
              name="contactPhone"
              placeholder="+94 77 412 8890"
              className={figmaField}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>What they do</span>
            <input
              name="industry"
              placeholder="Cold chain, food & beverage…"
              className={figmaField}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={figmaLabel}>Website</span>
            <input name="website" placeholder="els.lk" className={figmaField} />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className={figmaLabel}>What they asked for</span>
            <Dictate into="notes" label="Speak" />
          </div>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Looking for a Finance Manager and two Senior Accountants — Colombo, urgent"
            className={figmaField}
          />
        </div>

        {/* Already exists / similar check banner (Figma 1:1897) */}
        {showBanner && similar && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[16px] bg-warn-soft px-4 py-3">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[14px] leading-[21px] text-ink">
              <Icon name="alert" size={16} className="shrink-0 text-warning" />
              <span>
                Checked — no client called &ldquo;{company.trim() || "Ceylon Cold Stores"}&rdquo;.
                Similar:{" "}
                <Link href={similar.href} className="font-medium underline">
                  {similar.name}
                </Link>{" "}
                ({similar.owner}, {similar.status}).
              </span>
            </p>
            <button
              type="button"
              onClick={() => setDismissedMatch(company.trim() || "default")}
              className="text-[14px] font-medium leading-[21px] text-brand hover:underline"
            >
              Not the same
            </button>
          </div>
        )}
      </div>
      )}

      {/* Buttons (Figma 1:1906) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        <button type="submit" disabled={!canSave} className={pillPrimary + " disabled:cursor-not-allowed disabled:opacity-40"}>
          Save lead
        </button>
        <Link href="/clients" className="px-4 py-2 text-[16px] font-medium leading-[26px] text-ink-soft hover:text-ink">
          Cancel
        </Link>
        <span className="text-[14px] leading-[21px] text-ink-soft sm:ml-auto">The ops lead assigns the owner. Banking and finance are flagged when you save.</span>
      </div>
    </form>
  );
}
