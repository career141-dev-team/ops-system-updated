"use client";

import { useState } from "react";

import { handOverToTa, markRoleImpractical } from "@/app/actions";
import { Avatar, figmaField, figmaLabel, pillDanger, pillPrimary, pillSecondary } from "@/app/ui/figma";

type TaPerson = {
  id: string;
  fullName: string;
};

export default function RequirementDecisionClient({
  leadId,
  taPeople,
  defaultDate,
  rebookHref,
}: {
  leadId: string;
  taPeople: TaPerson[];
  defaultDate: string;
  rebookHref: string;
}) {
  const [choice, setChoice] = useState<"yes" | "no">("yes");
  const [selectedTaId, setSelectedTaId] = useState<string>(taPeople[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* 2 Choice Cards (Figma 1:2081) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("yes")}
          className={
            "flex flex-col gap-1.5 rounded-[24px] px-[18px] py-4 text-left transition-colors " +
            (choice === "yes"
              ? "border-2 border-brand bg-brand-tint"
              : "border-2 border-transparent bg-sunk hover:bg-rule/40")
          }
        >
          <span className="text-[16px] font-medium leading-[26px] text-ink">
            Yes — open the position
          </span>
          <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
            Market matches · creates the opening in the TA System
          </span>
        </button>

        <button
          type="button"
          onClick={() => setChoice("no")}
          className={
            "flex flex-col gap-1.5 rounded-[24px] px-[18px] py-4 text-left transition-colors " +
            (choice === "no"
              ? "border-2 border-brand bg-brand-tint"
              : "border-2 border-transparent bg-sunk hover:bg-rule/40")
          }
        >
          <span className="text-[16px] font-medium leading-[26px] text-ink">
            Not practical
          </span>
          <span className="text-[14px] font-normal leading-[21px] text-ink-soft">
            Decline politely · set a date to check back with them
          </span>
        </button>
      </div>

      {choice === "yes" ? (
        <form action={handOverToTa} className="flex flex-col gap-5">
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="primaryTaId" value={selectedTaId} />

          {/* Pick row (Figma 1:2088) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className={figmaLabel}>Primary TA</span>
              {taPeople.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {taPeople.map((person) => {
                    const active = selectedTaId === person.id;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setSelectedTaId(person.id)}
                        className={
                          "inline-flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-[14px] leading-[21px] transition-colors " +
                          (active
                            ? "border-[1.5px] border-brand bg-brand-tint font-medium text-ink"
                            : "border border-transparent bg-sunk font-normal text-ink-soft hover:text-ink")
                        }
                      >
                        <Avatar
                          name={person.fullName}
                          size="24"
                          tone={active ? "brand" : "neutral"}
                        />
                        <span>{person.fullName}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={selectedTaId}
                  onChange={(e) => setSelectedTaId(e.target.value)}
                  placeholder="Primary TA name"
                  className={figmaField}
                />
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={figmaLabel}>100% day (target to fill)</span>
              <input
                type="date"
                name="hundredPercentDay"
                defaultValue={defaultDate}
                className={figmaField}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="submit" className={pillPrimary}>
              Open the position
            </button>
            <a href={rebookHref} className={pillSecondary}>
              Not held — rebook
            </a>
          </div>
        </form>
      ) : (
        <form action={markRoleImpractical} className="flex flex-col gap-4">
          <input type="hidden" name="leadId" value={leadId} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={figmaLabel}>Why the role cannot be filled as asked</span>
              <input
                name="reason"
                required
                placeholder="Package below market for 8+ years experience…"
                className={figmaField}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={figmaLabel}>Check back with them on</span>
              <input
                type="date"
                name="inviteBackAt"
                defaultValue={defaultDate}
                className={figmaField}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="submit" className={pillDanger}>
              Not practical at that package
            </button>
            <button
              type="button"
              onClick={() => setChoice("yes")}
              className={pillSecondary}
            >
              Back to open position
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
