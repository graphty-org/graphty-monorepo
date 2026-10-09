# Fixing what round 3 found: implementation units

Written 2026-10-07. Round 3 of the tier 1 study (`../rounds/round-3/insights.md`, `scores.md`,
`repro/`) left a short list of problems: keyboard focus lost after a control removes itself, gray
helper text below the contrast floor, English sentences coming out of graphty-element, a weaker
exported picture than the screen, a key box that covers a node, sizes that read in the wrong order
in 3D, a Force layout that freezes when re-applied, and one inert row. Each unit below fixes one of
them in the package that owns it. The owner has ruled out a touch or tablet profile and a
keyboard-only study for this work; the tier 2 study starts after these land.

Where every unit works: the worktree `.worktrees/design-studio-tier1`, branch `design/studio-tier1`.
After a change, rebuild (`nx run graphty-element:build` when the element changed, then
`nx run graphty:build`); the build is served at `https://dev.ato.ms:9366/?next`. Every acceptance
check that drives the app runs `design/ui/studio/tool/real.mjs` (see `tool/README.md`) through
`tool/with-browser.sh`. Every fix comes with a test that fails without it.

A unit marked **public API** adds or changes something third parties of graphty-element rely on.
It is built minimally, recorded in `../owner-decisions.md` (what, why, alternatives), and its pull
request carries `hold` and `needs-decision`.

## Order

Four units edit the element's screenshot path (`ScreenshotCapture.ts`, `drawLegend.ts`, the
built-in camera views) and the app's export dialog, so they run one after another: sharp names and
a real 4x, then the "Whole graph" angle, then leaving out the selection, then the key insets. The
3D size fix waits for its trace. Everything else runs in parallel. A last unit rebuilds and
re-measures the whole build before the tier 2 study.

| Unit                                               | Package                         | Public API              | Waits for         |
| -------------------------------------------------- | ------------------------------- | ----------------------- | ----------------- |
| Focus after a control removes itself or closes     | graphty (maybe graphty-element) | no                      | --                |
| Gray helper text contrast, dark and light          | compact-mantine                 | no                      | --                |
| Layout refusals as codes, words in the app         | graphty-element + graphty       | yes                     | --                |
| Export warnings in the app's words                 | graphty                         | no                      | --                |
| Exported names at the target resolution, a real 4x | graphty-element                 | no                      | --                |
| "Whole graph" export keeps the on-screen angle     | graphty-element + graphty       | yes                     | sharp names       |
| No selection ring in the exported picture          | graphty-element + graphty       | yes                     | Whole graph angle |
| The key never covers a node                        | graphty-element + graphty       | yes                     | no selection ring |
| Trace the 3D size misreading                       | graphty-element (trace only)    | no                      | --                |
| Fix the 3D size misreading at its cause            | graphty-element (+ graphty)     | yes, if a mode is added | the trace         |
| Force re-applied freezes as a cloud                | graphty-element (or layout)     | no                      | --                |
| The Sources file row opens its table               | graphty                         | no                      | --                |
| Re-measure the build for the tier 2 study          | studio                          | no                      | all of the above  |

## Focus after a control removes itself or closes

**Package:** graphty (graphty-element only if the cause is the element's host).

**Files:** `graphty/src/workspace/start/StartScreen.tsx`, `graphty/src/workspace/start/open.ts`,
`graphty/src/workspace/privacy/UsageDataCard.tsx`, `graphty/src/components/shell/KeyboardShortcutsOverlay.tsx`,
`graphty/src/workspace/frame/HelpDialogs.tsx`, `graphty/src/components/shell/AppShell.tsx`,
`graphty/src/workspace/project/RecentProjects.tsx`; possibly `graphty-element/src/graphty-element.ts`.

**What.** Since the drawing stopped taking focus when it mounts, focus falls to the page whenever
the control that held it disappears. Reproduced paths: a sample opened by keyboard (r3-s14, s18,
s20, s22, s26, s39); "No thanks" on the usage card (r3-s01, s26); Escape from the keyboard
shortcuts dialog opened from the drawing (r3-s39); a refused file (r3-s52); Enter on a recent
project (r3-s47). Decided targets:

- After anything opens a graph (sample, file, recent project): the drawing (the element's canvas,
  already named by its `aria-label`). The user's act produced it, the load announcement speaks, and
  the drawing is where keyboard node walking starts.
- After "No thanks" or "Yes" on the usage card: the next control in reading order where the card
  was (on the start page, the first open choice).
- After a refused file: the start page's open control, with the kept reason beside it.
- After Escape from a dialog: the control that opened it. When the opener was the drawing and
  focusing the host does not reach the canvas inside the shadow root, the fix is in
  graphty-element (focus forwarded from the host to the canvas), not a reach into the shadow root
  from the app.

Then sweep: list every control in the app that unmounts itself or closes a surface on activation
(dialogs, popovers, menus, cards, chips with a remove, rows with delete, toggles that swap
themselves, "Undo" that removes the row it sits in) and give each a stated target. Fix every one
that drops to the page. Write the list into the unit's commit message.

**Acceptance.** Rerun `../rounds/round-3/repro/r3-s14/repro.sh`, `r3-s18`, `r3-s26`, `r3-s39`,
`r3-s47` and `r3-s52` on the rebuilt app: no `focus: nothing (the page itself)` line in any
`run.log`, and each named path's focus line names the target above. One graphty browser test per
path asserts `document.activeElement` (or the canvas inside the element's shadow root) after the
action; each fails on the round 3 build.

## Gray helper text contrast, dark and light

**Package:** compact-mantine.

**Files:** `compact-mantine/src/theme/colors.ts` (the `dark` ramp, shade 2 `#8c8c8c`),
`compact-mantine/src/theme/tokens.ts` (`text-secondary`, `text-tertiary` in both schemes),
a compact-mantine test; `design/ui/studio/tool/bars.mjs` (a `--scheme light` option).

**What.** Dimmed helper text `#8c8c8c` on the panel `#2c2c2c` measures 4.15:1, below WCAG 1.4.3's
4.5:1, on 9 of 13 core screens (start lines, Recent projects, 9 px text). Raise the shared ramp
so every caller gets it: the lowest gray that reaches 4.5:1 on each dark surface dimmed text sits
on (`#2c2c2c` panel, `#383838` field, `#1e1e1e` menu; about `#a0a0a0` clears all three), kept
visibly darker than shade 1 (`#b3b3b3`). Check the light theme the same way: `text-secondary`
`#00000080` on white is about 3.95:1, and Mantine's light dimmed gray is lower; raise whichever
non-disabled text uses them. Disabled text is exempt (WCAG 1.4.3) and stays as it is. No local
color in the app.

**Acceptance.** A compact-mantine unit test computes the contrast of every non-disabled text
token and ramp shade used for text against every surface token it is drawn on, in both schemes,
and fails below 4.5:1 (fails on the current values). `node design/ui/studio/tool/bars.mjs
tmp/bars-dark` and `... tmp/bars-light --scheme light` report zero `color-contrast` violations on
every core screen. The visual review shows the changed grays in compact-mantine and graphty
stories for the owner to approve.

## Layout refusals as codes, words in the app

**Package:** graphty-element, then graphty. **Public API:** yes.

**Files:** `graphty-element/src/session/planning.ts` (`layoutRefusal`, `unavailableLayout`,
`unavailableEstimate`), `graphty-element/src/session/cost/estimate.ts` (`CostEstimate`),
`graphty-element/src/session/shared.ts` (`CodedFact`), `graphty-element/api/session.api.md`;
`graphty/src/workspace/layout/methods.ts`, `graphty/src/workspace/layout/LayoutForm.tsx`, a new
words file beside them.

**What.** A refused layout reaches the screen in the element's English: "the layout "planar"
cannot draw this graph without crossings: G is not planar.", a raw field path such as
`results.louvain.group`, "with `dim: 2`". graphty-element must return neutral facts. Give
`CostEstimate` a coded refusal, `refusal?: CodedFact<...>` (the shape master's legend facts use),
with one code per refusal `layoutRefusal` and the unavailable estimates produce (not planar,
missing start node, no grouping attribute, needs a flat drawing, and the rest found in the file)
and their parameters (layout id, option name, attribute id, run id). Keep `reason` as it is,
marked deprecated, so nothing breaks. The app writes the words from the code, naming a run's
grouping by the run's own label and Louvain by its method name.

**Acceptance.** graphty-element tests: each refusal path returns its code and parameters, with
no English in `refusal`. On the app: open the Les Miserables sample (not planar), open Layout,
pick "No crossings": the reason under Method contains none of "G is not planar",
"results.", "dim:" or a backquote. Open Rings by group with no community run: the reason names
what to run in the app's words. The API report diff shows only the added field and code union;
the decision is recorded in `../owner-decisions.md`.

## Export warnings in the app's words

**Package:** graphty.

**Files:** `graphty/src/workspace/export/DataOutput.tsx`, a new words file beside it.

**What.** The Export > Data warnings show each `LossNote.message`, which is graph-io's and
graphty-element's English ("1 edge column is not written: an adjacency table holds the weight
only", nine bullets in program terms, r3-s48, s49, s56). Every note already carries a stable
`code`, a `column` and a `count`. Write the words in the app from those three, one sentence per
code, grouped as the app sees fit; an unknown code gets one generic sentence naming the column.
If a code turns out to need a parameter `LossNote` does not carry, that is a graph-io or element
change: record it in `../owner-decisions.md` instead of parsing the message.

**Acceptance.** A graphty test renders the warnings for a graph exported to CSV edges and
adjacency, GraphML and Graphty JSON and asserts no `message` string reaches the DOM. On the app:
Les Miserables, run Louvain, Export > Data > CSV: every warning line reads in plain words and
none contains a code, a backquote or a field path.

## Exported names at the target resolution, a real 4x

**Package:** graphty-element.

**Files:** `graphty-element/src/screenshot/ScreenshotCapture.ts`, `graphty-element/src/screenshot/dimensions.ts`,
`graphty-element/src/meshes/RichTextLabel.ts`, a browser test.

**What.** In an exported picture the names are soft while the key is sharp, and "For print, 4x"
is the screen enlarged, not re-rendered (r3-s02, s06, s09 downloads; r3-s05 at 3612 x 3440).
Trace both first: whether `multiplier` is applied to the canvas's device pixels or its CSS size,
whether a browser limit clamps the render target and the picture is then scaled up, and at what
resolution label textures are drawn during a capture. Then render labels at the capture's scale
for the duration of the capture (restored after, on success and on failure), and render 4x at 4x.

**Acceptance.** A graphty-element browser test captures one labeled node at multiplier 1 and 4:
the 4x image is exactly 4 times the canvas size per side, and the name's glyph edge (10 to 90
percent rise) spans no more output pixels at 4x than at 1x. On the app: Florentine families,
"Show all labels", Export > Image > For print, 4x: a crop of "Medici" at 1:1 is as crisp as the
key's text beside it, compared by eye on the PNG.

## "Whole graph" export keeps the on-screen angle

**Package:** graphty-element, then graphty. **Public API:** yes. **Waits for:** sharp names.

**Files:** `graphty-element/src/camera/builtins.ts` (`fitToGraph`), `graphty-element/src/catalog/cameras.ts`,
`graphty-element/src/screenshot/ScreenshotCapture.ts`, `graphty-element/src/screenshot/types.ts`;
`graphty/src/workspace/export/choices.ts`.

**What.** Export View "Whole graph" passes `camera: { preset: "fitToGraph" }`, and in 3D that view
jumps to a fixed diagonal angle, so the picture shows the drawing turned and a quarter empty
(r3-s01 downloads). The built-in view already receives the current camera (`CameraViewInput.current`).
Add the narrowest choice that frames everything from the current angle: an option on `fitToGraph`
declared in its catalog descriptor (default off, so no saved picture moves), passed through the
screenshot's `camera` option. Record it. The app asks for it on "Whole graph".

**Acceptance.** A graphty-element test: after orbiting the 3D camera, `fitToGraph` with the option
returns the same alpha and beta and a radius that contains every node; without it, the old
numbers to the digit. On the app: Les Miserables, orbit the drawing, Export > Image > Whole graph:
the picture is the screen's angle with every node inside and no empty quarter, compared with a
"Current view" export of the same moment.

## No selection ring in the exported picture

**Package:** graphty-element, then graphty. **Public API:** yes. **Waits for:** Whole graph angle.

**Files:** `graphty-element/src/screenshot/ScreenshotCapture.ts`, `graphty-element/src/screenshot/types.ts`
(`ScreenshotOptions`); `graphty/src/workspace/export/choices.ts`, `graphty/src/workspace/export/ImageOutput.tsx`.

**What.** A node selected before export keeps its selection ring in the file, tinted off its own
key (r3-s02 repro). Whether a picture shows the selection is a consumer's choice, so the element
gets a screenshot option to leave the selection highlight out for the capture (default: draw what
the screen shows, as now) and restores it after, on success and on failure, with no selection
change event. The app leaves the selection out by default. A choice in the dialog is not added
now; one more control is not justified by one session.

**Acceptance.** A graphty-element browser test selects a node, captures with the option, and finds
the node's pixels equal to an unselected capture; the selection is still set afterward and no
selection event fired. On the app: Florentine families, select Medici, Export > Image: no ring
around Medici in the file, and Medici is still selected on screen.

## The key never covers a node

**Package:** graphty-element, then graphty. **Public API:** yes. **Waits for:** no selection ring.

**Files:** `graphty-element/src/camera/types.ts` (`CameraViewInput`), `graphty-element/src/camera/builtins.ts`,
`graphty-element/src/cameras/OrbitCameraController.ts`, `graphty-element/src/cameras/TwoDCameraController.ts`,
`graphty-element/src/screenshot/drawLegend.ts`, `graphty-element/src/screenshot/ScreenshotCapture.ts`,
`graphty-element/src/graphty-element.ts`; `graphty/src/workspace/canvas/CanvasOverlays.tsx`,
`graphty/src/workspace/canvas/LegendCard.tsx`.

**What.** The on-screen key card covers the Pazzi node completely and half of Blacheville's name
from the first run, and the camera does not refit (r3-s27: the hit test at (531, 84) is Pazzi
before the run and a `div` after). The same card is drawn into exported pictures. Give the
element view insets: screen-space margins (CSS pixels per side) that every fit honors, the
automatic fit after a layout, the built-in views through `CameraViewInput`, and a capture. A
capture that draws a key reserves the key's own measured box itself, so an exported key never
covers a node either. The app reports the card's box as the inset (on mount, on resize, on
collapse) and the element refits. Prefer growing an existing camera option over a new one if one
fits.

**Acceptance.** A graphty-element test: with a left inset of 200 px, every node's projected
position after a fit lies outside the inset, in 2D and 3D. On the app: rerun
`../rounds/round-3/repro/r3-s27/repro.sh`: the hit test where the key sits returns no node under
the card, and Pazzi is visible and clickable; on Les Miserables after a community run no node
center lies under the card. In an exported picture of both, no node disc intersects the key card.
Decision recorded in `../owner-decisions.md`.

## Trace the 3D size misreading

**Package:** graphty-element (trace only, no fix).

**Files:** `graphty-element/src/cameras/OrbitCameraController.ts`, `graphty-element/src/meshes/NodeMesh.ts`,
a trace script under `tmp/`; findings written to `design/ui/studio/next-steps/traces/3d-size.md`.

**What.** With size bound to PageRank on the running club (`tool/files/friends.csv`), Ava's dot is
drawn about 140 px across and Farah's about 120 px in the default 3D view, the reverse of their
scores (0.06423 against 0.06608; `../rounds/round-3/repro/r3-s09/run/downloads/friends_current-view.png`).
Perspective is the guess, not a finding. Settle it: read each node's world-space size from the
element (right order or not), export the same binding once in 2D (View 2D, or a flat layout) and
once in 3D from two orbit angles, and measure Ava's and Farah's drawn diameters and camera
distances in each. Name the cause: perspective, the size mapping, a minimum-size clamp, the label
offset, or something else, with the numbers.

**Acceptance.** The trace file lists, for 2D and both 3D angles, the two world sizes, the two
camera distances and the two drawn diameters, and names the cause the numbers show. The script
that produced them is committed beside it so it can be rerun.

## Fix the 3D size misreading at its cause

**Package:** graphty-element (graphty only to switch a new option on). **Public API:** yes if a
mode or option is added; no if the cause is a mapping bug. **Waits for:** the trace.

**Files:** as the trace names; likely `graphty-element/src/meshes/NodeMesh.ts`,
`graphty-element/src/cameras/OrbitCameraController.ts`, the style schema for node size; the app
file that applies a bound size.

**What.** Fix the traced cause, not the symptom. If the element's world sizes are in the wrong
order, fix the mapping (no API). If perspective is the cause, a size bound to data must be
comparable whatever a node's depth: offer a perspective-independent node size (sized in screen
space, as a style or camera option, default off since it is a consumer's choice) and have the
app turn it on when a size is bound to a result. Not acceptable: pushing the camera back, hiding
sizes in 3D, or a warning in the app.

**Acceptance.** Rerun the trace script: on the running club in the default 3D view and both orbit
angles, Farah's drawn diameter is larger than Ava's, and every pair of nodes is drawn in the order
of their PageRank. A graphty-element test asserts drawn-size order equals value order for two
nodes at different depths. On the app: rerun `../rounds/round-3/repro/r3-s09/repro.sh`; in the
exported picture Farah's dot is the larger.

## Force re-applied freezes as a cloud

**Package:** graphty-element (or layout, if the trace lands there).

**Files:** `graphty-element/src/layout/NGraphLayoutEngine.ts`, `graphty-element/src/managers/LayoutManager.ts`,
a graphty-element test.

**What.** Applying Force again with a changed spring length (30 to 80) leaves a square, scrambled
cloud that never moves: positions identical node for node after 4 and 12 seconds and between the
session and the repro (`../rounds/round-2/repro/r2-s40/`). That reads as a fixed starting
placement whose simulation never runs or stops at once (a convergence check that is already
satisfied, an engine not restarted, a settled flag carried over). Trace it, then fix the cause:
a re-applied force layout runs from the current drawing and settles.

**Acceptance.** A graphty-element test applies the force layout, waits for it to settle,
re-applies with a changed spring length, and asserts that positions move and that the settled
mean edge length is at most half the mean distance between random node pairs. On the app: rerun
`../rounds/round-2/repro/r2-s40/repro.sh`: `12.png` and `13.png` differ from the start of the run
and show grouped clusters, not a cloud.

## The Sources file row opens its table

**Package:** graphty.

**Files:** `graphty/src/workspace/data-place/DataPlace.tsx` (`openSource`, `sourceItem`), its test.

**What.** Under Data > Sources, a file that produced a single table (an edge list such as
`friends.csv`) shows one row with no children. It takes focus, but a click or Enter opens nothing,
while the child rows of a two-table source open their table (r3-s53 repro). A source row with no
children opens the table it produced, the same way a child row does; a row with children keeps
expanding to them.

**Acceptance.** A graphty test: `openSource` on a childless edge-list source opens the table dock
on its edge table. On the app: rerun `../rounds/round-3/repro/r3-s53/repro.sh`: after step 05
(click) and step 06 (Enter) the `--read` output shows the edge table with 41 rows.

## Re-measure the build for the tier 2 study

**Package:** studio (`design/ui/studio/`). **Waits for:** every unit above.

**Files:** none changed in a package; results under `design/ui/studio/next-steps/verify/`.

**What.** Rebuild graphty-element and the app, confirm the served build stamp is the new commit,
and run every acceptance check above once on it, plus `tool/real.mjs --prove` and `tool/bars.mjs`
in both schemes. Report each check pass or fail with its log path. Bar 9 (app words at rest at or
below 50) must still hold: the new words live in reasons, warnings and the focus targets, not at
rest.

**Acceptance.** Every check listed above passes on one build; `bars.mjs` exits 0 in dark and
light; `real.mjs --prove` prints no FAIL; the words-at-rest count is at or below 50.
