# Handoff — Feedback for LLM Pro

*Cross-repo state as of 2026-11-17. For engine internals and build/release
mechanics see `AGENTS.md`; this file is the "where are we" snapshot.*

## Pro repo (this one)

- Baseline: `feedback-for-llm` **v1.8.2** imported as `76e8f6d`, rebranded
  "Pro". Same engine, new identity (structured issue reporter).
- Version **1.0.0** in `src/manifest.json`, **not tagged** — blocked on
  one-time setup:
  - ✅ GitHub Pages: `gh-pages` / root, built and live
    (https://bugscoderlab.github.io/feedback-for-llm-pro/)
  - ❌ AMO secrets: `AMO_JWT_ISSUER` + `AMO_JWT_SECRET` not set on this repo
    (verified 2026-11-17 via `gh secret list` — zero secrets). Values are
    write-only; the user must add them from the
    [AMO API keys page](https://addons.mozilla.org/developers/addon/api/key/),
    then tag `v1.0.0`.
- Verify: `node check-behaviour.mjs` (88 assertions), `check-hidden.mjs`,
  `check-toggle.mjs`, `node build.mjs`.

## Upstream (../feedback-for-llm) — has moved on since the fork

Shipped after the 1.8.2 baseline, none of it ported here yet:

- **v1.9.0 — "Pick several"**: multi-pick mode; one note fanned out onto N
  picked elements as individual numbered remarks. New drawer button
  `ffab-dr-multi`, `pickMode: "multi"`, `pendingTargets` run, popover fans out,
  pill counts the run, Esc opens the popover once. Subframe relay handles
  `multi`.
- **v1.9.1 — picked-so-far panel**: live list of the collected run.
- **v1.9.2 — occlusion fix (important)**: the grown panel swallowed clicks on
  page content beneath it (reported on a dense P&L table — the cell next to a
  picked one became unclickable). Fixed: panel is now a compact chip by
  default (`ffab-run-chip`), click to expand, header click folds back. When
  porting, take **1.9.2**, not 1.9.1.

## First tasks when resuming

1. User adds AMO secrets → tag `v1.0.0` → watch `gh run watch` → confirm the
   signed release lands.
2. Port the 1.9.x work (cherry-pick `1d8ba41`, `ea8cfe3`, `8fc73bf` from the
   original repo, or merge `main`) — expect conflicts in the drawer markup,
   `onPickClick`, and the popover save path, all of which the issue-container
   feature will also touch.
3. Then the structured-issue feature (spec in `AGENTS.md` → "Next"): issue =
   container with title + Expected + Observation (current Review box) +
   steps + remarks; one active issue; per-issue steps/remarks/markers;
   page-global basket; `format: 2` export with `format: 1` Load compat;
   GitHub-issue-shaped markdown.

## Environment notes

- Don't run this and the original extension enabled at once (identical
  `ffab-` element ids — two pills/drawers).
- Dev server for the target app during the occlusion work:
  http://187.53.132.86:3000/shipment-report (Next.js, dense `<table>` report —
  good stress case for pickers; cells are classless `td`s with
  `td:nth-of-type(n)` selectors).
