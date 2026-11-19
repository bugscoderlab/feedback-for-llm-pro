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

## Upstream (../feedback-for-llm) — 1.9.x PORTED 2026-11-19

Merged `upstream/main` (`8fc73bf`, v1.9.2) into pro main as `1348bb8` — the
one-time `--allow-unrelated-histories` merge that establishes a merge base, so
future upstream syncs are ordinary three-way merges (see AGENTS.md → "Keeping
in sync with upstream"; `upstream` remote added, tags disabled).

- ✅ v1.9.0 "Pick several" — multi-pick, one note fanned out onto N elements.
- ✅ v1.9.1/v1.9.2 picked-so-far panel + occlusion fix — the chip variant.
- Resolution rule applied: upstream engine changes adopted, pro identity
  (name, version 1.0.0, URLs, addon id) kept. `git diff upstream/main` on
  engine files shows branding only.
- Verified after merge: 106 behaviour assertions (was 88), check-hidden,
  check-toggle, build all green.

## First tasks when resuming

1. User adds AMO secrets → tag `v1.0.0` → watch `gh run watch` → confirm the
   signed release lands.
2. ~~Port the 1.9.x work~~ — done, see above.
3. ~~Then the structured-issue feature~~ — **done 2026-11-19** (three commits
   after the merge: model+fields, switcher+scoping, export+format 2). Issues
   with title/Expected/Observation + per-issue steps/remarks/markers, page-
   global basket, `format: 2` JSON with `format: 1` Load compat, GitHub-issue
   markdown. 138 behaviour assertions green. See AGENTS.md → "The
   structured-issue feature" for the shipped semantics.

## Next: phase 2 (deferred by spec)

Direct GitHub issue creation via API — token lives in the background script,
never a content script.

## Environment notes

- Don't run this and the original extension enabled at once (identical
  `ffab-` element ids — two pills/drawers).
- Dev server for the target app during the occlusion work:
  http://187.53.132.86:3000/shipment-report (Next.js, dense `<table>` report —
  good stress case for pickers; cells are classless `td`s with
  `td:nth-of-type(n)` selectors).
