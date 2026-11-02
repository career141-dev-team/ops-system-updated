@AGENTS.md

## Start here

New to this project? Read [`docs/HANDOVER-PROMPT.md`](docs/HANDOVER-PROMPT.md) first, then
[`docs/00-CONTEXT-FOR-A-NEW-CHAT.md`](docs/00-CONTEXT-FOR-A-NEW-CHAT.md) and the plan in
[`docs/15-BUILD-PLAN.md`](docs/15-BUILD-PLAN.md). Do not ask the owner to explain the
project: it is all written down. The plan is **not approved yet**, so no Ops code is
written until the owner says to build.

## Claude Code specifics

- The full Ops knowledge (flow, numbers, every planning card) is in the `/ops`
  skill on the owner's laptop; the TA System is described by `/ta-system-full-flow`
  and the TA repository's feature skills.
- Anything that would touch the live server, the live TA backend or the live Ops
  backend needs the owner's explicit go-ahead in the conversation, every time.
