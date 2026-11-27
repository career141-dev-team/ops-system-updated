"use client";

import { useState } from "react";

import { saveAgreementFields } from "@/app/actions";
import { ESA_FIELDS, expatMonthsOf } from "@/lib/esa";
import { figmaLabel, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { KeepFields } from "@/app/ui/KeepFields";
import { SubmitButton } from "@/app/ui/SubmitButton";

const input = "rounded-[10px] bg-surface px-3 py-2 text-[14px] text-ink outline-none";

/** The agreement's fields in the order a person asks for them on a call. */
const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Company", keys: ["companyName", "companyAddress", "clientBusiness", "registrationNo", "taxNo"] },
  { title: "Who signs for them", keys: ["signatoryName", "signatoryTitle", "signatoryEmail", "signatoryPhone"] },
  { title: "Terms", keys: ["clientType", "feeMonths", "expatFeeMonths", "feeBasis", "paymentDays", "guaranteeDays", "replacementWorkingDays", "refundPct"] },
  { title: "Agreed on the call", keys: ["notes"] },
];

/**
 * The one form for the agreement's details (17 Nov): on the intro call, where
 * the ops person learns them, and again on the Agreement step. It starts the
 * agreement when there is none, so nobody has to find a button first.
 * Blank required fields save fine and block the send.
 */
export function AgreementFieldsForm({
  leadId,
  esa,
  returnTo,
}: {
  leadId: string;
  esa: { id: string; fields: Record<string, string>; mode?: "draft" | "final" } | null;
  returnTo: "intro" | "agreement";
}) {
  const [mode, setMode] = useState<"draft" | "final">(esa?.mode ?? "final");
  const [clientType, setClientType] = useState<string>(String(esa?.fields.clientType ?? ""));
  // An agreement with no expat fee opens at twice its fee; saving a new fee carries it along (`followFee`).
  const value = (key: string) => (key === "expatFeeMonths" ? String(expatMonthsOf(esa?.fields ?? {})) : (esa?.fields[key] ?? ""));
  return (
    <form action={saveAgreementFields} className="flex flex-col gap-4">
      <KeepFields id={"agreement-fields-" + returnTo} />
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="esaId" value={esa?.id ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {/* 26 Nov (Nov 25 ops meeting): a Draft may leave the signatory and the address to be confirmed; it can never be marked signed. */}
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-ink-soft">Agreement type</span>
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "draft" | "final")}
            className={input}
          >
            <option value="final">Final: every detail filled in</option>
            <option value="draft">Draft: signatory, title and address may say &ldquo;To be confirmed&rdquo;</option>
          </select>
        </label>
        {mode === "draft" && (
          <p className="text-[12.5px] text-ink-soft">
            In Draft, signatory name, designation and address may stay blank — they print as highlighted &ldquo;To be confirmed&rdquo; with the draft note, and a Draft cannot be marked signed.
          </p>
        )}
      </div>
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <span className={figmaLabel}>{group.title}</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.keys.map((key) => {
              if (key === "expatFeeMonths" && clientType !== "international") return null;
              const field = ESA_FIELDS.find((f) => f.key === key);
              if (!field) return null;
              return (
                <label key={key} className={"flex flex-col gap-1 " + (key === "notes" || key === "companyAddress" ? "sm:col-span-2" : "")}>
                  <span className="text-[13px] text-ink-soft">
                    {field.label}
                    {field.required ? " *" : " (optional)"}
                  </span>
                  {key === "clientType" ? (
                    <select
                      name="field.clientType"
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                      className={input}
                    >
                      <option value="">Choose…</option>
                      <option value="local">Local</option>
                      <option value="international">International</option>
                    </select>
                  ) : key === "feeBasis" ? (
                    <select name="field.feeBasis" defaultValue={value(key) || "gross"} className={input}>
                      <option value="gross">Gross salary</option>
                      <option value="basic">Basic salary</option>
                    </select>
                  ) : (
                    <input name={"field." + key} defaultValue={value(key)} className={input} />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2.5">
        <SubmitButton id={"save-details-" + returnTo} className={pillSecondary}>
          Save the agreement details
        </SubmitButton>
        <SubmitButton id={"make-draft-" + returnTo} name="makeDraft" value="1" className={pillPrimary}>
          {mode === "final" ? "Save and Finalized ESA" : "Save and make the draft"}
        </SubmitButton>
        <span className="text-[12.5px] text-ink-soft">Each draft is a new version. The earlier ones stay.</span>
      </div>
    </form>
  );
}
