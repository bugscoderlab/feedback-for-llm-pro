# 🐞 Feedback for LLM Pro — Firefox extension

A browser-extension port of the annotation/feedback mode from
[`docs/brief/prototype/`](../docs/brief/prototype/index.html) ("📝 Feedback for
LLM"), evolved into a **structured issue reporter**: create an issue, record
the steps that led to the problem, write what you expected versus what you
observed, and export a paste-ready report — with element-level remarks carrying
CSS selectors and React component names. Forked from
[`feedback-for-llm`](https://github.com/bugscoderlab/feedback-for-llm) v1.8.2
(engine at v1.9.2 after the multi-pick port).

## What it does

- **🎯 Pick element** — the cursor becomes a crosshair; hovering
  highlights the target; clicking opens the remark popover with a generated
  label ("button “Approve all pending”", "column header “Qty”", …), the page
  context, and the element's CSS selector. **Tab** or **`]`** walk the
  highlight up through the stack of elements under the cursor
  (`elementsFromPoint` — nested parents *and* overlapping siblings),
  Shift+Tab/`[` back down. The press itself is swallowed, so native `<select>`
  dropdowns and other controls don't react while you aim. Inside an **iframe**
  (same- or cross-origin) a lightweight relay takes over: it paints the
  highlight in the frame, swallows the press, and forwards the pick — the
  popover still opens in the top page. A parent cannot message a cross-origin
  child, so arming state lives per-tab in the background; the top frame
  publishes it and subframes pull it (see `background.js`).
- **🚫 Remove element** — the same crosshair (the highlight turns red), but
  each click skips the popover and drops the element straight into the **removal
  basket**: no note to write, no per-element form. The picker stays armed so you can
  basket a whole run of elements, and the pill counts them as you go; Esc finishes.
  Basket entries show as red ✕ markers and as their own list above the remarks, each
  with an ✕ to unmark.
  The two pickers sit side by side at the top of the drawer.
- **🧭 Record steps** — the walkthrough: the run of clicks that got you to the
  problem, which the popover's one-shot remarks can't express. The picker works the
  same way (teal highlight, picks skip the popover), each click appends the next step,
  and it stays armed so the whole run is one motion; the pill counts the steps as you
  go. **Esc ends the run and opens the drawer to write your Expected and
  Observation** — because the point of stopping is having something to write
  down. Steps and words are positional
  and persisted per page, so you can stop mid-run, reload, and pick it back up.
- **💾 Save remark** — numbered markers pin to the elements; **clicking a
  marker reopens its popover with the note prefilled**, so the comment can be
  read and edited in place. Remarks persist per page in
  `browser.storage.local` (survive reloads and browser restarts).
- **Drawer** — every remark with *locate* (scrolls to the element and flashes
  it), *resolve/reopen*, and *delete*; every step with *locate* and *drop*.
  Footer accepts a raw CSS selector pasted from Firefox Inspect. **🗑 Clear all**
  appears only when there is something to clear, and swaps to an explicit
  ✓/✕ pair on the spot rather than using a dialog.
- **🐞 Issues** — the page's feedback is organised as issues: one **active
  issue** at a time, each with a **title**, **Expected**, **Observation**
  (the walkthrough's story), its own steps and remarks, and page markers. The
  issue bar (`Issue 1 ▾` + **＋ New**) in the drawer switches between issues
  and starts new ones; switching re-scopes the drawer list, the steps, and
  the on-page markers. The removal basket stays **page-global** — deleting an
  element is page feedback, not part of one issue's story.
- **📋 Copy / ⬇ feedback.md** — exports the **active issue** shaped as a
  GitHub issue body:

  ```markdown
  Save button stays disabled after filling the email
  *Page: <origin + path> · Exported: … · 2 open remark(s), 3 total · 3 step(s) to reproduce*

  ## Steps to reproduce

  1. button "Add user" — `#add-user`
  2. input "Email" — `.modal form > input:nth-of-type(2)`
  3. button "Save" — `.modal footer > button`

  ## Expected

  Save becomes clickable once Email is valid

  ## Actual

  Save stayed greyed out

  ### 1. [OPEN] button "Approve all pending"
  - Selector: `.q-item:nth-of-type(4) > button`
  - Currently shows: "approve"
  Requested change:
  make it a primary button
  ```

  Steps first, so the agent follows the journey before the requests; then the
  expected-vs-actual pair, then act on OPEN remarks (RESOLVED ones are done).
  When elements were basketed, a page-wide `## Remove these elements`
  section follows the remarks. The **⬇ json** export saves the whole page
  record (`format: 2` — every issue plus the basket) and **📂 Load** accepts
  both it and old `format: 1` records, migrating the legacy freeform review
  into the first issue's Observation. Copy says so on its own button
  (`✓ Copied`) — no dialog to dismiss.
- **Toolbar button** drops the on-page **📝 Feedback *n* pill** and shows an
  open-remark badge count. The drawer opens only from the pill; clicking the toolbar
  button again takes the pill (and drawer) away, so a page stays clean until asked.

## Install (dev)

Temporary (until browser restart):

1. Open `about:debugging` → **This Firefox**.
2. **Load Temporary Add-on…** → select `feedback-extension/manifest.json`.

For a persistent loop, use [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/):

```sh
cd feedback-extension
npx web-ext run            # launches Firefox with the extension, auto-reloads on change
```

## Usage

1. On any page, click the toolbar button — the **📝 Feedback *n*** pill drops into
   the bottom-right corner. Click the pill to open the drawer.
2. **🎯 Pick element**, click the element, write the change, **💾 Save remark**.
3. To explain how you got there instead, **🧭 Record steps** and click the elements in
   order — then Esc and write your **Observation**. Steps and issue fields persist per page, so you
   can stop mid-run and pick it back up later.
4. To delete elements, use **🚫 Remove element** and click each one
   (no note needed), then Esc — they collect in the removal basket above the remarks.
5. When done, **📋 Copy brief** and paste it to your LLM agent (or **⬇ feedback.md**).

## Notes & limitations

- **The toolbar button on a `file://` tab opens an explanatory popup instead
  of the pill.** Firefox never allows extension content on local files — no
  permission exists (verified against a signed permanent install). The popup
  hands over the commands to serve the folder over http; don't try to "fix"
  this with more manifest permissions.
- Remarks are scoped per page (`origin + pathname`, query ignored).
- **The extension raises no browser dialogs** — no `alert`, no `confirm`. Firefox
  stops showing dialogs for a page that has already shown a few, and a suppressed
  `confirm()` returns `false` with nothing on screen to explain it, so the button
  reads as broken from then on. Copy, Clear all and a failed *locate* all report on
  the button that was clicked instead. Keep it that way.
- Updating the extension does NOT reload content scripts in already-open tabs —
  Firefox only re-injects on a dev reload, so a real update leaves the old
  instance running with a dead message listener until the page reloads or the
  script is injected again. The extension heals this itself: the background
  injects `content.js` when a click finds no listener (see `background.js`),
  and the injected instance retires the previous one via `__ffabTeardown` —
  removing its listeners and UI — before re-arming, so exactly one live
  listener exists per page. (Without that retirement, the old UI would linger
  and two drawers would coexist invisibly; see the clean-slate block in
  `content.js`.)
- Styles are `ffab-`-prefixed and injected via the manifest (CSP-exempt), but
  marker/popover *positioning* uses inline styles — on pages with a strict
  `style-src` CSP (no `'unsafe-inline'`), positioning may degrade. Dev servers
  like the invoice-scanner app are unaffected.
- Regenerate icons after editing the glyph: `node tools/gen-icons.js`.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV2 manifest: content script on all URLs, storage, background |
| `background.js` | Toolbar click → toggle pill, injecting the content script on demand if the tab isn't ready; open-remark badge; per-tab pick state + pick relay for subframes (iframes) |
| `content.js` | Picking (remark / remove / step), selectors, descriptions, popover, drawer, markers, export |
| `popup.html` / `popup.js` | What the toolbar button shows on `file://` tabs, where Firefox forbids extension content: the platform restriction plus the http-server workaround |
| `feedback.css` | Prototype-styled UI, `ffab-`-prefixed |
| `icons/` | Extension icons (generated, see `tools/gen-icons.js`) |
