# Landing the studio branch on master: the pull request plan

The local branch `design/studio-tier1` holds everything the design studio built: the fixes from
three study rounds, the 54 fixes from the 2026-10-06 iPad interface review (branch
`fix/ipad-review-2026-10-06`), the fixes made after round 3, the tier 2 features, and the studio's
documents and study tool. At the time of writing it is 190 commits (184 without merges) ahead of
`origin/master` at `a2d5bdbd6`, its tip is `afed56e8d`, and master has 142 commits it does not.

This plan splits that work into 39 pull requests, says what each one carries, what it needs first
and how to build it, and assigns every commit to a pull request (the table at the end). It
follows section 6, item 1 of `design/ui/studio/report.md` and its order, with the changes the
facts below forced.

## What changed since the report was written

- `elementAt` (#1267) has merged, and so have the three other element branches the studio build
  merged in (#1264, #1271, #1276). Nothing of theirs is left to land. Their files still show in
  a plain diff against the old merge base (`graphty-element/docs/guide/element-at.md`,
  `NodeBehavior.ts`, the elementAt test and doc lines); master already has them.
- `fix/ipad-review-2026-10-06` was never pushed and has no pull request. It holds the 54 interface
  fixes on top of 17 round 1 study commits, and those 54 change graphty-element's public API in
  seven places (`downloadGraph`, `browserProjects`, export variants and the `graphty` format, the
  `force-2d` fold and `arrangedDimension`, `groupBy`, `runs.move`, XR availability) with no entry
  in `owner-decisions.md`. Under the one-pull-request-per-public-API rule they cannot land as one
  pull request, so the interface fixes are split like the rest: their element changes in the
  interface group below, their compact-mantine changes in the one compact-mantine pull request,
  and their app changes, together with the round 1 app fixes they sit on, as one app pull request.
- Master gained work that overlaps the studio's:
  - #1376 worded export losses in the app (`graphty/src/workspace/export/lossWords.ts`, commit
    `61ec94f84`), the same job as the studio's `eef118341`
  - #1409 gave style explain refusals coded facts (`predicate.ts`), beside the studio's selector
    reason codes
  - #1428 changed `layout/src/indexed/spectral.ts`, which the Spectral fix rewrites
  - open #1480 themes the bare `Input.Wrapper` label and dimmed text, beside the studio's
    `aaf5ef737` (wrapper description) and `3680c6698` (gray helper text)

  Each overlap is named again under the pull request it affects.
- `design/ui/studio/r` is an empty file committed by accident. It is left out.
- At the time of writing, another agent has uncommitted edits in the studio worktree: the
  `E_BAD_SELECTOR` documentation, the `AttributeLeafNodes` doc comment moved back out of the
  `RuleTree` comment it broke, and the regenerated API reports. Once committed, they belong to
  the selector reason codes and edge filter pull requests (28 and 29).

## How every pull request is built

These rules apply to every pull request below. A pull request's own section adds only what is
particular to it.

1. **A fresh branch from master.** `./tools/worktree-new.sh <branch>` from the main checkout. It
   runs `git worktree add -b <branch> .worktrees/<name> origin/master`, links `.env` (without it
   the pre-push SonarQube step skips silently) and installs. Never check out, switch, stash,
   reset or rebase in an existing tree.
2. **Dependencies are merged in, never based on.** Every pull request targets master. One whose
   changes need another pull request's changes to build first runs
   `git merge --no-edit origin/<dependency branch>` for each dependency, then adds its own
   changes. The shared commits are the same commits, so they drop out of its diff the moment the
   dependency lands. It keeps the `hold` label until every dependency has merged; then it is
   brought up to date with `gh api -X PUT repos/graphty-org/graphty-monorepo/pulls/<n>/update-branch`.
   If a dependency changes in review, merge its branch in again (never force-push). Never base a
   pull request on another pull request's branch: auto-merge there is unprotected.
3. **Element and other package pull requests carry commits.** For each commit listed, in the
   order listed: `git -C /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1
   diff --binary <c>^ <c> -- <paths> | git apply --3way`, where `<paths>` is the pull request's
   paths (for an element pull request `graphty-element/` with
   `':!graphty-element/api' ':!graphty-element/jsx.ts'`, plus anything named in its section).
   Commit with the original message (`git commit -C <c>`); when only part of a commit is carried,
   write a message that describes only that part and commit with `-F <file>`.
4. **App, compact-mantine and docs pull requests carry a slice of files.** `git -C <studio tree>
   diff --binary <from> <to> -- <paths> | git apply --3way`, committed as one commit (or a few,
   by path group) with a message that lists what the slice does.
5. **Conflicts.** Master has moved under every change. When a hunk conflicts, the file as it
   stands at `afed56e8d` on `design/studio-tier1` is the reference for what the studio meant,
   and master's newer lines are kept. The merge commits `34f1063de` (interface fixes into the
   studio build) and `f90a405d8` (master into the studio build) hold the resolutions already
   made once; `git show <merge> -- <file>` shows them. Carry only this pull request's change:
   a hunk that exists only because of another pull request goes to that one.
6. **Generated files are regenerated, never carried.** After the source changes build
   (`pnpm exec nx run graphty-element:build`), run `npm run api:report` in `graphty-element/`
   and commit the API reports (`graphty-element/api/*.api.md`) and `graphty-element/jsx.ts` as
   one `chore(graphty-element): record ... in the API report` commit.
7. **Checks before pushing.** Lint, build and the tests of every touched package, as CI runs
   them. Each fix already carries a test that fails without it; keep it with its fix. Never
   raise a timeout, add a retry or skip a test to get green.
8. **Committing and pushing.** Plain signed `git commit`, with every hook from that worktree's
   `.husky/_` except `prepare-commit-msg` copied to a fresh temp dir passed as
   `-c core.hooksPath=<dir>`; never `--no-verify`, `HUSKY=0` or a null hooks path; no
   Co-Authored-By, Claude-Session or "Generated with" lines. Push only through
   `/home/apowers/Projects/graphty-monorepo/tmp/push-queue.sh`.
9. **Labels.** A pull request marked "public API: yes" below gets `hold` and `needs-decision`,
   its body quotes its entry from `design/ui/studio/owner-decisions.md` (what, why,
   alternatives, owner questions), and it stays held until the owner says yes. Where no entry
   exists yet (named below), write it in `owner-decisions.md` in the studio worktree first,
   committing only that file. A pull request with an unmerged dependency gets `hold` until the
   dependency merges. No priority labels; no `gh pr merge` (Mergify merges what is not held).
10. **Screenshots.** Every pull request that moves a picture in a Storybook (graphty-element,
    compact-mantine, graphty, layout) needs the owner's approval in the visual review before it
    merges. After each push of such a pull request, run `./tools/visual-preview.sh <pr>` from the
    main checkout in the background. Never accept a snapshot or touch `visual-baselines/`.
11. **Drafts, then ready.** Open each pull request as a draft (`gh pr create --draft`) while it
    is built; mark it ready (`gh pr ready <n>`) once its checks pass locally. Never push to a
    pull request labeled `queued`. Read pull request status from
    `<main checkout>/tmp/pr-status/status.json`, not from per-pull-request API calls.
12. **API report.** A pull request that changes `graphty-element/api/*.api.md` says in its
    description which entry points changed, what was added, changed or removed, and whether it
    is breaking.

## The order

| # | Pull request | Branch | Public API | Needs first |
|---|---|---|---|---|
| | **Interface fixes: graphty-element** | | | |
| 1 | Interface-review element fixes with no API change | `fix/element-interface-review` | no | -- |
| 2 | Export variants and the Graphty JSON format in the format catalog | `feat/element-export-variants` | yes | -- |
| 3 | `downloadGraph`, and downloads that outlive the click | `feat/element-download-graph` | yes | 2 |
| 4 | `browserProjects`: projects kept in the browser | `feat/element-browser-projects` | yes | -- |
| 5 | `force-2d` folded into `force`; `layout.arrangedDimension` | `feat/element-force-fold` | yes | -- |
| 6 | `groupBy` on the shell, layers and bipartite layouts | `feat/element-layout-group-by` | yes | -- |
| 7 | Estimate and plan a layout choice | `feat/element-layout-estimate` | no | 6 |
| 8 | `runs.move` and the `algo.move` history code | `feat/element-runs-move` | yes | -- |
| 9 | XR availability as a capability; XR on by default | `feat/element-xr-availability` | yes | -- |
| | **Study fixes: graphty-element, no API change** | | | |
| 10 | Study element fixes with no API change | `fix/element-study-fixes` | no | -- |
| | **Study fixes: graphty-element public API, one each** | | | |
| 11 | `captureScreenshot({ legend })` | `feat/element-capture-legend` | yes | -- |
| 12 | Undirected graphs draw no arrowheads; `DataManager.directed` | `fix/element-undirected-no-arrowheads` | yes | -- |
| 13 | Exported partition groups numbered by size rank | `fix/element-export-group-rank` | yes | -- |
| 14 | A GraphML or GEXF file cut short is refused | `fix/element-refuse-truncated-xml` | yes | -- |
| 15 | `catalog.optionsFor` lists the columns a grouping layout can use | `feat/element-grouping-values` | yes | 6 |
| 16 | The element's `aria-label` names its canvas | `fix/element-canvas-aria-label` | yes | -- |
| 17 | 2D `zoom` unit documented; 2D Fit frames the whole graph | `fix/element-2d-zoom-unit` | yes | -- |
| 18 | Focusing the element focuses its drawing (`delegatesFocus`) | `fix/element-delegates-focus` | yes | 16 |
| 19 | `captureScreenshot({ showSelection })` | `feat/element-capture-show-selection` | yes | -- |
| 20 | Layout and run refusals as codes (`CostEstimate.refusal`) | `feat/element-refusal-codes` | yes | 7 |
| 21 | Fit to graph can keep the current angle (`keepAngle`) | `feat/element-fit-keep-angle` | yes | 17 |
| 22 | `viewInsets`: margins every fit keeps clear | `feat/element-view-insets` | yes | 11, 21 |
| 23 | `layoutBehavior.node.depthIndependentSize` | `feat/element-depth-independent-size` | yes | -- |
| | **compact-mantine** | | | |
| 24 | compact-mantine fixes from the interface review and the study | `fix/compact-mantine-studio-fixes` | no | -- |
| | **graphty app** | | | |
| 25 | App: the interface-review fixes and the round 1 study fixes | `fix/graphty-interface-review` | no | 1-11, 24 |
| 26 | App: the round 2 and round 3 study fixes | `fix/graphty-study-rounds-2-3` | no | 25, 15, 16 |
| 27 | App: the fixes made after round 3 | `fix/graphty-study-next-steps` | no | 26, 18-23 |
| | **Tier 2 features: graphty-element** | | | |
| 28 | Selector refusals carry a reason code | `feat/element-selector-reason-codes` | yes | -- |
| 29 | A filter on an edge attribute keeps the passing edges (`nodes`) | `feat/element-edge-attribute-filter` | yes | -- |
| 30 | Every load kept as a source: `data.sources()` | `feat/element-data-sources` | yes | -- |
| 31 | Each source keeps the edge rows it left out | `feat/element-source-left-out` | yes | 30 |
| 32 | Filter steps with per-step counts | `feat/element-filter-steps` | yes | -- |
| 33 | A weight's meaning chosen at load; `loadedWeight()` | `feat/element-weight-meaning-at-load` | yes | 30 |
| 34 | Every run reads the loaded weight (breaking for PageRank) | `feat/element-runs-read-loaded-weight` | yes | 33 |
| 35 | A run goes out of date when its data changes (`StaleNote.reason`) | `feat/element-stale-reason` | yes | -- |
| 36 | Pick edges on the canvas and draw selected edges | `feat/element-edge-picking` | yes | -- |
| | **Tier 2 features: graphty app** | | | |
| 37 | App: the tier 2 features and their fixes | `feat/graphty-tier2-features` | no | 27, 28-36 |
| | **The studio's documents and tool** | | | |
| 38 | The design studio: report, decisions, notes, plans and study tool | `docs/design-studio` | no | -- |
| 39 | The design studio's session records | `docs/design-studio-session-records` | no | -- |

Two departures from the report's order, both forced by dependencies. The interface fixes' app
changes (25) land after the element and compact-mantine pull requests they use, as the report's
own rule for app pull requests says. And the app is split into four slices by time instead of
six by path: 78 of the 203 app files carry edits from both the interface review and the study,
so a split by path would mean hand-splitting hunks inside the same files, while a slice by time
applies as a clean patch. Inside each app pull request, the description groups the changes by
path (keyboard and focus; export dialog; neighbors and selection; labels and Size; run names and
announcements; legend words).

## Each pull request

### 1. Interface-review element fixes with no API change

- Commits: `94b3fc0ce` (option flags so key forms show the right fields), `938d27d82` (a visible
  default glow), the graphty-element part of `edd05a030` (outline and glow colors stated by the
  channels), `e85d74633` (matte 3D lighting), `48d11d0cc` without its
  `test/catalog/export-variants.test.ts` hunk (the first import is the project's baseline), the
  graphty-element part of `a9b59c94a` (the `layout` property takes a catalog id).
- The glow defaults change published channel defaults and the baseline changes when
  `project.dirty` turns on; neither changes a type. Say so in the description.
- Moves pictures (lighting, glow): visual review.

### 2. Export variants and the Graphty JSON format

- Commits: `555c851e1`, the graphty-element part of `95f1ddb1e` (`src/catalog/formats.ts`),
  `2143deaae` (the CSV adjacency table without the header row default), and the
  `test/catalog/export-variants.test.ts` hunk of `48d11d0cc`.
- New `owner-decisions.md` entry needed: `FormatDescriptor.exportVariants`, the export-only
  `graphty` format, writer enum labels, which writer options are advanced.
- Master's #1376 (export loss codes) changed `src/data/export.ts`; keep its coded losses.

### 3. `downloadGraph`

- Commit: `f88efbbd4`. Needs 2 (it writes the `graphty` format).
- New `owner-decisions.md` entry needed: `element.downloadGraph(format, options)` and the
  download helper that revokes object URLs 40 seconds later.

### 4. `browserProjects`

- Commit: `effb80326`.
- New `owner-decisions.md` entry needed: `browserProjects` on `./session`, its IndexedDB
  database and store names (a stored format), its error codes.

### 5. `force-2d` folded into `force`

- Commits: `4cc3d820c` (also carries `design/extensions/layout.d.ts`), `2ea682c51` (its d3 `dim`
  test).
- New `owner-decisions.md` entry needed: `force-2d` leaves `catalog.layouts()` and stays a
  deprecated alias until the next major; the 2D view wins over an explicit `dim`;
  `session.layout.arrangedDimension`.

### 6. `groupBy` on three layouts

- Commit: `e0fdce5f0`.
- New `owner-decisions.md` entry needed: the published `groupBy` option of `shell`, `layers` and
  `bipartite`, and the bipartite refusal of anything but two groups.

### 7. Estimate and plan a layout choice

- Commit: `2df752ff4`. Needs 6 (it checks a grouping and, for bipartite, two groups).
- No type changes: `estimate` and `plan` now answer `layout.set`.

### 8. `runs.move`

- Commit: `0a0a7ebf1`. The `"algo.move"` member of `HistoryCode` was added while merging master
  in; take it from the studio tree (`src/session/history` or wherever `HistoryCode` lives at
  `afed56e8d`).
- Existing entry: "A history code for moving a run's layers: `algo.move`". New entry needed for
  `session.runs.move(id, before)` itself.

### 9. XR availability; XR on by default

- Commits: `67960c8ee`, `dba64036d` (Babylon's default enter button off the canvas; it relies on
  the opt-in `xr.ui.enabled` of `67960c8ee`).
- New `owner-decisions.md` entry needed: the `xr` member of `session.capabilities` and its
  events, `XrUnavailableReason`, XR on by default, refused entry reported as `graph-error`.

### 10. Study element fixes with no API change

- Commits: `7006b45a2` (camera keys stop sticking), `92882d5fd` (nodes named only by edges are
  drawn), `4dcee7c73` (Spectral by the smallest Laplacian eigenvectors; also carries `layout/`),
  `d9e5cc8dc` (wheel zoom on the 3D orbit camera), the graphty-element part of `377c526e1`
  (`EncodingSpec`), the graphty-element part of `b98e99a5b`, the graphty-element part of
  `269053df0` (the planar refusal test), the graphty-element part of `895e5fab3`, `6783ba895`
  (a capture larger than the canvas drawn at its own size), `b6011c01d` (the force defaults
  ngraph actually runs; also `stories/Layout.stories.ts`).
- `b98e99a5b` and `895e5fab3` were undone in the element when master was merged in: the seed
  default is master's `null` again, and the legend returns master's `legend.painted-over` fact.
  Carry only what still differs from master at `afed56e8d` (the layouts guide lines and
  `test/browser/legend-covered-layer.test.ts`, if it tests master's fact); if nothing differs,
  carry nothing and say so in the description.
- `layout/src/indexed/spectral.ts` conflicts with master's #1428 typings fix; keep both. The
  layout package gets a release from this pull request.
- Moves pictures (Spectral, force): visual review.

### 11. `captureScreenshot({ legend })`

- Commit: the graphty-element part of `c77e473ab` (`ScreenshotLegendSection`, `drawLegend.ts`).
- Existing entry: "`captureScreenshot({ legend })`: a key drawn into the exported image".

### 12. Undirected graphs draw no arrowheads

- Commits: `bee8d9c10`, plus `ae2af73e9` and `a937a4ad0`, which only record
  `DataManager.directed` in the API report (regenerate instead of carrying them).
- Existing entry: "An undirected graph draws its edges without arrowheads". Master's #1468
  (direction locked by config, `GraphStore.ts`) and #1470 (arrow color undo,
  `UpdateManager.ts`) touch the same path; keep both. Moves pictures: visual review.

### 13. Exported partition groups by size rank

- Commit: `9d6598eea`. Existing entry: "An export writes a partition's group as its rank".

### 14. A GraphML or GEXF file cut short is refused

- Commit: `0e6159fac`, plus the reconciliation with master's #1218 made while merging master in,
  which has no commit of its own: `docs/guide/load-preview.md`, `src/data/report.ts`,
  `src/session/project/draft.ts` and `test/session/load-errors.test.ts` as they stand at
  `afed56e8d`.
- Existing entry: "A GraphML or GEXF file that breaks off is refused, not loaded in part".

### 15. `catalog.optionsFor` lists grouping columns

- Commit: the graphty-element part of `8ca7596fb`. Needs 6.
- Existing entry: "`catalog.optionsFor` lists the columns a grouping layout can group by".

### 16. `aria-label` names the canvas

- Commit: the graphty-element part of `416876eea` (regenerate `jsx.ts`).
- Existing entry: "The element's `aria-label` names its canvas".

### 17. The 2D zoom unit and 2D Fit

- Commit: `d088c2341` (also `stories/CameraControls.stories.ts`, `stories/story-roster.json`,
  `docs/guide/extending/custom-cameras.md`).
- Existing entry: "A 2D camera's `zoom` is documented as relative to a half-width of 5 units".
  Visual review (new camera story).

### 18. `delegatesFocus`

- Commit: `e63ee191b`. Needs 16 (it extends `test/browser/element-canvas-a11y.test.ts`).
- Existing entry: "Focusing the element focuses its drawing (`delegatesFocus`)".

### 19. `captureScreenshot({ showSelection })`

- Commit: the graphty-element part of `4c087d8bc` (with `UpdateManager.meshesShownOrHidden()`).
- Existing entry: "A capture can leave the selection highlight out: `showSelection`".

### 20. Refusals as codes

- Commit: the graphty-element part of `481c6715a`. Needs 7 (layout refusals come from the layout
  estimate).
- Existing entry: "Why something cannot run, as a code: `CostEstimate.refusal`".

### 21. `keepAngle`

- Commits: the graphty-element part of `6f1cf692b`, the graphty-element part of `2538731dc`.
  Needs 17 (both edit `fitToGraph` in `src/camera/builtins.ts`).
- Existing entry: "'Fit to graph' can keep the current angle: `keepAngle`".

### 22. `viewInsets`

- Commits: the graphty-element part of `fa260f20d`, `ebb2cfcba` (restores the camera views that
  commit left unbuildable). Needs 11 (the exported key reserves its box) and 21 (same
  function). Regenerate `jsx.ts`.
- Existing entry: "Margins a fit keeps clear: `viewInsets`".

### 23. `depthIndependentSize`

- Commit: the graphty-element part of `ec66a2991`.
- Existing entry: "Node size that ignores depth: `layoutBehavior.node.depthIndependentSize`".

### 24. compact-mantine fixes

- A slice: `diff 8ec8a6925 afed56e8d -- compact-mantine/`. Commits by subject are in the table at
  the end; the main ones: touch-and-hold context menus and touch-dragged tree rows, submenus that
  open on tap, `CompactColorInput` swatches and `onChangeEnd`, the modal footer, the drag
  selection shield and touch targets, `MenuItemDescription`, the empty-list arrow, the default
  focus ring, menu-to-dialog focus, the trailing glyph, `EllipsizedName` and the long stat value,
  gray helper text at 4.5:1, tree focus after a delete, the search field's joined control, the
  pinned text and checkbox in tree rows, and the bare `Input.Wrapper` description.
- Known conflicts: `src/components/rows/DataRow.tsx` and `tests/figma/overlays.browser.test.tsx`.
- Open #1480 themes the same `Input.Wrapper` entry and dimmed text. If it lands first, keep its
  version and carry only what `aaf5ef737` and `3680c6698` add beyond it; if this lands first, say
  so on #1480.
- New exports (`MenuItemDescription`, two `CompactColorInput` props): say so in the description.
  Visual review.

### 25. App: the interface-review fixes and the round 1 study fixes

- A slice: `diff 0196d4621 a937a4ad0 -- graphty/`, the app half of `fix/ipad-review-2026-10-06`.
- Needs 1-11 and 24. (It needs 12-14 to show the studio's pictures but not to build.)
- Known conflicts with master: `components/shell/panel/DataPanel.tsx`,
  `components/shell/panel/__tests__/StyleLayerList.test.tsx`, `workspace/canvas/LegendCard.tsx`,
  `workspace/canvas/legendWords.ts` and its test, `workspace/export/DataOutput.tsx`,
  `workspace/style/row.ts`.

### 26. App: the round 2 and round 3 study fixes

- A slice: `diff a937a4ad0 1d79cba40 -- graphty/` (the studio's side of the interface merge,
  with that merge's resolutions).
- Needs 25, 15 (groupings from runs), 16 (the host's `aria-label`).

### 27. App: the fixes made after round 3

- A slice: `diff f90a405d8 376fdc76c -- graphty/`: export pictures without the selection, from the
  current angle, with the key clear of nodes; refusal words; sizes that read the same at any
  depth; focus places when a control goes away; Export Data warnings worded from loss codes; the
  table a single-table source produced.
- Needs 26 and 18-23.
- `eef118341` duplicates master's #1376 (`lossWords.ts`, `DataOutput.tsx`): keep master's words
  and carry only what the studio adds.

### 28. Selector reason codes

- Commit: `3d89d43c3`, plus the uncommitted `E_BAD_SELECTOR` documentation once it is committed.
- Existing entry: "Why a selector was refused, as a code". A refused `member` selector's details
  move from `details.reason` to `details.scope`: call that out. Master's #1409 coded explain
  refusals in the same `predicate.ts`; keep both.

### 29. Edge attribute filter

- Commit: `559f5dcb2`, plus the uncommitted `AttributeLeafNodes` doc comment fix.
- Existing entry: "A filter on an edge attribute narrows the edges".

### 30. `data.sources()`

- Commit: `f141b1283`. Existing entry: "Every load is kept as a source". It adds `sources` to the
  saved project file.

### 31. `LoadedSource.leftOut`

- Commit: `0c12c233b`. Needs 30. Existing entry: "Each load keeps the edge rows it left out".

### 32. Filter steps

- Commit: `8966b0888`, without `test/session/loaded-weight.test.ts` and without the
  `src/config/DataConfig.ts` weight-meaning lines, which belong to 33.
- Existing entry: "Filter steps: `visibility.steps` and `visibility.setSteps()`". It adds `steps`
  to the saved project file.

### 33. Weight meaning at load

- Commit: `89a2977df`, plus `test/session/loaded-weight.test.ts` and the `DataConfig.ts`
  weight-meaning lines from `8966b0888`. Needs 30 (both edit `src/session/draft.ts`).
- Existing entry: "A weight's meaning chosen at load".

### 34. Every run reads the loaded weight

- Commits: `337e98044`, `0e2379250` (`plan()` states the weight a run would read). Needs 33.
- Existing entry: "Every run reads the loaded weight". Breaking for PageRank (its default
  changes from unweighted to the loaded weight and its option moves), so a `!` commit would make
  graphty-element's next release a major. Do not add the `!` on your own: the owner decides
  whether it ships in a major, and which other breaking changes for graphty-element ride with it
  (open #1370, #702 and #676 carry `!`; #843 is a breaking weight rule in algorithms). The
  description lists them, as the repository's "Breaking changes and major releases" rule asks.

### 35. `StaleNote.reason`

- Commit: `ce34f31f3`. Existing entry: "A run goes out of date when its data changes". It adds
  `scope.data` to saved run records. `RunsApi.ts` and `runs/types.ts` conflict additively with
  8 and 34; keep both.

### 36. Edge picking

- Commits: `5a2b3b605`, `288624ad1` (the selected edge drawn in the selection color; also
  `stories/SelectionHighlight.stories.ts`), the graphty-element part of `c74a85615` (Frame
  selection frames a selected edge's ends).
- New `owner-decisions.md` entry needed: `elementAt` now returns edges (its documented type
  already allowed them), and a click selects an edge. Open #1370 (line width in world units)
  touches edge drawing. Visual review.

### 37. App: the tier 2 features and their fixes

- A slice: `diff 376fdc76c afed56e8d -- graphty/`: filter steps in the Data place, the inspector
  and the header; a Notes place; one Path popover; Sources listing every load with its left-out
  rows; Hops, Follow and Filter to neighbors; Replace with file and out-of-date runs; weight
  words at load and per run; an edge clicked on the canvas opens in the inspector; Find hints
  and column names; the history words for filter steps; and the fixes from the tier 2 pilots.
- Needs 27 and 28-36.

### 38. The design studio's documents and tool

- A slice: `design/ui/studio/` at `afed56e8d`, without `rounds/`, `tier2/pilot/` and the empty
  file `r`: the report, criteria, tasks, answers, roster, personas, notes, digests,
  `owner-decisions.md` (with the entries the pull requests above add), the next-steps documents
  including this plan, the tier 2 study materials, and the study tool (`tool/`).
- Commit messages: `docs(workspace)` and `fix(design-studio-tool)` as on the branch.

### 39. The design studio's session records

- A slice: `design/ui/studio/rounds/` and `design/ui/studio/tier2/pilot/` at `afed56e8d`: about
  7,200 small files (transcripts, grades, screenshots), 4.9 MB. Kept apart from 38 because
  GitHub shows at most 3,000 files of a pull request, so with the records in it the documents
  could not be reviewed.

## Every commit and where it goes

Each of the 184 commits is listed once, in branch order, with the pull request each of its
paths goes to. A commit split across several pull requests lists each. APP-IF is 25, APP-R23 is
26, APP-NS is 27, APP-T2 is 37, CM is 24, E-IF is 1, E-STUDY is 10, E-layout-estimate is 7,
DOCS-studio is 38, DOCS-records is 39; an API or T2 name is the pull request of that name above.

| Commit | Subject | Goes to |
|---|---|---|
| `a1e6b91ff` | docs(workspace): add the design studio's real-app study tool | DOCS-studio; DOCS-records |
| `0e6159fac` | fix(graphty-element): refuse a GraphML or GEXF file cut short instead of loading part of it | API-truncated-refused |
| `7006b45a2` | fix(graphty-element): stop camera keys sticking when a shortcut moves focus | E-STUDY |
| `9af92a64d` | fix(graphty): pick an analysis from the keyboard in the Analyze list | APP-IF |
| `4dcee7c73` | fix(graphty-element): lay out Spectral by the smallest Laplacian eigenvectors | E-STUDY; E-STUDY |
| `557713b81` | fix(graphty): make the Export dialog modal and name its two kinds as tabs | APP-IF; CM |
| `8bceb8175` | fix(graphty): return to the start screen when an open fails, and keep the reason | APP-IF |
| `c77e473ab` | feat(graphty-element): draw the caller's legend into a captured image | APP-IF; DOCS-studio; API-capture-legend |
| `92882d5fd` | fix(graphty-element): draw the nodes a load's edges name when no node row gives them | E-STUDY |
| `e1bdbb260` | fix(graphty): let the study tool save, reopen and see motion | DOCS-studio |
| `f60a81711` | fix(graphty): name the chrome's controls once and give cut names and icon menus tooltips | APP-IF; CM |
| `377c526e1` | fix(graphty): keep the legend and the Color line to what the drawing shows | APP-IF; E-STUDY |
| `b98e99a5b` | fix(graphty-element): impose no default layout seed; the graphty app passes its own | APP-IF; DOCS-studio; E-STUDY |
| `1889d513a` | fix(graphty): show the reader's Everything layer as the Everything row's paint, not a second row | APP-IF |
| `accefb9c3` | fix(graphty): move keyboard focus to the node's values after a find pick | APP-IF; DOCS-studio |
| `bee8d9c10` | fix(graphty-element): draw undirected graphs without arrowheads | DOCS-studio; API-undirected |
| `9d6598eea` | fix(graphty-element): export a partition's groups by the rank the screen names them by | DOCS-studio; API-group-rank |
| `ae2af73e9` | fix(graphty-element): record the directed getter in the public API report | DOCS-studio; API-undirected |
| `452285142` | fix(graphty): name the Everything row once in the inspector header | APP-R23 |
| `94b3fc0ce` | fix(graphty-element): flag layout and algorithm options so key forms show the right fields | E-IF |
| `555c851e1` | feat(graphty-element): list export variants and the project file in the format catalog | API-variants |
| `100ea2fa9` | feat(compact-mantine): drag tree rows by touch and give each row a context menu | CM |
| `f88efbbd4` | feat(graphty-element): add downloadGraph and keep download URLs alive past the click | API-download |
| `6fb2cec17` | feat(compact-mantine): open ContextMenu on a touch-and-hold | CM |
| `effb80326` | feat(graphty-element): keep projects in the browser with browserProjects | API-browser-projects |
| `4780d1937` | feat(compact-mantine): keep the lift that ends a touch hold from choosing a context-menu row | APP-IF; CM |
| `4cc3d820c` | feat(graphty-element): fold force-2d into force and report the arranged dimension | APP-IF; API-force-fold; API-force-fold |
| `6db47aaea` | fix(compact-mantine): open a submenu on click or tap instead of closing the menu | APP-IF; CM |
| `131b207bc` | feat(compact-mantine): add swatches and onChangeEnd to CompactColorInput | CM |
| `6dc747cc4` | feat(graphty): open chosen and dropped files through project.open | APP-IF |
| `a625b9a83` | fix(compact-mantine): give the modal footer touch-sized insets and let a wide shortcut tab scroll to its start | CM |
| `938d27d82` | fix(graphty-element): draw a visible default glow and publish the glow strength default | E-IF |
| `e0fdce5f0` | feat(graphty-element): group shell, layers and bipartite layouts by a node attribute with groupBy | API-group-by |
| `e85d74633` | fix(graphty-element): light 3D nodes matte so a lit face never washes to white | E-IF |
| `9ce31435c` | fix(compact-mantine): stop pointer drags from selecting page text and widen touch targets | CM |
| `8df4aab96` | feat(graphty): save projects in this browser and add Save local copy | APP-IF; CM |
| `0a0a7ebf1` | feat(graphty-element): move a run's style layers as one block with runs.move | API-runs-move |
| `2df752ff4` | feat(graphty-element): estimate and plan a layout choice | E-layout-estimate |
| `48d11d0cc` | feat(graphty-element): make the first import into a new session the project's baseline | E-IF (export-variants.test.ts hunk -> API-variants) |
| `b7bc18953` | fix(compact-mantine): draw no Open list arrow on a ComboInput with no choices | CM |
| `8f4891b7c` | fix(graphty): open the neighbor list from Neighborhood with one node selected | APP-R23 |
| `269053df0` | fix(graphty): say under Method when a layout method is refused | APP-R23; E-STUDY |
| `29a93f5c5` | feat(graphty): list one export row per file type and download through the element | APP-IF |
| `cae3dca4d` | fix(graphty): open the selection's Summary and source tables instead of dead ends | APP-R23 |
| `28bcb71a0` | fix(compact-mantine): ring a focusable control the theme gave no ring class | CM |
| `b11881bb2` | fix(graphty): leave out Summary rows that say nothing about a selection | APP-R23 |
| `2cd7cb36e` | feat(graphty): make the hamburger the app's one menu | APP-IF |
| `d9e5cc8dc` | feat(graphty-element): zoom the 3D orbit camera with the mouse wheel | E-STUDY |
| `a92117490` | feat(graphty): add a screen-reader mode to the design studio's study tool | DOCS-studio |
| `566bc6e03` | fix(graphty): open a node's neighborhood in the inspector from the Neighborhood command | APP-IF |
| `a7af729d9` | fix(graphty): list readable formats from the element catalog and drop controls with no handler | APP-IF |
| `1623c25b4` | feat(graphty): give each paint-tree row one command list with Rename and Delete | APP-IF; CM |
| `7d40cfe59` | fix(graphty): free a study session's browser soon after its agent stops | DOCS-studio |
| `5116e407a` | feat(graphty): open any sample from inside a project | APP-IF |
| `275e4d963` | feat(graphty): reorder paint-tree rows by drag, Alt+Up/Down and Move up/down | APP-IF |
| `613de0e9b` | feat(graphty): open a node's neighborhood from its context, not a floating bar | APP-IF |
| `e82708488` | fix(graphty): move focus to the new style line after a Style pick | APP-R23 |
| `67960c8ee` | feat(graphty-element): publish VR and AR availability and turn XR on by default | API-xr |
| `ecc074a59` | feat(graphty): draw every method's options through one form with an Advanced fold | APP-IF |
| `95f1ddb1e` | feat(graphty): show each export format's advanced options behind an Advanced fold | APP-IF; API-variants |
| `f1f51faed` | feat(graphty): open a context menu on the canvas by right-click, Shift+F10 or touch-and-hold | APP-IF; CM |
| `f0b134080` | feat(graphty): list Legend and Table under a Show section of the View menu | APP-IF |
| `49ae9c4d8` | feat(graphty): give the Selection, group and run rows a Style of their own | APP-IF |
| `9549ceb7a` | feat(graphty): name the view mode on the View tool and offer VR and AR from its menu | APP-IF; CM |
| `a9b59c94a` | feat(graphty): pick a layout from a list and edit it in one form with Shape and Apply | APP-IF; E-IF |
| `bb1f91f39` | feat(graphty): style a selected node, edge or several from their own row | APP-IF |
| `6b959abcf` | feat(graphty): give the attribute inspector Show in table and Add label line | APP-IF |
| `2149ad95f` | feat(graphty): offer VR and AR from the Views menu by the element's XR facts | APP-IF |
| `20f531d16` | feat(graphty): show keyboard shortcuts in a centered two-column dialog shared with Settings and Export | APP-IF |
| `40d09f456` | fix(graphty): let the side panels' resize handles reach past the panel edge | APP-IF |
| `4bd7e3e6c` | feat(graphty): draw a style color as the shared paint field, written once per gesture | APP-IF |
| `5c7444c78` | feat(graphty): draw Glow, the arrows and Pattern as one style line each | APP-IF |
| `624468b4b` | feat(graphty): open the Style tab's shape, bind, binding and label lists in titled pop-outs | APP-IF; CM |
| `2ea682c51` | test(graphty-element): type-check the d3 dim option assertion against an empty list | API-force-fold |
| `065233aef` | test(graphty): drag layer rows with pointer events and expect bipartite grouping to be supplied | APP-IF |
| `979449703` | docs(workspace): keep the design studio designers' notes under version control | DOCS-studio |
| `30fbf32d9` | feat(graphty): move a table column left or right from its header menu | APP-IF; CM |
| `f127ca5ae` | fix(graphty): put every dialog's buttons in the shared modal footer | APP-IF |
| `7eb70e017` | fix(graphty): keep a grown neighborhood's list current and give its actions button a full touch target | APP-IF; CM |
| `dba64036d` | fix(graphty-element): keep Babylon's default WebXR enter button off the canvas | API-xr |
| `edd05a030` | fix(graphty): start Glow and Outline in the element's own colors and fold animation into Pattern | APP-IF; E-IF |
| `f97a49868` | fix(graphty): keep the table dock's controls above the panels' resize handles | APP-IF |
| `38789b7f4` | fix(graphty): resize the classic shell's panels and table with the shared resize handle | APP-IF; CM |
| `a937a4ad0` | chore(graphty-element): record DataManager.directed in the API report | API-undirected |
| `4a7a1a7fb` | docs(workspace): round 1 grades, scores and studio notes | DOCS-studio; DOCS-records |
| `895e5fab3` | fix(graphty-element): leave a layer painted over on every node out of the legend | APP-R23; DOCS-studio; E-STUDY |
| `8ca7596fb` | feat(graphty-element): offer run results as groupings for grouping layouts | APP-R23; DOCS-studio; API-grouping-values |
| `416876eea` | fix(graphty-element): name the drawing's canvas and show its focus ring | APP-R23; DOCS-studio; API-aria-label |
| `5b150ac8c` | feat(graphty): announce a finished load and a finished run on the status line | APP-R23 |
| `d088c2341` | fix(graphty-element): frame the whole graph when fitting a 2D view | DOCS-studio; API-2d-zoom |
| `a6aee40a9` | feat(graphty): study tool hears the highlighted option and measures the a11y and word bars | DOCS-studio; DOCS-records |
| `da96bd92e` | feat(graphty): open the from-data list when a Size line is added | APP-R23; DOCS-studio |
| `b7db5da7d` | fix(graphty): keep focus in a dialog opened from a menu | CM |
| `b59b92861` | fix(graphty): name a run by its method everywhere | APP-R23 |
| `794674a63` | fix(graphty): make a clickable row's trailing glyph part of the row | CM |
| `b7590f8de` | feat(graphty): add a Show all labels switch beside the label count | APP-R23 |
| `f108a2350` | docs(workspace): round 2 results and studio notes | DOCS-studio; DOCS-records |
| `64d10f9db` | docs(workspace): the design studio's report and notes | DOCS-studio; DOCS-records |
| `1d79cba40` | docs(workspace): the design studio's tier 1 report, round 3 results and notes | DOCS-studio |
| `4c087d8bc` | feat(graphty-element): leave the selection highlight out of a capture on request | APP-NS; DOCS-studio; API-show-selection |
| `ce290c9b3` | docs(design): record the export selection-ring change in the engineer notes | DOCS-studio |
| `481c6715a` | feat(graphty-element): report why a layout or run cannot start as a code, not a sentence | APP-NS; DOCS-studio; API-refusal-codes |
| `6f1cf692b` | feat(graphty-element): fit the whole graph from the current angle on request | APP-NS; DOCS-studio; API-keep-angle |
| `fa260f20d` | feat(graphty-element): keep every fit clear of what covers the canvas | APP-NS; DOCS-studio; API-view-insets |
| `2538731dc` | feat(graphty-element): frame a kept angle by the box's corners | DOCS-studio; API-keep-angle |
| `b65b6bfaa` | docs(design): record the view-insets change in the engineer notes | DOCS-studio |
| `6783ba895` | fix(graphty-element): draw a capture larger than the canvas at its own size | E-STUDY |
| `e7f43916d` | docs(design): record the sharp 4x export in the engineer notes | DOCS-studio |
| `a9862ddb7` | docs(graphty-element): trace the 3D size misreading to perspective | DOCS-studio |
| `ec66a2991` | feat(graphty-element): draw node sizes comparably at any 3D depth | APP-NS; DOCS-studio; API-depth-size |
| `b6011c01d` | fix(graphty-element): publish the force layout defaults ngraph actually runs | E-STUDY |
| `59810d250` | docs(design): record the force defaults fix in the engineer notes | DOCS-studio |
| `3680c6698` | fix(compact-mantine): raise gray helper text to 4.5:1 in both schemes | APP-NS; CM; DOCS-studio |
| `e63ee191b` | fix(graphty-element): hand focus given to the element to its drawing | DOCS-studio; API-delegates-focus |
| `befd9c37d` | fix(compact-mantine): keep focus in the tree when its focused row is deleted | CM |
| `5a66c5bd0` | fix(graphty): give focus a stated place when the control holding it goes away | APP-NS |
| `2143deaae` | fix(graphty-element): write the CSV adjacency table without the header row default | API-variants |
| `eef118341` | fix(graphty): word Export Data warnings from loss codes, not the writers' English | APP-NS |
| `71be6d4fb` | fix(graphty): open the table a single-table source produced from its Sources row | APP-NS |
| `ebb2cfcba` | fix(graphty-element): restore the camera views a mixed commit left unbuildable | API-view-insets |
| `b40f264a9` | fix(compact-mantine): turn touch emulation off after a test's touch drag | CM |
| `3b84510eb` | docs(design): record the re-measured build before the tier 2 study | DOCS-studio |
| `376fdc76c` | docs(design): decide how the tier 2 capabilities are built | DOCS-studio |
| `3d89d43c3` | feat(graphty-element): give every selector refusal a reason code | DOCS-studio; T2-selector-reason |
| `559f5dcb2` | feat(graphty-element): a filter on an edge attribute keeps the passing edges | DOCS-studio; T2-edge-filter |
| `f141b1283` | feat(graphty-element): keep every load in the graph as a source | DOCS-studio; T2-sources |
| `8966b0888` | feat(graphty-element): filter steps with per-step counts | APP-T2; DOCS-studio; T2-filter-steps (loaded-weight.test.ts and the DataConfig weight hunk -> T2-weight-at-load) |
| `337e98044` | feat(graphty-element): every run reads the loaded weight by default | DOCS-studio; T2-runs-read-weight |
| `89a2977df` | feat(graphty-element): choose a weight's meaning at load and read it back | DOCS-studio; T2-weight-at-load |
| `cb3cf8df1` | docs(design): note how to commit in a worktree other agents share | DOCS-studio |
| `ce34f31f3` | feat(graphty-element): a run goes out of date when its data changes, and says why | DOCS-studio; T2-stale-reason |
| `5a2b3b605` | feat(graphty-element): pick edges on the canvas and draw selected edges | T2-edge-picking |
| `2df88ddef` | fix(graphty): a path run's Values lists its route instead of crashing | APP-T2 |
| `e666ae17d` | feat(graphty): an edge clicked on the canvas opens in the inspector with Select endpoints | APP-T2 |
| `f09aae3aa` | fix(graphty): Find hints a typed rule and words a refused one | APP-T2 |
| `21a367ce9` | feat(graphty): say what an edge weight means at load and what each run read | APP-T2; DOCS-studio |
| `52ae4b683` | fix(graphty): a table file opened into an open project goes through the Data page | APP-T2 |
| `44f517408` | feat(graphty): a Notes place, with N and Add note writing about what the inspector shows | APP-T2 |
| `7742cd684` | feat(graphty): filter steps in the Data place, the inspector and the header | APP-T2 |
| `88749291a` | fix(compact-mantine): keep a search field's joined control on the field's line | CM |
| `587e2930e` | feat(graphty): one Path popover from P, a node's menu and Analyze | APP-T2 |
| `8569342f6` | feat(graphty): Sources lists every load, and Edit source... reopens its own tables | APP-T2 |
| `587c58f05` | feat(graphty): Hops and Follow in the neighbor list, and Filter to neighbors | APP-T2; DOCS-studio |
| `ca8b3b916` | feat(graphty): Replace with file... and out-of-date runs | APP-T2 |
| `0f63c8106` | docs(design): engineer notes on Replace with file and out-of-date runs | DOCS-studio |
| `d041fe832` | docs(workspace): tier 2 tasks, answer key, returning-user personas and preflight | DOCS-studio; DOCS-records |
| `6eba30d4e` | docs(workspace): tier 2 study ready: frozen criteria, nine tasks, answer key, returning roster | DOCS-studio; DOCS-records |
| `a358d04ff` | docs(workspace): correct the tier 2 answer key against the re-pilots | DOCS-studio; DOCS-records |
| `0c12c233b` | feat(graphty-element): keep the edge rows a load left out on its source entry | DOCS-studio; T2-left-out |
| `35a444f45` | test(graphty): narrow the load mapping before reading its tables | APP-T2 |
| `18e87fc07` | docs(workspace): engineer notes on keeping left-out rows per load | DOCS-studio |
| `288624ad1` | fix(graphty-element): draw a selected edge with the configured selection color | T2-edge-picking |
| `01d7bccba` | docs(workspace): engineer notes on drawing a selected edge as a halo band | DOCS-studio |
| `2084adbdf` | fix(compact-mantine): a cut row name shows its whole text from anywhere on its row | CM; DOCS-studio |
| `a8dae1930` | fix(compact-mantine): keep a long stat value inside its row and its name readable | CM |
| `d5d5ae383` | docs(workspace): engineer notes on keeping a long stat value inside its row | DOCS-studio |
| `b8767ad92` | fix(graphty): the Direction row no longer quotes the file's raw statement | APP-T2; DOCS-studio |
| `4f52eac23` | fix(graphty): find results name an edge the way the inspector does | APP-T2; DOCS-studio |
| `bf3b30715` | fix(graphty): the Overview says when its counts are for the whole graph under a filter | APP-T2; DOCS-studio |
| `f1f041a40` | fix(graphty): match the verb to the count of unmatched edge rows | APP-T2 |
| `b38985f56` | docs(graphty): note the unmatched-rows verb fix and the New from data upload trap | DOCS-studio |
| `bbf1c4738` | fix(design-studio-tool): click a text box by its placeholder words | DOCS-studio |
| `fa23e967f` | fix(design-studio-tool): stop reporting a still drawing as moving while an overlay repaints | DOCS-studio |
| `923155eb1` | fix(design-studio-tool): restore clicking a text box by its placeholder words | DOCS-studio |
| `6dab0493e` | fix(graphty): find checks a typed rule before Enter and offers column names after = | APP-T2 |
| `84bf6a791` | fix(graphty): selection summary no longer contradicts its header | APP-T2 |
| `3ea9171e3` | fix(compact-mantine): a tree row's pinned text gives way before its name | CM |
| `f79110b10` | feat(graphty): Sources says when a load left rows out, and a source opens in the inspector | APP-T2 |
| `c8af81107` | docs(graphty): engineer notes on showing a load's left-out rows in Sources | DOCS-studio |
| `c74a85615` | fix(graphty): frame selection frames a selected edge's ends | APP-T2; T2-edge-picking |
| `4c8d9eb2a` | fix(graphty): Enter in the Path popover's From box moves on to To | APP-T2 |
| `0e2379250` | fix(graphty-element): plan() states the weight a run would read | T2-runs-read-weight |
| `295d601b9` | fix(graphty): the Weight box says when the loaded weight will not be read | APP-T2 |
| `b980ec050` | docs(graphty): engineer notes on the Weight box reading the element's plan | DOCS-studio |
| `aaf5ef737` | fix(compact-mantine): a bare Input.Wrapper draws its description at the fields' 11px | APP-T2; CM |
| `75cbc3a9a` | docs(compact-mantine): engineer notes on theming a bare Input.Wrapper | DOCS-studio |
| `1c723b415` | fix(compact-mantine): a tree row's checkbox keeps its size beside a count | CM |
| `647ba88b2` | docs(design-studio-tool): re-walk the tier 2 pilots after the fixes | DOCS-records |
| `089d6e542` | docs(design-studio-tool): engineer notes on the tier 2 re-walk and the tree checkbox regression | DOCS-studio |
| `c16465e7a` | docs(design-studio-tool): re-walk the fewest-people-in-between pilot after the next-steps fixes | DOCS-records |
| `c67402147` | docs(design-studio-tool): re-pilot the two-spreadsheet task on the rebuilt app | DOCS-records |
| `d5d727979` | docs(design-studio-tool): re-pilot the tier 2 rule-highlight task on the rebuilt app | DOCS-records |
| `ce13e3644` | docs(design-studio-tool): re-walk tier 2 T24 on the rebuilt app | DOCS-records |
| `afed56e8d` | docs(workspace): tier 2 study materials and studio notes | DOCS-studio; DOCS-records |
