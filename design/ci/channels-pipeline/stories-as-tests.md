# Stories as tests: screenshots taken and compared inside each story's test

Part of the channels pipeline design (canary.graphty.app = master, nightly.graphty.app,
graphty.app = production). This section covers how Storybook screenshots are taken, compared,
selected, recorded and approved once every branch reaches master through its own pull request.

## 1. What changes, in one paragraph

Today a story is rendered twice per CI run: once by its Vitest test (the `storybook` Vitest
projects, which run every story's play function) and once by the separate screenshot capture
(`visual-review/capture/capture.mjs`, one `visual (<project>)` job per Storybook in
`.github/workflows/ci.yml`, after a full `build-storybook`). After this change the test is the
capture: at the end of each story's test, after the play function and the readiness waits, the
test takes the screenshot, compares it with the baseline in `visual-baselines/<project>/`, and
records the result. A pull request runs only the stories its change can reach and never waits for
the owner. The full capture of every story runs in the 6-hourly full run on master's tip, and the
owner's passkey-signed approval of changed screenshots gates the promotion of canary to nightly,
not the merge.

## 2. The record this answers

| What went wrong                                                  | Measured                                                                                                                                     | Answer here                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The screenshot verdict was the only failing job                  | 29 of 53 real ci.yml runs since 2026-10-18 (tmp/failure-position/ci-out.txt)                                                                 | A changed image never fails a pull request; "waiting for the owner" is a promotion state, not a red check (section 7)                   |
| Approval per pull request or per cut, redone when anything moved | 5,099 changed images decided in 25 days, 3 to 6 Finish rounds per cut (#3234, #3238, #3246, #3321)                                           | One review per promotion; a decision is keyed by capture hash and carries to the next candidate when the bytes are the same (section 7) |
| Every Storybook captured though the change could reach only one  | About 453 runner hours a week before tools/visual-capture-plan.mjs; captures take 51 runner minutes per full run                             | Per-story selection by the import graph (section 5)                                                                                     |
| Every story rendered twice, plus a Storybook build per run       | Capture jobs start 7.8 min into a run and finish at 18.8 min (median); graph-io-fidelity alone to 29.7 min                                   | One render per story; no `build-storybook` on a pull request                                                                            |
| Local and CI screenshots differed                                | Host fonts: 0 of 198 graphty-element captures matched CI; pinned fonts: 1,432 of 1,432 (design/visual-testing/local-previews.md, 2026-10-04) | Parity is checked mechanically on every run and every mismatch is filed as a bug (section 8)                                            |
| A one-off timeout was retried silently                           | `shoot()` in capture.mjs retries a failed render once in a new context                                                                       | No hidden retry; flakiness is judged by evidence against the same baseline hash (section 6)                                             |

## 3. The story test, step by step

The visual step is a Storybook project annotation, `afterEach`, added only in each project's
`.storybook/vitest.setup.ts` (so Storybook's own UI never runs it). It runs after the story's play
function has finished, while the story is still mounted. Each step mirrors one step of today's
`shootOnce()` in `visual-review/capture/capture.mjs`, so the bytes can stay identical:

| Today (capture.mjs)                                                                                                                   | In the story test                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh Playwright context: 1200 x 900, `deviceScaleFactor: 2`, `timezoneId: "UTC"`, `locale: "en-US"`                                  | Vitest `browser.viewport: { width: 1200, height: 900 }`; the Playwright provider's `contextOptions` set the same scale, time zone and locale                                                                                                                                                        |
| `CHROMIUM_ARGS` (SwiftShader WebGL, CPU rasterization, sRGB, no LCD text, no hinting)                                                 | The provider's `launchOptions.args` import the same exported `CHROMIUM_ARGS`                                                                                                                                                                                                                        |
| `FONTCONFIG_FILE=visual-fonts/fonts.conf`, a private font cache, `TZ=UTC`                                                             | `launchOptions.env`, built by the exported `pinnedFonts()`; the run's font fingerprint goes into results.json `environment.fonts` as today                                                                                                                                                          |
| `navigator.gpu` deleted by an init script                                                                                             | Deleted at the top of `vitest.setup.ts`, before any story module loads                                                                                                                                                                                                                              |
| `?chromatic=true` so `isChromatic()` is true                                                                                          | `history.replaceState` adds `chromatic=true` to the tester page's URL in `vitest.setup.ts`, so stories that branch on `isChromatic()` (graphty/.storybook/preview.tsx, graphty-element/stories/helpers.ts, cytoscape-extensions/stories/demo.ts and three more) draw what they draw for the capture |
| Clock installed at 2026-01-01T12:00:00Z, then resumed                                                                                 | `vi.useFakeTimers({ now: CLOCK_START, toFake: ["Date"], shouldAdvanceTime: true })` before each story renders: the same fixed start that keeps running                                                                                                                                              |
| Wait for Storybook's render phase, error display means `failed`                                                                       | The story test itself: a render error or a failed play fails the test                                                                                                                                                                                                                               |
| `document.fonts.ready`, one frame, `document.fonts.ready`                                                                             | The same three lines                                                                                                                                                                                                                                                                                |
| Project `waitFor` (graphty-element's `waitForStableFrame`, cytoscape-extensions' and graph-io-fidelity's `whenDone`), `failOnConsole` | Read from the same `visual-review.config.json` entry; console lines are collected by a wrapper the setup file installs                                                                                                                                                                              |
| `parameters.chromatic.delay`                                                                                                          | Same parameter, same wait (19 story files set one; each is a fixed wait and is recorded as debt to replace with a condition, never added to)                                                                                                                                                        |
| `screenshotWholePage()`: throwaway 1 x 1 shot, two frames, measure, full page, slices of 8,192 device px stitched with pngjs filter 4 | A Vitest browser command (runs in Node with Playwright's page): the same throwaway shot and two frames, then the tester frame is resized to the measured scroll size and screenshotted; tall pages use the same slicing and stitching code                                                          |
| Modes (`parameters.chromatic.modes`, graphty's light and dark)                                                                        | The hook re-renders the composed story with each mode's globals and shoots each; file names from the exported `fileName(id, mode)`                                                                                                                                                                  |

The comparison runs in the same Node command, with today's code unchanged:
`readBaseline()`, `classify()` and `sha256()` from `visual-review/trusted/lib/compare.mjs`, the
story's threshold from the exported `storySettings()`, renames from the project's `renames.json`.
When the first shot differs from the baseline (or there is none), the hook unmounts the story,
renders it again and shoots again, and `classify()` gets both shots, exactly as capture.mjs does
today: `unchanged` (with `flaky: true` when only the second matched), `changed`, `new`, or
`unstable`.

What the test does with the result:

| Status                                                       | Test outcome on a pull request and in the full run                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `unchanged`, `moved`, `excluded`                             | Passes                                                                                                    |
| `changed`, `new`                                             | Passes. The image is written for review (section 4). It never blocks a merge                              |
| `unstable` (two shots disagree)                              | Fails. An image that is not reproducible is a determinism defect, handled like any flaky test (section 6) |
| `failed` (render error, never settled, `failOnConsole` line) | Fails, as the play test does today                                                                        |

Code location: one new module, `visual-review/capture/story-test.mjs`, exporting the browser
command (`visualShot`), the annotation (`visualAfterEach(project)`), the provider options
(`visualBrowserOptions(config, project)`) and the results reporter. It is published as a new entry
point, `@graphty/visual-review/vitest` (additive, so decided here, not asked), so any Storybook
user of visual-review gets the same thing. capture.mjs exports the constants and functions above
instead of keeping them private; nothing in `visual-review/trusted/` changes.

## 4. Output: the same results.json, so the review page and the gate need no change

The reporter writes exactly what capture.mjs writes today, per project: `results.json` (validated
by `validateResults()` in `visual-review/trusted/lib/results.mjs` before it is marked complete),
the capture of every changed, new and unstable item, `second/<file>` for unstable ones and
`baselines/<file>` for the compared baseline. It is uploaded as the same artifact name,
`visual-<project>-<attempt>`, so `visual-review serve` and `gate` read it unchanged.

Two additions, both written only by the new code:

- A sharded project (graphty-element's storybook project runs as 5 shards) writes one partial
  directory per shard; `visual-review merge-results --project <p> <dir>...` combines them. It
  marks the result complete only when every story of the project's index appears exactly once, so
  a killed shard yields an incomplete result, which the gate already refuses.
- A pull request's results carry `"selection": { "base": "<sha>", "stories": <n>, "reason": ... }`
  and list only the stories that ran. The review page shows such a result as a look-only preview
  (one condition in `serve.mjs`), never as something to Finish.

## 5. Which stories run

**On a pull request:** the storybook Vitest projects take part in the same changed-test
selection as every other test (the fast-testing section of this design): each `*.stories.*` file
is a test file, so a story file runs when its import closure contains a changed file. Selection
is per story file, every story and mode in it. Three extra rules, kept in the selector's rule
file (today `tools/test-select-rules.json`):

1. **Global inputs run every story of the project:** its `.storybook/**` (preview, main,
   preview-head, vitest.setup), its `vitest.config.ts`, `visual-review.config.json`,
   `visual-fonts/**`, `visual-review/capture/**`, `visual-review/trusted/lib/compare.mjs`,
   `pnpm-lock.yaml` (a Playwright or Chromium bump changes every image), and the shared theme
   (compact-mantine's theme for graphty and compact-mantine; graphty-element's `src/` for
   algorithms, layout, graphty and graph-io-fidelity, as `tools/visual-capture-plan.mjs` maps them
   today).
2. **A changed baseline runs its story:** a change under `visual-baselines/<project>/<id>*.png`
   (the owner's accept commit) runs that story, so the accept pull request proves the new baseline
   matches.
3. **Unknown means run:** a file in the project that no import graph explains (data fetched by
   URL, `staticDirs`, `new URL(..., import.meta.url)` that the graph builder could not follow)
   runs every story of the project. Selection can only make a run longer, never skip an affected
   story silently.

Baselines are fetched only for what runs: the job runs `git lfs pull --include` with the selected
stories' files instead of the whole project (graph-io-fidelity's baselines are 437 MB, graphty's
285 MB; all seven projects 880 MB), with the existing `actions/cache` keyed by the files' hashes.

**In the full run every 6 hours:** every story of every project, in both shards layouts as
defined in `tools/ci-test-matrix.mjs`, plus `merge-results`. This is the capture the owner
reviews and the gate judges. An owner-triggered out-of-schedule full run (the hotfix path) is the
same run.

**Feature flags:** screenshots are taken in the everything-off configuration only, so baselines
show today's behavior and turning a flag on in the app cannot change a baseline. The
everything-on configuration runs the same story tests without the visual step. A story written
for an experimental feature switches the feature on in its own args and is screenshotted like any
story (decided here; reversible).

## 6. Results in the test results service, keyed by baseline hash

Each story test job sends its visual items with its test-group record to the shared test-results
store (the Cloudflare Worker and D1 database defined in the store section), as its last step, and
sends each `unstable` or `failed` item the moment it happens. Calls time out fast and fail open:
the comparison against the baseline file in the checkout decides the test either way, and an
unreachable store only loses history.

One row per story and mode per run, in table `visual_items`:

```
run_id        TEXT  -- the test-group run (commit, inputs key, job, attempt) from the store section
project       TEXT  -- "graphty"
file          TEXT  -- "app-shell--default.dark.png"
baseline_sha  TEXT  -- SHA-256 of the baseline compared with; NULL for a new story
capture_sha   TEXT  -- SHA-256 of the shot the status describes
second_sha    TEXT  -- second shot when one was taken, else NULL
status        TEXT  -- unchanged | moved | changed | new | unstable | failed | excluded
changed_px    INTEGER
env_key       TEXT  -- SHA-256 of {fonts fingerprint, Playwright and Chromium version, WebGL
                    --   renderer string, emoji font present, runner ImageOS and ImageVersion}
pr            INTEGER -- the pull request, NULL on master runs
```

Volume: about 2,480 rows per full run (one per baseline today), 4 full runs a day, about 10,000
rows and 2 MB a day; pull request runs add only the selected stories. A year is under 1 GB, inside
D1's 10 GB per database. The images themselves stay in GitHub Actions artifacts, as today; only
changed, new and unstable images are uploaded.

Questions the store answers, each by evidence and never by timing:

- **Unstable story:** for one `(file, baseline_sha, inputs key, env_key)`, two different
  `capture_sha` values, or both `unchanged` and `changed`. Approving a new picture changes
  `baseline_sha` and so starts a new history. It is a flaky test: `priority:critical` issue,
  quarantine as for any test (store section), fixed by finding the mechanism (a frame that is not
  settled, a race in the story's data, state leaking from the previous story in the file), never
  by raising a threshold or adding a delay.
- **Which pull request changed an image:** the first master or pull request run whose
  `capture_sha` for that file differs from `baseline_sha` names its merge. The review page shows
  it beside each changed image, so a rejected image points at the pull request to revert or fix.
- **Environment mismatch:** same commit, inputs key and file, different `env_key`, different
  `capture_sha` (section 8).

## 7. Approval and the gate, at canary to nightly

What visual-review keeps, unchanged: the review page (`visual-review serve`, run from the main
checkout under servherd as today), decisions, Finish, passkey signing (`approval.mjs`,
`passkeys.json`), the signed tree approvals in `visual-review-approvals/<tree>.json`, the review
records in `visual-baselines/reviews/`, renames, the gate (`visual-review/trusted/gate.mjs`), the
`notify` push notification, and baselines and fonts in Git LFS. Agents still never edit `gate.mjs`,
`approval.mjs` or `passkeys.json`, never press Accept or Finish, and never write under
`visual-baselines/` or `visual-review-approvals/`.

The flow for a full run on master's tip, commit C:

1. **Every project `unchanged`:** nothing to approve; canary promotes to nightly automatically
   (with every other lane green).
2. **Some images `changed` or `new`:** the promotion is in the state "waiting for screenshot
   approval": a pending commit status `promotion/screenshots` on C, not a failure, so the pipeline
   round has nothing to fix. `visual-review notify` sends one push notification. The review page
   offers C's full run (today's `--master-run <run id>` path, renamed `--candidate`).
3. **Decisions carry over by hash:** when a newer full run C2 starts while the owner is
   reviewing, the page moves to C2, and every item whose `capture_sha` the owner already decided
   arrives decided. An image that changed three times between promotions is looked at once, and a
   Finish round is never repeated for an image whose bytes did not change.
4. **Finish** commits the accepted PNGs, the review record and the signed approval as one accept
   commit A whose parent is C, on branch `visual/approve-<C short sha>`, pushed by the review
   server as it pushes accept commits today, and opens a pull request from it to master that
   merges on the light checks (channels section, "Promotion to nightly"). A differs from C only
   under `visual-baselines/` and `visual-review-approvals/`; parenting it on C, not on master's
   tip, keeps that true however far master has moved, and the merge into master is an ordinary
   merge (never a rebase). A conflict (a later pull request changed the same baseline) is resolved
   with the existing `visual-review update <pr>`.
5. **The accept pull request's light checks** run exactly the stories whose baselines changed
   (rule 2 of section 5) against A's baselines; each now reads `unchanged`. Their results are the
   artifact the resume step needs.
6. **The resume step** (release.yml with `mode: promote-nightly`, channels section) cannot hand
   the gate C's own capture: those results say `changed` for exactly the images the owner
   approved, and the gate passes only `unchanged` and `excluded`. So it first overlays the accept
   pull request's re-check on C's full results with `merge-results` (sound because A's code is
   C's code; the step checks that `git diff --name-only C A` holds only those two directories),
   then runs the gate unchanged, from the promoted side so a candidate cannot loosen it:
   `git archive <channel/nightly> visual-review/trusted | tar -x -C "$gate"`, then
   `node "$gate/visual-review/trusted/cli.mjs" gate --captures <overlaid dir> --base <channel/nightly> --head A`.
   A is in master's history once its pull request merged, so the gate's ancestry rule holds.
7. **Rejected images:** the review page names the pull request that changed each one (section 6);
   the pipeline round reverts it or fixes forward on master, and the next full run is the next
   candidate.

The gate step moves out of ci.yml into the promotion workflow; ci.yml's pull request runs have no
gate step at all. That edit touches the gate step, which is the owner's to review; the owner's
decision of 2026-10-24 (approval gates nightly) is the authorization, and the pull request goes
through the CODEOWNERS review that covers `.github/` and `visual-review/`.

**Which capture code judges:** today CI runs the base branch's capture code (`git archive HEAD^1
visual-review/capture visual-review/trusted`), so a change to capture is first exercised by the
run after it. On a pull request the story tests run the pull request's own `story-test.mjs`,
which is acceptable because a pull request's screenshots decide nothing. The full run, whose
captures the gate judges, replaces `visual-review/capture/` and `visual-review/trusted/` with the
copies at the current nightly commit before running the story tests, the same `git archive` step
as today. CODEOWNERS on `visual-review/**`, every `.storybook/**` and every `vitest.config.ts`
means a change there also needs the owner's review before it reaches master.

## 8. Environment parity is a bug class

Rule: a story that draws different bytes in two environments from the same commit and inputs has
a bug, in the environment or in the story. CI's capture is the reference until parity is proven;
the difference is filed and fixed, never absorbed (no per-environment baselines, no raised
threshold, no "CI only" skip).

How mismatches are found, mechanically:

- **CI against CI:** runners differ (AMD EPYC 7763, Xeon 6973P-C, Xeon Platinum 8573C were all
  byte-identical on 2026-10-04). The store compares `env_key` groups on every full run; a split
  files an issue.
- **Local against CI:** `pnpm run test:changed` on the development machine runs the selected
  story tests with the same pinned fonts and Chromium flags and sends its rows with its own
  `env_key`. A story that differs from its baseline locally while its import closure is unchanged
  by the local work cannot be the change's doing: it is a parity mismatch, reported as one, and
  the local test passes with a warning rather than blocking the developer on the environment.
  Locally captured images can be looked at with `visual-review serve --results <dir>` (look-only),
  which replaces the local preview script.
- **Filing:** one issue per `(project, file, env pair)`, labels `bug`, `priority:high`,
  `effort:medium`, with both hashes, both env fingerprints and the pixel box; a comment, not a new
  issue, when it recurs. Known mechanism classes to check first, from the record: a missing or
  host font (the 2026-10-04 emoji box), a font package that changed under the runner image, a
  GPU path drawn where WebGPU exists (why `navigator.gpu` is deleted), sub-pixel glyph placement
  under GPU rasterization (why `--disable-gpu-rasterization`), a font fetched after the first
  frame, and state left by the previous story in the same page.
- **Proven:** a project's parity is proven when two full local runs on different days match
  CI's full run of the same commit byte for byte. From then on a local result can be trusted as
  CI's would be for that project; until then it only informs.

## 9. Migration, project by project, starting with graphty

Each project moves the same way. The old capture stays authoritative for it until it switches,
and the gate does not care which code wrote a results.json.

1. Enable the visual step in the project's storybook Vitest project.
2. In every full run, run both: the old `visual (<project>)` capture and the story tests.
   `visual-review parity --project <p> <old> <new>` compares the two results.json files item by
   item by `capture` hash and fails on any difference, listing it.
3. Each difference is a bug in the new harness or a state-leak bug in a story, fixed at its
   mechanism. No project re-baselines to make the switch easier: that would put hundreds of
   images in front of the owner for no product change.
4. Switch after two consecutive full runs with zero differences: the project's matrix entry
   leaves ci.yml's `visual` job, and its full-run captures come from the story tests.

| Order | Project              | Baselines                  | Today's capture job (median, from first start)   | Work specific to it                                                                                                                                           |
| ----- | -------------------- | -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | graphty              | 399 (light and dark modes) | about 7 min                                      | Storybook project exists (graphty-storybook shard, 2.1 min of Vitest); viewport already 1200 x 900; first user of modes and of `isChromatic()` in preview.tsx |
| 2     | graphty-element      | 275                        | about 6 min                                      | Exists, 5 shards, so first user of `merge-results`; `waitForStableFrame` and the "Graph settled timeout" console rule                                         |
| 3     | compact-mantine      | 1,004                      | about 11 min                                     | Exists; most images, cheapest renders                                                                                                                         |
| 4     | algorithms, layout   | 27, 17                     | about 1.5 min each                               | New storybook Vitest projects (`storybookTest` plugin) and shards in `tools/ci-test-matrix.mjs`                                                               |
| 5     | cytoscape-extensions | 181                        | about 5 min                                      | New project; `whenDone` waits; CPU path only because `navigator.gpu` is deleted                                                                               |
| 6     | graph-io-fidelity    | 575                        | about 19 to 22 min, the longest job of every run | New project with `-c fidelity-stories/.storybook`; LFS baselines 437 MB, so selected-file LFS pulls matter most here                                          |

Estimated cost after the switch, to be measured in step 2 for graphty: the screenshot adds the
shot, PNG encoding and a hash per story and mode (under a second at 2,400 x 1,800 device px), and
a second render only for the few that differ. The full run saves the separate render of every
story (about 51 runner minutes per run today) and, on pull requests, every `build-storybook` used
only for capture. Storybooks are still built for the site deploys, once per full run.

Budgets (in the budgets file of the time-limits section): each storybook shard's existing time
limit stays; the visual step's share is recorded per story in the store, so a story whose shot
time jumps shows up in the trend alarm like any other task.

## 10. Failure modes

| Failure                                                   | Handling                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The store is unreachable or slow                          | Fail open: the test still compares with the checkout's baseline; rows are lost, selection treats missing history as "run"                                                            |
| A baseline is an LFS pointer                              | `readBaseline()` throws with "run git lfs pull"; the test fails with that message                                                                                                    |
| A shard is killed mid-run                                 | Its partial directory is missing; `merge-results` writes an incomplete result; the gate refuses it; the full run's failed job is re-run                                              |
| A story never settles                                     | The test fails (`failed`); there is no silent second try; recurrence is judged in the store                                                                                          |
| Two shots disagree                                        | `unstable`: the test fails, critical flaky-test issue                                                                                                                                |
| A Playwright, Chromium or font bump                       | A global input: every story runs on that pull request; real changes wait for the owner at the next promotion                                                                         |
| A new story                                               | `new`: passes on the pull request, the owner accepts its first baseline at promotion                                                                                                 |
| A story renamed                                           | `renames.json` as today: `moved` when the picture is the same                                                                                                                        |
| A pull request commits a PNG into `visual-baselines/`     | Its story reads `unchanged`, but the gate at promotion refuses a baselines tree without the owner's signed approval of exactly that tree, and CODEOWNERS requires the owner's review |
| A pull request loosens the comparison code                | Its own screenshots decide nothing; the full run uses the capture code at the promoted nightly commit; CODEOWNERS covers the files                                                   |
| The owner has not reviewed yet                            | Pending status; canary keeps moving; the next candidate carries earlier decisions by hash                                                                                            |
| A story's picture depends on the story rendered before it | Found by the parity run (different from the fresh-context capture) or as `unstable`; fixed in the component or story                                                                 |

## 11. What is deleted

After the last project switches:

- ci.yml's `visual` job (about 200 lines: LFS pull, base capture code, Chromium install,
  reference download, capture, upload), the `visual-skip` plumbing in the packages and build jobs,
  and the gate step (moved to the promotion workflow).
- `tools/visual-capture-plan.mjs` and its test (per-story selection replaces per-project skips).
- `tools/visual-preview.sh`, the local preview flow and its `tmp/visual-review/local/` captures
  (the golden pull request it previewed is gone; local look-only review uses `serve --results`).
- `.github/workflows/visual-seed.yml` and the seed pull request: a story with no baseline is
  accepted at promotion like any other new image. The template stays in the package for other
  repositories.
- The `reference` download and the `unseeded` path in this repository's workflows (kept in the
  package).

Kept in the package, unused by this repository's CI: `visual-review capture` (still useful for an
ad hoc `--stories` capture of a built Storybook, and for other consumers).
