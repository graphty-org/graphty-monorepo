# Graphty app shell -- user acceptance tests

A manual acceptance suite for the **graphty** React app's progressive-disclosure
shell. It is written to be driven by hand, by a person or by Claude, using the
Playwright MCP tools and the Nanobanana MCP. Every step is a tool call that can be
copied as written; every expected result is something you can read off the screen or
off a probe -- a string, a computed style, a count, a measured contrast ratio.

Requested by the product owner on 2026-09-13, item 7 of seven: "create user
acceptance tests that Claude can run manually using the Playwright MCP to verify that
key paths are working and rendering correctly".

Scenarios have stable ids, `UAT-01` upward. Report a result as
`UAT-05 PASS` or `UAT-05 FAIL: the status bar still read "20 nodes"`. Ids are never
renumbered; a retired scenario keeps its id and is struck out in place.

Most scenarios run against the app. Two do not: UAT-15 and UAT-16 were reported against
named **Storybook** stories rather than against the shell, so they run against
Storybook, and section 1.7 is their setup.

Related documents:

- `design/ui/app-shell-progressive-disclosure-design.md` -- the shell spec. Sections
  cited below by number (5.2 narrow screens, 6.12 the latch, 7.1 Welcome, 7.2 what a
  load decides, 7.3 the insight rule table, 7.5 the graph-summary reading).
- `design/ui/mockups/system/` -- REGISTER-1.5, DECISIONS-1.7, DECISIONS-1.8,
  CONTRAST-DIVERGENCE, COMPACTION-1.6.
- `design/ui/mockups/artboards/*.dc.html` -- the artboards.
- `graphty/src/stories/compact/CompactControls.stories.tsx` and
  `CompactButtons.stories.tsx` -- the two story files UAT-15 and UAT-16 read.

---

## 1. Setup

### 1.1 Build and serve

Run this once per session. The app is tested against a **production build served by
`vite preview`**, not against the dev server: the dev server injects the eruda console
overlay (see 1.5) and serves unminified modules whose timing differs from what a user
gets.

```bash
cd /home/apowers/Projects/graphty-monorepo/graphty && npx vite build
cd /home/apowers/Projects/graphty-monorepo/graphty && npx vite preview --port 9089 --host
```

**There is no working directory to be in.** Every bash line in this document is
self-contained: it carries its own `cd` where the tool it runs needs one, and it names
every script and every file by ABSOLUTE path. A line can therefore be pasted from
anywhere, and a runner whose working directory resets between calls -- Claude's does --
never has to track one. A relative path in a command here is a defect in this document:
report it as BROKEN (section 3) and repair the line. Only three lines in this whole
document need a `cd` at all -- the two above and the `storybook dev` line in 1.7 --
because `vite` and `storybook` each read their config from the working directory.

Pick any free port in **9000-9099** (this machine only accepts connections in that
range). Check first with `ss -ltn | grep :9089`. `vite preview` inherits the dev
server's TLS from `vite.config.ts`, so the app is reached over **https** at:

```
https://dev.ato.ms:9089/
```

Substitute your own port everywhere below. Leave the preview running for the whole
session; nothing in this document requires a rebuild, and a rebuild is only needed
when source changes.

### 1.2 Viewport

Unless a scenario says otherwise, run at **1600 x 1000**. The shell's narrow
breakpoint is 1280; scenarios that exercise it say so and set their own size.

Every colour expected below is a **dark-scheme** value: `main.tsx` mounts Mantine with
`defaultColorScheme="dark"`, so the probe's `scheme` field must read `dark`. If it
reads `light`, the colours will all differ and nothing below applies -- reset the
scheme before continuing rather than reporting a wall of FAILs.

```
mcp__playwright__browser_resize
  width: 1600
  height: 1000
```

### 1.3 Reaching a fresh first visit

The shell persists its layout in `localStorage` under `graphty.shell.layout.v2` (plus
`graphty.shell.canvas.v1` and `graphty.shell.insights.v1`). Several scenarios test
what a **first-time** reader sees, so they begin by clearing storage and reloading.
This is the standard reset; it appears as "RESET" in the steps below.

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
      return await page.evaluate(() => Object.keys(localStorage));
    }
```

Clearing storage requires the page to already be on the app's origin, so navigate
first if this is the first call of the session.

### 1.4 The standard probe

Most expected results are read with one probe. Copy it as written; it returns every
fact the scenarios below assert, so a single call usually settles a whole scenario.

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      return await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const box = (s) => {
          const el = q(s);
          if (el === null) return "ABSENT";
          const r = el.getBoundingClientRect();
          return "PRESENT x=" + Math.round(r.x) + " y=" + Math.round(r.y) +
                 " w=" + Math.round(r.width) + " h=" + Math.round(r.height);
        };
        const latch = (s) => {
          const el = q(s);
          if (el === null) return "ABSENT";
          const cs = getComputedStyle(el);
          return el.getAttribute("data-variant") + "/" +
                 el.getAttribute("aria-pressed") + "/bg=" + cs.backgroundColor;
        };
        return {
          viewport: window.innerWidth + "x" + window.innerHeight,
          scheme: document.documentElement.getAttribute("data-mantine-color-scheme"),
          welcomeSheet: box("[data-canvas-welcome-sheet]"),
          panel: box("[data-testid=\"activity-panel\"]"),
          panelTitle: q("[data-testid=\"panel-header-title\"]")?.textContent ?? null,
          inspector: box("[data-testid=\"inspector\"]"),
          inspectorKind: q("[data-testid=\"inspector-kind\"]")?.textContent ?? null,
          panelLatch: latch("[data-testid=\"panel-header-keep-open\"]"),
          inspectorLatch: latch("[data-testid=\"inspector-keep-open\"]"),
          counts: q("[data-status-slot=\"counts\"]")?.innerText.replace(/\n/g, " ") ?? null,
          layoutChip: q("[data-status-slot=\"layout\"]")?.innerText.replace(/\n/g, " ") ?? null,
          reading: q("[data-testid=\"graph-summary-reading\"]")?.textContent ?? null,
          inspectorText: q("[data-testid=\"inspector\"]")?.innerText.slice(0, 400) ?? null,
          overlays: [...document.querySelectorAll("[data-canvas-overlay]")]
            .map((e) => e.getAttribute("data-canvas-overlay")),
          insightTitles: [...document.querySelectorAll("[data-canvas-overlay=\"insights\"] button")]
            .map((b) => b.innerText.split("\n")[0]).filter(Boolean),
          legend: q("[data-canvas-overlay=\"legend\"]")?.innerText.replace(/\n/g, " | ") ?? null,
          styleLayers: q("[data-testid=\"style-layers\"]")?.innerText.replace(/\n+/g, " | ") ?? null,
          stored: JSON.parse(localStorage.getItem("graphty.shell.layout.v2") ?? "{}"),
        };
      });
    }
```

Fields referenced by name in the expected results below (`probe.counts`,
`probe.panelLatch`, ...) are this object's fields.

### 1.5 Standing gotchas

These all cost time in the session that produced this document. Read them before
reporting a failure.

1. **eruda.** `src/main.tsx` loads the eruda mobile console when `import.meta.env.DEV`
   is true. On the **dev server** (`vite dev` in the `graphty` package) its floating
   button and its expanded console sit over the app, they are captured by screenshots,
   and they can intercept a click. On a `vite preview` build, which is what section 1.1 asks for, eruda is not
   loaded at all -- confirm with
   `document.querySelector("#eruda, [class*=eruda]") === null`. If you must test against
   the dev server, hide it first:
   `page.evaluate(() => { document.querySelectorAll("#eruda,[class*=eruda]").forEach((e) => e.remove()); })`.

2. **A click near the left edge lands on the panel, not the canvas.** With the
   activity panel open the rail occupies x 0-48 and the panel x 48-328, so the canvas
   starts at x=328 at the default 280 px panel width. Click the canvas at **x >= 700**.
   Use `[data-shell-region="canvas"]` as the click target rather than a coordinate
   wherever a scenario just needs "somewhere on the canvas".

3. **The Babylon canvas needs time.** After a sample is clicked, allow **about 3.5 to
   4 seconds** before probing: the graph is loaded in chunks, the 7.2 load defaults are
   applied only after the last chunk arrives, and the degree pass runs after that.
   Budgets that were measured to be sufficient, with margin:

   | after this | wait |
   | --- | --- |
   | reload, for Welcome | 2.5 s |
   | a sample row click | 4.0 s |
   | a `Find groups` click | 3.5 s |
   | a Welcome hint click (load **and** run in one) | 7.0 s |
   | a latch or panel toggle click | 0.4 s |

   Never assert on a canvas fact without one of these waits. A failure reported
   without one is not a failure.

4. **`getByText` with `exact: true` does not match the insight cards.** A card draws
   its plain name and its technical name inside ONE span --
   `Find groups (Communities, Louvain)` is a single text node plus a nested span -- so
   `getByText("Find groups", { exact: true })` finds nothing. Filter the button
   instead:
   `page.locator('[data-canvas-overlay="insights"] button').filter({ hasText: "Find groups" })`.

5. **The sample rows on Welcome and in the Data panel are different elements.** The
   Welcome list carries `[data-sample-row="<id>"]`; the Data panel's list does not --
   its rows are compact-mantine `DataRow`s whose name cell is
   `[data-testid="data-row-name"]`. Panel rows are reached as
   `page.locator('[data-testid="activity-panel"] [data-testid="data-row-name"]', { hasText: "Karate Club" })`.

6. **The Data panel's `Sample datasets` section starts collapsed.** Click its label
   once before looking for rows in the panel.

7. **`Toggle inspector` is two buttons when the inspector is open.** The inspector's
   own header carries `[data-testid="inspector-toggle"]`; the top bar's carries the
   same `aria-label` and no testid. When the inspector is CLOSED only the top bar's
   exists, which is the one to click to reopen it:
   `page.locator('button[aria-label="Toggle inspector"]').first()`.

8. **The minimap draws nothing, by design.** `Minimap.tsx`'s own header says the
   drawing is a placeholder that "does not yet project graphty-element's own scene",
   and `AppShell.tsx` passes it `{ nodeCount }` and no points. A flat 160 x 100
   rectangle at the bottom left of the canvas is the expected state, not a defect.

9. **Playwright leaves the pointer on whatever it last clicked, and hover has a
   colour.** An icon button that is unlatched but still hovered computes
   `background-color: rgba(34, 139, 230, 0.2)` -- close enough to the latched
   `rgba(34, 139, 230, 0.15)` to read as "still latched" and cause a false FAIL on
   UAT-03. Always `await page.mouse.move(800, 900)` before probing a computed
   background, and prefer `data-variant` plus `aria-pressed`, which hover does not
   touch, over the colour.

10. **Escape does not reach the narrow-overlay rung while focus is still on the
    rail icon that opened the overlay.** Measured at 1024 x 900: open the Data
    panel by clicking `[data-activity="data"]`, press Escape, and the panel is
    still there -- focus is on the rail button and the press never reaches
    Escape's third rung (5.6). Click something that takes no focus first
    (`[data-testid="panel-header-title"]` works) and the same Escape closes it;
    a tap on the canvas closes it from anywhere. A scenario that presses Escape
    straight after a rail click is testing the rail, not the ladder.

### 1.6 How to check RENDERING, and the warning about it

Two of the shell's most important facts are invisible to the DOM: the node labels and
the node colours are painted by graphty-element into a **WebGL canvas**, where
`getComputedStyle` reaches nothing. Rendering is therefore checked two ways, and both
halves are required.

**(a) Measured contrast -- the numeric half.** `tools/uat-contrast.py` crops a box out
of a screenshot, takes the most common colour in the box as the ground and the pixel
farthest from it in relative luminance as the ink, and prints the WCAG 2.1 contrast
ratio between them. Crop tightly around the string under test; a box with no text in it
measures about 1.0.

```bash
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/SHOT.png X Y W H [MIN_RATIO]
```

`X Y W H` are image pixels, which equal CSS pixels when the screenshot was taken with
the Playwright MCP's default `scale: "css"`. `MIN_RATIO` defaults to 4.5 (WCAG AA body
text). The script exits 0 on PASS and 1 on FAIL.

**(b) Nanobanana -- the shape-and-layout half.**

> **WARNING -- Nanobanana agrees with whatever it is asked.** It is a cooperative
> model, not a judge. A leading question returns the answer the question implies, so
> "is the text readable?" and "does the card look good?" are worth nothing and must
> never appear in a UAT. Ask only questions that
>
> - can be answered YES or NO from the image alone,
> - are about countable or geometric facts (how many, which side, is X inside Y, is
>   colour A the same as colour B), and
> - are **neutral or inverted** -- write the question so that the DEFECT would be a
>   YES at least half the time, and include at least one question whose correct
>   answer is NO, as a control, and
> - include at least one question whose correct answer is YES, as the positive anchor.
>   A set whose every correct answer is NO is passed by a model that answers NO to
>   everything, which is a leading question with its sign flipped. The anchor doubles
>   as the premise check: a NO there means the screen did not render, and every other
>   answer in the set is then worthless.
>
> Do not ask it for contrast judgements at all. It was asked, in the session that
> wrote this document, whether any text on the loaded-graph screen was hard to make out
> against its background; it answered NO, while `uat-contrast.py` measured the node
> labels at 2.94:1. Use (a) for contrast and (b) for layout.

Each set below states its own arithmetic in its expected result -- how many of its
questions have the defect as a YES, which ones are the NO controls and which are the YES
anchors -- so a later edit can be checked against the rule above instead of re-derived
from the wording.

Always send the prompt with the standard preamble so the answers stay parseable:

```
Answer each numbered question with exactly YES or NO and nothing else. Do not
explain. Do not be agreeable; if a question's premise is false, answer NO.
```

Screenshots go in `/home/apowers/Projects/graphty-monorepo/tmp/`, never `/tmp`.

### 1.7 Reaching Storybook

Two of the seven reported defects were reported against **Storybook** stories rather
than against the shell -- item 1 ("component sizes aren't varying based on the size
specified (see Storybook Controls : Slider - Size Comparison)") and item 2 ("filled
icons aren't filled (see Storybook Buttons : ActionIcon - Colors)"). UAT-15 and UAT-16
are those two, and they need none of 1.1's preview, none of 1.3's storage reset and none
of 1.4's probe. This section is their whole setup.

Start Storybook on a free port in 9000-9099 and leave it running. It rebuilds and
reloads on a source change by itself, so a theme edit never needs a restart:

```bash
cd /home/apowers/Projects/graphty-monorepo/graphty && npx storybook dev -p 9058 --no-open
```

(`cd /home/apowers/Projects/graphty-monorepo && pnpm run storybook:graphty` is the same
Storybook on port 9035 over https, with the certificate paths the package script names.
Either works; the line above is plain http and needs no certificate. First start takes
about 30 s.)

Probe a story through `iframe.html`, never through the manager UI: the manager runs the
story inside a nested iframe, so a `document.querySelector` from the top frame reaches
the manager's chrome and finds nothing of the story.

```
http://localhost:9058/iframe.html?id=<story-id>&viewMode=story
```

The two ids this document uses are `compact-controls--slider-size-comparison` and
`compact-buttons--action-icon-colors`. An id is the story's `title` and its `name`
kebab-cased and joined with `--` (`Compact/Buttons` plus `ActionIcon - Colors` gives
`compact-buttons--action-icon-colors`), and every id Storybook knows is a key of
`entries` in:

```bash
curl -s http://localhost:9058/index.json
```

Reading a computed style out of a story is two calls: navigate, then wait for the
component's own Mantine class and read. This is the shape both Storybook scenarios use.

```
mcp__playwright__browser_navigate
  url: http://localhost:9058/iframe.html?id=compact-controls--slider-size-comparison&viewMode=story
```

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.waitForSelector(".mantine-Slider-root");
      await page.waitForTimeout(400);
      return await page.evaluate(() =>
        [...document.querySelectorAll(".mantine-Slider-root")].map((root) => {
          const cs = getComputedStyle(root);
          const track = root.querySelector(".mantine-Slider-track");
          const thumb = root.querySelector(".mantine-Slider-thumb");
          return {
            label: root.parentElement.querySelector("p, .mantine-Text-root")?.textContent ?? null,
            trackH: Math.round(track.getBoundingClientRect().height * 100) / 100,
            thumbW: Math.round(thumb.getBoundingClientRect().width * 100) / 100,
            sizeVar: cs.getPropertyValue("--slider-size").trim(),
            thumbVar: cs.getPropertyValue("--slider-thumb-size").trim(),
          };
        }));
    }
```

Three Storybook gotchas, all of them measured here:

1. **eruda IS loaded in Storybook**, unlike the preview build of 1.1.
   `.storybook/preview.tsx` calls `eruda.init()` and `eruda.show("console")` with no
   `import.meta.env.DEV` guard, so
   `document.querySelector("#eruda, [class*=eruda]") !== null` in every story. Its
   button and its console appear in every screenshot and can intercept a click -- which
   is why UAT-15 and UAT-16 assert computed styles rather than pixels. Gotcha 1's
   removal snippet works here if a screenshot is needed.
2. **A story renders in the DARK scheme by default.** `preview.tsx` sets
   `initialGlobals: { theme: "dark" }` and forces the Mantine scheme from it, matching
   1.2, so every colour below is a dark-scheme value.
3. **A size token is SET on the component root.** Mantine writes `--slider-size`,
   `--slider-thumb-size`, `--input-height`, `--ai-size` and `--cb-size` onto the
   component's root element, and the track, the input or the icon consumes them from
   there. Custom properties inherit, so a descendant reports the same value and the
   TextInput probe below reads the token straight off the `input`; the root is where it
   is DECLARED, which is where to look when a value is missing. Assert the token and
   the measured box together: a token that varies while the box does not is a variable
   no rule consumes, and it passes a theme unit test while failing a reader.

---

## 2. Scenarios

### UAT-01 -- Welcome draws on its own surface

Product owner item 6. Spec 7.1, amended 2026-09-13: the Welcome block carries its own
ground and no longer depends on the graph background colour, which graphty-element
clears to a near-white #F5F5F5.

**Precondition.** Preview running. Viewport 1600 x 1000.

**Steps.**

```
mcp__playwright__browser_navigate
  url: https://dev.ato.ms:9089/
```

RESET (section 1.3), then:

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      return await page.evaluate(() => {
        const sheet = document.querySelector("[data-canvas-welcome-sheet]");
        if (sheet === null) return "NO SHEET";
        const cs = getComputedStyle(sheet);
        const h1 = sheet.querySelector("h1");
        const r = sheet.getBoundingClientRect();
        const wrap = document.querySelector("[data-canvas-welcome]").getBoundingClientRect();
        return {
          bg: cs.backgroundColor,
          border: cs.borderTopWidth + " solid " + cs.borderTopColor,
          radius: cs.borderRadius,
          hasShadow: cs.boxShadow !== "none",
          heading: h1.textContent,
          headingColor: getComputedStyle(h1).color,
          sheet: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          wrapper: { x: Math.round(wrap.x), w: Math.round(wrap.width) },
          isDialog: sheet.closest("[role=dialog], [aria-modal=true]") !== null,
          hasScrim: document.querySelector(".mantine-Overlay-root") !== null,
          railVisible: document.querySelector("nav[aria-label='Activity rail']").getBoundingClientRect().width > 0,
        };
      });
    }
```

**Expected result.**

- `heading` is exactly `Open a graph to get started`.
- `bg` is `rgb(31, 36, 40)` -- fully opaque, no `rgba(...,0)`.
- `border` is `1px solid rgb(122, 130, 142)` and `hasShadow` is `true`. Both are
  required: in the light scheme the sheet's white and the canvas clear are only about
  1.09:1 apart, so the border is the sheet's only WCAG 1.4.11 boundary.
- `radius` is `8px`.
- `headingColor` is `rgb(213, 215, 218)`.
- `sheet.w` is **634** and `wrapper.w` is **992**: the sheet is sized to its 600 px
  content band plus 2 x 16 padding plus 2 x 1 border, NOT to the canvas. A sheet as
  wide as its wrapper is a failure.
- `isDialog` is `false` and `hasScrim` is `false`. This is a modal SURFACE, not a
  modal dialog; 7.1's "no tour, no wizard, no modal" stands.
- `railVisible` is `true`.

---

### UAT-02 -- Welcome's contrast, measured

The rendering half of UAT-01. Product owner item 6 was reported as
"light-text-on-white"; this is the number that says whether it still is.

**Precondition.** UAT-01 just passed; Welcome on screen.

**Steps.**

```
mcp__playwright__browser_take_screenshot
  filename: /home/apowers/Projects/graphty-monorepo/tmp/uat-01-welcome.png
  scale: css
```

```bash
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/uat-01-welcome.png 524 294 520 24
```

Then the layout questions, with the section 1.6 preamble:

```
mcp__nanobanana-mcp__gemini_chat
  images: ["/home/apowers/Projects/graphty-monorepo/tmp/uat-01-welcome.png"]
  message: |
    Answer each numbered question with exactly YES or NO and nothing else. Do not
    explain. Do not be agreeable; if a question's premise is false, answer NO.

    1. Is the large centred card's interior fill the SAME colour as the area
       immediately outside its left and right edges?
    2. Is any one of the card's four edges missing its outline, so that the card's
       boundary is interrupted?
    3. Do the card's left and right edges reach the left and right edges of the image?
    4. Is the whole image uniformly dimmed or greyed, as if behind a translucent
       overlay?
    5. Is the vertical strip of icon buttons at the extreme left edge of the image
       covered, in whole or in part, by the card?
    6. Is a vertical strip of icon buttons present along the extreme left edge of the
       image?
    7. Is the card's interior noticeably darker than the area immediately outside its
       left and right edges?
```

**Expected result.**

- `uat-contrast.py` prints `ground: rgb(31, 36, 40)`, `ink: rgb(213, 215, 218)` and
  `ratio: 10.86:1`, `result: PASS`. Anything under 4.50 is a FAIL of item 6.
- Nanobanana answers **NO, NO, NO, NO, NO, YES, YES** in that order.
- The set's arithmetic, against the rule in 1.6: five of the seven questions (1-5) are
  written so that the DEFECT is the YES -- the sheet losing its own ground (1), losing
  a border edge (2), becoming a full-bleed layer (3), growing a scrim (4), or covering
  the rail (5); 7.1 forbids the last three outright. Those five are also the NO
  controls. Questions 6 and 7 are the YES anchors: they say the rail rendered at all
  and that the sheet's ground really is the darker of the two, so a model answering NO
  to everything fails the set instead of passing it. A NO on 6 means nothing rendered
  and the other six answers are worthless.

---

### UAT-03 -- Both sidebars start locked open, and the locks show it

Product owner items 3 and 4. Departure from 6.12 recorded in `ShellContext.tsx` at
`FIRST_VISIT_LAYOUT`, dated 2026-09-13.

**Precondition.** Viewport 1600 x 1000.

**Steps.** RESET, then the standard probe (section 1.4), then:

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.click("[data-testid=\"panel-header-keep-open\"]");
      await page.mouse.move(800, 900);   // gotcha 9: hover tints an unlatched button
      await page.waitForTimeout(400);
      return await page.evaluate(() => {
        const el = document.querySelector("[data-testid=\"panel-header-keep-open\"]");
        const cs = getComputedStyle(el);
        return { variant: el.getAttribute("data-variant"), pressed: el.getAttribute("aria-pressed"),
                 bg: cs.backgroundColor, label: el.getAttribute("aria-label"),
                 stored: JSON.parse(localStorage.getItem("graphty.shell.layout.v2")).panelKeptOpen };
      });
    }
```

**Expected result.**

- On the fresh visit, `probe.panel` is `PRESENT x=48 ... w=280` and
  `probe.inspector` is `PRESENT x=1320 ... w=280`. Both sidebars are open with no
  interaction.
- `probe.panelTitle` is `Data`.
- `probe.panelLatch` and `probe.inspectorLatch` are both
  `light/true/bg=rgba(34, 139, 230, 0.15)` -- a tinted ground and `aria-pressed=true`.
  A latch that reads `subtle/.../bg=rgba(0, 0, 0, 0)` while pressed is item 4
  unfixed.
- `probe.stored` contains `"panelKeptOpen": true` and `"inspectorKeptOpen": true`
  under the key `graphty.shell.layout.v2`. A record under `...v1` means the storage
  bump did not land.
- After the click, the panel latch reads `variant: "subtle"`, `pressed: "false"` and
  `bg: "rgba(0, 0, 0, 0)"`, and `stored` is `false`. Without the `mouse.move` the same
  probe returns `bg: "rgba(34, 139, 230, 0.2)"` -- the hover tint, not the latch tint;
  see gotcha 9. `variant` and `pressed` are the reliable pair.
- The ONE word `Keep open` is the `aria-label` in both states -- a toggle never
  renames itself (REGISTER-1.5 10.2), so a label that changed to `Unlock` is a FAIL.

---

### UAT-04 -- A sample loads through the ordinary path

Spec 7.1 item 2. The row click loads the sample and stops.

**Precondition.** Viewport 1600 x 1000. RESET; Welcome on screen.

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll("[data-sample-row]")].map((e) => e.getAttribute("data-sample-row")));
      await page.click("[data-sample-row=\"cat-social-network\"]");
      await page.waitForTimeout(4000);
      return rows;
    }
```

Then the standard probe.

**Expected result.**

- The row ids are exactly `["karate", "cat-social-network", "college-football"]`, in
  that order. Three rows, not six: the other three artboard rows are marked INVENTED
  in FIXTURES.md and are deliberately absent.
- `probe.welcomeSheet` is `ABSENT` -- Welcome has left.
- `probe.counts` is `20 nodes 29 edges`.
- `probe.reading` is exactly
  `20 nodes, connected by 29 relationships. One connected part holds all 20 nodes.`
- The top bar shows `cat-social-network.json`
  (`page.getByText("cat-social-network.json")` resolves).
- `probe.legend` is `null`. A plain row click runs nothing, so nothing is encoded and
  the legend correctly draws nothing (spec 01 section 9). A legend here means the row
  ran a capability it should not have.

---

### UAT-05 -- A second sample REPLACES the first

This regressed once: the second load silently did nothing while the top bar renamed
the dataset. The point of this scenario is that EVERY surface moves, not just the name.

**Precondition.** UAT-04 just passed; the cat network is loaded.

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      const before = await page.evaluate(() => ({
        counts: document.querySelector("[data-status-slot=\"counts\"]").innerText.replace(/\n/g, " "),
        reading: document.querySelector("[data-testid=\"graph-summary-reading\"]").textContent,
      }));
      await page.click("[data-activity=\"data\"]");
      await page.waitForTimeout(600);
      await page.getByText("Sample datasets", { exact: false }).first().click();
      await page.waitForTimeout(500);
      await page.locator("[data-testid=\"activity-panel\"] [data-testid=\"data-row-name\"]",
                         { hasText: "Karate Club" }).click();
      await page.waitForTimeout(5000);
      const after = await page.evaluate(() => ({
        counts: document.querySelector("[data-status-slot=\"counts\"]").innerText.replace(/\n/g, " "),
        reading: document.querySelector("[data-testid=\"graph-summary-reading\"]").textContent,
        name: document.body.innerText.includes("karate.gml"),
        stillCat: document.body.innerText.includes("cat-social-network.json"),
      }));
      return { before, after };
    }
```

**Expected result.**

- `before.counts` is `20 nodes 29 edges`; `after.counts` is `34 nodes 78 edges`.
- `before.reading` names 20 nodes; `after.reading` is exactly
  `34 nodes, connected by 78 relationships. One connected part holds all 34 nodes.`
- `after.name` is `true` and `after.stillCat` is `false`.
- **The regression signature to watch for:** `after.name` true while `after.counts`
  and `after.reading` are unchanged from `before`. That is the top bar renaming a
  dataset that never arrived, and it is a FAIL even though the screen looks plausible.

---

### UAT-06 -- The 7.2 load defaults apply

Spec 7.2: a load decides the layout, the label budget, the size scale and the one
neutral colour, from the graph's size alone, and nothing else runs. Two of those four
are deliberately NOT applied -- see the departure recorded in `AppShell.tsx` dated
2026-09-13 -- so this scenario asserts what actually ships.

**Precondition.** A sample is loaded (UAT-04 or UAT-05).

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.click("[data-activity=\"style\"]");
      await page.waitForTimeout(800);
      return await page.evaluate(() => ({
        panelTitle: document.querySelector("[data-testid=\"panel-header-title\"]").textContent,
        layers: document.querySelector("[data-testid=\"style-layers\"]").innerText.replace(/\n+/g, " | "),
        layoutChip: document.querySelector("[data-status-slot=\"layout\"]").innerText.replace(/\n/g, " "),
      }));
    }
```

**Expected result.**

- `panelTitle` is `Style`.
- `layers` is `Layers | Top degree labels | selection | default`. The
  `Top degree labels` layer is 7.2's label budget having been spent; its absence is a
  FAIL. `selection` and `default` are graphty-element's own tuned layers and must
  still be there -- a node-colour or node-size layer of the shell's own ON TOP of them
  would be the departure being reverted without a decision.
- `layoutChip` is `NGraph`.
- On the cat network the canvas draws exactly **5** node labels
  (`Mr_Whiskers`, `Mrs_Henderson`, `The_Vet`, `Butterscotch`, `Chonky_Boy`) -- count
  them on the UAT-13 screenshot. 7.2's budget is 5; 15 labels means the label
  selector is comparing by degree instead of naming the chosen ids.

---

### UAT-07 -- The Insights strip appears and names its capabilities

Spec 7.3. Each card names its capability plain-then-technical on one line.

**Precondition.** The cat network is loaded (RESET, then UAT-04).

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      return await page.evaluate(() => ({
        overlays: [...document.querySelectorAll("[data-canvas-overlay]")]
          .map((e) => e.getAttribute("data-canvas-overlay")),
        cards: [...document.querySelectorAll("[data-canvas-overlay=\"insights\"] button")]
          .map((b) => b.innerText.replace(/\n/g, " | ")).filter((t) => t.trim() !== ""),
      }));
    }
```

**Expected result.**

- `overlays` contains `insights`.
- `cards` has exactly **2** entries:
  - `Find groups (Communities, Louvain) | Cluster nodes that interact more with each other than with the rest. | Try it`
  - `Search for something you know (Search) | Type a name like Mr_Whiskers to find it on the canvas. | Try it`
- Search is always last. The example name in the Search card is the highest-degree
  node's id, so it is `Mr_Whiskers` on the cat network and `34` on Karate Club -- do
  not assert the literal string across datasets.
- A third entry with empty text is the strip's dismiss X, not a card; this is why the
  filter on non-empty text is in the snippet.

---

### UAT-08 -- Find groups runs and writes its reading

Spec 7.3 and 7.5. Two routes are covered: the strip's `Try it`, and the one-click
cold-start route through the Welcome row's closing hint.

**Precondition.** UAT-07 just passed.

**Steps -- route A, the strip.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.locator("[data-canvas-overlay=\"insights\"] button")
        .filter({ hasText: "Find groups" }).click();
      await page.waitForTimeout(3500);
      return await page.evaluate(() => ({
        panelTitle: document.querySelector("[data-testid=\"panel-header-title\"]").textContent,
        inspectorKind: document.querySelector("[data-testid=\"inspector-kind\"]").textContent,
        resultLayer: document.querySelector("[data-testid=\"result-layer\"]").innerText,
        inspectorText: document.querySelector("[data-testid=\"inspector\"]").innerText,
      }));
    }
```

**Steps -- route B, the cold start.** RESET, then:

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.click("[data-sample-row=\"cat-social-network\"] [data-sample-hint]");
      await page.waitForTimeout(7000);
      return await page.evaluate(() => ({
        panelTitle: document.querySelector("[data-testid=\"panel-header-title\"]").textContent,
        reading: document.querySelector("[data-testid=\"inspector\"]").innerText.split("\n")[2],
        legendHead: document.querySelector("[data-canvas-overlay=\"legend\"]").innerText.split("\n")[0],
        insightTitles: [...document.querySelectorAll("[data-canvas-overlay=\"insights\"] button")]
          .map((b) => b.innerText.split("\n")[0]).filter(Boolean),
      }));
    }
```

**Expected result -- route A.**

- `panelTitle` becomes `Analyze`.
- `inspectorKind` is `Result`.
- `resultLayer` is `Groups (Communities, Louvain)`.
- `inspectorText` contains, in order: a reading matching
  `/^\d+ groups found\. The groups are .* \(modularity 0\.\d+\)\.$/` -- on the cat
  network it reads `6 groups found. The groups are clearly separated (modularity
  0.571).` -- then the run record `Louvain, 20 nodes`, then per-group rows
  `Group 1 ... 4 members` through `Group 6 ... 2 members`, then
  `Actions / Change encoding / Delete layer / Remove result`. Assert the regex and the
  run record; do not hard-assert the group count across datasets.
- The member counts sum to 20.

**Expected result -- route B.**

- `panelTitle` is `Analyze` and `reading` matches the same regex, from a **single
  click** on a cold start. That is 7.1 item 2's "one interaction from a cold start to
  a coloured graph".
- `legendHead` is `Color: Groups (Communities, Louvain)`.
- `insightTitles` is exactly `["Search for something you know (Search)"]` -- the
  `Find groups` card has been **retired**, because the hint took the reader where the
  card was taking them (spec 5643-5648). A `Find groups` card still standing here is a
  FAIL.

---

### UAT-09 -- The legend names the encoding

Spec 01 section 9. What the colours MEAN is the legend's fact, not the reading's.

**Precondition.** Find groups has run (UAT-08, either route).

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      const el = page.locator("[data-canvas-overlay=\"legend\"]");
      await el.screenshot({ path: "/home/apowers/Projects/graphty-monorepo/tmp/uat-09-legend.png" });
      return await page.evaluate(() => {
        const l = document.querySelector("[data-canvas-overlay=\"legend\"]");
        const r = l.getBoundingClientRect();
        const c = document.querySelector("[data-shell-region=\"canvas\"]").getBoundingClientRect();
        return { lines: l.innerText.split("\n"),
                 box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
                 canvasRight: Math.round(c.right), legendRight: Math.round(r.right) };
      });
    }
```

**Expected result.**

- `lines[0]` is `Color: Groups (Communities, Louvain)`.
- `lines` then holds `Group 1` through `Group 5`, then an `Other (...)` line matching
  `/^Other \(\d+ group(s?), \d+% of nodes\)$/` -- on the cat network, `Other (1 group,
  10% of nodes)`. Five named swatches plus one Other is the legend's cap; six named
  groups would be the cap not being applied.
- The last line is `categorical`.
- The legend sits at the bottom right of the canvas at the shared 12 px overlay
  inset: `canvasRight - legendRight` is exactly **12** (1320 and 1308 at 1600 x 1000).
- Before any encoding is applied the legend is ABSENT entirely (asserted in UAT-04).
  An empty legend frame is a FAIL; an unencoded channel is absent, not empty.

---

### UAT-10 -- Picking a style layer opens the style-layer inspector

**Precondition.** A sample is loaded; the `Top degree labels` layer exists (UAT-06).

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.click("[data-activity=\"style\"]");
      await page.waitForTimeout(800);
      await page.locator("[data-testid=\"style-layers\"]")
        .getByText("Top degree labels", { exact: true }).click();
      await page.waitForTimeout(700);
      return await page.evaluate(() => ({
        kind: document.querySelector("[data-testid=\"inspector-kind\"]").textContent,
        name: document.querySelector("[data-testid=\"inspector-header-name\"]").textContent,
        head: document.querySelector("[data-testid=\"inspector\"]").innerText.slice(0, 120),
        sections: ["Node Properties", "Shape", "Color", "Effects", "Label", "Edge Properties"]
          .filter((s) => document.querySelector("[data-testid=\"inspector\"]").innerText.includes(s)),
      }));
    }
```

**Expected result.**

- `kind` and `name` are both `Style layer`.
- `head` begins `Style layer` and contains `Layer: Top degree labels`.
- `sections` returns all six names. A style layer selection that leaves the Graph
  summary or a Result showing in the inspector is a FAIL.
- Selecting a style layer outranks a result on this surface. If UAT-08 ran first and
  the inspector still says `Result` after this click, that is the failure; if a LATER
  Find groups run leaves `Style layer` showing because a layer is still selected, that
  is correct and expected.

---

### UAT-11 -- The lock sequence: locking the second surface keeps the first

Product owner item 5, verbatim: "if I lock one panel, open the other, lock the other,
the first one closes". Run this at **1200 x 1000**, below the 1280 narrow breakpoint,
which is where the old narrow-exclusivity rule fired. That rule was removed for
READER-DRIVEN latching on 2026-09-13; the departure from 6.12 and 5.2 is recorded in
`ShellContext.tsx` at `setPanelKeptOpen`.

**Precondition.** Nothing loaded. Viewport set by the steps. Below 1280 a first visit
opens NEITHER surface (`firstVisitLayout`, second pass 2026-09-13; UAT-14 is that
scenario), so this sequence opens them itself -- which is what makes both latches the
reader's own deliberate clicks rather than a default.

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.setViewportSize({ width: 1200, height: 1000 });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
      const probe = () => page.evaluate(() => {
        const p = document.querySelector("[data-testid=\"panel-header-keep-open\"]");
        const i = document.querySelector("[data-testid=\"inspector-keep-open\"]");
        const at = (s) => {
          const el = document.querySelector(s);
          return el === null ? "ABSENT" : "PRESENT x=" + Math.round(el.getBoundingClientRect().x);
        };
        return {
          panelLatch: p === null ? "ABSENT" : p.getAttribute("data-variant") + "/" + p.getAttribute("aria-pressed"),
          inspLatch: i === null ? "ABSENT" : i.getAttribute("data-variant") + "/" + i.getAttribute("aria-pressed"),
          panel: at("[data-testid=\"activity-panel\"]"),
          inspector: at("[data-testid=\"inspector\"]"),
          stored: JSON.parse(localStorage.getItem("graphty.shell.layout.v2")),
        };
      });
      const s = {};
      s["0 first visit"] = await probe();
      await page.click("[data-activity=\"data\"]");
      await page.waitForTimeout(500);
      s["1 panel opened"] = await probe();
      await page.click("[data-testid=\"panel-header-keep-open\"]");
      await page.mouse.move(800, 950);   // gotcha 9: hover tints an unlatched button
      await page.waitForTimeout(500);
      s["2 panel LOCKED"] = await probe();
      await page.locator("button[aria-label=\"Toggle inspector\"]").first().click();
      await page.waitForTimeout(700);
      s["3 inspector opened"] = await probe();
      await page.click("[data-testid=\"inspector-keep-open\"]");
      await page.mouse.move(800, 950);
      await page.waitForTimeout(500);
      s["4 inspector LOCKED"] = await probe();
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
      s["5 after reload"] = await probe();
      return s;
    }
```

**Expected result.** Step by step, as measured at 1200 x 1000:

| step | panelLatch | inspLatch | panel | inspector |
| --- | --- | --- | --- | --- |
| 0 first visit | `ABSENT` | `ABSENT` | `ABSENT` | `ABSENT` |
| 1 panel opened | `subtle/false` | `ABSENT` | `PRESENT x=48` | `ABSENT` |
| 2 panel LOCKED | `light/true` | `ABSENT` | `PRESENT x=48` | `ABSENT` |
| 3 inspector opened | `light/true` | `subtle/false` | `PRESENT x=48` | `PRESENT x=920` |
| 4 inspector LOCKED | `light/true` | `light/true` | `PRESENT x=48` | `PRESENT x=920` |
| 5 after reload | `light/true` | `light/true` | `PRESENT x=48` | `PRESENT x=920` |

- The whole scenario turns on steps 3 and 4: `panel` must still be `PRESENT x=48` and
  `panelLatch` must still be `light/true`. `panel: "ABSENT"` at step 3 or 4, or
  `panelLatch` falling back to `subtle/false`, is item 5 unfixed.
- `stored` at step 4 holds `"panelKeptOpen": true` and `"inspectorKeptOpen": true`
  together. A record that can never hold both true is the old exclusivity rule still
  in the setters.
- Step 5 is the persistence half: both latches come back `light/true` after a reload
  and both surfaces are on screen. A stored `false` must survive a reload too -- a
  reader's own unlatch outranks a first-visit default (UAT-03).
- Step 0 is the narrow first-visit default, and it is UAT-14's subject. A latch reading
  `light/true` there is the 2026-09-13 regression and it makes the rest of this table
  untestable, because every click below would then be unlatching rather than latching.

### UAT-12 -- The control case: an UNLOCKED panel still yields below 1280

This is the scenario that gives UAT-11 its meaning. It is NOT a bug and must not be
reported as one. Spec 6.12's surface lifecycle: an unkept surface is still closed by
the shell when another surface needs the room. The latch is what buys the exemption.

**Precondition.** Viewport 1200 x 1000, nothing loaded.

**Steps.**

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.setViewportSize({ width: 1200, height: 1000 });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
      await page.click("[data-activity=\"data\"]");   // open the panel and do NOT latch it
      await page.waitForTimeout(500);
      const before = await page.evaluate(() => ({
        panel: document.querySelector("[data-testid=\"activity-panel\"]") !== null,
        panelLatch: document.querySelector("[data-testid=\"panel-header-keep-open\"]")
          .getAttribute("aria-pressed"),
      }));
      await page.locator("button[aria-label=\"Toggle inspector\"]").first().click();
      await page.waitForTimeout(700);
      const after = await page.evaluate(() => {
        const i = document.querySelector("[data-testid=\"inspector\"]");
        return {
          panel: document.querySelector("[data-testid=\"activity-panel\"]") !== null,
          inspector: i !== null,
          inspectorX: i === null ? null : Math.round(i.getBoundingClientRect().x),
          activeActivity: JSON.parse(localStorage.getItem("graphty.shell.layout.v2")).activeActivity,
        };
      });
      return { before, after };
    }
```

**Expected result.**

- `before.panel` is `true` and `before.panelLatch` is `"false"`: the panel is open and
  UNLATCHED, which is the whole premise. An opened panel that latches itself would make
  this scenario a duplicate of UAT-11.
- `after.panel` is `false`, `after.inspector` is `true`, `after.inspectorX` is `920`,
  and `after.activeActivity` is `null`. An UNLOCKED panel gives way to the inspector
  below 1280, and the shell records that the panel is closed.
- Compare with UAT-11 step 3, where the only difference is the latch and the panel
  survives. If BOTH scenarios keep the panel, the shell has stopped reclaiming room
  from unkept surfaces, which is a different defect.
- At 1600 x 1000 this scenario does not apply at all: there is room for both and
  neither closes.

### UAT-13 -- The loaded graph renders

The rendering sweep the product owner asked for, on the state a novice actually ends
up in: a sample loaded, groups found, colours on the canvas.

**Precondition.** Viewport 1600 x 1000. RESET, then UAT-04, then UAT-08 route A.

**Steps.**

```
mcp__playwright__browser_take_screenshot
  filename: /home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png
  scale: css
```

```
mcp__nanobanana-mcp__gemini_chat
  images: ["/home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png"]
  message: |
    Answer each numbered question with exactly YES or NO and nothing else. Do not
    explain. Do not be agreeable; if a question's premise is false, answer NO.

    1. Are all of the spheres in the central area drawn in one single colour?
    2. Is the central area completely empty of spheres and of connecting lines?
    3. Does the panel in the bottom-right corner show FEWER than six colour swatches?
    4. Is there a colour swatch in the bottom-right panel with no text label beside it?
    5. Is the area across the top centre of the image free of any card-shaped
       rectangle?
    6. Are the spheres in the central area drawn in more than two distinct hues?
    7. Do the rows in the rightmost column have right-hand values that end in the word
       "members"?
```

Then measure the node labels. They are painted into the WebGL canvas and have no DOM
box, so they are measured from the screenshot. The NGraph layout is **deterministic**
for a given dataset and canvas size -- two runs of the cat network at 1600 x 1000
produced pixel-identical node positions -- so these crops are fixed rather than
guessed. Move the pointer somewhere inert (`page.mouse.move(200, 700)`, inside the
panel) before the screenshot: a pointer left over the canvas toolbar pops a tooltip
into the shot.

```bash
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png 640 377  55 20   # The_Vet
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png 738 507  62 20   # Mr_Whiskers
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png 610 539  90 20   # Chonky_Boy
python3 /home/apowers/Projects/graphty-monorepo/tools/uat-contrast.py /home/apowers/Projects/graphty-monorepo/tmp/uat-13-groups.png 694 620 126 24   # Mrs_Henderson
```

The fifth label, `Butterscotch`, sits ON TOP of its own orange sphere, so any crop
around it measures the sphere rather than the ground and reports a meaningless PASS.
Skip it; four labels are enough. If the canvas size or the dataset changes, re-read
the label positions off the screenshot and crop tightly around each word.

**Expected result.**

- Nanobanana answers **NO, NO, NO, NO, NO, YES, YES** in that order.
- The set's arithmetic, against the rule in 1.6: five of the seven (1-5) are written so
  that the DEFECT is the YES -- one flat colour where six groups were encoded (1), an
  empty canvas (2), a legend short of its six rows (3), a swatch with nothing naming it
  (4), and the Insights strip gone from the top centre (5) -- and those five are the NO
  controls. Questions 6 and 7 are the YES anchors, and 6 is the premise check: a NO
  there means nothing rendered and every other answer in the set is worthless.
- Each node label measures **4.5:1 or better** against the canvas ground.

  > **KNOWN FAILURE as of 2026-09-13.** This assertion does not currently hold. The
  > canvas ground measures `rgb(245, 245, 245)` and the labels measure:
  >
  > | label | ink | ratio |
  > | --- | --- | --- |
  > | The_Vet | `rgb(143, 144, 144)` | 2.94:1 |
  > | Mr_Whiskers | `rgb(142, 143, 144)` | 2.97:1 |
  > | Chonky_Boy | `rgb(131, 131, 133)` | 3.47:1 |
  > | Mrs_Henderson | `rgb(120, 120, 120)` | 4.05:1 |
  >
  > All four are below the 4.5:1 AA floor. This is product owner item 6 again, in a
  > second place: `LABEL_TEXT_COLOR` in
  > `graphty/src/components/shell/defaults/loadDefaults.ts` is `#d5d7da`, which is
  > `PANEL_INK.VALUE` -- ink chosen for the dark panel ground, painted by
  > `topDegreeLabelLayer` onto graphty-element's near-white clear colour. Its own
  > comment says the override exists because "RichTextStyle would otherwise default to
  > #000000", which on a near-white ground is the readable choice. Item 6 was fixed by
  > giving Welcome its own dark ground; the labels have no ground to give them, so the
  > decision here is a different one and it has not been made. Until it is, record
  > UAT-13 as `PASS (labels known-fail)` rather than as a fresh defect.

- The flat rectangle at the bottom left of the canvas is the minimap placeholder; see
  gotcha 8. Not a failure.

---

### UAT-14 -- A narrow first visit leaves the reader a canvas

Product owner items 3 and 6 at the place where they collide. Item 3 latched both
sidebars open by default; item 6 gave Welcome its own sheet but left it centred in the
FULL canvas rect. Below the 1280 breakpoint both sidebars are 280 px OVERLAYS over a
canvas that is never resized under them, and 6.12 makes a latch a veto on every close
the shell performs as a side effect -- so a default that latched both produced a screen
with no canvas and no way out. The fix is `firstVisitLayout(shellWidth)` in
`ShellContext.tsx` (second pass, 2026-09-13): at or above the breakpoint the first visit
latches both surfaces, and below it the first visit opens neither and spends no latch the
reader did not ask for. Spec 6.12 and 5.2 are the authority; the amendment is recorded in
the design document's 6.12 and in section 13 under 1.12.

**Precondition.** Nothing loaded. Each viewport starts from its own RESET, so the reset
happens AFTER the resize -- a reset at 1600 followed by a resize to 1024 tests a
remembered layout, not a first visit, and will pass while the defect is present.

**Steps.** Run once per viewport in `[[1024, 900], [600, 900], [375, 812]]`.

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
      const probe = () => page.evaluate(() => {
        const box = (s) => {
          const el = document.querySelector(s);
          if (el === null) return "ABSENT";
          const r = el.getBoundingClientRect();
          return "x=" + Math.round(r.x) + " right=" + Math.round(r.right) + " w=" + Math.round(r.width);
        };
        const sheet = document.querySelector("[data-canvas-welcome-sheet]");
        const panel = document.querySelector("[data-testid=\"activity-panel\"]");
        const insp = document.querySelector("[data-testid=\"inspector\"]");
        const covered = sheet === null ? null : (() => {
          const s = sheet.getBoundingClientRect();
          const left = panel === null ? 0 : panel.getBoundingClientRect().right;
          const right = insp === null ? window.innerWidth : insp.getBoundingClientRect().x;
          return Math.round(Math.max(0, left - s.x)) + "/" + Math.round(Math.max(0, s.right - right));
        })();
        return {
          viewport: window.innerWidth + "x" + window.innerHeight,
          panel: box("[data-testid=\"activity-panel\"]"),
          inspector: box("[data-testid=\"inspector\"]"),
          sheet: box("[data-canvas-welcome-sheet]"),
          heading: document.querySelector("[data-canvas-welcome-sheet] h1")?.textContent ?? null,
          covered,
          stored: JSON.parse(localStorage.getItem("graphty.shell.layout.v2")),
        };
      });
      const out = { "1 first visit": await probe() };
      await page.click("[data-activity=\"data\"]");
      await page.waitForTimeout(500);
      out["2 panel opened by the reader"] = await probe();
      await page.click("[data-shell-region=\"canvas\"]", { position: { x: 400, y: 400 } });
      await page.waitForTimeout(500);
      out["3 canvas tapped"] = await probe();
      return out;
    }
```

**Expected result.** Step 1, the first visit, as measured at each viewport:

| viewport | panel | inspector | sheet | covered L/R |
| --- | --- | --- | --- | --- |
| 1024 x 900 | `ABSENT` | `ABSENT` | `x=219 right=853 w=634` | `0/0` |
| 600 x 900 | `ABSENT` | `ABSENT` | `x=48 right=600 w=552` | `0/0` |
| 375 x 812 | `ABSENT` | `ABSENT` | `x=48 right=375 w=327` | `0/0` |

- `covered` is `0/0` at every width. That is the whole scenario: not one pixel of the
  Welcome sheet is under a sidebar, because there is no sidebar to be under. Any non-zero
  number here on a FIRST visit is the regression.
- `heading` is the complete string `Open a graph to get started`. It is in the DOM even
  when it is covered, which is why `covered` and not the heading is the assertion -- the
  defect rendered as "aph to get started" on screen while this field read in full.
- `stored` holds `"activeActivity": null`, `"inspectorOpen": false`,
  `"panelKeptOpen": false` and `"inspectorKeptOpen": false`. A stored latch of `true`
  below 1280 on a first visit is the defect, whatever the boxes say.
- The sheet shrinks with the viewport (`maxWidth: 100%`): 634 at 1024, 552 at 600, 327 at
  375 -- its 600 px content band plus 2 x 16 padding and two hairlines where there is
  room for it, and the canvas width where there is not. A sheet still 634 px wide at 375
  would be overflowing the canvas.

Steps 2 and 3 are the other half -- the reader is not trapped by their own click:

- Step 2: the panel is `PRESENT x=48`, its latch reads `subtle/false`, and at 1024
  `covered` becomes `109/0`. A surface the reader opened does cover part of the sheet;
  what matters is that it is dismissible.
- Step 3: after a tap on the canvas the panel is `ABSENT` again, `covered` is back to
  `0/0`, and `stored.activeActivity` is `null`. Escape does the same thing, but only
  once focus has left the rail icon -- gotcha 10.
- At 1600 x 1000 this scenario does not apply: both surfaces are latched open by default
  (UAT-03), neither is an overlay, and `covered` is `0/0` because the canvas rect
  excludes them.

> **Regression signature, measured on the pre-fix build on 2026-09-13.** At 1024 x 900
> on a genuine first visit: panel `x=48 right=328`, inspector `x=744 right=1024`, sheet
> `x=219 right=853`, `covered` `109/109`, both latches `light/true`, and both Escape and
> a canvas tap refused -- `closeNarrowOverlay` vetoes a LATCHED overlay, so with both
> latched it could only ever return false. At 600 x 900 the panel took `[48, 328]` and
> the inspector `[320, 600]` against a canvas of `[48, 600]`, and at 375 x 812 `[48,
> 328]` and `[95, 375]` against `[48, 375]`: the two overlays covered the canvas end to
> end and overlapped each other, so the sheet under them showed nothing at all. If a run
> reproduces any of that, report `UAT-14 FAIL` and quote the `covered` pair.

A residual that is NOT this scenario's subject, recorded so it is not re-reported as one:
the sheet is centred in the full canvas rect, so a surface the reader opens below 1280
still overlaps it. Measured at 1200 x 1000 with both surfaces opened and latched by hand
(UAT-11 step 4), each covers 21 px of the sheet -- its 16 px padding plus the hairline
plus 4 px of the content band. The fix removed the default; it did not move the sheet.

---

### UAT-15 -- Compact sizes actually vary (Storybook)

Product owner item 1, verbatim: "component sizes aren't varying based on the size
specified (see Storybook Controls : Slider - Size Comparison)". Setup is section 1.7, not
1.1: this runs against Storybook and touches neither the app nor `localStorage`.

Two stories, not one. The Slider is the story the item named, and the theme's
size-awareness is per component -- each component's `vars` resolver either takes the
size argument or does not -- so a passing Slider proves only the Slider. The TextInput is
the second sample, and it is where the defect was still visible after the first pass.

**Precondition.** Storybook running on 9058 (1.7).

**Steps.**

```
mcp__playwright__browser_navigate
  url: http://localhost:9058/iframe.html?id=compact-controls--slider-size-comparison&viewMode=story
```

Then the 1.7 probe, unchanged. Then:

```
mcp__playwright__browser_navigate
  url: http://localhost:9058/iframe.html?id=compact-inputs--text-input-size-comparison&viewMode=story
```

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.waitForSelector("input.mantine-TextInput-input");
      await page.waitForTimeout(400);
      return await page.evaluate(() =>
        [...document.querySelectorAll("input.mantine-TextInput-input")].map((el) => {
          const cs = getComputedStyle(el);
          return {
            placeholder: el.placeholder,
            h: Math.round(el.getBoundingClientRect().height * 100) / 100,
            heightVar: cs.getPropertyValue("--input-height").trim(),
            fontSize: cs.fontSize,
          };
        }));
    }
```

**Expected result.** Match rows by the LABEL each row draws, never by row order: the
Slider story's row order was changed once on 2026-09-13 and the ids stayed the same.

| Slider row | `trackH` | `thumbW` | `sizeVar` | `thumbVar` |
| --- | --- | --- | --- | --- |
| xs | 2 | 8 | `2px` | `8px` |
| compact | 4 | 12 | `4px` | `12px` |
| sm | 4 | 12 | `4px` | `12px` |
| md | 6 | 16 | `6px` | `16px` |

- `compact` and `sm` are deliberately IDENTICAL. `compact` is this design system's own
  step and `sm` is Mantine's nearest neighbour, and the theme maps them to one value on
  purpose. TWO identical rows in a Size Comparison story is the intended result; FOUR
  identical rows is item 1. A reader who reports the duplicate pair as the bug has
  reported the thing the story exists to disprove, so check which pair it is before
  reporting anything.
- TextInput: the four rows must differ, and the story labels its own intent --
  `xs (28px)`, `compact (24px)`, `sm (32px)`, `md (36px)`. The load-bearing assertion is
  weaker than those four numbers and outlives a retune: `heightVar` and `h` take at least
  three distinct values across the four rows, and `compact` is the smallest or equal
  smallest.
- The token and the box must move together. A `heightVar` that varies while `h` does not
  is a CSS variable no rule consumes, which passes a theme unit test and fails a reader.

> **Measured 2026-09-13, after the first pass at item 1.** The Slider table above is what
> the story drew -- the Slider is fixed. The four TextInput rows all reported
> `heightVar: "24px"`, `h: 24` and `fontSize: "11px"`: one size for four sizes, which is
> item 1 still standing in the inputs. A diagnostic for that state, not a substitute for
> this scenario:
>
> ```bash
> grep -rn "vars: () =>" /home/apowers/Projects/graphty-monorepo/compact-mantine/src/theme/components/
> ```
>
> Every hit is a component whose CSS variables cannot depend on the size, because the
> resolver never received it. The count was 24 when item 1 was reported and 1 when this
> scenario was written.

---

### UAT-16 -- The Filled ActionIcons are filled (Storybook)

Product owner item 2, verbatim: "filled icons aren't filled (see Storybook Buttons :
ActionIcon - Colors)". Setup is section 1.7.

The story's first group sits under a `Filled` heading and renders five
`<ActionIcon size="compact" color={...}>` with NO `variant` prop. The compact theme sets
`defaultProps: { variant: "subtle" }` on ActionIcon, and Mantine resolves
`{ ...defaultProps, ...filterProps(props) }`, so an explicit `variant` on the story DOES
win -- nothing is shadowing it and the theme is not the defect. The theme's default is
deliberate and load-bearing (three tests pin it, and PopoutButton depends on it), so the
default stays and the STORY becomes explicit. This scenario is therefore a test of the
story's honesty: a group headed `Filled` must draw filled icons.

**Precondition.** Storybook running on 9058 (1.7).

**Steps.**

```
mcp__playwright__browser_navigate
  url: http://localhost:9058/iframe.html?id=compact-buttons--action-icon-colors&viewMode=story
```

```
mcp__playwright__browser_run_code_unsafe
  code: |
    async (page) => {
      await page.waitForSelector(".mantine-ActionIcon-root");
      await page.waitForTimeout(400);
      return await page.evaluate(() =>
        [...document.querySelectorAll(".mantine-Group-root")].slice(0, 2).map((g) => ({
          heading: g.parentElement.querySelector("p, .mantine-Text-root")?.textContent ?? null,
          icons: [...g.querySelectorAll(".mantine-ActionIcon-root")].map((el) => {
            const cs = getComputedStyle(el);
            const svg = el.querySelector("svg");
            return {
              variant: el.getAttribute("data-variant"),
              bg: cs.backgroundColor,
              fg: cs.color,
              box: Math.round(el.getBoundingClientRect().width),
              glyph: svg === null ? null : svg.getAttribute("width"),
            };
          }),
        })));
    }
```

**Expected result.**

- The first group's `heading` is `Filled` and all five of its icons report
  `variant: "filled"`.
- Each of those five has an OPAQUE ground: `bg` is an `rgb(...)` value, never
  `rgba(..., 0)`, and the five grounds are five DIFFERENT colours. In this theme's dark
  scheme they are the same five the `Button - Colors` story's Filled row draws --
  `rgb(25, 113, 194)` blue, `rgb(47, 158, 68)` green, `rgb(224, 49, 49)` red,
  `rgb(240, 140, 0)` yellow, `rgb(52, 58, 64)` gray -- with `fg: "rgb(255, 255, 255)"`.
  Those five values are the expected reading; the load-bearing assertions are the
  variant, the opacity and the five being distinct, which survive a palette retune.
- The second group's `heading` is `Subtle`, its five icons report `variant: "subtle"`,
  `bg: "rgba(0, 0, 0, 0)"`, and their colour lives in `fg` -- `rgb(116, 192, 252)`,
  `rgb(140, 233, 154)`, `rgb(255, 168, 168)`, `rgb(255, 224, 102)`,
  `rgb(222, 226, 230)`. The point of the scenario is that the two groups DIFFER.
- Every icon in both groups stays `box: 24` with `glyph: "14"`. A variant is a paint
  change and must not move the box; a filled group that grew to 28 px trades item 2 for
  a compaction defect.

> **Measured 2026-09-13.** Before the story was made explicit, both groups came back
> identical: ten icons, every one `variant: "subtle"` with `bg: "rgba(0, 0, 0, 0)"`,
> `--ai-size: 24px`, colour only in the glyph -- item 2 exactly, a `Filled` heading over
> five subtle icons. After it, the same probe returned the two groups as the expected
> result above states them, value for value.

---

## 3. Reporting

Report one line per scenario:

```
UAT-01 PASS
UAT-02 PASS
...
UAT-05 FAIL: after.counts stayed "20 nodes 29 edges"; after.name was true
```

A scenario whose SELECTOR does not match is a broken test, not a product failure --
report it as `UAT-nn BROKEN` with the selector, so the document gets fixed rather than
the product blamed. Selectors drift; the table in section 4 is the place to repair
them.

A full pass of UAT-01 through UAT-14 against the app takes about twelve minutes of wall
time, most of it the waits in gotcha 3. UAT-15 and UAT-16 run against Storybook (1.7),
add about a minute, and need no preview build -- they can be run on their own when only
the compact theme or a story has changed.

Which scenarios answer which of the seven items the product owner reported on
2026-09-13:

| reported item | scenarios |
| --- | --- |
| 1, component sizes do not vary | UAT-15 |
| 2, filled icons are not filled | UAT-16 |
| 3, sidebars locked open by default | UAT-03, UAT-14 |
| 4, the locks do not show their state | UAT-03, UAT-11 |
| 5, locking one surface closed the other | UAT-11, UAT-12 |
| 6, Welcome unreadable on the canvas | UAT-01, UAT-02, UAT-13, UAT-14 |
| 7, this suite | every scenario |

---

## 4. Selector reference

Everything the scenarios depend on, in one place.

| what | selector |
| --- | --- |
| shell root | `[data-testid="app-shell"]` |
| a region | `[data-shell-region="rail" \| "panel" \| "canvas" \| "inspector" \| "statusbar"]` (all but canvas are `display: contents`, so they have NO box -- measure the child) |
| activity rail button | `[data-activity="data" \| "explore" \| "analyze" \| "style" \| "present" \| "ai" \| "settings" \| "help"]`, carries `aria-pressed` |
| activity panel | `[data-testid="activity-panel"]`, content `[data-testid="activity-panel-content"]` |
| panel title | `[data-testid="panel-header-title"]` |
| panel latch | `[data-testid="panel-header-keep-open"]`, `aria-label="Keep open"` |
| panel close | `[data-testid="panel-header-close"]` |
| inspector | `[data-testid="inspector"]` |
| inspector kind / name | `[data-testid="inspector-kind"]`, `[data-testid="inspector-header-name"]` |
| inspector latch | `[data-testid="inspector-keep-open"]` |
| inspector toggle (header) | `[data-testid="inspector-toggle"]` |
| inspector toggle (top bar) | `button[aria-label="Toggle inspector"]` without a testid |
| graph summary reading | `[data-testid="graph-summary-reading"]` |
| result layer chip | `[data-testid="result-layer"]` |
| style layer list | `[data-testid="style-layers"]` |
| a compact row's name cell | `[data-testid="data-row-name"]` |
| canvas region | `[data-shell-region="canvas"]`, graph host `[data-canvas-graph]` |
| Welcome block / sheet | `[data-canvas-welcome]` / `[data-canvas-welcome-sheet]` |
| Welcome sample row | `[data-sample-row="karate" \| "cat-social-network" \| "college-football"]` |
| Welcome sample hint | `[data-sample-row="..."] [data-sample-hint]` |
| a canvas overlay | `[data-canvas-overlay="insights" \| "legend" \| "minimap" \| "time-slider" \| "filter-status" \| "graph-table" \| "data-drawer"]` |
| an insight card | `[data-canvas-overlay="insights"] button` (the last one is the dismiss X) |
| status bar slot | `[data-status-slot="counts" \| "layout"]` |
| canvas toolbar | `[data-testid="canvas-toolbar"]` |
| command palette | `[data-testid="command-palette"]`, opened with `Control+k` |
| persisted layout | `localStorage["graphty.shell.layout.v2"]` |
| persisted canvas / insights | `localStorage["graphty.shell.canvas.v1"]`, `["graphty.shell.insights.v1"]` |

And for the two Storybook scenarios (1.7), which reach none of the above:

| what | selector |
| --- | --- |
| a story, isolated | `http://localhost:9058/iframe.html?id=<story-id>&viewMode=story` |
| the two story ids | `compact-controls--slider-size-comparison`, `compact-buttons--action-icon-colors`, plus `compact-inputs--text-input-size-comparison` |
| a Slider | `.mantine-Slider-root`, track `.mantine-Slider-track`, thumb `.mantine-Slider-thumb` |
| a TextInput | `input.mantine-TextInput-input` |
| an ActionIcon | `.mantine-ActionIcon-root`, carries `data-variant` |
| a row's own label | the `p` / `.mantine-Text-root` in the component root's parent |
| size tokens | `--slider-size`, `--slider-thumb-size`, `--input-height`, `--ai-size`, `--cb-size`, all on the component ROOT |
