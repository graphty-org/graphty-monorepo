# AI-checked acceptance tests for the graphty app

Status: Proposed, 2026-10-22. Issue #3272. Built so far: the routes in `graphty/acceptance/` (outcome checks only,
no step screenshots yet) and `tools/acceptance.mjs run` and `select` (section 9) without a model, selecting by
the files the app's build bundles, read from its source maps, rather than by per-route coverage (section 5.3).

This document describes how the graphty app's study tasks become scripted acceptance tests that run
on every change that can affect them, compare a screenshot of every step with the same step on the
previous build, and call a Claude agent only for the steps whose picture changed or whose script
broke.

It builds on two designs that are in flight and does not repeat them:

- `design/ci/fast-pipeline.md` (branch `design/fast-pipeline`, issue #3262), in particular section
  4.4 ("the dry-run script"), section 5 (deterministic test impact analysis) and section 4.3
  (verification of golden after each landing). This document is the detailed design of that
  section 4.4 and of step 9 of its build order, and changes it in the two places section 13 lists.
- Issue #3266 (branch `infra/3266-gate-input-keys`): the pre-push gate keys every pass by its
  inputs, in `tools/prepush-inputs.mjs`. This document reuses that mechanism; section 6 says
  exactly how.

Words used throughout:

- **The design studio** is the simulated UX research process in `design/ui/studio/`: simulated
  participants try tasks in the real graphty app, graders score them, and fixes follow.
- **A task** is one study task (tier 3 has T37 to T51), each in two halves, A and B, on different
  data. **The answer key** is the tier's `answers.md`: each task's success path, detours, dead
  ends and final screen.
- **A route** is one scripted walk of one task half: the success path by pointer, one common detour,
  or the keyboard walk. A route is a `route.jsonl` file as the study tool writes it today.
- **The study tool** is `design/ui/studio/tool/real.mjs`, which drives the production build of the
  app in a GPU-drawn headless Chromium through the Playwright library and saves a screenshot after
  every step.
- **A dry run** is the studio's readiness check before a round of sessions: pilot agents walk every
  task's success path, detours and keyboard walk on the frozen build and report what blocks them.
- **The fast check**, **verification**, **golden**, **landing** and **the gate** are as defined in
  `design/ci/fast-pipeline.md`.

## 1. The problem

Tier 3's dry runs took five passes over about three days before a single study session ran
(`.claude/workflows/design-studio.js` records it). Almost all of that was agents walking the app one
step at a time to answer a mechanical question: does each task's success path, its common detours
and its keyboard walk still work on this build?

Measured from the subagent transcripts of tier 3's dry runs (404 walk segments, 6,786 steps) and
574 walks in all:

| Measure                                                                | Value                                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| One walk, mean wall time                                               | 493 s                                                                 |
| ... of which the model thinking                                        | 126 s (about 25%)                                                     |
| ... of which starting a browser, stepping, ending and other tool calls | 365 s (about 74%): start 146, steps 142, end 21, other shell calls 56 |
| All tier 3 walks                                                       | about 79 hours of agent walking                                       |
| One full pilot pass (30 task halves, 3 walks each, 4 browsers)         | about 3.3 hours                                                       |
| The same three routes replayed with no model                           | 17, 23 and 31 s, every check point matched                            |
| Waiting for a free browser slot during the walks                       | about 11 hours of agent time                                          |

So three quarters of a walk is the browser and the tool, and the model spends most of its quarter
re-reading screens that did not change. The replay added on 2026-10-21 (`real.mjs --replay` and
`--rewalk`, below) already runs a recorded route in 20 to 30 seconds with no model, but only inside
the studio, only on the build the studio froze, and only by checking names and controls on screen.
Nothing runs the routes when the app changes on an ordinary branch, so a broken task is found days
later by a pilot or a participant, and the studio pays for it in a whole pass.

What this design gives:

- The routes run on every change that can affect them, in minutes, on this machine.
- A screenshot of every step is compared with the same step on the build before the change, so a
  change nobody intended is seen even when every name on the screen is the same.
- A model looks only at the few steps that changed, and says whether each change is a bug, an
  intended change, or a usability problem.
- The dry run's mechanical half is done by the scripts. Pilot agents walk only what is new or what
  the scripts could not finish.

What it does not change: simulated participants still explore freely, from a briefing, with no
script. Their sessions are the study; the scripts are only the readiness check.

## 2. What already exists, and what is reused

| Piece                         | Where                                                                                   | Used for                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The study tool                | `design/ui/studio/tool/real.mjs` (Playwright library, not the Playwright MCP)           | Runs every route: the same browser, flags, GPU drawing, settle detection and screenshots a study uses                                                                   |
| Route files and replay        | `route.jsonl` in every walk folder; `real.mjs --replay` and `--rewalk`                  | The script format and the runner. A route records each step's actions and its check points (what the step printed, the controls and headings on the screen it ended on) |
| The browser gate              | `design/ui/studio/tool/with-browser.sh`, checked in as `tools/with-browser.sh` by #3266 | Every route's browser takes a slot; GPU sessions may use 8, warm browsers start in about 2 s                                                                            |
| GPU drawing                   | `real.mjs` with the extracted `libEGL` in `tmp/egl`                                     | A software renderer fails loudly, never runs slowly                                                                                                                     |
| The scripted bars             | `design/ui/studio/tool/bars.mjs`, `score.mjs`                                           | Unchanged; they measure the study's bars and score its sessions. The acceptance tests do not replace them                                                               |
| Pixel comparison              | `tools/pixel-diff.mjs`                                                                  | Changed pixels, bounding box, local or frame-wide, and a diff image                                                                                                     |
| Input keys and pass records   | `tools/prepush-inputs.mjs` on `infra/3266-gate-input-keys`                              | Deciding which routes a change affects at package level, and reusing a route's pass on identical inputs                                                                 |
| The impact selector           | `design/ci/fast-pipeline.md` section 5                                                  | Its rules file for inputs an import graph cannot see, and its advisory-then-gating rollout                                                                              |
| Verification                  | `design/ci/fast-pipeline.md` section 4.3                                                | Runs the affected routes on golden after each landing, which produces the captures branches compare with                                                                |
| The studio workflow and skill | `.claude/workflows/design-studio.js`, `.claude/skills/design-studio/SKILL.md`           | The dry run calls the acceptance run instead of re-walking by hand                                                                                                      |
| Storybook screenshot review   | `visual-review/`, `design/visual-testing/design.md`                                     | Not reused for app walks (section 8.4 says why); it keeps covering Storybook stories                                                                                    |

## 3. Where the scripts come from

### 3.1 The suite

The routes live in a checked-in suite under `graphty/acceptance/` (fast-pipeline section 4.4 puts
the dry-run script under `graphty/`):

- `graphty/acceptance/routes/<task><half>-<walk>.jsonl`, for example `T38A-success.jsonl`,
  `T38A-detour-find-replace.jsonl`, `T38A-keys.jsonl`. The format is exactly the study tool's
  `route.jsonl`, so `real.mjs --replay` runs it unchanged.
- `graphty/acceptance/tasks.json`: one entry per task half, naming its tier, its section in the
  answer key, its setup file, the data files it uploads, and its routes.
- The data files and setups stay where the study tool finds them (`design/ui/studio/tool/files/`,
  the tier's setups); the suite names them, it does not copy them.

About 90 routes for tier 3 (30 halves, three walks each); every later tier adds its own.

### 3.2 First source: the walks the studio already recorded

Every pilot walk since 2026-10-21 saved its `route.jsonl`. The newest pilot pass of each task half
(for tier 3, `design/ui/studio/tier3/rounds/r1d2/pilot/<task><half>/`) is copied into the suite.
A walk is promoted only if its replay on the current golden build matches to the end; one that
diverges is walked again by a pilot agent first.

### 3.3 Second source: the answer key

A task half with no recorded walk gets a route written from the answer key. Each success path in
`answers.md` is a numbered list of steps a person takes ("1. 'Open a file', volunteers.graphml. 2. Load. 3. '+' beside Style layers. ..."). An agent translates that list once into the
hand-written route form the replay already accepts (one `{"steps": [...]}` line per step), then
replays it with `--keep` so the tool records each step's screen. That recorded run becomes the
route. Detours come from the answer key's detour and dead-end paragraphs the same way.

### 3.4 Outcome checks

A replay that only matches screens proves the app looks the same, not that the task succeeded.
`design/graphty-element/the-testing-blind-spot.md` found 131 story tests that assert nothing. So
every route ends with outcome checks taken from the answer key's "Success" and "Final screen"
lines:

- text on screen, with the study tool's existing `--expect` and `--expect-not` steps ("role: board,
  staff, 8 nodes");
- facts about the graph, read from the style tree `real.mjs` already writes (`styles.json`,
  `styles-steps.jsonl`): how many nodes a layer paints and in which color. This needs one new step
  kind, `--expect-style "<layer>: <count> nodes <color>"`, read through graphty-element's public API
  as the style tree already is.

### 3.5 How the scripts stay current

- **An intended change.** When the agent judges a changed step to be intended (section 7), the
  branch's session re-records the route from the step where it changed: `real.mjs --replay <route>
<folder> --keep`, then the remaining steps by hand, then copies the new `route.jsonl` into the
  suite in the same branch as the change. The steps may change; the outcome checks may not (next
  point).
- **Outcome checks are protected**, as fast-pipeline section 4.4 already says: a check in the fast
  check refuses a branch that removes or changes an existing `--expect` or `--expect-style` line
  of a route. Changing one takes its own branch from a different session, holding only that change
  and its reason.
- **New tasks and new findings.** Each new studio tier adds its tasks' routes when its first dry
  run's pilots finish. Each defect the studio finds becomes a route or an outcome check on one,
  in the branch that fixes it.
- **Retired tasks.** A route whose feature was removed is deleted in its own commit that names the
  removal.
- **The tool itself.** `real.mjs` and its steps are inputs of every route (section 5.2), so a change
  to the tool runs the whole suite.

## 4. Running a route deterministically

A route runs on a build of the app, never a dev server:

- The build is the tree's own production build of `graphty/` (nx caches it, so an unchanged tree
  costs nothing), copied to a frozen folder as the studio's freeze does, and served by `real.mjs`
  through `REAL_DIST`.
- The window is 1440 x 900, the color scheme light, a clean browser profile per route, the GPU
  renderer checked and recorded.
- `real.mjs --replay <route> <folder> --end-on-diverge` with `REAL_MISS_FAILS=1` runs it: a name
  that matches nothing fails the step instead of passing a check it never reached.
- After each step the tool already waits for the page to take the step and for the drawing to
  settle, and saves `NN.png`. Nothing new is needed for the screenshots themselves.
- Each route also records which source files it ran (section 5.3).

The result of a route run is its **capture**: the numbered screenshots, `replay.json` (steps
matched, where it diverged), the outcome checks' results, the style tree records and the coverage
record. Captures are kept in the main checkout under `tmp/acceptance/captures/<route>/<key>/`,
where `<key>` is the route's input key (section 6), so every worktree shares them and a capture is
never made twice for identical inputs. They are removed after 14 days, as pass records are.

## 5. Which routes a change affects

### 5.1 The rule

A change affects a route when it changes anything the route's run reads. The selection is
deterministic: the same change always selects the same routes.

### 5.2 Level one: packages, by the gate's own input keys

The route's package-level inputs are computed exactly as `tools/prepush-inputs.mjs` computes a test
shard's: the shard definition (here, the route file and its `tasks.json` entry), the Node version,
the lane environment, the installed lockfile, the gate's version, every file outside the
workspace packages, every file of the `graphty` package and of each package it is related to (the
closure of nx's project graph and of path references, `related()`), and their build outputs. Added
to that: `design/ui/studio/tool/` (the tool) and the data and setup files the route names.

If a change touches none of those, no route is affected and the acceptance lane does nothing.
That is the common case for a change to `webgpu-graph-algorithms`' Node lanes, `visual-review`,
`githerd`, CI workflows that are not shared globals, and documentation.

### 5.3 Level two: the source files each route actually runs

The graphty app reaches almost every package (graphty-element, algorithms, layout, graph-io,
graph-format, compact-mantine), so at package level nearly every app or element change would run
all 90 routes. The finer level is new, and is the browser analog of the Vitest `related` mode that
fast-pipeline section 5.1 uses for unit tests:

- While a route runs, the tool collects the browser's JavaScript coverage (Playwright's
  `page.coverage`, which Chromium supports) and CSS coverage, and maps the bundle ranges back to
  source files through the build's source maps (`graphty/vite.config.ts` already builds them).
  The record is the set of source files the route executed, kept in the route's capture.
- A change selects a route when a changed file is in that route's recorded set from the base
  capture (the capture of the same route on the commit the change is measured from).
- Changes the coverage cannot see go through fast-pipeline's rules file (section 5.1 step 3), with
  one addition: a changed file in the `graphty` package closure that is not JavaScript or
  TypeScript (CSS not in the coverage, fonts, images, `public/`, HTML, the app's words files) selects
  every route of the package it is in. A changed data or setup file selects the routes that name it.
- **Fail safe.** No base capture with a coverage record, a coverage record older than the base, or
  a changed file that no rule and no record accounts for: every route the package level selected
  runs. A miss costs minutes; a skip that should have run costs a broken task.

Function-level selection (a route runs only if a changed function ran) is left out. File level is
enough to cut most runs, and finer selection can be added when the measured run time says so.

### 5.4 Reusing passes

A route that passed on identical inputs does not run again. Its pass is recorded with the existing
`node tools/prepush-inputs.mjs record` under a new kind, `route`, in the main checkout's
`tmp/prepush-passes/route/<key>.json`, beside the existing `source`, `gate` and `shard` kinds. The
key is the package-level input key of section 5.2, so a clean merge of a branch into golden, whose
tree is the one the branch tested, reuses the branch's route passes on landing and in
verification, as it does for test shards.

## 6. What is reused from the gate input keys work, and what is new

**Reused, unchanged:**

- `treeFiles()`, `gateContext()`, `laneEnv()` and `related()` from `tools/prepush-inputs.mjs`, to
  compute a route's package-level inputs.
- `inputKey()` itself, with a route's file and its `tasks.json` entry passed as the shard
  definition and the `graphty` package as the shard's package.
- The pass records (`passed` and `record`) and their store in `tmp/prepush-passes/`, with a new kind
  name.
- nx's project graph, through `prepush-inputs.mjs`'s own `projectGraph()`, for which packages are
  affected.
- The push base logic (`tools/push-base.mjs`, `keyBase()`): a route's change set is measured from
  the same base the rest of the gate uses, so a branch stacked on another is judged only on its own
  commits.
- The fast-pipeline selector's rules file for hidden inputs, and its advisory rollout (section 12).
- `tools/with-browser.sh` for every browser, and the wait log `tmp/waits.jsonl` #3266 adds, which
  records the acceptance lane's slot waits like any other.

**New:**

- Per-route coverage records and the file-level selection over them (section 5.3).
- The `route` pass kind and the capture store `tmp/acceptance/captures/`.
- The screenshot comparison and the judging step (sections 7 and 8).
- One new tool, `tools/acceptance.mjs`, with the commands in section 9. It is a thin layer over
  `real.mjs --replay`, `pixel-diff.mjs` and `prepush-inputs.mjs`; it does not drive a browser
  itself.
- One new study-tool step, `--expect-style` (section 3.4).

There is no second affected-package calculation, no second key format and no second pass store.

## 7. Screenshot comparison and when an agent is called

### 7.1 What is compared

For each selected route, the tool runs it on the change (the **head**) and finds the capture of the
same route on the base (the commit the change is measured from). If the base capture is missing, it
builds the base tree and captures it first; that capture is then shared by every later run on the
same base.

Step N of the head is compared with step N of the base, with `tools/pixel-diff.mjs` at its default
threshold. The comparison splits the screen in two:

- **The interface** (everything outside the graph canvas) is compared pixel by pixel.
- **The graph canvas** is compared pixel by pixel only for routes whose drawing proved stable
  (section 7.3). For the others it is compared by facts instead: the style tree records (which
  layers, how many nodes each paints, the distinct node colors drawn) and the replay's own check
  points. The start page's turning demo drawing is always compared by facts, since it turns.

### 7.2 What happens at each step

| What the step shows                                                                              | What happens                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same picture, same check points                                                                  | Nothing. The step passes with no model                                                                                                                                 |
| The script broke: a name missing, a check failed, the step printed something new (replay exit 5) | The step goes to the judge                                                                                                                                             |
| The picture changed above the threshold                                                          | The step is run again once on the same head. If it changes between two runs of the same build, it is unstable (section 11), not judged. Otherwise it goes to the judge |
| An outcome check failed                                                                          | Always a bug; it fails the run without a judge. Outcome checks are the answer key's own success state                                                                  |

Only the first changed or broken step of a route is judged as the cause; the steps after it in the
same route are shown to the judge as context, since one change usually shifts every later picture.

### 7.3 Proving a route stable

A route is "canvas-stable" when two runs of it on the same build give pixel-identical canvases at
every step (within the threshold). The tool checks this once per route when the route enters the
suite and again whenever an unstable step is seen. Routes with an unseeded layout, a turning camera
or GPU dithering on the canvas stay "facts only" on the canvas. The app may set a layout seed of its
own (an application choice under graphty-element's rules); the tests never force one.

## 8. What the agent decides, and where its verdict goes

### 8.1 Who the agent is

The acceptance tool never calls a model itself, and the pre-push gate runs no model. When steps need
judging, the tool writes one judging request per route into the run's folder and stops with a
distinct exit status ("needs judgment"). The session that ran it (the branch's own session, or the
pipeline round for verification) starts a fresh-context subagent with that request. On a branch,
this is the same fresh-context reviewer fast-pipeline section 4.1 already runs over the branch's
diff; judging the changed steps becomes part of its review. A fresh context matters: the session
that wrote the change would judge its own work.

### 8.2 What the agent sees

- the task's text from `tasks.md` and its answer-key section from `answers.md`;
- for the changed step and the step before it: the base screenshot, the head screenshot and the
  diff image, and what the step printed on each build;
- the base and head style tree facts for that step;
- the branch's commit messages and the list of files changed since the base, with the diff of the
  files the route's coverage record names;
- the binding decisions in the tier's `decided.md`, so a decided behavior is not reported as a defect.

### 8.3 The verdicts

Each judged step gets exactly one verdict, with a one-line reason that cites the commit or the
answer-key line it rests on:

- **bug**: the change breaks or degrades the task (a control gone, a wrong count, focus lost, an
  error, a layout regression nobody asked for). The run fails.
- **intended**: the change is what a commit on the branch says it does, and the task still
  succeeds. "Intended" must name the commit; a change no commit explains cannot be intended. The
  run passes for that step, and the route is re-recorded from that step in the same branch
  (section 3.5).
- **usability**: the change works as intended but makes the task harder for a person (more steps,
  a less clear name, something pushed out of view). It does not fail the run.
- **cannot tell**: the agent cannot decide from what it saw. It fails the run, and the session looks
  at it itself; it is never read as a pass.

### 8.4 Where verdicts go

- `verdicts.json` in the run's folder (`tmp/acceptance/runs/<run>/`), one entry per judged step,
  beside the request and the images. The tool reads it back: rerunning the same head with the same
  base reuses verdicts already given instead of asking again.
- **bug** and **cannot tell**: the run's failure output names each step, its screenshots and the
  reason. The branch's session fixes the bug on its branch, as with any failing test.
- **intended**: recorded in the commit that re-records the route (the commit message names the
  step and the reason), so the next base capture already shows the new picture.
- **usability**: one comment on the branch's issue listing each finding with its screenshots, and,
  when a study tier is open, a line in that tier's `backlog.md`, which the studio's next round
  already reads.
- A one-line summary of the run (routes run, steps judged, verdict counts) goes into the branch's
  progress note through `tools/branch-note.mjs`.

These are not owner-approved baselines. The owner's screenshot approval in visual-review covers
Storybook stories and is signed; an app walk's verdict is an agent's judgment, its "baseline" is
just the previous build's capture, and nothing here writes to `visual-baselines/` or
`visual-review-approvals/`. Folding app walks into visual-review would put an agent's decisions
where only the owner's may go.

## 9. The command

One tool, `tools/acceptance.mjs`, used by the gate, the studio and agents by hand:

```bash
node tools/acceptance.mjs run              # the routes the change affects (section 5), the default
node tools/acceptance.mjs run --wide       # every route of every package the branch changed (package level)
node tools/acceptance.mjs run --all        # every route in the suite
node tools/acceptance.mjs run --tasks T38,T46   # only these tasks' routes
node tools/acceptance.mjs select           # print the selected routes and why, run nothing
node tools/acceptance.mjs verdicts <run>   # read the judge's verdicts.json back and finish the run
```

Every form measures from the push base, takes browsers through `tools/with-browser.sh`, reuses
passes and captures, and exits 0 (all passed), 1 (a bug, a failed outcome check, or cannot tell),
3 (needs judgment: requests written) or 4 (could not run: no GPU, no build, no base capture
possible). `--dist <dir>` runs against a frozen build instead of building the tree, for the studio.

## 10. How it fits the rest of the pipeline

### 10.1 The fast check and the pre-push gate

The acceptance routes are a lane, like the local NVIDIA lane (fast-pipeline section 5.1 already
puts "GPU, browsers, local servers" in lanes): they need this machine's GPU and browsers, never run
in GitHub CI, and are skipped on a machine without the GPU with a loud "not run" line.

- In the branch's fast check, `acceptance.mjs run` runs after the build and the selected unit tests.
  Exit 3 makes the fast check report "needs judgment"; the branch's session runs the reviewer, then
  `acceptance.mjs verdicts`, and the fast check passes once no bug or cannot-tell remains.
- `land.mjs` refuses a branch whose affected routes have no recorded pass on its tree, as it refuses
  a branch with no fast-check pass.
- Under the landing lock nothing new runs: the landing push's tree equals the branch's, so the route
  passes are reused (section 5.4).

### 10.2 Verification of golden

Verification (fast-pipeline section 4.3) runs `acceptance.mjs run` for its range after each landing.
Its captures become the base captures for every branch that later merges that golden commit, which
is what keeps a branch's base capture usually already present. A failure there is bisected and the
culprit reverted, as for any shard, and the pipeline round runs the judge when verification stops
with "needs judgment".

### 10.3 The design studio

The dry run keeps its purpose and loses its mechanical walking:

1. After a build is frozen, the workflow runs `acceptance.mjs run --all --dist <frozen build>` in
   place of the first full pilot pass's hand walks and in place of `real.mjs --rewalk` in the
   targeted re-pilots.
2. A route that passed needs no pilot: its earlier report stands, as a matched `--rewalk` does today.
3. A route that diverged, and every task half or detour that has no route yet, gets a pilot agent,
   which carries on from where the script stopped and records the new route.
4. The judge's verdicts go to the dry-run triage (`tier<N>/dry-run-r<r>-<pass>.md`) as findings.
5. The pilots still walk each task by keyboard where its keyboard route diverged, and still check
   every field's Enter, Tab and Escape where the scripts do not.

`bars.mjs`, `score.mjs`, the study's sessions, grading, the expert walkthroughs and the screenshot
audit are unchanged. The workflow's change is limited to `pilotAll()` and the re-pilot step in
`.claude/workflows/design-studio.js`, and to the dry-run lines of the design-studio skill.

### 10.4 Long-running branches

There is no automatic wider sweep. Nothing runs on a branch's age, size or drift since golden, and
the acceptance tests do not hook into the nightly branch sync (`design/ci/branch-sync.md`, branch
`infra/3266-branch-sync`): the sync's own check of a branch runs the branch's affected build, lint
and test shards and leaves the acceptance lane to the branch's owner. The automatic runs, on a
branch and in verification, cover only the routes a change affects.

The command for every route is `node tools/acceptance.mjs run --all` (or `graphty/acceptance/run.mjs`):
`pnpm run check:quick --with-dry-run` (issue #3269), with the same occasions as below.

The agent that owns a long-running branch decides when to run wider, and runs it with
`acceptance.mjs run --wide` or `--all`. The guidance, written into CLAUDE.md ("Landing changes"),
the design-studio skill and the issue-round skill's prompt for the subagents it starts:

- **Before landing** a branch that has been open more than about two days or holds more than a day
  of work: `--wide`.
- **After merging golden into the branch**, when the merge brought in app or graphty-element changes
  or needed conflicts resolved: `--wide`.
- **After a large change** on the branch: a refactor of a shared component, a dependency or
  lockfile upgrade, a change to graphty-element's styling, layout or rendering paths, or a change
  to the study tool: `--all`.
- **When the affected run looks too small to be true**, for example it selected nothing for a change
  the agent knows reaches the app: `--wide`, and report the selector miss (section 12).

A wide run's result is recorded and judged like any other, and its passes are reused by the landing.
fast-pipeline section 4.4's rule "before landing a branch older than two days or marked long-lived,
and in verification of a range containing one" is replaced by this guidance (section 13).

## 11. Failure cases

| Case                                              | What happens                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No GPU, or the renderer is software               | The route fails at start with the reason (the study tool already refuses a software renderer). The lane reports "not run"; the branch cannot land until it runs. Never a silent software fallback                                                 |
| A step changes between two runs of the same build | Marked unstable, not judged. The route's canvas goes to facts-only (section 7.3); an unstable interface step is a real defect in the app (a race, an animation the settle check misses) and is filed as one                                       |
| A slow machine                                    | The study tool's waits and "slow click (landed)" handling already absorb load; a route that times out is rerun once, and a second timeout is reported with the wait log, never called a flake without a mechanism                                 |
| The base capture is missing                       | The base tree is built (nx cache) and captured, then shared. Costs one extra run of the selected routes                                                                                                                                           |
| The coverage record is missing or stale           | Every route the package level selected runs (section 5.3)                                                                                                                                                                                         |
| A change to a file the selector cannot see        | The rules file and the non-script rule catch known kinds; a miss found later adds a rule in the same fix (section 12)                                                                                                                             |
| The judge says "intended" for a real bug          | The answer key's outcome checks still fail a broken task, whatever the judge says. A wrong verdict on a cosmetic change is found by verification, the studio's pilots or its sessions; every verdict is kept with its reason, so it can be traced |
| No session runs the judge                         | The fast check stays at "needs judgment" and the branch does not land. Nothing passes without a verdict                                                                                                                                           |
| Many routes break at once (a redesign)            | The judge's verdicts are mostly "intended"; the branch re-records the routes in the same branch. If more than about a third of the suite diverges, the branch's session re-records with `--all` before landing rather than one route at a time    |
| A route's task was removed from the app           | The route is deleted in a commit that names the removal; its outcome checks go with it, in that commit only                                                                                                                                       |
| Disk                                              | A full capture of the suite is about 1,350 screenshots, roughly 400 MB; captures and runs are pruned after 14 days, as pass records are                                                                                                           |
| Browser slots                                     | Routes queue in `with-browser.sh` like any browser; a study round's participants keep their priority (slots 5 to 8 are the studio's alone)                                                                                                        |

## 12. What stays manual

- Study sessions: simulated participants explore freely; nothing here scripts them.
- Grading, expert walkthroughs, the screenshot audit, critique and the owner's decisions.
- Writing a tier's tasks, answer key and outcome checks.
- The first walk of a new task half or detour, by a pilot agent, which then becomes a route.
- Re-recording a route after an intended change.
- Judging changed steps, by an agent; reading the judge's "cannot tell" results, by the branch's
  session.
- Choosing a wide or full run on a long-running branch (section 10.4).
- The owner's screenshot approval of Storybook stories, in visual-review, unchanged.

## 13. Changes to the fast pipeline design

Two points of `design/ci/fast-pipeline.md` section 4.4 change:

1. **Screenshots.** Section 4.4 says the dry-run script never captures screenshots. Here it does, at
   every step, because a change nobody intended often keeps every control name and only shows in
   the picture. The canvas is compared by facts where it is not stable (section 7.3), which is the
   risk that line guarded against.
2. **When it runs.** Section 4.4 runs the script before landing a branch older than two days and in
   verification of a range containing one. Here the automatic runs are selected by change, on every
   branch and in every verification, and wider runs on long-running branches are the owning agent's
   decision (section 10.4).

The rest of section 4.4 stands: routes from the start page and never by URL, outcome checks read
through graphty-element's public API or the accessibility tree, the NVIDIA card checked, the shared
browser cap, protected outcome checks, and every studio defect becoming a route.

## 14. Costs

Estimates, from the measurements in section 1 and fast-pipeline section 4.4. Model tokens are
estimated; nothing here has been measured on a real judge yet.

**Time on this machine:**

| Run                                                            | Routes                   | Time                                                          |
| -------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------- |
| A change outside the app's package closure                     | 0                        | under 5 s (selection only)                                    |
| A typical app or graphty-element change (file-level selection) | about 5 to 30            | 1 to 4 minutes at 4 browsers, plus the build if not cached    |
| `--wide` on a branch that touched the app and graphty-element  | about 30 to 90           | 4 to 12 minutes at 4 browsers                                 |
| `--all` (tier 3's suite)                                       | about 90                 | 6 to 12 minutes at 4 browsers, about 4 to 6 at 8 GPU browsers |
| A missing base capture                                         | the same routes again    | doubles the above, once per base                              |
| Pixel comparison                                               | about 15 steps per route | about 0.2 s per step, run beside the browsers                 |

Against today's full pilot pass of about 3.3 hours, and three days of dry-run passes for tier 3.

**Tokens:**

- A judged step: two full-window screenshots and a diff image (about 1,700 tokens each at 1440 x
  900), the answer-key section (3,000 to 5,000), the change summary and coverage-scoped diff (2,000
  to 8,000) and the instructions (about 2,000): about 15,000 to 20,000 input tokens and under 1,000
  output tokens. Steps of the same route are judged in one request, about 25,000 to 40,000 tokens a
  route.
- A typical change with nothing changed on screen: no tokens.
- A typical UI change: 1 to 5 routes judged, about 40,000 to 200,000 tokens.
- A redesign with 30 routes judged: about 1 million tokens.
- For comparison, a hand walk keeps every screenshot of every step in its context; at about 15
  steps and a growing context, roughly 150,000 to 300,000 tokens a walk (estimated), so a 90-walk
  pilot pass is on the order of 15 to 25 million tokens.

## 15. Rollout

Each step is useful alone and lands separately, after #3266 (input keys) has landed.

1. **Measure determinism.** Run each tier 3 route twice on the same frozen build and record which
   steps' interface and canvas are pixel-stable. This decides the canvas rule per route (section
   7.3) before anything depends on it.
2. **The suite.** Promote tier 3's newest pilot routes into `graphty/acceptance/`, write the missing
   ones from the answer key, add the outcome checks and `--expect-style`, and the check that
   protects outcome checks.
3. **The runner without a model.** `tools/acceptance.mjs run --all` and `--tasks`, captures, pixel
   comparison, the `route` pass kind. Used by hand and by the studio's dry run (section 10.3) first,
   where it replaces `--rewalk`.
4. **The judge.** Requests, the reviewer subagent's verdicts, `verdicts.json`, the issue comment, the
   backlog line and the branch note.
5. **Selection, advisory.** Coverage records and file-level selection, logged beside `--all` runs on
   every golden verification, as fast-pipeline section 5.2 does for unit tests: every route the
   selector skipped but `--all` found changed is a miss, and adds a rule. It gates nothing yet.
6. **Selection gating.** After two weeks of golden landings with zero misses: the affected run joins
   the fast check and verification, and `land.mjs` requires the route passes.
7. **Guidance.** The long-running branch rules of section 10.4 go into CLAUDE.md, the design-studio
   skill and the issue-round skill's subagent prompt, and fast-pipeline section 4.4 is amended as
   section 13 says.
