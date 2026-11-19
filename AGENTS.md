# Feedback for LLM Pro — agent brief

Firefox extension (MV2, Firefox-only). A structured **issue reporter**: create
an issue, record the steps that led to the problem, write what you expected vs
what you observed, attach element-precise remarks (CSS selectors + React
component names), export a paste-ready report. Forked from
[`bugscoderlab/feedback-for-llm`](https://github.com/bugscoderlab/feedback-for-llm)
v1.8.2 — same engine, new identity.

## Current state

- Baseline import committed as `76e8f6d` ("Import feedback-for-llm v1.8.2 as
  the pro baseline"), pushed to `main`. Working tree clean.
- Version **1.0.0** — committed to `src/manifest.json`, but **NOT tagged yet**:
  the release workflow would fail without the one-time setup below.
- `gh-pages` branch exists (empty placeholder `bc815c5`) so Pages can be
  pointed at it.
- All 88 behaviour assertions pass; `node build.mjs` is clean.

## One-time setup — USER'S SIDE, status unknown — verify before tagging

1. **GitHub Pages**: repo Settings → Pages → Deploy from a branch → `gh-pages`
   / root. (Branch already exists.)
2. **AMO secrets**: `AMO_JWT_ISSUER` + `AMO_JWT_SECRET` in repo Settings →
   Secrets → Actions (same values as the original repo, or fresh from the AMO
   API keys page).

Do NOT push a version tag until both are confirmed — a failed release run
wastes a tag and pollutes Releases.

## House rules (user's standing instructions)

- **Every completed change: commit, push, and tag.** Then watch the release
  workflow (`gh run watch`) and confirm the signed release lands. Use `gh`.
- Versioning: **patch for small iterations, minor for new capabilities** (repo
  convention, from the original project).
- Act directly; no clarifying questions — make the reasonable assumption, state
  it, proceed.
- Never run git mutations beyond commit/push/tag without asking.

## Verify before shipping any change

```sh
node check-behaviour.mjs     # 88 assertions, drives src/content.js in headless Chrome
node check-hidden.mjs        # every *-hidden class must have a real hide rule
node check-toggle.mjs        # toolbar click always reaches the pill
node build.mjs               # rebuilds dist/, re-runs hidden/toggle guards, zips
```

`check-behaviour.mjs` embeds its harness page as template literals: inside
`HARNESS_JS`, escape backticks as `` \\\` `` and avoid `${`. Fixture fibers
fake React's `__reactFiber$` shape. The harness runs content.js as a plain
page script — same world; production Firefox uses Xray isolation, which is why
the React fiber walk runs via the injected page-world probe
(`window.__ffabReactInfo`, called through `window.wrappedJSObject`). Keep that
bridge intact when touching `reactInfo`/`describeElement`.

## Keeping in sync with upstream

The `upstream` remote points at
[`bugscoderlab/feedback-for-llm`](https://github.com/bugscoderlab/feedback-for-llm)
(added 2026-11-19; this repo is **not** a GitHub network fork). Pro = upstream
engine + a layer of pro-only changes (branding, structured-issue feature) on
top of the `76e8f6d` baseline import.

- **Never fetch upstream tags** (`remote.upstream.tagOpt = --no-tags` is set):
  upstream's `v*` tag names collide with this repo's own release tags. Fetch
  branches only.
- **To port upstream work**: `git fetch upstream`, then either
  `git merge upstream/main` (brings everything, one merge commit) or
  `git cherry-pick <sha>` specific commits (e.g. the 1.9.x run `1d8ba41`,
  `ea8cfe3`, `8fc73bf`). Resolve conflicts in favour of "keep pro branding and
  features, adopt upstream's engine changes".
- Keep pro-only changes in small, well-separated commits so these merges stay
  clean. Known overlap/conflict zones: drawer markup, `onPickClick`, the
  popover save path.
- Upstream tags are the porting reference: a version like upstream v1.9.2 =
  tag `v1.9.2` there; `git log upstream/main` after fetching shows the same
  commits.

## Next: the structured-issue feature (the reason this repo exists)

Design already agreed with the user — build to this spec:

- **Issue = container**: title + **Expected** + **Observation** (the current
  freeform "Review" box becomes Observation; Expected is new) + steps (exists
  as 🧭 Record steps) + remarks (exist as 🎯 picks). One **active issue** at a
  time: a switcher (`[ Issue: "…" ▾ ]` + ＋ New) in the drawer header.
- **Per-issue**: steps, remarks, markers. **Page-global**: the removal basket
  ("remove this element" is page feedback, not part of one issue's story).
- **Persistence**: stays keyed by `pageKey`; add `issues: []`. JSON export
  becomes `format: 2`, and `Load` must still accept `format: 1` records (the
  `app: "feedback-for-llm"` marker stays — it is a format identifier).
- **Export**: markdown shaped as a GitHub issue body — title, `## Steps to
  reproduce`, `## Expected`, `## Actual` (observation), remarks with
  selectors/components. Copy/Save per issue or per page (pick one, state it).
- **Deferred (phase 2)**: direct GitHub issue creation via API — token must
  live in the background script, never a content script.

## Gotchas carried over from the original

- Don't run this and the original extension enabled at once — both inject the
  same `ffab-` UI with identical element ids; you get two pills/drawers.
- Updating mid-tab self-heals via `__ffabTeardown` + re-inject; see
  `src/content.js` header and `src/background.js`.
- Drawer slides in from the right (`transform: translateX`), hidden =
  `visibility: hidden` after the transition — `check-hidden.mjs` depends on it.
- Manifest/build/release config all flow from `release.config.json`; the
  workflow has no hardcoded repo names.
