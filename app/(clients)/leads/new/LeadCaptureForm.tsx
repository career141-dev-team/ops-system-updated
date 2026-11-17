"use client";

import Link from "next/link";
import { useState } from "react";

import { createLead } from "@/app/actions";
import Dictate from "@/app/Dictate";
import Icon from "@/app/Icon";
import { figmaField, figmaLabel, pillPrimary } from "@/app/ui/figma";

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
    defaultSource: "website_form",
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
  { value: "website_form", label: "Website" },
  { value: "director", label: "Director" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export default function LeadCaptureForm({
  existingCompanies,
}: {
  existingCompanies: ExistingCompany[];
}) {
  const [pathKey, setPathKey] = useState<(typeof PATHS)[number]["key"]>("enquiry");
  const [source, setSource] = useState<string>("website_form");
  const [company, setCompany] = useState<string>("");
  const [dismissedMatch, setDismissedMatch] = useState<string | null>(null);

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
      <input type="hidden" name="source" value={source} />

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

      {/* Form Fields (Figma 1:1888) */}
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

      {/* Source pills (Figma 1:1903) */}
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

      {/* Buttons (Figma 1:1906) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        <button type="submit" className={pillPrimary}>
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
