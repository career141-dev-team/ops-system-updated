# 32 · TA shortlist feed: candidates and CVs on the Ops position

**Status: plan, not built (22 Nov 2026).** Written after the ops team's feedback that no
role and no CV shows in Ops. It says what already exists on both sides, what is wrong or
missing, and the order of work. Nothing here changes the TA System until its own pull
request is reviewed there (AGENTS.md rules 1, 2 and 8).

## The goal

When a TA shortlists candidates for a client's opening, those candidates appear on the
matching Ops position, each with a CV a person can open, without anyone copying them over
by hand. TA stays the only place candidates are created and moved. Ops reads them.

Later, the Capacity Planner joins as a third system. The same rule holds for it: each system
reads the others only through an API, with its own key.

## What already exists

Most of the plumbing is built and tested on both sides. It is not switched on.

| | TA System (ta-system repo) | Ops (this repo) |
|---|---|---|
| Auth | `Authorization: Bearer <OPS_API_TOKEN>`, own secret, 503 until set (`convex/lib/partnerReadAuth.ts`, `convex/integrations/opsReadHttp.ts`) | `OPS_TA_TOKEN`, `OPS_TA_BASE_URL`, `OPS_TA_READS_ENABLED`, `OPS_TA_WRITES_ENABLED` (`src/lib/ta.ts`) |
| Openings | `POST /integrations/v1/openings`, raises `opening.created` | `handOverToTa` queues it in the outbox; `takeOpeningCreated` fills `openingTaId` |
| Pipeline | `GET /openings/{id}/pipeline` → `{id, candidateName, currentStage, setNumber, backupForApplicationId}` per application, up to 1000, live ones only | `pipeline()` read live by `taApplicationsFor` (`src/lib/positionCandidates.ts`), shown on the position's Candidates tab |
| Client sets | `GET /openings/{id}/client-sets[/{n}]`, raises `client_set.ready` | `takeClientSetReady` makes an `opsClientSets` row |
| CVs | `GET /applications/{id}/prepared-cv` streams the application's stored CV (TA fetches the signed R2 URL itself; Ops never sees it) | `reviewClientSet` copies each set CV into the file store |
| Events | `opsEvents` table, `GET /events?after=<ms>`, 16 types raised by TA's own work (commit f67133f, PR #366) | `readTaEvents` polls every 5 minutes from the clock |
| Stand-in | none needed | `src/data/fakeTa.ts`, on when `OPS_TA_FAKE=on` |

`docs/29-BUCKET-LIST.md` §1 calls the events "the biggest single gap". That is out of date:
TA now raises 16 of them. Only `reference.reported` and `candidate.rejection_notice_sent`
are declared and never raised.

## What is wrong or missing

1. **The stage names do not match (blocking).** TA's pipeline returns its raw backend stage
   (`ta-system/convex/integrations/opsRead.ts`, `toOpsPipeline`). Those are `new_cvs`,
   `matched_candidates`, `ta_shortlist`, `ai_call`, `follow_up`, `second_shortlist`,
   `director_shortlist`, `client_review`, `interview`, `offer`, `placed`, `rejected` and
   `unresponsive`. Ops and its stand-in use `client_shortlist`, `sent_to_client`,
   `rejected_by_client` and `screened`, which TA never sends.
   - `SHORTLISTED_STAGES` and `PENDING_STAGES` (`src/lib/depth.ts`) would count zero.
   - `INTERNAL_STAGES` (`src/lib/positionCandidates.ts`) is marked as a guess in its own comment.
   - So the first real read would show every position as empty, and the depth rules (hold at 5, search again at 3) would never fire.
   - "Sent to the client" is not a stage in TA at all. It is a `reviewRounds` row with `kind: "client"` and `dispatch: "sent"`.
2. **There is no shortlist view in Ops.** The Candidates tab lists the whole pipeline. It cannot say "these are the ones TA shortlisted", and only set CVs can be opened.
3. **CVs open only inside a client set.** A shortlisted candidate who is not yet in a ready set has no CV in Ops, although TA's `prepared-cv` endpoint already serves any application's CV.
4. **The `prepared-cv` name is misleading.** It streams the CV the candidate uploaded, not the CAREER141-branded "Prepared CV" PDF. That PDF is made by TA's Next app (`src/lib/preparedCvFile.ts`, `/api/prepared-cv/[appId]`), which only answers a signed-in TA user. Ops must not send a client a raw CV thinking it is the branded one.
5. **The opening match is fragile.** `takeOpeningCreated` links TA's new opening to the oldest waiting Ops position for the same client. It does not use the `opsPositionId` Ops sent. Two openings handed over for one client on the same day can be crossed.
6. **The pipeline has only a name and a stage.** There is no `candidateId`, `ownerTaId` or `shortlistedAt`, and nothing to say whether a CV exists. The fuller contract in `docs/15-BUILD-PLAN.md` E2 lists these fields.
7. **TA side limits.** Reads cap at 100 rows with no paging (the pipeline goes to 1000). The client-set read scans `reviewRounds.take(1000)` in memory instead of using an index. Neither matters at today's volume, but the second will slow and then miss rows as rounds grow.
8. **Not switched on.** `OPS_API_TOKEN` is not set on TA, so every call answers 503. The Ops production example still runs on the stand-in.

## The plan, in order

Each step is a pull request of its own. Steps 1 and 2 are Ops-only and can start now.
Step 3 is in the TA repo. Step 0 is a person's work with the owner's go-ahead.

### Step 0 · Switch the read link on, on preview first (person, no code)

- Generate one token (at least 43 base64url characters).
- Set it as `OPS_API_TOKEN` on TA through TA's release pipeline. It must not be set from a laptop (TA AGENTS.md).
- Set the same value as `OPS_TA_TOKEN` on the Ops **preview**, with `OPS_TA_FAKE` off, `OPS_TA_READS_ENABLED=on` and writes still off.
- Check `/dev/ta` on preview against two real openings, reading only.
- Writes (`OPS_API_WRITES_ENABLED`, `OPS_API_ACTOR_EMAIL`, `switch.taWritesEnabled`) stay off until step 2 is merged.

Needs: the owner's explicit go-ahead, because it touches the live TA backend's settings.

### Step 1 · One stage map in Ops (blocking, Ops only)

- Add `src/lib/taStages.ts`. It is the single place TA's raw stage names are read.
- It maps each name to what Ops needs:
  - in search: `new_cvs` to `ai_call`;
  - TA shortlisted: `follow_up`, `second_shortlist`;
  - Director shortlisted: `director_shortlist`;
  - with the client: `client_review`;
  - interview, offer and placed;
  - out: `rejected`, `unresponsive`.
- An unknown name maps to "unknown" and is logged, never dropped silently.
- `depth.ts`, `positionCandidates.ts` and the sample data all read through it.
- Rewrite `fakeTa.ts`, `sampleOpenings.ts` and `sampleDesk.ts` to use TA's real names, so the local run fails the same way the real one would.
- Test: every name in TA's `currentStage` union is mapped. Copy the list in with a dated comment pointing at `ta-system/convex/schema.ts`. When step 3 lands, TA's contract test becomes the source.
- Decide one rule with the owner: does "shortlisted" for the depth count start at the TA shortlist (`follow_up`) or at the client's (`client_review`)? Today's code means the client's. `ta-system/docs/ops/OPS-TA-CONNECTIONS.md` says 5 shortlisted in total.

### Step 2 · The shortlist and its CVs on the position (Ops only)

- On the position's Candidates tab, show TA-shortlisted candidates and beyond as their own group, "Shortlisted by TA", from the live pipeline read. Group them with the step 1 map.
- Add **Open CV** for each one. A new signed-in route, `app/api/ta-cv/[applicationId]`, calls `prepared-cv` and streams the bytes on with `no-store`.
  - The CV is not copied. 78,000 CVs stay in TA's bucket, and Ops keeps a copy only when one goes into a client set, as `reviewClientSet` already does, so what a client received can be shown later.
  - The route checks that the application belongs to an opening this position holds, so a guessed id opens nothing.
- Label it **"The candidate's own CV"**, not "Prepared CV". The branded version is step 3.
- When TA is down, the tab says so in a plain sentence, as the hardening rules already require. It does not show an empty list.
- Cache the pipeline read for 30 seconds per opening. `docs/15-BUILD-PLAN.md` E1 already says so, and the code does not do it yet.
- Tests: the grouping, the ownership check on the CV route, and TA down. All of it runs against the stand-in, rewritten in step 1.

### Step 3 · Additive TA endpoints (TA repo, its own pull request, `merge-teammate` review)

Only new optional fields and new routes. Nothing that changes what a TA sees.

1. **`opening.created` echoes `opsPositionId`** in its `data`, when Ops sent one. Ops then matches on it and keeps "oldest waiting for that client" only as the fallback. This fixes gap 5.
2. **Pipeline fields.** Add `candidateId`, `ownerTaId`, `shortlistedAt` and `hasCv: boolean` to each application, all optional. Ops shows who shortlisted and when, and hides Open CV when there is none.
3. **The branded Prepared CV for the Ops token.** Add a server route in TA's Next app that checks the Ops bearer token and returns `preparedCvFile`'s PDF. It is `files.preparedCv` in `ta-system/docs/ops/OPS-TA-CONNECTIONS.md` §12, and T19 in `docs/15-BUILD-PLAN.md`. Ops then sends clients the branded file.
4. **Index the client-set read** by `jobId` on `reviewRounds` instead of scanning 1000 rows.

Contract tests: TA's `tests/opsRead.test.ts` gains the new fields. Ops adds a contract test
that runs against TA's real answer shapes. It is listed as not built in `docs/STATUS.md`.

### Step 4 · Writes on (person, owner go-ahead)

After steps 1–3, switch on `OPS_API_WRITES_ENABLED`, `OPS_API_ACTOR_EMAIL` and the Ops
switch `switch.taWritesEnabled`, on preview first. Then hand over one real requirement end
to end: opening created, position linked by `opsPositionId`, the shortlist shows, a CV
opens, and a client set sends.

## The Capacity Planner

**What exists:**
- It already reads TA through TA's separate partner API: `/integrations/v1/tables/*` and `/cv/{cvUploadId}`, with its own `CAPACITY_PLANNER_READ_TOKEN` (`ta-system/docs/PARTNER-READ-ONLY-API.md`).
- Ops does not use that API and must not disturb it.
- Nothing exists between Ops and the Capacity Planner.

**Proposed rule:**
- Each pair talks through the API of the system that owns the data, each with its own key.
- TA owns candidates and CVs.
- Ops owns clients, requirements, positions, agreements and money.
- The Capacity Planner owns how much work the team can take on.

**Questions for the owner before any design:**
1. What does the Capacity Planner need from Ops: open positions and headcount, hundred-percent days, or the client stage? Does it need it as a read, or as events?
2. Does Ops need anything back, for example "this TA has no room this week" when assigning a primary recruiter at hand-over?
3. Should the Capacity Planner read Ops through an Ops read API with its own key, mirroring TA's? That would be a new `app/api/integrations/v1/*` here, which does not exist yet.

## What this plan does not cover

- Ops creating or shortlisting candidates in TA. TA has no such write, and adding one would change what a TA sees.
- Hand-added candidates (`manualCandidates`) going into a set (STATUS.md, "needs a TA endpoint that can hold a person Ops made").
- Email sending. It is a separate go-live item (`docs/22-GO-LIVE.md`).
