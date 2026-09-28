# Visual review: build plan

Date: 2026-09-27

This is the build order for the system that replaces Chromatic's visual review in the graphty
monorepo: Playwright screenshots of every Storybook story, taken in our own GitHub Actions jobs,
compared with baseline PNGs committed to git, and accepted or rejected by the owner in a small web
page served from the development server. `roadmap.md` says what each milestone delivers and why;
`design.md` is the full design. This document covers milestone 1 in detail and outlines the rest.

## Milestone 1: approving again

Goal: by the end of today the owner reviews compact-mantine captures in the review page, accepts
or rejects them, and the accepts are committed baselines on master. graphty-element follows as
soon as its harness pull request (#519) merges: the review of #519 is its seed.

### Shape of the work

- One tooling pull request from the branch `feat/visual-review`, then one seed pull request that
  holds only compact-mantine baselines, then real reviews on waiting pull requests.
- Three agents. Phase 1 comes first and fixes the shared `results.json` format; after it, phases 2,
  3 and 4 run in parallel, each in its own worktree branched from `feat/visual-review` (use
  `tools/worktree-new.sh`) and merged back into it. Phase 4 tests against a committed fixture, so
  it needs nothing from phase 3. Phase 5 needs phases 2 and 3 merged into `feat/visual-review`.
  Phases 6 and 7 need the owner and phase 4a only; phase 4b lands after the seed if the day runs
  short. Nothing in 4a is ever cut to make time.

| Agent               | Phases                                                   | Rough time                                         |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| First               | 1, then 2, then 5 once 3 is merged                       | 2 to 2.5 hours                                     |
| Second              | 3 (capture)                                              | 1.5 to 2 hours                                     |
| Third               | 4a (serve, the page's core), then 4b (the page's extras) | 1.5 to 2 hours, then about 1 hour                  |
| All, with the owner | 6 (seed), 7 (first real review)                          | about 1 hour, most of it CI and the owner's review |

Every phase is written test-first: the tests in "Tests first" are written and seen failing before
the code. Every phase ends with `pnpm exec nx run visual-review:lint`,
`pnpm exec nx run visual-review:test` and `pnpm run lint:knip` green, and pushes through the
normal pre-push gate. Agents never run `git stash`, never check out or switch branches in the main
checkout, never reset a shared branch, and never push to master.

### Decisions for this milestone

These keep milestone 1 small. Each is reversed in a later milestone without rework.

| Decision                                                                                                                                                                                                                                                                                            | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Changed in                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Capture runs as a `visual` job inside `ci.yml`, after the existing build job, reusing the Storybook artifacts it already uploads for all five projects                                                                                                                                              | A `workflow_run` workflow only runs once it is on master, so the design's separate `storybooks.yml` and `visual.yml` could not be tested in the tooling pull request itself. Inside `ci.yml` the pull request's code could alter its own capture; that only matters once approval is enforced                                                                                                                                                                             | Milestone 3                                                                            |
| The capture job has `continue-on-error: true`                                                                                                                                                                                                                                                       | release.yml, deploy-pages.yml and coverage.yml gate on the CI run's overall conclusion, so without it a tool crash on master would block the release, the graphty.app deploy and coverage                                                                                                                                                                                                                                                                                 | Milestone 3, when capture moves to its own workflow and `continue-on-error` is dropped |
| On pull requests only, "All Checks Pass" fails while a project with baselines on the base branch has, at the newest attempt of the run, a `results.json` holding `changed`, `new`, `removed`, `unstable` or `failed` items, or none at all, or an unfinished one (`visual-review/trusted/gate.mjs`) | Without it, pull requests merge before the owner opens the page (about a dozen merged on 2026-09-27 alone), master drifts from its baselines, and every later pull request shows those changes as its own. An accept commit turns the items `unchanged`, so the check clears exactly when the owner presses Finish. It blocks unreviewed merges; it does not prove who reviewed, since an agent with the owner's credentials could press Accept (records stay `unproven`) | Milestone 3, when the signed "Visual review" check replaces it                         |
| graphty-element is not seeded from master (`"seedFromMaster": false` in projects.json); the owner's review of #519 is its seed                                                                                                                                                                      | design.md section 6: seeding before #519 (which deletes the 1,000-pre-step Chromatic decorator and pins the label font) gives baselines under a harness known to be unstable, and the owner would review about 171 images twice. The job still captures graphty-element (every item `new`) to measure its time on the runner                                                                                                                                              | Milestone 1, when #519 merges                                                          |
| `serve` listens on servherd's hostname over HTTPS, with a per-session token and an Origin check, not on 127.0.0.1                                                                                                                                                                                   | The owner's browser is on another machine; the token and Origin check stop other network clients and cross-site requests. They do not stop a local agent, which is why records are `unproven`                                                                                                                                                                                                                                                                             | Milestone 3 (`sign` runs on the owner's computer)                                      |
| Both projects are captured on every run                                                                                                                                                                                                                                                             | About 5 free CI minutes; affected-only planning is a separate piece of work                                                                                                                                                                                                                                                                                                                                                                                               | Milestone 2                                                                            |
| Baselines are captured only in CI, on the `ubuntu-24.04` runner; no pinned font set yet                                                                                                                                                                                                             | Only CI captures can be accepted, so every baseline comes from one environment. Pinned fonts matter once local captures must match CI                                                                                                                                                                                                                                                                                                                                     | Milestone 2, as one planned re-baseline                                                |
| The comparison uses `pngjs`, already in the lockfile                                                                                                                                                                                                                                                | The design wants the verifying code dependency-free, which matters only once it verifies signatures                                                                                                                                                                                                                                                                                                                                                                       | Milestone 3                                                                            |
| An accept writes an unsigned record marked `"unproven": true`                                                                                                                                                                                                                                       | Signing needs hardware keys the owner has not bought yet                                                                                                                                                                                                                                                                                                                                                                                                                  | Milestone 3                                                                            |
| Pull requests from forks are not supported by accept                                                                                                                                                                                                                                                | Every waiting pull request is on this repository                                                                                                                                                                                                                                                                                                                                                                                                                          | Milestone 3                                                                            |
| Viewport-only screenshots (1200 x 900) for both projects                                                                                                                                                                                                                                            | A full-page capture can resize a Babylon canvas mid-frame; compact-mantine full height waits for a stability measurement                                                                                                                                                                                                                                                                                                                                                  | Milestone 2                                                                            |
| Baseline PNGs are Git LFS objects from the first baseline; only the `visual` job fetches images, for its own project, through the Actions cache                                                                                                                                                     | Plain-git image history is permanent (110 to 210 MB in year one) and a later move is a history rewrite; `design.md` section 7 has the bandwidth estimate                                                                                                                                                                                                                                                                                                                  | Not planned to change                                                                  |
| Seeding is per story: a story with no baseline that looks as in master's newest capture is `unseeded` and passes the gate; one a pull request adds or changes is `new` and blocks                                                                                                                   | Many stories need several rounds before they look right; one-pass seeding would force accepting wrong images or blocking every pull request (`design.md` section 11a)                                                                                                                                                                                                                                                                                                     | Not planned to change                                                                  |

### Files

```
visual-review/                       @graphty/visual-review, private, plain .mjs, no build
  package.json                       "private": true, "type": "module", bin visual-review;
                                     dependencies: playwright (exact version, the one the lockfile
                                     resolves today), pngjs; devDependencies: vitest (catalog)
  project.json                       "name": "visual-review"; Nx targets test, coverage (the CI
                                     shard runs it) and lint
  vitest.config.mjs
  projects.json                      compact-mantine, graphty-element and layout: Storybook artifact name,
                                     package directory, workers, stableFrame (wait for
                                     graphty-element), seedFromMaster. Modes are not listed here:
                                     they come from each story's parameters.chromatic.modes
  capture/capture.mjs                Playwright capture (phase 3)
  trusted/cli.mjs                    subcommands: capture, reference, compare, serve
  trusted/lib/results.mjs            results.json format and its validator (phase 1)
  trusted/lib/compare.mjs            hash, pixel comparison, classification (phase 2)
  trusted/lib/github.mjs             gh calls: pull requests, CI runs, artifacts (phase 4)
  trusted/lib/accept.mjs             writes baselines and the record, commits, pushes (phase 4)
  trusted/vendor/pixelmatch.mjs      pixelmatch source, ISC licence header kept
  trusted/page/index.html, review.js, review.css
  test/*.test.mjs
  test/fixtures/results/             a small results.json with changed, new, removed and unstable
                                     items and their PNGs, used by phases 2 and 4
.gitattributes                       visual-baselines/**/*.png stored in Git LFS
tools/lfs-pre-push.sh                the Git LFS upload, run first by .husky/pre-push
visual-baselines/<project>/<story-id>[.<mode>].png    a Git LFS object
visual-baselines/<project>/<story-id>.json     only for excluded stories in this milestone
visual-baselines/reviews/<utc-time>-<id>.json  one record per accept session
```

The `trusted/` and `capture/` split follows `design.md` so nothing moves when signing arrives.

### The results.json format

Written by capture, read by CI, the review page and later the MCP server:

```json
{
    "version": 1,
    "project": "compact-mantine",
    "commit": "<sha the Storybook was built from>",
    "headSha": "<pull request head or null>",
    "pr": 123,
    "runId": 987654,
    "runAttempt": 1,
    "local": null,
    "seeded": true,
    "reference": 987600,
    "complete": true,
    "expected": 828,
    "capturedAt": "2026-09-27T12:00:00Z",
    "clock": { "start": "2026-01-01T12:00:00Z", "running": true },
    "environment": { "chromium": "...", "renderer": "...", "gpu": false, "tool": "<sha>" },
    "items": [
        {
            "id": "button--primary",
            "mode": "dark",
            "file": "button--primary.dark.png",
            "status": "changed",
            "flaky": false,
            "baseline": "<sha256 or null>",
            "capture": "<sha256 or null>",
            "size": [1200, 900],
            "baselineSize": [1200, 900],
            "changedPixels": 412,
            "bbox": [10, 20, 90, 44],
            "threshold": 0.063,
            "includeAA": false,
            "reason": null,
            "console": []
        }
    ]
}
```

`seeded` is true when the captured commit holds any baseline for the project. `reference` is the
master CI run whose capture served as the reference for stories with no baseline, or null (a
master capture, or no reference downloaded). Capture rewrites
the file after every item and sets `complete: true` only at the end, so a crash leaves a file that
says how far it got (`items.length` of `expected`). `status` is one of `unchanged`, `changed`, `new`, `unseeded` (no
baseline, and the capture matches master's newest capture of the story), `removed` (a baseline whose story is gone),
`unstable` (two captures disagree and neither equals the baseline), `failed` (render errored or
did not settle) or `excluded`. `local` is null for CI and holds `git describe --always --dirty` and
the SHA-256 of `git diff HEAD --binary` for a local run, as `{ "describe": "...", "diff": "<sha256>" }`;
the page labels a local run "preview, not acceptable". That is the whole answer to dirty state.

`bbox` is `[x, y, width, height]` of the changed pixels, in the capture's coordinates. For an
`unchanged` item with `flaky: true`, `capture` is the hash of the second capture (the one that
matched the baseline); for `changed` and `unstable` it is the first.

`validateResults(parsed)` in `trusted/lib/results.mjs` returns a list of problems (empty when
valid); every reader calls it before using a field. Beyond the types it enforces that `file` is
exactly `<id>[.<mode>].png` (id and mode are lowercase letters, digits and hyphens, so a file name
can never hold `/` or `..`), that no story and mode appears twice, that `changed` and `unchanged`
items carry both hashes, `new` and `unseeded` only a capture and `removed` only a baseline, at most 5,000 items,
at most 100 console lines, and strings of at most 2,000 characters.

### Phase 1: package skeleton and the results format

**Tests first.** `test/results.test.mjs`: a valid example passes `validateResults`; an unknown
status, a missing hash on a `changed` item, a `file` containing `/` or `..`, and an item count over
5,000 are rejected.

**Build.** `trusted/lib/results.mjs`; the package files above with empty subcommands, and
`"name": "visual-review"` set in project.json so every command, the matrix and the release
exclusion use that one name; `pnpm-workspace.yaml` entry; `knip.config.ts` workspace entry; a
`visual-review` shard in `tools/ci-test-matrix.mjs` like remote-logger's, whose coverage includes
only `trusted/lib/*.mjs` (capture, the page and `gh` glue are not reachable by unit tests);
`"!visual-review"` in nx.json's `release.projects` so `nx release` never versions it;
`visual-review` added to commitlint's `scope-enum`; `visual-baselines/` in `.prettierignore`; an
`eslint.config.js` block giving `globals.node` to
`visual-review/{trusted/lib,trusted/cli.mjs,capture,test}/**` and `globals.browser` to
`visual-review/trusted/page/**` (the base config declares only browser globals, and only
`tools/**` gets Node's); an `affected visual-review && (cd visual-review && npm run test:run)`
line in `tools/prepush.sh` beside the other packages' test lines.
Confirm a change under the root `visual-baselines/` affects no Nx project (`pnpm exec nx show
projects --affected` after touching a file there); add a `.nxignore` only if it does.

**Done when.** Lint, test and knip pass, and `pnpm run lint:eslint-root` accepts the new block;
`pnpm exec nx show projects` lists `visual-review`;
`pnpm exec nx release --dry-run` does not list it; the phase is committed on `feat/visual-review`
so the other agents can branch.

### Phase 2: comparison

**Tests first.** `test/compare.test.mjs`, with PNGs generated in the test with `pngjs`:

- equal bytes give `unchanged` without decoding;
- one pixel changed above the threshold gives `changed`, `changedPixels: 1` and its bounding box;
- a change under the threshold gives `unchanged`;
- different sizes are padded to the larger size, top-left, and the padding counts as changed;
- `includeAA: false` ignores an anti-aliased edge pixel that `includeAA: true` counts;
- classification: capture equals baseline -> `unchanged`; both captures agree and differ ->
  `changed` (or `new` with no baseline); first differs, second equals baseline -> `unchanged` with
  `flaky: true`; both differ and disagree -> `unstable`; a baseline with no story -> `removed`.

**Build.** `trusted/lib/compare.mjs` and `trusted/vendor/pixelmatch.mjs`. SHA-256 first; pixelmatch
only when bytes differ, at the story's `diffThreshold` (default 0.063, Chromatic's default) and
`diffIncludeAntiAliasing`. Mark the `pngjs` import `// ponytail: pngjs until milestone 3 needs a
dependency-free decoder`. `visual-review compare --baselines <dir> --captures <dir>` for local use.

**Done when.** Tests pass, and `compare` over two real screenshots from `tools/diff-stories.mjs`
reports the same changed-pixel count as `tools/pixel-diff.mjs` at an equivalent threshold, or the
difference is explained in the commit message.

### Phase 3: capture

**Tests first.** `test/capture.test.mjs` for the pure parts: the story URL
(`iframe.html?id=<id>&viewMode=story&chromatic=true`, plus `&globals=theme:<mode>` for
compact-mantine's modes); `index.json` filtering (stories only, no docs entries); the file name
for a story and mode; `seeded` true only when the project has a baseline PNG; reading `disableSnapshot`, `delay`, `diffThreshold`, `diffIncludeAntiAliasing`
and `modes` from a story's `parameters.chromatic`, with a settings file in
`visual-baselines/<project>/<id>.json` overriding them.

**Build.** `capture/capture.mjs`, starting from `tools/diff-stories.mjs` (its static server and
Chromium flags). For each story and mode:

1. A fresh page at 1200 x 900, device scale factor 1, `TZ=UTC`, `page.clock.install({ time:
"2026-01-01T12:00:00Z" })` then `page.clock.resume()` before navigation, so time starts at a
   fixed instant but still advances. `setFixedTime` is not used: it freezes `Date.now()`, which
   hangs graphty-element's input playback (`InputManager.ts`) and recording
   (`MediaRecorderCapture.ts`), both of which measure elapsed time with it. Chromium flags
   `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --force-color-profile=srgb
--disable-lcd-text --font-render-hinting=none`. `chromatic=true` in the URL makes the existing
   `isChromatic()` calls return true, so graphty-element's layout pre-steps apply with no story
   change.
2. Wait for `__STORYBOOK_PREVIEW__.currentRender.phase === "completed"` (it includes play
   functions); `errored`, or 30 s without completing, is `failed` with the console output
   recorded. Read the story's parameters from the current render (check this path against the
   repository's Storybook version first).
3. graphty-element only: call `waitForStableFrame()` on every `graphty-element` in the page, then
   wait one animation frame. graphty-element's preview declares its settle `play` inside
   `parameters`, where Storybook never runs it, so this wait is the real one. A rejection or a
   "Graph settled timeout" console warning is `failed`.
4. Wait the story's `delay`; screenshot with `animations: "disabled"` (matches
   `pauseAnimationAtEnd`) and `caret: "hide"`.

    Parameters are read once per run, before any capture, from
    `__STORYBOOK_PREVIEW__.extract()` (Storybook 9.1; it is what Chromatic reads too), not from each
    story's current render: a story's modes decide which URLs to open, so they are needed before
    the story is opened. The render counts as done at `completed` or any later phase (`afterEach`,
    `finished`). Each worker has its own browser: every page of one browser shares its GPU process,
    and with SwiftShader one busy WebGL page stalled the other workers' renders and screenshots for
    minutes, past Playwright's own timeouts.

5. Compare with phase 2. Every `changed` or `new` item is captured once more in a new browser
   context before it is classified.
6. Write `results.json` (after every item, `complete: true` at the end), and copy only `changed`,
   `new` and `unstable` PNGs to the output directory (the second capture of an unstable item goes
   to `second/<file>`), plus, under `baselines/`, the baseline PNG the comparison
   used for every `changed`, `unstable` and `removed` item. The review page then shows exactly the
   before image CI compared against, whatever the development server's checkout holds.

Workers from `projects.json` (4 for graphty-element, 8 for compact-mantine locally; CI measures 2
against 4).

Command: `node visual-review/trusted/cli.mjs capture --project <id> --out <dir> [--storybook <dir>]
[--baselines <dir>] [--workers <n>]`; the Storybook defaults to `<package>/storybook-static` and
the baselines to `visual-baselines/<id>`. It exits 0 whatever it finds, and non-zero only when the
tool itself fails.

**Done when.** Built locally (`pnpm exec nx run compact-mantine:build-storybook` and the same for
graphty-element), each project is captured, then captured again with the first run's PNGs as
baselines. The second run reports every item `unchanged` except known instability
(`ai-control--default` is expected to be `unstable`); any other unstable or failed story is listed
in the pull request description with its console output. Record wall time and item counts there.
These local images are previews only and are never committed.

### Phase 4a: serve and the review page's core (needed for the seed)

**Tests first.**

- `test/accept.test.mjs`, against a temporary repository with a bare remote: accepting two items
  writes the two PNGs at their paths, one record whose items name path, `from` (old hash or null),
  `to` and reason, with `"unproven": true`, the run id, the captured commit and head; commits once;
  pushes to the pull request's branch. Decisions across every project of the pull request land in
  that one commit and one push. It refuses when a PNG's bytes do not hash to `results.json`'s
  `capture`; when a pull request's head has moved past the captured head ("capture is stale, wait
  for CI"; pull request targets only); when `origin/master` has a commit touching
  `visual-baselines/<project>/` that is not reachable from the captured head (`git merge-base
--is-ancestor`; "merge master into the branch first", since otherwise every accepted PNG is an
  add/add conflict with master's); and when an item is `unstable` or `failed`. Exclude writes
  `{"disableSnapshot": true, "reason": ...}` to `<id>.json` and a record item for it. Accepting
  `removed` deletes the PNG. The generated commit message (`test(workspace): accept visual
baselines for #N`, `test(workspace): seed visual baselines` for master) passes the repository's
  commitlint config. With a failing `commit-msg`, `pre-commit` and `prepare-commit-msg` hook
  installed, accept still commits, and the commit is signed when signing is configured. When
  `git commit` fails, nothing is pushed, the decisions stay in state, and git's stderr is returned.
- `test/serve.test.mjs`, with `gh` replaced by a fake: `GET /api/prs` lists every open pull
  request with a CI run, with counts per project, and shows "capture failed" (with the job log
  link) when the `visual` job failed or uploaded no artifact, and "incomplete: N of M stories"
  when `complete` is not true; with two attempts of one run, the newest attempt's artifact is
  shown; a pull request whose branch lacks master's newest baseline commit is badged "merge master
  first"; `GET /api/pr/:n/:project` returns items; the master target with `--master-run <id>`
  shows that run and no other; Accept is refused for a project with `seedFromMaster: false` on the
  master target; image routes refuse any path outside the downloaded artifact; an image whose
  SHA-256 differs from `results.json`'s `baseline` or `capture` hash is refused, not shown; an
  `/api` request without the session token is refused; a state-changing request with a foreign
  `Origin` is refused; Finish answers only POST.

**Build.**

- `trusted/lib/github.mjs`: open pull requests, the newest `ci.yml` run for a head SHA, the `visual` job's conclusion, and the highest-attempt `visual-<project>-<attempt>`
  artifacts downloaded to `tmp/visual-review/<run>-<attempt>/`. "master" is a target too, pinned
  to one run with `serve --master-run <id>` (the page shows that run's id and commit); its accepts
  go to a new branch `visual/seed-<date>` created at that run's `results.commit` (not at
  `origin/master`, so the branch holds exactly the captured tree), and a pull request titled
  `test(workspace): seed visual baselines`. Every call goes through `gh api` (and `gh run
download`), not `gh pr list`, `gh run list --commit` or `gh pr create`: the development server
  has gh 2.4, which lacks those flags and most `--json` fields.
- `trusted/lib/accept.mjs`: works in `.worktrees/visual-accept-<pr>` (`git worktree add --detach`
  at the captured head), never in the main checkout. The worktree has no `node_modules`, and the
  shared hooks (`core.hooksPath=.husky/_`: secretlint on pre-commit, commitlint on commit-msg,
  `cz --hook` on prepare-commit-msg, the gate on pre-push) all need it or a terminal, so every git
  command runs with `-c core.hooksPath=/dev/null` (and `HUSKY=0`, `--no-verify`): git runs
  prepare-commit-msg even under `--no-verify`, so that flag alone does not skip it. Signing stays on and the owner's git identity is
  used; if gpg-agent's cache has expired, the commit fails and Finish shows git's stderr (the
  owner unlocks the key and presses Finish again). A comment in the code gives the reason: the
  commit holds only tool-written PNG and JSON under `visual-baselines/`, and its message is
  generated to pass commitlint. Rejects become one pull request comment with the reasons and a
  machine-readable block.
- `trusted/cli.mjs serve`: `node:https` on `PORT` with the certificate at `HTTPS_CERT_PATH` and
  `HTTPS_KEY_PATH`, serving the page and a small JSON API. The token lives in
  `tmp/visual-review/state/token` (created once), so a restart keeps the owner's URL; `serve`
  prints the URL with the token at every start, so `servherd_logs` shows it again. Every `/api`
  request must carry the token in a header the page sets; state-changing requests must be POST
  with an `Origin` equal to the served origin. Images are served only from the downloaded
  artifact and only when their SHA-256 matches `results.json`. The second capture of an unstable
  item (`second/<file>`) is therefore not shown: `results.json` records no hash for it. Decisions in progress live in
  memory until Finish.
- The page, plain HTML and JavaScript: the pull request list and the master target; per project a
  thumbnail grid filtered by status with "12 / 40 reviewed"; a story view with side by side, flash
  (about 1.5 Hz), pixel highlight (pixelmatch in the browser over a dimmed baseline, a box around
  the changed region) and a "size changed" badge; Accept, Reject with a reason, Exclude with a
  reason (the only choice for `unstable` and `failed`); keys J and K (next, previous), A and R;
  Finish per pull request across every project, making one commit, one push and one comment.
- `CLAUDE.md`: a short "Visual review" section: the servherd call below; agents never press Accept
  or write under `visual-baselines/` on the owner's behalf; on a merge conflict under
  `visual-baselines/`, take master's side for every file and let CI recapture; after an accept,
  update the branch from master by merge, not rebase.

```jsonc
servherd_start({ name: "visual-review", cwd: "<repo>", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} node visual-review/trusted/cli.mjs serve",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

**Done when.** Tests pass. Started with that servherd call against `test/fixtures/results/` (fed
in with a `--results <dir>` option), a Playwright screenshot of the grid and of the story view with
flash and highlight shows the expected images, checked by looking at the screenshots, not by
asking an image model. Pressing Finish in that servherd-started server, on a scratch branch of the
real repository with the repository's hooks, produces one signed commit that passes commitlint.
After phase 3 merges, the same check runs once against phase 3's local output.

### Phase 4b: the review page's extras (after the seed if time is short)

Resume after a closed tab (decisions in `tmp/visual-review/state/<pr>.json`, keyed by path and
hash); zoom with `image-rendering: pixelated` that jumps to the box; hold Space to flash; keys E,
F, H, Z and Shift+A; Accept all in a project, with Finish showing "N accepted without being
opened"; a Finish warning when another project of the same pull request still has undecided
items; a "re-review: your earlier accept was replaced by master's baseline" flag for an item whose
path appears in an earlier record on the same branch with a different `to` hash (only possible
after a merge conflict, so never before the seed). Each has one serve or page test, written
first.

An item counts as opened once its story view has been shown; Accept all marks its accepts as not
opened until then. A saved decision is resumed only while the item's image hash (the capture, or
the baseline for a removed item) is unchanged, so a new CI run keeps decisions on identical
images and drops the rest. The re-review flag reads the pull request's records at the captured
head and compares the newest `to` for the path with the baseline in `results.json`. The page test
(`test/page.test.mjs`) drives Chromium, so the visual-review CI shard installs a browser.

### Phase 5: the CI job

**Build.** A `visual` job in `.github/workflows/ci.yml`: `needs: build`, `runs-on: ubuntu-24.04`,
`permissions: contents: read`, `continue-on-error: true`, a matrix over compact-mantine (artifact
`build-storybook-compact-mantine`) and graphty-element (`build-storybook-element`),
`timeout-minutes: 30`. Steps: checkout (the pull request's merge commit, as the other jobs), the
repository's usual pnpm and Node setup, restore `~/.cache/ms-playwright` keyed by the Playwright
version, `pnpm exec playwright install --with-deps chromium`, download the Storybook artifact,
`node visual-review/trusted/cli.mjs capture`, upload `visual-<project>-${{ github.run_attempt }}`
(results and PNGs, `retention-days: 30`, `if: always()` so a partial `results.json` is kept; the
attempt in the name avoids v4's same-name conflict on a re-run), and write counts per status to
the job summary. The job exits non-zero only when the tool itself crashes; changes are not
failures.

"All Checks Pass" gets `visual` in its `needs` (its result is always success) and three steps, only
when `github.event_name == 'pull_request'`: a sparse checkout of `visual-review/`, a download of
every `visual-*` artifact of the run (all attempts), and `visual-review/trusted/gate.mjs`, which
fetches the base branch tip's tree (no blobs) and, for every project with baseline PNGs there,
fails, naming the project and counts, when the newest attempt's `results.json` holds an item that
is not `unchanged`, `excluded` or `unseeded`, or is missing or unfinished. A project with no
baseline on the base branch passes. The job also fetches its project's LFS images (`git lfs pull
--include`, through the Actions cache) and, on pull requests, master's newest capture as the
reference for stories with no baseline (`visual-review reference`, `actions: read`). It never
runs on master, so release, deploy and coverage are unaffected.

**Done when.** The tooling pull request's own CI run shows both `visual` jobs green, each artifact
holds a valid, complete `results.json` with every item `new` and `seeded: false`, "All Checks
Pass" is green, and the wall time of each job (graphty-element's included, still under the
1,000-pre-step decorator) is written in the pull request description. Two temporary commits,
reverted before merge: one that makes capture throw leaves the run's conclusion `success`. Because
"seeded" is read from the base branch, a baseline planted in this pull request does not arm the
gate; its logic is covered by `test/gate.test.mjs`, and the first pull request after the seed is
its live check.

### Phase 6: seed compact-mantine (with the owner)

1. The owner merges the tooling pull request. Master's CI run for the merge commit X finishes.
2. An agent starts `serve --master-run <X's run id>` through servherd and gives the owner the URL.
3. The owner opens "master" (the page shows X and its run id), reviews the compact-mantine grid
   (828 images), accepts the stories that look right, rejects the ones that do not with a reason,
   excludes unstable stories with a reason, leaves the rest, and presses Finish. The tool pushes
   `visual/seed-<date>` at X, opens the seed pull request, and files the rejects as one issue.
   Later rounds repeat this for the stories still without a baseline; until then they block only
   a pull request that changes them.
4. The seed pull request's own `visual` job captures its merge commit, with the newest master, on
   a different runner.

**Done when.** In the seed pull request's capture, every item is `unchanged` or `excluded`, except
items whose story changed after X: an item is a determinism problem only if `git diff --quiet X
<merge commit> -- compact-mantine/` (and its dependencies' directories) shows no change. A
determinism problem is fixed or excluded with a reason and recorded in `design.md`; any other
changed item is an ordinary review item, accepted or rejected in the page. Same-runner
disagreement is already caught by capture's second pass as `unstable`. The owner merges the seed
pull request, and the first master CI run after it has a compact-mantine artifact whose items are
all `unchanged` or `excluded`, apart from compact-mantine changes merged in between, identified the
same way.

### Phase 7: the first real reviews, and the graphty-element seed

**Starts after** phase 6: the tooling pull request and the compact-mantine seed pull request have
both merged, so a merge of master brings the `visual` job and compact-mantine's baselines into a
waiting pull request. Before that, merging master into these branches gains nothing. Steps 1 and 2
commit and push to other pull requests' branches, so whoever runs them needs the owner's go-ahead
for those branches; an agent limited to the tooling branch cannot do them.

1. An agent brings one waiting compact-mantine pull request (#511, #365 or #364) up to date with
   master by merge. Every pull request that predates the seed needs this before its accept, and the
   page badges it "merge master first" until it has it.
2. An agent resolves #519's merge conflicts with master (by merge; this is on graphty-element's
   critical path and unestimated). With no graphty-element baselines on master, its capture shows
   every item `new` under the new harness, so the owner's review of #519 is graphty-element's
   seed: about 171 images, reviewed once.
3. When their CI finishes, the owner reviews each in the page, accepts or rejects, and presses
   Finish.

**Done when.** Each pull request's next capture shows every accepted item `unchanged`, its rejects
are in one pull request comment, #519 has merged with graphty-element's baselines, and the owner
has no remaining Chromatic review to do for these two projects.

### Owner actions for milestone 1 (about 15 minutes, any time today)

- Move the Chromatic account to the Free plan, confirm with Chromatic that the Free plan stops at
  its snapshot limit rather than billing, remove the payment method, and stop using the
  `chromatic` label.
- Order two FIDO2 security keys with PIN support (needed for milestone 3).
- Install git-lfs on every machine that accepts or pushes baselines (`visual-review/README.md`,
  "Setup"); the development server has it.

## Later milestones (outline)

### Milestone 2: every project, and the local hook

1. Affected-only planning: a `plan` step computes the projects to capture from `git diff
--name-only` against `inputs` globs in `projects.json`; an unknown path plans everything. Test:
   each project's `inputs` cover its Nx dependency closure.
2. Pinned fonts: a committed font set and `fontconfig` file used by every capture; a check story
   that renders each font family, an emoji and the time. Then one planned re-baseline of both
   seeded projects.
3. algorithms and layout: measure two-run stability under `taskset -c 0-3`, fix or exclude, seed.
   layout is in `projects.json` and the CI visual matrix with `seedFromMaster` true and `canvas`
   true (its 3D stories draw into WebGL). Its 17 stories captured identically on two runs with no
   stable-frame wait; that run was not pinned with `taskset`.
   The graphty app after its light mode (preview reads `theme`, the app sets `colorScheme`) and its
   eruda debug button (issue #204) are fixed.
4. Pre-push: a blocking step before the gate's "No package is affected" exit, failing a push of a
   baseline PNG without a record naming its hash (read from the PNG's LFS pointer with the gate's
   `contentHash`, so no image is downloaded); an opt-in `PREPUSH_VISUAL=1` local capture.
   Measure local against CI captures of the same commit and record it in `design.md`.
5. Review page: modes of a story together, live Storybook links (graphty.app for the baseline, the
   pull request's Storybook served by a second servherd server on another origin), per-story
   history panel and "previously rejected", recapture of failed and unstable items through a
   dispatched run, per-story settings files for thresholds, full height for compact-mantine and
   the graphty app once measured stable.

### Milestone 3: owner-only approval, enforced

`design.md` sections 8, 11 and 15 have the detail. In order: `trusted/` made dependency-free
(replace `pngjs` with a `node:zlib` PNG decoder) under a 2,500-line budget test; `verify`, `audit`
and `sign` with `ssh-keygen -Y sign` over canonical JSON and `verify-required` test vectors; move
capture into `storybooks.yml` (the pull request's code, no secrets) followed by `visual.yml`
(master's code) posting "Visual review"; split release.yml so the deploy key meets no repository
code; the owner creates keys, reads `trusted/`, signs the seed manifest and records its merge
commit and the key fingerprints outside the repository; the owner's settings: a fine-grained agent
token, no admin bypass, "Visual review" required.

### Milestone 4: retire Chromatic

`visual-review diff` for any two built Storybooks, absorbing `tools/diff-stories.mjs` and
`tools/pixel-diff.mjs`; decide the pre-push capture default; after two weeks of the required check,
remove every Chromatic job, script, addon, dependency and token, and replace `isChromatic()` with a
`visual=1` URL flag in the same pull request that switches the capture.

### Milestone 5: later

Notes Claude can pick up (as untrusted pull request data), an MCP server with no accept tool,
WebKit for compact-mantine, grouping identical changes, region masks, a history page, and WebP
baselines if LFS storage or bandwidth ever matters.
