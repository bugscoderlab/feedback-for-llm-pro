# Structured-issue feature — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (native, single session) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat page feedback record into per-page **issues** — each
with title, Expected, Observation, steps, and remarks — with one active issue,
a drawer switcher, GitHub-issue-shaped per-issue export (JSON `format: 2`,
`format: 1` Load compat).

**Architecture:** All state lives in the existing per-page storage record
(`ffab:${pageKey}`). Issues are a new `issues: []` array plus
`activeIssueId`/`issueSeq`; annotations and steps gain an `issueId` stamp at
creation. The drawer gains an issue bar (switcher + ＋ New) and the Review box
is replaced by the issue fields block (title / Expected / Observation). Export
is per issue; the removal basket stays page-global and rides along in exports
as a page-wide section.

**Tech Stack:** Plain JS content script (`src/content.js`), CSS
(`src/feedback.css`), behaviour harness (`check-behaviour.mjs`, headless
Chrome). No new dependencies.

**Spec:** `AGENTS.md` → "Next: the structured-issue feature" (agreed design);
`HANDOFF.md` resume task 3.

## Global Constraints

- `app: "feedback-for-llm"` marker stays in JSON export — it is a format
  identifier, NOT renamed.
- One **active issue** at a time; switcher `[ Issue: "…" ▾ ]` + ＋ New in the
  drawer header area.
- **Per-issue**: steps, remarks, markers. **Page-global**: removal basket.
- Persistence stays keyed by `pageKey`; `Load` must accept `format: 1`
  records (review → default issue's Observation).
- Export markdown shape: title, `## Steps to reproduce`, `## Expected`,
  `## Actual` (observation), remarks with selectors/components.
- Copy/Save scope decision (spec leaves a choice): **Copy and .md Save export
  the ACTIVE issue**; the page-global basket is appended as
  `## Remove these elements (page-wide)` when non-empty; **JSON Save exports
  the whole page record** (all issues) as `format: 2`.
- Version stays **1.0.0** (debut release, never tagged; the port + this
  feature ship together when AMO secrets land). No tag — release workflow
  blocked.
- Existing harness semantics change only where the spec demands: the Review
  box becomes Observation (`ffab-dr-review` / `ffab-dr-review-note` ids are
  replaced by the issue-fields ids).
- Never introduce an `*-hidden` class without an id-qualified
  `#<id>.ffab-hidden { display: none; }` rule — `check-hidden.mjs` fails
  otherwise. Reuse plain `ffab-hidden`.

## Review Focus

- Typing in a field while `render()` runs (pick lands, marker click) must not
  clobber the active element — same guard as the old review box.
- Switching issue mid-popover: pending popover must close, pending picks must
  not leak onto the newly active issue.
- `format: 1` Load with empty/missing `review` → default issue with empty
  Observation, not undefined.
- Annotations/steps with missing or dangling `issueId` (hand-edited JSON,
  pre-feature storage) must be stamped onto the active issue, never dropped.
- Clear-all must reset issues to exactly one empty default issue (reused ids
  from `issueSeq` reset are fine).

---

### Task 1: Issue data model, persistence, and the fields block

**Files:**
- Modify: `src/content.js` (storage section ~L165-218, injected UI ~L296-299,
  wiring ~L1206-1219, clear-all ~L1410-1425)
- Modify: `src/feedback.css` (replace `#ffab-dr-review*` rules; style the
  issue bar + fields)
- Test: `check-behaviour.mjs` (update sections 5, 6, 10, 14 to the fields
  block; add section 15 for model persistence)

**Interfaces:**
- Produces (used by Tasks 2-3):
  - Globals: `issues` (`{id,title,expected,observation,createdAt}[]`),
    `issueSeq` (number), `activeIssueId` (number|null).
  - `ensureIssue() -> issue` — creates the default issue when `issues` is
    empty; sets `activeIssueId`.
  - `activeIssue() -> issue` — the issue matching `activeIssueId`, else
    `issues[0]`.
  - `adoptState(rec)` — set all state globals from a raw record (storage or
    JSON); migrates legacy (`issues` absent → one issue, Observation =
    `rec.review ?? ""`, stamp `issueId` = that issue on annotations/steps);
    stamps dangling/missing `issueId`s to the active issue; reconciles
    `issueSeq`/`activeIssueId`.
  - Storage record v2: `{annotations, seq, basket, steps, issues, issueSeq,
    activeIssueId}` (no `review` field).
  - DOM ids: `ffab-dr-issuebar`, `ffab-issue-switch`, `ffab-issue-cur`,
    `ffab-issue-new`, `ffab-issue-menu` (hidden, needs CSS hide rule),
    `ffab-dr-issue-fields`, `ffab-issue-title`, `ffab-issue-expected`,
    `ffab-issue-observation`. Removed: `ffab-dr-review`,
    `ffab-dr-review-note`.

- [ ] **Step 1: Update the harness (failing tests)**

In `check-behaviour.mjs`:
- Section 5: replace `ffab-dr-review` visibility check with
  `ffab-dr-issue-fields` visible.
- Section 6: type into `ffab-issue-observation`; assert
  `rec().issues[0].observation === REVIEW` (replace `rec().review`).
- Section 10 (clear all): replace review assertions with
  `rec().issues.length === 1`, fields emptied
  (`ffab-issue-observation").value === ""`), fields block still visible.
- New section 15 (after section 14's load tests, renumber nothing — call it
  15): fill title + expected + observation on the default issue; assert
  `rec().issues.length === 1`, all three persisted on `issues[0]`; assert the
  stored record has no `review` key (`!("review" in rec())`).
- Section 14 stays format-1 for now; its `rec().review` assertion moves to
  Task 3 (migration). Until then expect this section to fail — that is the
  red state for Task 3's green.

- [ ] **Step 2: Run to verify red**

`node check-behaviour.mjs` → new/updated assertions FAIL.

- [ ] **Step 3: Implement in `src/content.js`**

- Storage globals: add `issues = []`, `issueSeq = 1`, `activeIssueId = null`.
- `load()` delegates to `adoptState(rec)`; `save()` writes the v2 record.
- `adoptState(rec)` per Interfaces (also called by `applyLoadedRecord` in
  Task 3 — for now wire `load()` only).
- Field inputs: `input` listeners write `activeIssue().title/expected/
  observation`, debounce `save()` (reuse the `reviewSaveTimer` pattern);
  `blur` saves immediately. `render()` syncs values with the
  `document.activeElement !== el && el.value !== field` guard (review-box
  pattern) — the render-side sync lands in Task 2's `renderIssueBar()`.
- Drawer markup: issue bar (switcher button with `ffab-issue-cur` span + ＋
  New button) under `ffab-dr-head`; fields block replaces the
  `ffab-dr-review` div.
- `syncClearAll()`: also true when any issue has a non-blank field.
- `clearEverything()`: reset issues to one fresh default issue
  (`issueSeq = 1`, field values cleared).

- [ ] **Step 4: CSS in `src/feedback.css`**

- Remove `#ffab-dr-review.ffab-hidden` rule + review-note styles (replaced).
- Add `#ffab-issue-menu.ffab-hidden { display: none; }`.
- Style: `.ffab-dr-issuebar` (flex row), `#ffab-issue-menu` (issue rows),
  `.ffab-dr-issue-fields` (bordered block, reuses `.ffab-rv-head`), extend the
  old review textarea selector to `#ffab-issue-expected,
  #ffab-issue-observation`; `#ffab-issue-title` reuses the manual-input look.

- [ ] **Step 5: Run to verify green**

`node check-behaviour.mjs` → all pass except the known section-14 red
(covered by Task 3). `node check-hidden.mjs` → OK.

- [ ] **Step 6: Commit** (`feat: issue data model + fields block (wip: load migration next)`)

### Task 2: Issue switcher, ＋ New, per-issue scoping

**Files:**
- Modify: `src/content.js` (render ~L1008-1083, renderSteps ~L1090-1137,
  renderMarkers ~L911-957, popover save ~L883-907, addStepEntry ~L583,
  addMultiEntry save path, sel-add path, switch wiring)

**Interfaces:**
- Consumes: Task 1 globals + helpers.
- Produces:
  - `annActive()` / `stepsActive()` — filtered by `activeIssueId`.
  - `renderIssueBar()` — switcher label (`Issue N` + truncated title) and the
    menu (one row per issue, active marked; click to activate). Called from
    `render()`; also syncs the three field values (Task 1 guard pattern).
  - `switchIssue(id)` — sets `activeIssueId`, `closePopover()`, `render()`.
  - New annotations/steps stamped `issueId: activeIssueId` (popover save,
    multi fan-out, addStepEntry, subframe relay paths, sel-add).
  - FAB idle count and toolbar badge = open remarks **across all issues**
    (page-level signal; stated decision).

- [ ] **Step 1: Harness (failing) tests — section 16**

- ＋ New: creates a second issue, activates it, `rec().issues.length === 2`,
  switcher label shows the new issue.
- Remark picked under issue 2: `rec().annotations.at(-1).issueId ===
  rec().activeIssueId` and drawer list shows only issue-2 remarks; markers
  on page match issue-2 remark count only.
- Record a step under issue 2; switch to issue 1 via the menu: steps section
  shows issue-1 steps only; title/expected/observation fields show issue-1
  values; switch back, fields restore.
- Typing a field, then clicking 🎯 Pick element (render runs) — field value
  intact (`ffab-issue-observation").value` unchanged).
- Popover open (armed pick) → switch issue is unreachable while drawer is
  hidden; assert instead: after Esc cancels picking with drawer open… skip —
  covered implicitly. Instead assert: marker click opens edit popover for an
  issue-1 remark while issue 1 active after switching.

- [ ] **Step 2: Run red; Step 3: implement; Step 4: run green** (same loop as
  Task 1; `check-behaviour.mjs` all green except section 14).

- [ ] **Step 5: Commit** (`feat: issue switcher + per-issue scoping`)

### Task 3: Per-issue export, format 2 JSON, Load migration

**Files:**
- Modify: `src/content.js` (feedbackText ~L1294-1335 → `issueText(issue)`,
  copy/download wiring ~L1371-1380, JSON export ~L1453-1472, Load ~
  L1489-1522 `applyLoadedRecord`)
- Test: `check-behaviour.mjs` (section 14 rewrite + new section 17)

**Interfaces:**
- Produces:
  - `issueText(issue) -> string` — GitHub-issue-shaped markdown: first line
    title (or `Untitled issue`), `*Page: …*` line, `## Steps to reproduce`,
    `## Expected`, `## Actual`, `## Remarks` (`### n. [STATUS] label` with
    selector/component/source/shows + "Requested change:"), then page-global
    `## Remove these elements (page-wide)` when basket non-empty, then the
    existing `---` + generated-by footer.
  - JSON export: `{app: "feedback-for-llm", format: 2, exported, pageKey,
    annotations, seq, basket, steps, issues, issueSeq, activeIssueId}`.
  - `applyLoadedRecord(rec)` → delegates to `adoptState(rec)` after
    validating `Array.isArray(rec.annotations)`; accepts `format` absent/1/2.

- [ ] **Step 1: Harness (failing) tests**

- Section 14 rewrite: after the format-1 load, assert migration:
  `rec().issues.length === 1`, `rec().issues[0].observation === "loaded
  review"`, loaded annotation has `issueId === rec().activeIssueId`,
  `ffab-issue-observation").value === "loaded review"`, `!("review" in
  rec())`.
- Section 17 (export shape): with issue 2 active carrying title/expected/
  observation/steps/remarks + a basket entry: click Copy; assert
  `window.__export` starts with the title; contains `## Steps to
  reproduce`, `## Expected`, `## Actual`, `## Remarks`,
  `## Remove these elements (page-wide)`; remark block contains
  `` ` ``-wrapped selector and `[OPEN]`.
- Section 17b (format-2 round trip): build a `format: 2` object in-page
  (reuse current `rec()` + wrap: `{app:"feedback-for-llm", format:2,
  exported:…, pageKey:…, ...rec()}`), clear everything, Load it, assert
  `rec().issues.length`, `rec().activeIssueId`, and annotations restored with
  issueIds.
- Section 17c: format-1 with NO `review` key → Observation `""`, not
  `undefined`.

- [ ] **Step 2-4: red → implement → green** (full suite green now).

- [ ] **Step 5: Commit** (`feat: per-issue export, format 2 JSON, load migration`)

### Task 4: Docs, guards, build, ship

**Files:**
- Modify: `README.md` (feature bullet: replace the export example with the
  issue-shaped one), `src/README.md` (the Copy/export bullet), `AGENTS.md`
  (structured-issue marked implemented; storage shape v2 note),
  `HANDOFF.md` (resume task 3 done; next: AMO secrets → tag)

- [ ] **Step 1: Update docs** (keep tight; the export example block in
  `src/README.md` gets the new shape).
- [ ] **Step 2: Full verification**

`node check-behaviour.mjs` (all green) + `node check-hidden.mjs` +
`node check-toggle.mjs` + `node build.mjs`.

- [ ] **Step 3: Commit + push** (no tag — AMO secrets still missing;
  `gh secret list -R bugscoderlab/feedback-for-llm-pro` to re-verify and say
  so).

## Self-review notes

- Spec coverage: container title/Expected/Observation (T1), steps+remarks in
  issue (T2), one active + switcher + New (T2), per-issue steps/remarks/
  markers + page-global basket (T2, export T3), pageKey persistence + issues
  [] (T1), format 2 + format 1 compat (T3), GitHub-issue markdown (T3),
  per-issue Copy/Save choice stated (Global Constraints). Phase 2 GitHub API
  stays deferred per spec.
- Rename consistency: `annActive`/`stepsActive`/`renderIssueBar`/`switchIssue`
 /`adoptState`/`issueText` used consistently across tasks; ids listed once in
  Task 1 and not redefined.
