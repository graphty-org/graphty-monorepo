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

1. (2026-10-06) Round 2 work, in order: (a) a run is named by its method everywhere ("PageRank",
   not "Influence"; "Betweenness", not "Bridges"), words from `analyze/words.ts`, never the
   element's English `run.label` -- the one decided change not yet built (pilot on build
   e82708488 still shows "Influence"); (b) trace "Force, flat" on Les Miserables -- an even disc,
   identical 10 s later, looks like no iterations ran (`rounds/r1/pilot/all/T11-flat/05` vs `07`);
   element bug if confirmed; (c) reproduce the stale legend after a second coloring run (r1-s49b),
   it decides the "legend agrees with the drawing" bar; (d) trace the legend overlay covering a
   node and the hover `tooltip: null` (deferred to round 3, trace first: does the element already
   take fit padding?).
2. (2026-10-06) Round 1 verdict: the core path works on real wiring. All 17 walked tasks reach
   their end state on the rebuilt app (`rounds/r1/pilot/all/pilot.md`); 26 of 27 valid sessions
   succeeded, no false "done" in 29. The remaining problems are costs and detours, not blocks.
   Biggest one was the neighbors task (ease 2.75, 4.3x the path) -- fixed by routing, not by a
   new affordance. The Degree-row cue was rejected for round 2 so the routing fix is measured alone.
3. (2026-10-06) The "failed 40m00s" sessions were the runner, not the app: the 40-minute clock ran
   while waiting 17 to 50 minutes for a browser slot. Fixed: idle close 15 min (7d40cfe59), at most
   3 session agents (4th slot for repros), `--end` after every attempt, ease asked 1 = very
   difficult to 7 = very easy (round 1 ease reads as 8 minus the answer). Do not restart first
   runs that have a "b" re-run; the 7 timed-out "b" re-runs move into round 2 (Sam's keyboard
   names session first). If a round 2 session still "fails" at the cap, check the queue first.
4. (2026-10-06) Graph logic goes in graphty-element, never the app; an app comment explaining why
   the element could not be used is an element bug report. The element returns neutral facts and
   `{ code, params }`; the app owns words. Style only through layers; suggested layers paint only
   their result. Public element API = owner one-way door: `owner-decisions.md` + `npm run api:report`.
5. (2026-10-06) No default layout seed in the element (owner). The app seeds itself: `LAYOUT_SEED`
   and `takesSeed()` in `layout/methods.ts`; seed on the tag in `ElementHost.tsx` and on every
   Method pick. Any new layout path passes the seed.
6. (2026-10-06) Test the element first: two "app" bugs in round 1 were app plumbing (the planar
   refusal drawn where nobody looks; Neighborhood never set the inspector). Before designing a
   new affordance, check whether an existing door reaches the wrong screen.
7. (2026-10-06) Every count on screen is computed from live element state, and every claim is
   checked against the drawing. Look for motion first ("0 labels" was the camera spin).
8. (2026-10-06) Known open items on the core path: the live Selection row blank after the
   neighbor route (headless renders; suspect `useAsyncValue` reset per session event); a reopened
   run has no count (element); Size/Color by a run's result on the Everything row "could not be
   changed" (untraced, `style/row.ts` `writeLine`); Effects Outline default makes black blobs;
   project name vs outline differ after save; Overview direction line shows raw file text
   ("directed 0", `"directed": f`); CSV export headers are internal (`results.louvain.group`)
   and its warning is developer English; names soft and overlapped in exported images.
9. (2026-10-06) The answer key needs re-recording when wording changes: T11's refusal now reads
   "No crossings could not lay out this graph, so the drawing is unchanged"; T13's Export uses
   `role=tab:Image` / `role=tab:Data`. Tell whoever owns `answers.md` after every wording change.
10. (2026-10-06) Simulated participants are one model: a shared first guess is not N observations,
    and they act on still screenshots, so hover cues and tooltips are under-measured. Trust a
    scripted repro or a cause in code over a participant count.
11. (2026-10-06) Iterate locally: change, rebuild (element first if changed, then
    `pnpm exec nx run graphty:build`), re-run the steps with `tool/real.mjs`. Never push. Other
    agents share the worktree: stage only my hunks, check `git show --stat HEAD`, and check
    `pgrep -af "real.mjs --prove"` and rebuilds before trusting a FAIL.
12. (2026-10-06) A re-dispatched decision is often already done: `git log --grep`, the
    `tmp/check-*` screenshots and a recheck on the current build first.
13. (2026-10-06) Focus follows the pick: find box -> node Summary values (`focusNodeValuesNext()`),
    Style picks -> the new line (`focusLineNext()`, e82708488). New doors that pick do the same.
    No two reachable controls share a name; icons get the themed Mantine tooltip.
14. (2026-10-06) Use compact-mantine defaults; fix the shared component (focus ring 28bcb71a0,
    empty ComboInput arrow b7bc18953, Modal overlay 557713b81). Dialog kind choices are `Tabs`.
15. (2026-10-06) One group number everywhere: size rank via `partitionGroupRanks()`; the legend
    shows only what the drawing shows (`keyBlocks()`); exported images carry the legend.

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

- (2026-10-06) Round 1 closed (Design Director, `rounds/round-1/decisions.md`). Twelve changes
  for round 2; I built 1-10 (runner, screen-reader mode, Neighborhood route, Summary cleanup,
  dead-end clicks, empty combo arrow, planar refusal line, wheel zoom, focus ring, focus after
  pick). Not built: run named by method (change 11, app words only, no public API). Rejected: a
  Degree-row cue (two changes at once hides which helped), a refusal code (app knows the method),
  filling the Size list (second bind route), a Style-tab signpost (one model's guess). Deferred:
  "show all labels" until wheel zoom is measured; legend overlay and hover tooltip, trace first.
  Pilot of every task on e82708488: all end states reached, no console error.

- (2026-10-06) Focus after a Style pick (commit e82708488): a "+" pick, a single "+", a
  "by attribute" bind and a label attribute pick move focus to the first control of the line
  they made (`[data-line]`, waiting for `[data-bound]` after a bind). The "+" Menu has
  `returnFocus={false}` so Mantine's 10 ms return to "+" cannot win the race; Esc still returns.
  A failed write withdraws the ask. Rejected: per-component state (lost on the tab's remount;
  the first test run failed exactly so), returning focus to the trigger (gone). Proof: the "focus
  after a pick" test in `StyleTab.real-element.test.tsx` fails with the hand-off disabled;
  `tmp/check-r1-focus-after-pick/a/` (04 Tooltip, 06 Outline, 10 Label position) and `c/05.png`
  (edge Width bound to weight, focus on its pill).

- (2026-10-06) Study runner. Round 1's "failed 40m00s" sessions were runner timeouts: an agent's
  40-minute clock ran while `real.mjs --start` waited 17 to 50 minutes for one of the 4 browser
  slots, and two stopped agents kept their slots because their session process outlived them.
  Fixes: (a) `real.mjs` closes a session nobody steps for 15 minutes (was 45), counted from the
  end of the last request -- before, the timer ran during a request, so a short limit killed a
  slow start mid-request (found while proving it with REAL_IDLE_SECONDS=20); `--prove` checks an
  abandoned session closes itself (commit 7d40cfe59). (b) The rounds workflow script (outside the
  repo, in the session's workflows folder) from round 2 on runs at most 3 session agents at once
  (the 4th slot is for graders' repros), runs `--end` after every attempt, and asks ease as
  "1 (very difficult) to 7 (very easy)" -- every round 1 transcript was asked it reversed, so
  round 1 ease must be read as 8 minus the answer. Round 1's code path is untouched so a resume
  replays its cached sessions. `with-browser.sh` needed no change: flock frees a slot when its
  holder dies; the holder simply lived on.

- (2026-10-06) Keyboard focus ring for plain controls (commit 28bcb71a0): compact-mantine's
  foundation CSS rings any `.mantine-focus-never` control with no `cm-` class on `:focus-visible`
  (1px `--cm-border-selected`, offset 1px; `:where()` keeps it at Mantine's specificity so any
  later rule wins). Controls with a `cm-` class keep their own ring. Gate: the UnstyledButton row
  in `compact-mantine/tests/theme/focus-ring.browser.test.tsx` (fails without the rule). Proven on
  the app: Tab rings the start page's sample entries (`tmp/check-r1-focus-ring/02.png`, `03.png`).
  App code never adds its own focus ring; a missing ring is a compact-mantine fix.

- 2026-10-06 -- "No crossings" on a non-planar graph: graphty-element's `layout.set` ALREADY
  rejects (`E_INTERNAL`, "could not be initialised: G is not planar."), and the previous layout
  keeps drawing; pinned by `graphty-element/test/browser/planar-refusal.test.ts` (K6). The silent
  commit was the app: `LayoutGroup.tsx` sent the refusal to the store's notice slot, which never
  reached the reader under the Layout popover. Now the Method select shows Mantine's `error` line,
  "<method> could not lay out this graph, so the drawing is unchanged", naming the picked method
  (`methodName()` in `layout/methods.ts`) until the layout changes. No new element API or code.
  Proven on Les Miserables (`tmp/check-r1-planar-refusal/06.png`, cleared at 08.png after Circle)
  and by `LayoutRefusal.real-element.test.tsx`. Lesson: test the element first; a "silent" refusal
  can be an app message drawn where nobody looks.

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
- 2026-10-03 to 10-05 -- Ten element API items for tier 1 (owner, after adversarial review);
  graphty-element neutral about presentation. Tier 1 screen PRs folded into one (#942). The
  group-row color fallback in `graph-place/rows.ts` stays until #1099 removes it.
- 2026-10-06 -- Study tooling element APIs: `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`. Held PRs awaiting the owner's name confirmation; merged into
  the studio worktree so the study tool can use them. Studio proposed; owner to confirm. The
  seeded default layout merged with them (issue #801) is withdrawn; see the next entry.
- 2026-10-06 -- No default layout seed in graphty-element; the app passes its own (owner). The
  element's seed default is undone and recorded in `owner-decisions.md` so held #801 does not land.
  App: seed on the tag (not `session.layout.set` at open, an undo step) and on Method picks.
  Evidence: `LayoutSeed.real-element.test.tsx`; `tmp/check-r0-seed-out-of-element/a/` (02 and 04
  byte-identical across a reopen).
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

- 2026-10-06 -- Smaller fixes, all proven (details in the commits and `tmp/check-r0-*`):
  a GraphML/GEXF file cut short is refused whole (`E_PARSE_FAILED`, `importDocument`); camera
  keys ignore modifier chords and clear on blur (`cameras/InputUtils.ts`); the themed Modal
  always has an overlay (compact-mantine); a failed open returns to the start screen with a
  notice that stays (`start/open.ts`); exported images carry the legend (c77e473ab, public
  `ScreenshotOptions.legend`, owner to confirm); a load draws every node its edges name
  (92882d5fd, `session/project/ingest.ts`); chrome tooltips (f60a81711); `keyBlocks()` keeps the
  legend and Style lines truthful (377c526e1); one Everything row (1889d513a); exports write a
  group as its size rank (a file-format change in `owner-decisions.md`).

## Tried: worked / did not work

- **(2026-10-06) Screen-reader mode in `real.mjs`.** Accessible name from CDP
  `Accessibility.getPartialAXTree` on the deep `activeElement` (Chromium's own computation; no
  hand-rolled name logic); live regions through an init-script MutationObserver, so a message
  that comes and goes inside one step is still caught. First run on Florentine already found
  `focus: Canvas (no name)` after a file opens (the graph canvas takes focus with no accessible
  name) and a polite status that says "No nodes to draw" then "Reading florentine" on open.
  Evidence: `tmp/check-r1-sr-mode/s1/`, `--prove` session-d. Another agent's `--prove` run deletes
  `tmp/prove/` under a running one: a FAIL with ENOENT there is that, not a defect.

- **(2026-10-06) Mouse wheel zooms the 3D orbit camera: worked** (d9e5cc8dc). A canvas `wheel`
  listener in `OrbitInputController` (passive: false, added/removed in enable/disable), not a
  scene POINTERWHEEL observer. One notch (deltaY 100, clamped) = cameraDistance *
  keyboardZoomSpeed / 2 (10%); a fixed 0.2-unit step is invisible at 300 units. No new option or
  public API. Proof: `input-speed.test.ts` wheel test fails without it; `tmp/check-r1-wheel-zoom/`.
- **(2026-10-06) Open: the live Selection row is blank after the neighbor route.** On the running
  app (`tmp/check-r1-summary-cleanup/06-08.png`): Valjean, Degree, then the Selection row (37)
  shows the header and no body, even after 5 s and an Everything/Selection round trip. The same
  component in a headless test renders. Suspect `useAsyncValue` reset by a steady stream of
  session events (it sets undefined on every version bump) or a refused `statistics()` read in
  the live element; not yet traced. Escape from the neighbor list now returns to the single node,
  so the Selection row is the only way to the several-node Summary from the neighbor route.

- **(2026-10-06) Worked, small:** summary rows that say nothing (b11881bb2), the empty
  ComboInput arrow (b7bc18953, compact-mantine), undirected arrowheads, dead-end clicks (cae3dca4d). The Selection row renders `SeveralValues`;
  a Sources table click opens the dock via the one-shot store request `tableOn`. Tests fail on old;
  `tmp/check-r1-dead-end-clicks/s1/`.
- **(2026-10-06) A "missing route" was a routing bug: worked.** The Neighborhood command never set `inspected: neighborhood`; routing it through `openNeighborhood` fixed it (8f4891b7c). Lesson: before designing a new affordance for a hard task, check whether an existing door reaches the wrong screen.

- 2026-10-06 -- Analyze keyboard pick as the ARIA combobox pattern (focus stays in the filter,
  `aria-activedescendant`, first match active): worked; `tmp/check-r0-analyze-keyboard-pick/`.
  The `AnalyzeFiltered` story's baseline changed (owner review).
- (2026-10-06) **Testing lessons.** Prove a test fails on old code by copying `git show
  HEAD:<path>` over the file and back (no stash or checkout); run a new app test against the old
  build too. Probe focus with a `--type` step before blaming the app for a dead key. Hover a name
  span (`"Edges per node#2"`), not its stat group. Real-element popover tests need
  `page.viewport(1366, 768)` and must wait for `aria-disabled` to clear. "0 labels" was the camera
  spin keeping the view unsettled: look for motion first. Check `git diff HEAD` per file right
  before staging. Never call an unexplained failure a flake. Two agents' `--prove` runs clobber
  each other's `tmp/prove/` and a rebuild empties `dist`: check `pgrep -af "real.mjs --prove"`
  and rerun before trusting a FAIL.

- (2026-10-06) **Layout and load checks (folded from Top of mind).** Check a layout against a
  reference before a study offers it (Spectral was wrong until matched against numpy). A load the
  counts say worked can still draw nothing (store and render half fed separately in `ingest.ts`):
  assert on `element.graph.getNodes()` too.

## Thinking

- **Element English in descriptors (2026-10-06).** `channels.ts` plainName still says "Node
  Colour" and Layer.ts validation messages build sentences from it. If one reaches the screen
  again, the fix is the element returning codes, not an app rename. Also: root prettier reflows a
  line in `graphty-element/test/session/styles/encoding.test.ts`; format only my own hunks there.

- **Project name after "New from data..." (2026-10-06).** After Load the header still read
  "Untitled", though `DataPage.tsx` load renames a new graph after its file. Seen in
  `tmp/check-r0-new-from-data-empty-canvas/04.png`; not looked into yet.

- **Other refusal codes on open.** `notReadSentence` writes its own words only for
  `E_PARSE_FAILED`; any other code still shows the element's English message. If the study meets
  another refusal on open (E_UNKNOWN_FORMAT, E_EMPTY_LOAD), map it there, reusing the Data page's
  `refusalFor` words where they fit the start screen (its "File settings" advice does not).

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.
- **Run landing above a reader's layer.** Today a suggested style is suppressed by a reader-set
  "Everything" color, with a notice. If the study shows first-time users never see their run, the
  remedy is a design decision for the owner, not a quiet code change.
- **The image key's look (2026-10-06).** A fixed light card top left that can cover nodes; a
  fix is a placement option or camera fit (owner API questions), not app styling.
- **What a study can and cannot observe.** The tool drives a headless browser and asserts on
  element reads; it cannot judge color legibility or motion. Visual claims need a screenshot and a
  human-readable check, and the image model only transcribes; its yes/no answers are not evidence.

- **Public API report (2026-10-06).** Any element change that adds a public member needs
  `npm run api:report` in the same commit and a line in `owner-decisions.md`.
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
