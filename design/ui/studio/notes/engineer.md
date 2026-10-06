# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, and I say what the code and the element's API can and cannot do today. I keep
fixes small and in the right package. I read this file at the start of every session and update it
as I decide and learn.

Words used below: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a
first-time user's core path from an empty app (open a sample or a file, read it, run an analysis,
color or size by a result, put names on, find a node and its neighbors, export a picture and the
numbers, save and reopen). "The walk" is the whole first session chained end to end, the build's
acceptance test. "The studio worktree" is
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1` on branch
`design/studio-tier1`.

## Top of mind

1. (2026-10-06) The study tool can now save, reopen and see motion: `real.mjs` answers the save and
   open pickers (real private-file-system handles, copies in `<session>/saved/`), `--reopen` closes
   the tab and opens a new one on the same storage (preflight 7 settled: it works), names resolve
   only inside an open `aria-modal` dialog, and a canvas that keeps changing across three captures
   prints "the drawing is still moving". `--prove` covers all four.
2. (2026-10-06) Graph logic goes in graphty-element, never the app. An app comment that explains why
   the element could not be used is an element bug report; I fix the element locally rather than
   add or keep an app workaround. Presentation (words, headings, grouping, what to show) is the
   app's; the element returns neutral facts and `{ code, params }`. All styling goes through style
   layers; an algorithm's suggested layers paint only its own result.
3. (2026-10-06) graphty-element imposes NO default layout seed (owner). The app seeds itself
   (commit b98e99a5b): `LAYOUT_SEED` and `takesSeed()` in `graphty/src/workspace/layout/methods.ts`;
   `ElementHost.tsx` declares `layout="ngraph"` and `layoutConfig={{ seed }}` on the tag (a setup
   declaration, so the baseline, not an undo step); `LayoutGroup.tsx` passes the seed with every
   Method pick. Any new app path that chooses a layout passes the seed when the layout takes one.
   Never re-add a seed default in the element. The random layout's own default 1 predates this.
4. (2026-10-06) The legend says only what the drawing shows: `keyBlocks()` in
   `canvas/legendWords.ts` drops label/tooltip blocks and a constant ("literal") size block from
   the card and the exported image's key; a bound Color line's chip is the element legend's
   colors (commit 377c526e1). Exported images carry the legend (`captureScreenshot({ legend })`,
   c77e473ab; new public API listed in `owner-decisions.md`).
5. (2026-10-06) The cheapest wins before and between study rounds: adopt element capabilities that
   are already closed but never adopted. Biggest first-time impact: node names instead of ids
   (#895), the legend's reading sentence and size range (#912), the weight line at load (#926),
   attribute roles and in-use (#893/#923), Show all labels and Reframe doors (#903/#900),
   Open project or file... reopening a project file (#913), histograms (#896/#897/#932), selecting
   isolated nodes, self-loops and repeats (#899/#931).
6. (2026-10-06) Iterate locally on the studio worktree: change code, rebuild
   (`pnpm exec nx run graphty:build`, Sentry variables unset; rebuild graphty-element first when it
   changed), re-run the affected study steps with `design/ui/studio/tool/real.mjs`. Never push,
   never open PRs. Keep a ledger of every local change (package, file, reason, the issue it
   answers) so the owner can land them later. Other agents edit and rebuild this worktree at the
   same time: stage only my hunks (a blob built from the base, `git update-index --cacheinfo`),
   check `git show --stat HEAD`, and wait for their builds before trusting a `--prove` FAIL.
   One branch, one integration (parallel screen PRs caused combined-only bugs, 2026-10-05).
7. (2026-10-06) A round tests the design only once the deciding defects are fixed and proven. The
   mock rounds died on prototype defects (round 7: 18 of 61 tasks unreachable; round 8: four tasks
   decided by the skeleton). On the real app, a defect that decides a task is my top priority
   before the next round, and every fix gets a step that proves it.
8. (2026-10-06) The three untested round 8 fixes are the first things a round measures: Label "+"
   adds a label line and opens its attribute list; a node's neighbors listed by name and tie value;
   the find box as one live list. All three depend on node names (#895 adoption) to read right.
9. (2026-10-06) Every count or claim on screen is computed from live element state, or the message
   is removed. Fixed strings ("64 labels hidden") were the top trust-killer in the mock rounds.
   Re-test a symptom after an upstream fix before building: the label line's "0 labels" was the
   camera spin starving the element's settle-then-announce event, and needed no change.
10. (2026-10-06) A run paints as soon as it finishes (owner). When a reader's own layer suppresses
   it, the "Hidden by your layer" notice with Show anyway must appear; whether a run should instead
   land above such a layer is an open owner question, not mine to decide in code.
11. (2026-10-06) Known gaps on the core path I expect the study to hit: Open project or file...
    imports a `.graphty.json` as data; legend switch not saved with the project; Undo can leave a
    stale project name in the header; the Selection row's Style tab is empty (selection look lives
    in `config.selectionStyle`, not a layer); group Members shows load order, not top by rank;
    PageRank's Weight line missing (#882, open); Layout method is a bare select.
12. (2026-10-06) Use the default components (compact-mantine). If a shared component is wrong, fix
    the shared component. The Data page's role selects above the grid (`DataPage.tsx` ~685) are a
    component workaround to retire, not copy. Every themed Modal now blocks the page behind a
    transparent overlay (commit 557713b81); a choice between kinds inside a dialog is Mantine
    `Tabs`, not a `PageList` grid.
13. (2026-10-06) A file the importer gives up on is refused whole, in every format: nothing read
    before the break reaches the graph (`importDocument` in
    `graphty-element/src/data/graph-io-import.ts`). Do not reintroduce "keep what was read". In the
    app a failed open from the start screen closes the half-made project, adds nothing to Recent
    projects and leaves an error notice (`Notice.error`) that stays until dismissed; any new open
    path must keep this.
14. (2026-10-06) Check a layout against a reference before a study offers it (Spectral was
    wrong until matched against numpy; "Force, flat" runs ARF, not the default force on a plane).
    Also: a load that the counts say worked can still draw nothing -- the store and the render
    half are fed separately in `ingest.ts`; assert on `element.graph.getNodes()`, not only on
    `statistics()`, in any load test.
15. (2026-10-06) Keyboard focus follows the reader's pick: a node chosen in the find box moves
    focus to that node's Summary values (a `role="group"` "Summary values", tabIndex -1), so one
    Tab reaches Degree and later letters stop typing into the box. Any new door that picks a node
    should hand focus the same way (`focusNodeValuesNext()` in `inspector/reads.ts`).
    Names and tooltips: no two reachable controls share a name, and every icon or cut
    name has the themed Mantine tooltip (commit f60a81711). A native `title` is invisible to
    real.mjs and to headless screenshots, so it does not count. Analyze is an ARIA combobox
    (filter `combobox`, entries `option`); reuse that for any filter-over-list.

## Priorities and values

- The first-time user's core path works end to end on real wiring, before anything else
  (owner, 2026-10-02 and 2026-10-03). A step that looks right but changes nothing visible is worse
  than a missing step: the mock rounds' dominant failure was "the right control is found; what it
  does next fails."
- Fixes land in the package every consumer gets. The app is today the only consumer of the
  element, so it is the only thing that can discover element defects; a workaround throws that
  information away (repository `CLAUDE.md`, "The app MUST NOT work around graphty-element").
- Small diffs, root causes. One guard in the shared function rather than a patch per caller.
- Evidence over taste: I assert on element reports (`runs.painting()`, `styles.explain()`,
  `labelOf`, `nodeScreenPosition`), not on pixels or on what a panel claims.
- The studio's time and the owner's attention are expensive. I tell designers early when a
  decision would need new element API (a public contract, so a one-way door for the owner), and
  when it is cheap app chrome (a two-way door I can just build).
- Never blame timing or load for a failure; find the mechanism first.

## Design criteria

- **Visible effect at commit.** Every step's change shows on the canvas and the legend the moment
  it commits (tier 1 design, the walk). Reason: round 8's walk failed 21 of 21, mostly on actions
  that changed panel text but not the drawing.
- **Live counts only.** Any number in a message is read from the element at render time. Reason:
  repeated "numbers disagree between screens" findings in rounds 2-7.
- **No promises.** An unbuilt item is not drawn: no "Coming" tags, no disabled stand-ins for work
  that does not exist (tier 1 design, section 3). Reason: dead-end menu items ("not available
  yet") turned every second route into a failure in round 8.
- **One door, one command.** A command is registered once and every door (key, menu, Quick
  actions, selection bar) uses its words verbatim; no two reachable controls share an accessible
  name. Reason: "Data" and "Louvain" on several controls confused sighted users and broke the
  screen-reader persona; it also breaks the study tool's click-by-name.
- **Element owns facts, app owns words.** The element returns codes, values and descriptors; the
  app writes every sentence (owner, 2026-10-03). Reason: a third-party consumer must be able to
  present the same facts its own way.
- **Easy things easy.** A new element API has a simple path whose first example fits in about 15
  lines and names no internal concept; it is checked by a docs-only author (repository
  `CLAUDE.md`).
- **Style layers only; suggested layers scoped to the result** (repository `CLAUDE.md`). Reason:
  styling outside layers is invisible to the layer list and lost at a dataset boundary; an
  unscoped suggested layer erases every algorithm beneath it.
- **Exact by default.** The method named is the method run; a sampled variant is offered, never
  swapped in; cost estimates come from the element (framework principle 2).
- **The app never starts work unasked.** Samples open with nothing run (round 8 decision).
- **Accessible by default.** WCAG 2.2 AA; the table and inspector are the canvas's text
  equivalent; Esc closes the innermost thing first; focus never falls to the page body.

## Decisions and reasons

- 2026-09-13 to 09-19 -- Owner rules now in `CLAUDE.md`: all styling through style layers;
  algorithms layer their styles and never mute others; graphty-element owns all graph
  functionality and the app never works around it (the 2026-09-19 audit found every app
  workaround comment pointing at a real element defect).
- 2026-09-30 -- A run paints as soon as it finishes. Owner ("this is graph visualization
  software").
- 2026-10-03 -- Stop mocking; build tier 1 as the real app and study that. Reason: the mock was
  the main source of study failure; real code from Claude Code is about as fast to write. Owner.
- 2026-10-03 -- The new shell lives under `graphty/src/workspace/`, served at `/?next` beside the
  old shell until a switch-over deletes the old one. Studio plan
  (`design/ui/tier1-real-app/plan.md` on `feat/tier1-real-app`).
- 2026-10-03 -- Ten element API items for tier 1 (`data.prepare()`, column measurement,
  `session.find`, `data.neighbors`, result columns, Analyze descriptors, hidden-label counts,
  `runs.painting`, project file, readable run names); columns named `{ kind, name }`, one text
  matcher, one progress event. Style channel groups dropped (presentation). graphty-element is
  neutral about presentation. Owner, after an adversarial review found a problem in every draft.
- 2026-10-05 -- Fold the tier 1 screen PRs into one (#942): stacked screens caused combined-only
  bugs and repeated image re-approvals. Owner ("fold all").
- 2026-10-05 -- Leave the group-row color fallback in `graph-place/rows.ts` for now and file its
  removal (#1099) rather than force a new full screenshot review of #942. Studio; the workaround
  must come out next.
- 2026-10-06 -- Study tooling element APIs: `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`. Held PRs awaiting the owner's name confirmation; merged into
  the studio worktree so the study tool can use them. Studio proposed; owner to confirm. The
  seeded default layout merged with them (issue #801) is withdrawn; see the next entry.
- 2026-10-06 -- No default layout seed in graphty-element; the app passes its own (owner). Undid
  the element's DEFAULT_LAYOUT_SEED, `withDefaultSeed`, the ngraph schema default (back to null)
  and the guide section; recorded in `owner-decisions.md` so held #801 does not land. App: seed on
  the tag (not `session.layout.set` at open, which would add an undo step that unseeds the drawing)
  and on Method picks; the Seed field falls back to the app's seed, not 0 (the flat layout's
  schema refuses 0). Evidence: `LayoutSeed.real-element.test.tsx` fails on the old app sources
  ("expected undefined to equal 1"); `tmp/check-r0-seed-out-of-element/a/`: Les Miserables opened,
  tab reopened, opened again -- 02.png and 04.png byte-identical; Seed reads 1 for Force and Force,
  flat (10.png, 12.png). Re-recorded on the seeded default: Louvain 6 groups of 20/17/11/11/10/8
  (06.png); label line by name "77 labels, 7 hidden to avoid overlap" (09.png); after Force, flat
  "77 labels, 0 hidden".
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

- 2026-10-06 -- A GraphML or GEXF file cut short is refused whole with `E_PARSE_FAILED`, in the
  shared `importDocument` helper (before, a GraphML cut at 55% opened as 5 nodes, no warning).
  Evidence: a GraphMLDataSource test; `tmp/check-r0-truncated-graphml-partial/session/03.png`.

- 2026-10-06 -- Camera keys ignore modifier chords and clear held keys on canvas blur and
  visibilitychange (Shift+A had left yaw held forever once the Analyze popover took focus). Not
  public API (`src/cameras/InputUtils.ts`).

- 2026-10-06 -- The themed Modal always has a (transparent) overlay, so the page behind a dialog
  cannot be clicked (pilot T13); fixed in compact-mantine. Export dialog's Image and Data are
  vertical Mantine Tabs ("What to export"); the Settings dialog still uses a PageList.

- 2026-10-06 -- A failed open from the start screen returns to the start screen with an error
  notice that stays (`Workspace.tsx`, `notReadSentence` in `start/open.ts`). Rejected: deferring
  the project until the load succeeds (the session only exists inside the mounted frame).
  Evidence: `tmp/check-r0-failed-open/session/03.png`.

- 2026-10-06 -- Exported images carry the legend (#133, commit c77e473ab):
  `ScreenshotOptions.legend: ScreenshotLegendSection[]`, drawn by the element at the top left; the
  app's `imageLegend()` (`canvas/legendWords.ts`) passes the card's own words while the card is
  shown. Rejected: `legend: true` (element would write words), app compositing (breaks the
  clipboard gesture). Evidence: `tmp/check-r0-image-legend/s1/downloads/`. Owner to confirm names.

- 2026-10-06 -- A load draws every node its edges name, even with no node rows (commit 92882d5fd).
  Before, "New from data..." with friends.csv stored 20 nodes and drew none: edges waited for node
  render objects that only node records make. Fixed once in `Ingest.addDataFromSource`
  (`session/project/ingest.ts`): endpoints the builder made are drawn as `{ id }` nodes at the
  load's end. Scoped to a load, not `addEdges`. Not public API. Evidence:
  `test/browser/load-draft.test.ts`; `tmp/check-r0-new-from-data-empty-canvas/04.png`.

- 2026-10-06 -- Chrome names and tooltips (commit f60a81711): Main menu and privacy chip
  tooltips; the Graph place footer is no longer a link (only the toolbar is "Analyze"); cut names
  get a tooltip from compact-mantine's `rows/EllipsizedName.tsx` only when actually cut. The
  Canvas rows sit 8 px deeper than Method and Seed; left alone.
- 2026-10-06 -- The finding "Style tab panel named by its whole content" came from the study
  tool's printout (it shows innerText for an element with no aria-label), not from the ARIA name:
  Mantine's `Tabs.Panel` is labelled by its tab. `--click "Style"` no longer prints ambiguous. No
  change.

- 2026-10-06 -- Legend and Style lines kept truthful (commit 377c526e1). App: `keyBlocks()` filters
  the legend before the card (`CanvasOverlays.tsx` read) and `imageLegend()`: no label, tooltip or
  arrow-text block, no literal size block. `SetLine.tsx` BoundValue's chip reads the element legend
  block for (layer, channel), then the named palette, then gray. Element: a run's encoding layer is
  named `run.label` (was "<run> - Node Colour"), as a column layer is `column.name`; a default
  string, not public API, so no owner door. Not done: renaming the "Node Colour" plainName itself
  (validation messages still say "Colour"). Evidence: the chip assertion in
  `StyleTab.real-element.test.tsx` fails on the old SetLine (gray var); `legendWords.test.ts`;
  `tmp/check-r0-legend-and-style-lines-truthful/` 06 (constant size: no Size block, orange chip),
  07 (bound size: Size ramp), 08 (names drawn, no Label block).

- 2026-10-06 -- One Everything row (commit 1889d513a). The reader's Everything layer (the layer
  `writeLine` in `style/row.ts` adds, marked `userData.graphtyEverything`) is the Everything row's
  paint, so `paintRows` (`graph-place/rows.ts`) skips it instead of listing a second "Everything"
  layer row. Kept the Everything row eye-less (fixed rows have no eye). Evidence: new case in
  `graph-place/__tests__/rows.test.ts` fails on the old rows.ts; real.mjs session
  `tmp/check-r0-duplicate-everything-row/` 10.png: labels drawn, one Everything row.
  Still open: the inspector header reads "Everything" twice (row name, then its kind word from
  `inspector/words.ts`), so `--click "Everything"` stays ambiguous (treeitem plus two `p`s).

## Tried: worked / did not work

- 2026-10-06 -- Analyze keyboard pick as the ARIA combobox pattern: focus stays in the filter box,
  `aria-activedescendant` names the active option, and the first match is active while there is
  filter text, so Enter on a single match opens it. Worked: a new real-element test fails on the
  old popover and passes on the new one; real.mjs session `tmp/check-r0-analyze-keyboard-pick/`
  (Shift+A, type "brokers", Enter opens Betweenness, Enter runs it; ArrowDown twice, Enter opens
  Degree). Side effect: the `AnalyzeFiltered` story now shows the first match highlighted, a
  baseline change for the owner's visual review.
- 2026-10-06 -- When a keyboard step "does nothing" in real.mjs, probe focus with a `--type` step
  before blaming the app (a capture once dropped focus to the page body; fixed in the tool).

- 2026-09-13 to 10-04 -- Before the real app: specify panel lifecycle before building; fake
  wiring measures the fake; public API drafts need a blind-author check; one integration branch,
  not parallel screen PRs; a four-slot browser gate (`with-browser.sh`) after 23 browsers filled
  swap on 2026-10-01; the tier 1 vs mock drift list (`tmp/tier1-vs-mock/`, main checkout) is my backlog.
- 2026-10-06 -- `real.mjs` (commit a1e6b91ff) rests on `labelOf`, `nodeScreenPosition` and
  `elementAt`. "Stable frame" does not mean "labels re-evaluated": re-check label reads after a
  label setting change. A seeded default layout made screenshots reproducible but relayouts the
  whole graph when nodes are added (now the app's seed, per the owner's 2026-10-06 decision).

- 2026-10-06 -- Real-element app tests that open a toolbar popover need `page.viewport(1366, 768)`
  (at the runner's 414 px Mantine hides a popover whose anchor is clipped) and must wait for the
  tool's `aria-disabled` to clear after data arrives. compact-mantine's number field is a
  `spinbutton`, the Method select a `combobox`.
- 2026-10-06 -- Proving a test fails without the change by copying the old file from
  `git show HEAD:<path>` over the new one, running the test, and copying back. Worked, and needs no
  stash or checkout (both forbidden in the studio worktree).

- 2026-10-06 -- Camera spin fix: four new tests in
  `graphty-element/test/interactions/integration/keyboard-controls.test.ts` fail on the old
  controllers; app check `tmp/check-r0-camera-spin/s1/`. Lesson: spy on the controller's `spin` and
  call the input handler's `update()` directly to make a frame-driven camera test deterministic.

- 2026-10-06 -- Spectral layout: Chebyshev-filtered subspace iteration, matched against numpy;
  "Spread Out, Flat" left on ARF with a true description (ngraph flat needs an owner door).
  Evidence: `design/ui/studio/tmp/check-r0-broken-layouts/`.

- 2026-10-06 -- A dialog-blocks-the-page test passed with the bug at the 414-wide viewport. Run a
  new test against the old build (graphty reads compact-mantine from its `dist`).

- 2026-10-06 -- Element screenshot tests: `test/setup.ts` stubs `CreateScreenshotAsync` with a
  1x1 PNG; override it per file for pixel assertions (`screenshot-legend.test.ts`).
- 2026-10-06 -- Another agent's commit swept my uncommitted test edit into its own commit (the
  Export dialog test). Lesson: in the shared worktree, check `git diff HEAD` per file right before
  staging; a hunk may already be committed by someone else.

- 2026-10-06 -- Reproducing an app symptom in an element browser test first found the cause in
  one run. Unexplained, twice now: an element `--project=default` run failed a file that passed on
  an immediate rerun (`cache-inputs.test.ts`; on 2026-10-06 `seeded-placement.test.ts` right after
  an element build). Find the mechanism if it recurs; do not call it a flake.

- 2026-10-06 -- Study tool pickers and motion: real OPFS handles as picker stand-ins work (Recent
  projects reopens them); hiding the page for a canvas capture blurs it and hides motion; three
  plain clipped captures work.

- 2026-10-06 -- Names and tooltips checks (unique names test, Method padding, cut-name tooltip)
  each fail on the old files. In real.mjs hover the name span (`"Edges per node#2"`), not the stat
  group, whose center lands on the value.

- (2026-10-06) **Find box focus hand-off: worked.** A find pick of a node calls
  `focusNodeValuesNext()` (a one-shot flag in `inspector/reads.ts`) before `selection.apply`;
  `NodeValues` consumes it in an effect that runs after every render (so re-picking the node
  already shown also moves focus) and focuses a tabIndex -1 group around the Summary rows. A
  module flag beside the component file failed lint (react-refresh only-export-components), so the
  flag lives in `reads.ts`. Escape on an empty box already blurred it; unchanged. Proven by the
  real-element test "T12 from the find box" (fails without the call) and on the running app: find
  Javert, Enter, Tab lands on Degree, Enter lists "Javert's 17 connections"
  (`design/ui/studio/tmp/check-r0-find-box-focus/06-08.png`). Edge and value picks keep focus
  where it was (no node view to land in).

## Thinking

- **Element English in descriptors (2026-10-06).** `channels.ts` plainName still says "Node
  Colour" and Layer.ts validation messages build sentences from it. If one reaches the screen
  again, the fix is the element returning codes, not an app rename. Also: root prettier reflows a
  line in `graphty-element/test/session/styles/encoding.test.ts`; format only my own hunks there.

- **Project name after "New from data..." (2026-10-06).** After Load the header still read
  "Untitled", though `DataPage.tsx` load renames a new graph after its file. Seen in
  `tmp/check-r0-new-from-data-empty-canvas/04.png`; not looked into yet.
- **Which unbuilt pieces matter (2026-10-06).** Load cancel #296, paint counts #790, layout motion
  #791, samples in the element #796: let the study say which a first-time user misses; do not build
  them speculatively.

- **Other refusal codes on open.** `notReadSentence` writes its own words only for
  `E_PARSE_FAILED`; any other code still shows the element's English message. If the study meets
  another refusal on open (E_UNKNOWN_FORMAT, E_EMPTY_LOAD), map it there, reusing the Data page's
  `refusalFor` words where they fit the start screen (its "File settings" advice does not).

- **Order of work before round 1.** Prove the walk with `real.mjs` (a step that cannot complete is
  a deciding defect); adopt node names (#895); the legend reading sentence (#912) and the weight
  line (#926). Everything else waits for evidence.
- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.
- **Run landing above a reader's layer.** Today a suggested style is suppressed by a reader-set
  "Everything" color, with a notice. If the study shows first-time users never see their run, the
  remedy is a design decision for the owner, not a quiet code change.
- **The image key's look (2026-10-06).** It is a fixed light card in the system font at the top
  left, not the app's card; on a graph drawn into that corner it covers nodes. If a round reads
  that as a defect, the answer is a placement option or the element fitting the camera around the
  card -- both owner API questions -- not app styling.
- **What a study can and cannot observe.** The tool drives a headless browser and asserts on
  element reads; it cannot judge color legibility or motion. Visual claims need a screenshot and a
  human-readable check, and the image model only transcribes; its yes/no answers are not evidence.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments that cite element issues (2026-10-06): `export/ImageOutput.tsx` #133;
  `inspector/Inspector.tsx`, `NodeValues.tsx`, `RunValues.tsx` #895; `canvas/LegendCard.tsx`,
  `legendWords.ts` #912; `inspector/GraphValues.tsx` #903/#900; `graphty/src/data/sampleManifest.ts` #796.
- Transcript `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` (2026-10-03 to 10-06);
  owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes;
  visual capture is the whole canvas).
