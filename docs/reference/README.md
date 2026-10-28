# Reference material

The source material collected on 27 Oct 2026, kept as it was written. When it
disagrees with the documents in `docs/`, **the documents in `docs/` win**, and the
newest decision is in [`../09-DECISIONS-AND-QUESTIONS.md`](../09-DECISIONS-AND-QUESTIONS.md).

| File | What it is | Note |
|---|---|---|
| `ANALYSIS.md` | The deep analysis of the owner's planning canvas: which cards count, corrected diagram labels, 12 design gaps, the 17 settled conflicts, the plan checked against TA's code | Still correct |
| `COMPARISON.md` | The Ops flow compared with the TA System stage by stage: same, extend or new, and permissions | Still correct |
| `OPS-TA-CONNECTIONS.md` | The 26 connection points in full: data, direction, rules, events | Written for Ops **inside** the TA backend. Each "contract function" is now an API endpoint (see `../03-CONNECTION-TO-TA.md`) |
| `INTEGRATION-PLAN.md` | The first integration draft: modules M1-M12, rules, safety, testing | Its "one app with an Ops workspace" architecture is **replaced** by the separate system (28 Oct). The modules and rules still apply |
| `OPS-PROJECT-REPORT.md` | The full project report and the first one-week timeline | Architecture section replaced (28 Oct) |
| `TA-AND-OPS-WEEK-PLAN.pdf` | The one-week plan in simple words: TA System, Ops System, TA Tracking | Written before the separate-system decision |
| `walkthroughs/` | Every canvas flow diagram as a readable list of steps and arrows. The newest is `c5237-...` | Arrow labels marked "position-matched" are approximate |

The raw canvas cards are **not** stored here because they contain real staff, client
and candidate names. They stay in the owner's `/ops` skill.
