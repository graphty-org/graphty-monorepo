# What we actually use from Chromatic

Date: 2026-09-27

This is an inventory of every Chromatic feature the graphty monorepo uses or depends on, where
each one is used, and what a replacement visual-review system has to do to take its place. It
covers the CI jobs, the five Storybook configurations (graphty-element, compact-mantine, graphty,
algorithms, layout), every story-level `chromatic` parameter, the `isChromatic()` checks, the
local scripts, and the review habits visible in this repository's issues and pull requests.

Line numbers refer to `master` at commit 17d5468b unless a pull request is named.

## Summary

- Chromatic is used as a **screenshot farm, a comparison engine, a baseline store and a review UI**.
  Almost nothing else: no TurboSnap, no UI Review workflow, no accessibility tests, no second
  browser, no Figma or design-token features.
- The story-level surface is small and mechanical. Five parameters are in use: `delay`,
  `pauseAnimationAtEnd`, `disableSnapshot`, `diffThreshold` with `diffIncludeAntiAliasing`, and
  `modes` (light and dark). A pinned `viewports: [1200]` is waiting in an open pull request.
- `isChromatic()` is load-bearing in graphty-element: it switches physics layouts to pre-stepped,
  deterministic pictures and switches off a label animation. A replacement must set the same
  signal, and it can: `isChromatic()` also returns true for any URL containing `chromatic=true`.
- **One real defect found while taking this inventory:** the graphty app's two modes set a global
  named `colorScheme`, but its preview decorator reads `theme`. Both of the app's "light" and
  "dark" snapshots therefore render dark. Half of graphty's snapshots have been duplicates, and the
  app has never been visually tested in light mode.
- The owner's habits that the replacement must preserve: only the owner accepts; review happens
  in a dashboard, not in PR statuses; each change is classified story by story; accepted changes
  follow a merge into master; agents need to list changed stories and read the images; and the
  owner wants to compare arbitrary versions (the last 1.x release against master).

## 1. How CI runs Chromatic

| Feature | Where | What it does today | What the replacement must do | Tier |
|---|---|---|---|---|
| One Chromatic project per Storybook, five tokens | `.github/workflows/ci.yml:517-720` (jobs `chromatic-element`, `-app`, `-compact-mantine`, `-algorithms`, `-layout`); secrets `CHROMATIC_PROJECT_TOKEN_ELEMENT`, `_APP`, `_COMPACT_MANTINE`, `_ALGORITHMS`, `_LAYOUT` (`ci.yml:552,594,636,678,720`; `.env.example:40-54`) | Each package has its own baselines, build history and review page | Separate baseline sets and separate pass/fail per package, in one review UI | P0 (the owner's "multiple projects") |
| Captures the prebuilt `storybook-static` artifact | `ci.yml:541-555` and the same pattern in each job (`storybookBuildDir`, artifact `build-storybook-*`) | Chromatic uploads and captures the static build CI already made | Capture the same artifact; do not rebuild | P0 |
| Affected-only gating through Nx | `ci.yml:519-523` (and each job's `if`), plan step `ci.yml:45-80`, `tools/ci-test-matrix.mjs:15` | A job runs only when Nx says its package, or anything it depends on, changed | Keep the same `needs.build.outputs.affected` gate | P1 (already free) |
| Opt-in by label or manual dispatch | `ci.yml:6-8` (`labeled` trigger), `ci.yml:14-19` (dispatch input `chromatic`), each job's `if`; merged in PR #538 | Stops the bill; runs only on PRs labelled `chromatic` or on a dispatch | Not needed: the replacement runs on every affected PR because it costs nothing. The label can be deleted | drop |
| Fail the job when snapshots changed | `exitZeroOnChanges: false`, `ci.yml:553,595,637,679,721` | A changed snapshot turns the CI job red until accepted in Chromatic | A per-package check that stays red while unreviewed changes exist, and turns green when the owner accepts. It must distinguish "changes to review" from "the capture broke" (issue #351 asked for exactly that) | P0 |
| Skipped Chromatic job counts as passing | `ci.yml:905-936` (`ci-success` gate: skipped `chromatic-*` jobs are allowed) | The required check ignores Chromatic when it did not run | The new visual jobs join the gate; a skipped (unaffected) one passes, a failed one does not | P0 |
| TurboSnap | Disabled, comment at `ci.yml:554-555` | Nothing; every run is a full capture | Not needed. The comment is also out of date: Vite builds do emit `preview-stats.json` with `--stats-json` (see `chromatic-alternatives.md`). Nx affected-only gating already provides the useful part | drop |
| `chromatic.config.json` | `graphty-element/chromatic.config.json` (holds only `projectId`) | Unused by CI, which runs from the repository root; kept for the id | Delete at retirement | drop |
| Local and Nx entry points | `tools/chromatic.sh` (whole file); `graphty-element/package.json:107,116,119,159`; `graphty/package.json:25-27`; `graphty-element/project.json:74-79` (Nx target `chromatic`) | `npm run chromatic`, `test:visual`, `test:shard:visual` publish a paid build | The same script names should run the local capture and comparison instead. Note that `test:shard:visual` still publishes a paid build on master; PR #519 removes that from `npm test` | P0 (local run in the push hook) |
| Stale nested workflow | `graphty-element/.github/workflows/ci.yml:134-136,194` (`npx chromatic`) | GitHub never runs a workflow outside the root `.github`, so this is dead | Delete | drop |

## 2. Project-level Storybook configuration

| Feature | Where | What it does | What the replacement must do | Tier |
|---|---|---|---|---|
| `@chromatic-com/storybook` addon (the "Visual Tests" panel) | `graphty-element/.storybook/main.ts:5`, `algorithms/.storybook/main.ts:5`, `layout/.storybook/main.ts:5`, `graphty/.storybook/main.ts:5`, `compact-mantine/.storybook/main.ts:16`; dependency in each `package.json` (root `package.json:66`, `algorithms/package.json:112`, `layout/package.json:89`, `compact-mantine/package.json:37`) | Adds a panel that can run a cloud build of uncommitted code and accept baselines from inside Storybook [C6]. No evidence in issues or PRs that anyone uses it; every recorded review was on chromatic.com | Nothing required. Remove the addon at retirement. A "view this story's diff" link from our review page into the live Storybook covers the useful part | drop (link-to-live-story is P1) |
| `modes` light and dark (compact-mantine) | `compact-mantine/.storybook/preview.tsx:110-115`, reading the `theme` global declared at `:26-55` | Every story captured twice, as two baselines named `light` and `dark` [C3] | Capture each story once per mode, set the globals through the URL (`&globals=theme:light`), name baselines by story id plus mode name | P0 |
| `modes` light and dark (graphty app) | `graphty/.storybook/preview.tsx:114-120` | **Broken.** The modes set `colorScheme`, but the decorator at `:70-78` calls `getColorScheme` (`:24-49`), which reads only `backgrounds` and `theme`, and defaults to dark. Both modes render dark | Fix the mode to set `theme` (a one-line change) before seeding baselines, or the new system inherits 76 duplicate dark captures and zero light ones | P0 (fix), found here |
| Project default `delay` | `graphty-element/.storybook/preview.ts:117-118` (500 ms); `algorithms/.storybook/preview.ts:22-25` and `layout/.storybook/preview.ts:22-25` (300 ms) | A fixed minimum wait before capture [C4] | Honour `parameters.chromatic.delay` as a minimum wait after the render phase completes. Better: replace with an event wait (see section 4) and treat `delay` as a fallback | P0 (honour), P2 (replace) |
| `pauseAnimationAtEnd: true` | `graphty-element/.storybook/preview.ts:119` | CSS animations and transitions are frozen on their last frame [C5]. graphty-element draws on a canvas, so this affects only its DOM overlays (tooltips, the palette picker, the AI panel) | Playwright's `animations: "disabled"` screenshot option fast-forwards finite CSS animations, transitions and Web Animations to completion and resets infinite ones to their initial state [P1]; that matches `pauseAnimationAtEnd: true` for finite animations | P0 |
| Global pre-steps under Chromatic | `graphty-element/.storybook/preview.ts:7,71,97-98` | Every story whose element has no `layoutBehavior` gets 1,000 layout pre-steps when `isChromatic()` is true. PR #519 deletes this decorator and moves the pre-steps into the five Data stories that needed it | Must set the `isChromatic()` signal (section 3). No other work once PR #519 lands | P0 |
| `parameters.play` wait for `graph-settled` | `graphty-element/.storybook/preview.ts:121-124` | **Dead code.** Storybook never reads a play function from `parameters`, so this never ran (noted in `graphty-element/.storybook/vitest.setup.ts:329-331`; deleted by PR #519) | Nothing; do not port it. Settling is done per story (section 4) | drop |
| Capture viewport | Not pinned on master. PR #519 (open) adds `viewports: [1200]` to `graphty-element/.storybook/preview.ts` | Chromatic's default is 1200 x 900, and it captures the full height of the rendered story unless `cropToViewport` is set [C2] | Default viewport 1200 x 900, full-height capture of the story root, and honour `viewports` when a story sets it | P0 |
| Label font pinned for snapshots | PR #519 (open): a Storybook loader registers committed Inter as "Verdana"; issue #234 | Removes host-font drift between machines | Capture on one pinned image (Playwright's Docker image) so fonts match between CI and the push hook; the loader works unchanged | P0 |

## 3. `isChromatic()` checks

`isChromatic()` (package `chromatic`, file `isChromatic.js`) returns true when the user agent
contains "Chromatic" **or** the page URL contains `chromatic=true` (read from
`node_modules/.pnpm/chromatic@11.29.0/node_modules/chromatic/isChromatic.js`). So the replacement
can keep every call site unchanged by appending `&chromatic=true` to the iframe URL, with no
user-agent spoofing. Later, the calls can be renamed to a neutral helper.

| Call site | What changes under Chromatic |
|---|---|
| `graphty-element/.storybook/preview.ts:7,97` | 1,000 pre-steps for any story that did not choose (removed by PR #519) |
| `graphty-element/stories/helpers.ts:7,323-324`, used by `setLayoutPreSteps` at `:410-412` and by `applyConfiguration` | A story's `preSteps` apply only under Chromatic; elsewhere the layout animates for the reader |
| `graphty-element/stories/assertions.ts:35,508` | A play-function assertion allows pre-steps only under Chromatic |
| `graphty-element/stories/LabelStyles.stories.ts:7,1127,1145` | The Animation story switches the label pulse off and asserts stillness |
| `graphty-element/test/browser/story-determinism.test.ts:236,266,278,325` | A contract test that every snapshotted story is seeded and pre-stepped; it reads `parameters.chromatic.disableSnapshot` to skip opted-out stories |

The dependency is P0: without the signal, every physics-layout story captures a graph in mid-flight.
The helper also has to remain importable without the `chromatic` package once Chromatic is removed
(a five-line local copy, or keep the `chromatic` dev dependency only for this file).

## 4. Story-level `chromatic` parameters

All in graphty-element unless another package is named. compact-mantine and the graphty app set
no story-level parameters.

| Parameter | Where | Count | Meaning in Chromatic | What the replacement must do | Tier |
|---|---|---|---|---|---|
| `delay` | `ArrowText.stories.ts:15-16`, `NodeStyles.stories.ts:56-57`, `BezierEdges.stories.ts:15-16`, `NodeTooltips.stories.ts:88` (800), `SelectionHighlight.stories.ts:85` (800), `LayeredStyles.stories.ts:50-51`, `AllNodeShapes.stories.ts:16-17` and `:107-108` (1000), `GraphStyles.stories.ts:39-40`, `Data.stories.ts:28-29`, `algorithms/helpers.ts:40-41` (all algorithm stories), `PalettePicker.stories.ts:29-30` (300), `EdgeStyles.stories.ts:61-62` (500) and `:955,1273,1513,1750` (1000), `XR/Example.stories.ts:39-40` (1000); project level in three previews (section 2) | 18 blocks | Minimum wait before capture, after the play function [C4] | Honour as a minimum wait. Most comments say "allow Babylon.js render frames to complete"; graphty-element's `graph.waitForStableFrame()` (PR #519) is the event the capture should wait on instead | P0 (honour) |
| `disableSnapshot: true` | `PerformanceTest.stories.ts:24-25` (whole file, meta), `LayoutGpu.stories.ts:355-356` (`ForceAtlas2WebGpu`), `algorithms/stories/shortest-path/FloydWarshall.stories.ts:449-451` (animation exceeds Chromatic's 30 s budget) | 3 | Story is not captured | Skip these stories; the determinism contract test already reads the same flag | P0 |
| `diffThreshold` with `diffIncludeAntiAliasing: true` | `GraphStyles.stories.ts:109-111` (0.3), `Layout.stories.ts:212-215` (0.3) and `:298-300` (0.8, the D3 layout), `LabelStyles.stories.ts:496-499` (0.3), `:594-596`, `:809-811`, `:905-907`, `:1025-1027`, `:1088-1090`, `:1450-1452`, `:1486-1488` (0.25), `:1183-1185` (0.5), `:1414-1416` (0.3) | 14 | `diffThreshold` is a per-pixel colour distance in YIQ space from 0 to 1, default 0.063; anti-aliased pixels are ignored unless `diffIncludeAntiAliasing` is true [C1] | pixelmatch has the same 0-1 scale and the same anti-aliasing switch (`threshold`, `includeAA`), but its current README says it measures colour distance in OKLab (HyAB), not YIQ [P2], so the numbers are close but not identical. Read `parameters.chromatic.diffThreshold` and `diffIncludeAntiAliasing` per story, default 0.063 rather than pixelmatch's 0.1, and check the 14 stories against their existing Chromatic behaviour once before trusting them. pixelmatch is not installed today (pngjs 7 is) | P0 |
| `modes` | Project level only (section 2) | 2 projects | See section 2 | See section 2 | P0 |
| `viewports`, `cropToViewport`, `prefersReducedMotion`, `media`, `forcedColors`, `ignoreSelectors`, `pauseAnimationAtEnd: false` | Not used anywhere (repository-wide grep, 2026-09-27) | 0 | -- | Not needed. `viewports` arrives with PR #519 | -- |

Stories also carry determinism work written "for Chromatic" that any capture tool inherits
unchanged: seeded layouts and pre-steps matched to iteration counts (`Layout.stories.ts:274-275,359,428`,
`Layout2D.stories.ts:346,460`, `LayoutGpu.stories.ts:164,270,310,347`, `SelectionHighlight.stories.ts:56-57`),
seeded data (`graphty/src/components/data-view/DataView.stories.tsx:83-87`), a fixed 3D camera
(`layout/stories/utils/visualization-3d.ts:41`), and play functions that run an animation to its
end before capture (`algorithms/stories/traversal/BFS.stories.ts:373-377`,
`DFS.stories.ts:377-381`, `layout/stories/2d/Random.stories.ts:151-153`). That makes one more
capture requirement explicit: **wait for the play function to finish** before the screenshot
(Storybook's render phase reaching `completed`), and allow at least 15 s for render plus 15 s for
play, Chromatic's budget [C4], or FloydWarshall-like stories will time out differently.

## 5. Chromatic services outside the repository

| Feature | Evidence | Used? | Replacement | Tier |
|---|---|---|---|---|
| Hosted per-build review page with per-story accept and deny | Every review in issues #157, #217, #217's decision, #518; `tools/chromatic-capture.mjs` scrapes it | Yes, the main way the owner reviews ("the owner reviews visual changes from the Chromatic dashboard, not from pull request statuses", issue #351) | A static review page (baseline, new, diff) with accept and reject per story | P0 |
| Diff overlay and "spotlight" of changed pixels | Chromatic review page | Yes, implicitly | Pixel-highlight diff image plus a baseline/new toggle | P1 (the owner's "flashing" and "pixel highlighting") |
| Baselines that follow merges | Decision record in PR #519: accepted snapshots on a merged PR are carried to master, which is why master builds went from pending to accepted | Yes, and it confused everyone once | Baselines committed with the code get this for free: merging the PR merges the accepted PNGs | P0 |
| Build history, who accepted what | Chromatic build numbers quoted in issues (648, 717, 718) | Yes, for audits | Review records tied to commit hashes | P0 |
| GitHub commit statuses "UI Tests" and "Storybook Publish" | Issue #351: only compact-mantine's project is linked to GitHub and posts them; the other four do not | Partly; the owner said it is not needed | A per-package check run with a link to the review page | P0 (the check), P1 (the link in the PR) |
| Hosted Storybook per build ("Storybook Publish") | Issue #351 | Rarely | Link to the CI Storybook artifact, or publish PR Storybooks to GitHub Pages under a path | P1 |
| UI Review (the PR-style design review workflow) | Listed on the project's Manage page (issue #217 comment), no use recorded | No | None | drop |
| Flake filter | Listed on the Manage page (issue #217); whether it is on is not recorded | Unknown | Recapture once on a difference, and flag stories that differ from themselves; `chromatic-alternatives.md` measured one unstable story (`ai-control--default`) | P1 |
| Accessibility tests | Manage page lists them; compact-mantine already runs `@storybook/addon-a11y` locally | No | None | drop |
| Notifications | Manage page | Unknown | The PR check is the notification | drop |
| Other browsers | Never configured | No | Chromium only at first | P2 |
| API for agents | `tools/chromatic-api.sh` (read-only build totals); `tools/chromatic-capture.mjs` (session-cookie scrape of changed stories and images); issue #218 | Yes: the API refuses per-story data to a project token, so agents needed a browser cookie | The review data must be plain files (JSON plus PNGs) an agent can read without credentials | P1 (files), P2 (the owner's MCP) |

## 6. The owner's review habits

From issues #157, #204, #217, #218, #234, #351, #518 and pull requests #496, #519, #538:

- **Only the owner accepts.** Stated in issue #217 and the decision record
  `design/decisions/2026-09-27-only-the-owner-accepts-chromatic-changes.md` (in PR #519). No
  agent, script or CI job accepts, and no option that accepts (`--auto-accept-changes`, or
  `exitZeroOnChanges` used to hide a change) is allowed. The replacement's accept action has to
  be one an agent holding the owner's credentials cannot perform alone (see the threat model in
  the design).
- **Review is story by story, with a reason.** Issue #157 asked that "each change ... is listed
  with accept/fix and a reason"; issue #518 classifies each difference as intended or a
  regression. A per-story note field on accept or reject is therefore wanted, not only a button.
- **Silent carry-over is distrusted.** Issue #217 exists because a hundred 2.0 changes reached
  master's baseline without a story-by-story review. The replacement must never promote a
  baseline without a recorded owner decision.
- **Agents do the investigation, the owner decides.** Issue #218 and PR #496 built tooling so an
  agent can list changed stories, fetch the images and explain the pixels (camera move versus a
  local change, via `tools/pixel-diff.mjs`). The review data must be readable by an agent.
- **Comparing arbitrary versions.** Issue #518 compares the last 1.x release with master, which
  Chromatic cannot do (it compares only with the branch's previous accepted build). Capturing any
  two built Storybooks and diffing them (`tools/diff-stories.mjs` already does this) is a real,
  recurring need.
- **Chrome in snapshots is a defect.** Issue #204: the eruda debug button is drawn into every
  graphty app story and snapshot. Fix before seeding baselines, or every graphty baseline contains
  it.
- **Determinism is enforced by tests.** `graphty-element/test/browser/story-determinism.test.ts`
  and the story contract tests hold every snapshotted story to seeding and pre-steps, so a new
  capture tool starts from stable stories.

## 7. What the replacement must do, in order

P0, before the owner can approve images again:

1. Capture each package's built `storybook-static` in Chromium with SwiftShader, one pinned
   Docker image, iframe URL with `&chromatic=true` so `isChromatic()` is unchanged.
2. Wait for Storybook's render phase `completed` (after play), then `parameters.chromatic.delay`,
   with animations finished; 1200 x 900 viewport, full-height capture of the story root.
3. Skip `disableSnapshot`; capture each `modes` entry through URL globals, baseline named
   `<story-id>.<mode>.png`.
4. Compare with pixelmatch at the story's `diffThreshold` (default 0.063) and
   `diffIncludeAntiAliasing`, after checking that pixelmatch's OKLab scale treats those 14 stories
   as Chromatic's YIQ scale did.
5. Per-package check, red while unreviewed changes exist, distinct from "capture failed".
6. A review page per package with per-story accept and reject and a reason, owner-only acceptance,
   and a record tied to the commit.

Fix first, or the new baselines are wrong from day one: the graphty app's `colorScheme` mode
(section 2) and the eruda button (issue #204).

P1: flake recapture, diff highlighting and a toggle, links to the live stories, agent-readable
JSON. P2: an MCP server, other browsers.

Drop: TurboSnap, the `chromatic` label, the Visual Tests addon, UI Review, Chromatic's
accessibility tests.

## Sources

Repository (all file:line references above), read on 2026-09-27. GitHub issues #157, #204, #217,
#218, #234, #351, #518 and pull requests #496, #519, #538 in graphty-org/graphty-monorepo, read
with `gh`.

- [C1] https://www.chromatic.com/docs/threshold/ -- `diffThreshold` is a YIQ colour distance from 0 to 1, default 0.063; `diffIncludeAntiAliasing`
- [C2] https://www.chromatic.com/docs/modes/viewports/ -- default viewport 1200 x 900; full-height capture unless `cropToViewport`
- [C3] https://www.chromatic.com/docs/modes/ -- modes set globals; baselines keyed by mode name; modes stack
- [C4] https://www.chromatic.com/docs/delay/ -- `delay` is a minimum wait; 15 s render plus 15 s interaction budget; capture after assertions pass
- [C5] https://www.chromatic.com/docs/animations/ -- `pauseAnimationAtEnd`; JavaScript animations are not controlled
- [C6] https://www.chromatic.com/docs/visual-tests-addon/ -- the Storybook addon's local builds and accept flow
- [C7] https://www.chromatic.com/docs/config-with-story-params/ -- the list of story-level parameters
- [P1] https://playwright.dev/docs/api/class-page#page-screenshot, and the option's doc comment in `playwright-core` 1.57 `types/types.d.ts` -- `animations: "disabled"`
- [P2] https://github.com/mapbox/pixelmatch -- `threshold` (0 to 1, default 0.1), `includeAA`, colour distance in OKLab HyAB
- `node_modules/.pnpm/chromatic@11.29.0/node_modules/chromatic/isChromatic.js` -- the user-agent and `chromatic=true` URL checks
