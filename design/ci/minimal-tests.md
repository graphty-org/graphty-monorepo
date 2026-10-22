# Minimal tests: run only what a change can affect

Status: Built in part, 2026-10-22: `pnpm run test:changed`, `PREPUSH_SELECT=1` in the gate (off by
default) and `tools/test-select-mutate.mjs` exist; mutation runs and the switch to on are next. Issue #3276, part of the fast pipeline (#3262,
`design/ci/fast-pipeline.md`, section 5).

Running tests is the slowest part of getting a change into graphty-monorepo. A golden landing waits
for every test shard of every package nx calls affected, and graphty-element's ten browser and
Storybook shards alone take most of an hour. Most of those tests cannot fail because of the change:
a fix to one graphty dialog runs every graphty test file, and a fix to one graph-format view runs the
whole graph-format suite and every package that depends on it.

This document describes how the local tools run the smallest set of tests that can show a change
works, how that set is found, how we know it is right, and how it is rolled out. It builds on the
test selector that already exists (`tools/test-select.mjs`), which today only logs what it would
have run.

Words used throughout:

- **shard**: one entry of `tools/ci-test-matrix.mjs`, a command that runs part of one package's
  tests. CI runs each shard on its own runner; the pre-push gate runs them on this machine.
- **the gate**: `tools/prepush.sh`, run for every push and every landing; its test stage is
  `tools/prepush-tests.mjs`.
- **verification**: `tools/verify.mjs`, which runs the whole gate on golden's newest commit after
  landings and bisects a failure to the landing that caused it.
- **a miss**: a test that would have failed on a change but was not selected for it.

## 1. Three levels, three places

Selection is used where speed matters and the cost of a miss is small. It is never used where a
miss would reach users.

| Level                    | Where                                | Runs                                     | Typical time       |
| ------------------------ | ------------------------------------ | ---------------------------------------- | ------------------ |
| Development loop         | `pnpm run test:changed` on a branch  | selected test files, no coverage         | seconds to minutes |
| Landing check            | the gate (`tools/prepush-tests.mjs`) | selected files per shard, else the shard | minutes            |
| Verification and release | `tools/verify.mjs`, `release.yml`    | every shard, with coverage               | unchanged          |

### 1.1 Development loop: `pnpm run test:changed`

A new script, `tools/test-changed.mjs`, exposed as the root `test:changed` script. It answers
"which tests should I run right now?" for the branch in the current worktree:

1. The change is everything since the merge base with `origin/golden`: committed files, staged and
   unstaged edits, and untracked files that git does not ignore. A developer runs it before
   committing, so the working tree counts.
2. It asks `selectChange()` in `tools/test-select.mjs` for the selection, with the same rules and
   the same allowed packages as the gate. Passing `test:changed` should mean the gate's test stage
   passes.
3. For a shard selected file by file it runs one `vitest run` in the shard's package, with the
   shard's config file and `--project` filters, the selected files as arguments, no `--coverage`
   and no `--shard` slice. For a shard that runs whole it runs `tools/run-tests.sh <shard>`, which
   is CI's command.
4. `--dry-run` prints the selection and the reason for each answer and runs nothing. `--all`
   ignores the selection. `--base <ref>` compares with another branch.

It builds the packages the selected shards need first (`nx run-many -t build` for their
dependencies, which nx's cache makes cheap), because every test reads other packages through their
`dist/`. Every run takes a machine-wide test slot through `tools/test-slots.mjs`, as every vitest
run here does.

### 1.2 Landing check: selection in the gate

`tools/prepush-tests.mjs` already computes the selector's answer for every push and writes it to
`tmp/test-select/advisory.jsonl` beside what it actually ran. With `PREPUSH_SELECT=1` it uses the
answer:

- **none**: the shard is skipped, with a line naming the reason (only design notes changed, only a
  test of another shard changed).
- **files**: the shard's run is replaced by one vitest run of the selected files, built as in 1.1:
  the shard's config and projects, the selected files, no `--coverage`, no `--shard`. The slices
  of one family (graphty-1 to graphty-3) collapse into one run, reported under the first shard of
  the family, so two selected files do not start three vitest processes.
- **all**: the shard runs exactly as today.

The gate falls back to the whole shard whenever the selector cannot decide: it threw, an import
graph could not be built, a changed file matched no import and no rule, the shard's command is not
a plain `vitest run` or an `nx run <package>:coverage` (the GPU shards' `run-node-shard.js` and
`run-browser-project.js` wrappers, the Cytoscape versions script), the package is not in the
allowed list, or the shard runs a browser project that is not allowed (section 3).

Coverage thresholds are not checked on a selected run: 80 percent of a package cannot be judged
from five of its test files. A change that lowers a package's coverage below its threshold is
caught by verification, which runs with coverage. This is the one check the landing gives up, and
it is a rare failure.

A selected pass is recorded in the pass store (`tmp/prepush-passes/`) under its own kind,
`shard-selected`, keyed by the shard's input key plus a hash of the selected file list. It never
counts as a pass of the whole shard, so a later full run, or verification, cannot skip a shard
because a subset of it passed.

### 1.3 Verification and the release train stay full

Verification sets `PREPUSH_ALL=1`, and the gate ignores `PREPUSH_SELECT` whenever `PREPUSH_ALL` is
set. The release train runs CI's full suite on the commit it releases. Neither changes. They are
what makes selection safe to use earlier: a miss in the gate is found by the next verification
run, bisected to its landing and reverted by the pipeline round, and it never reaches master or
npm. Every miss still costs a revert and a second landing, so selection must be right, not just
fast.

## 2. How dependencies are found

A test depends on a source file in four ways, and each needs its own tool.

### 2.1 Inside one package: Vitest's module graph

For files of the package that holds the tests, the selector builds each vitest project's module
graph the way Vitest's own `related` mode does: every test file is transformed by the project's
Vite server and its static and literal dynamic imports are followed. On top of Vitest it adds what
Vitest drops: imports with a query suffix (`?raw`, `?url`, `?worker`, `?inline`) and
`new URL("./file", import.meta.url)`, which is how the Graphviz worker and the label font are
loaded. A change that reaches a project's setup files runs that whole project. The graphs are
cached by the tree of the package, so a second push of the same package reuses them.

### 2.2 Across packages: whole packages, never files

Every package reads the others through their built `dist/` (the `@graphty/*` exports point there,
and no vitest config aliases a workspace package to its source). So a change to
`graph-format/src/views/csr.ts` appears in no other package's module graph: downstream tests import
`graph-format/dist/graph-format.js`. File-level selection across packages is therefore impossible
with any import-graph or recorded-dependency tool, and the selector never tries.

Instead, when a package changes a file that goes into its build (anything outside its tests,
stories and docs), every package that depends on it runs all of its affected shards. The
dependency closure is the one `tools/prepush-inputs.mjs` computes: nx's project graph, plus every
package another one reaches by a relative path (`../graph-io/test/corpus/...`,
`{workspaceRoot}/graph-samples/dist/data/v1`). Today that relative-path scan finds edges nx does
not have: graph-io's tests read graphty-element files, graphty reads algorithms and layout, and
visual-review reads layout. Section 4 moves those edges into nx.

### 2.3 What no graph shows: hand-kept rules

`tools/test-select-rules.json` holds the rules for dependencies no import shows. Each rule names a
path pattern and what a change to it runs:

- **everything**: the lockfile, the root `package.json`, `patches/`, `nx.json`, `.github/`, the
  test-running tools (`tools/test-slots.mjs`, `tools/run-tests.sh`, `tools/ci-test-matrix.mjs`,
  `tools/shard-verdict.mjs`) and nx's `sharedGlobals` (the shared Vite and Vitest configs and
  coverage setup).
- **the whole package**: fixture, data, recording, golden, corpus, conformance and snapshot
  folders; test setup folders; the package's `package.json`, `project.json`, `tsconfig*.json` and
  Vite and Vitest configs; `.storybook/`.
- **the tests that read files**: a test whose own source calls `readFileSync`, `readdir`,
  `existsSync`, `import.meta.glob`, `execFileSync`, `spawn` or `new Worker` runs on any change to
  its package other than another test, because what it reads is invisible to the graph. These are
  the docs-example checks, the build-output and package-structure tests, the API parity checks.
- **nothing**: design notes, agent settings, the screenshot baselines and approvals, root Markdown.
- **also run**: a path one package reads from another without importing it, with the packages it
  then runs (graph-io's corpus also runs graphty-element and cytoscape-extensions).

Environment variables that choose a lane (`GRAPHTY_GPU_REQUIRE`, `GRAPHTY_BROWSER_GPU` and the
rest of `laneEnv()` in `tools/prepush-inputs.mjs`) are part of every shard's pass key, so a pass
under one lane never stands in for another.

### 2.4 Anything unknown runs the whole shard

A changed file that no import, rule or test accounts for runs its whole package. A package whose
graph could not be built runs whole. A new kind of import the selector does not parse shows up as
an unexplained file and runs whole. Over-selection costs minutes; under-selection costs a revert.

### 2.5 Recorded dependencies: not yet

Vitest's `experimental.recordDependencies` records what each test file actually loaded, including
computed dynamic imports, mocks and setup files. It would replace much of 2.1 and some of 2.3 for
Node-pool tests. It is a Vitest 5 feature (5.0.4 or later); this repository is on Vitest 4.1.11
through the pnpm catalog, with a patch on `@vitest/browser@4.1.11`. A major upgrade of Vitest is
not trivial, so it is out of scope here and is the first improvement after rollout. It would not
help the heaviest shards in any case: a test file in a browser pool gets no record and always runs,
and recorded paths for other packages are `dist/` files, so 2.2 stays as it is.

## 3. Browser, Storybook and screenshots

Browser-mode tests (graphty-element's browser, interactions and xr projects, graphty's app tests,
compact-mantine, algorithms-browser, graph-io-browser) and the Storybook projects are most of the
gate's time. They are also where hidden inputs are most common: the label font loads through a
`?url` import in every graphty-element browser test, Storybook's preview imports the registries,
the font helper and app modules into every story, and `staticDirs` serve graph-samples' build.

So a shard that runs a browser project is selected file by file only when its package is on the
browser allow list in `tools/test-select-rules.json` (a new `fileLevelBrowser` list, empty at
first), and a package goes on it only after mutation testing (section 5) of its browser projects
finds no miss. Until then such a shard runs whole whenever its package is affected, as it does
today. The Storybook projects are judged the same way, with one extra rule already in the rules
file: a change to `.storybook/` or to any file the preview imports runs the whole Storybook
project.

Screenshots are taken by visual-review for a whole project: every story of each affected
Storybook. That stays. The later step is per-story selection as Chromatic's TurboSnap does it:
build the Storybook with Vite's module graph written out, map the changed files onto it, and
recapture only the story files they reach, with a full recapture when `.storybook/`, anything
`preview` imports, a `staticDirs` folder or an upstream package's build changes. Stories that were
not recaptured keep the baseline already approved for them. That is a change to visual-review and
to its gate, which only the owner may approve, so it gets its own design.

## 4. Nx 24

The repository is on nx 22.7.12 (with `patches/nx@22.7.12.patch`, which stops nx's process
metrics collector from filling the file table). Nx 24.0.0 was released on 2026-10-21; its headline
change is task-based affected, the default from 24 on. In legacy mode a change to any file of a
project marks every task of that project and of every project depending on it as affected. In
task-based mode nx starts from the changed files, marks only the tasks whose declared inputs
contain them, and follows outputs through the task graph. A change to one graphty-element story
then no longer marks the graphty app's tests affected, and a change to a graph-format test no
longer marks every downstream package's tests.

The danger is silent: a task whose inputs leave out something it reads is not selected when that
thing changes. Nx's documentation says task-based mode ignores implicit dependencies and looks only
at inputs. So the upgrade goes in four steps, each a two-way door.

1. **Upgrade, legacy on.** `pnpm exec nx migrate 24.0.0`, run the migrations (they set
   `affected.legacy: true` in `nx.json`), move every `@nx/*` package to the same version, and port
   or drop the process-metrics patch (check whether 24 still starts the collector). The
   repository's `minimumReleaseAge` of one day allows 24.0.0 from 2026-10-22. Build, lint and the
   gate must pass unchanged. Nothing about selection changes in this step.
2. **Declare what only `prepush-inputs.mjs` knows.** In `nx.json` and the project files:
    - `targetDefaults` for the targets the shards run (`coverage`, `test:coverage`, `vite:test`),
      not only `test` as today, each with `default`, `^production`, the shared Vitest files, and
      the root test tools as `{workspaceRoot}/...` globs (the "everything" list of the rules file).
    - `{ "dependentTasksOutputFiles": "**/*", "transitive": true }` on those targets, because the
      tests read the upstream `dist/` that the upstream `build` tasks write.
    - For each relative-path read that is not an nx dependency, a `{workspaceRoot}/<package>/<dir>/**`
      input on the reading project's test targets: graph-io's reads of graphty-element, graphty's of
      algorithms and layout, visual-review's of layout, fidelity-web-oracles' of graph-io. Inputs,
      not `implicitDependencies`: graph-io reading graphty-element as an implicit dependency would
      make a cycle with graphty-element's dependency on graph-io, and task-based mode ignores
      implicit dependencies anyway.
    - The rules file's "also run" entries and graph-samples' `dist/data/v1` as inputs of the
      packages that read them.
    - The lane environment variables as `{ "env": "..." }` inputs, so nx's cache keys match the
      gate's.
3. **Check.** Extend `tools/test-select-replay.mjs` with an nx mode: for every past gate run in the
   replay window, ask nx which test tasks are affected in task-based mode (`nx affected -t <targets>`
   with `--graph=<file>.json`, which writes the task graph without running it, and `--explain` for
   why a task is in or out) and compare with the packages the selector's closure runs. Every shard
   the closure runs that task-based nx drops is a missing input; add it and replay again until the
   difference is empty.
4. **Switch.** Set `affected.legacy: false`. The gate then asks nx for affected test tasks instead of
   affected projects (`tools/prepush.sh` today runs `nx show projects --affected`), and ci.yml's plan
   does the same through `tools/ci-test-matrix.mjs`, so CI and the gate agree.

What it buys beyond the selector: the selector already narrows within a package, but it starts
from nx's affected projects and can only make that set smaller where file-level selection is
allowed. Task-based nx shrinks the set before the selector sees it, for every shard including the
browser and Storybook ones that file-level selection does not touch yet, and it does the same in
CI. It also shrinks the builds the gate runs. Once nx's inputs hold every edge, the relative-path
scan in `prepush-inputs.mjs` becomes a check that nx's inputs are complete rather than a second
source of truth.

## 5. Why the selection is right, and how misses are found

The argument: a test can fail because of a change only if the change reaches something the test
reads. Inside a package the test reads its imports (2.1), the files its own code opens (2.3, the
"tests that read files" rule) and its setup (2.1); across packages it reads `dist/`, which changes
only when the upstream package's build inputs change (2.2); and the shared configuration is in the
"everything" rule. Each of those edges either is followed or makes the whole package run. The
argument has holes wherever a reader is not recognised, so three checks look for them.

- **Replay** (`tools/test-select-replay.mjs`, results in `design/ci/test-selection-replay.md`):
  every past gate run and every failed CI run on golden and cut pull requests, asking whether the
  selector would have run each test that failed. The 2026-10-22 replay of 1,185 gate runs found 11
  misses, all flaky tests or a golden that was already broken, none caused by the change.
- **Mutation testing of the selection**, a new script `tools/test-select-mutate.mjs`. In a scratch
  worktree of its own it picks source files of a package (seeded, so a run can be repeated), breaks
  one at a time and runs the package's shards in full: a code file gets a top-level
  `throw new Error("select-mutant")` after its imports, so every test that loads it fails; a data
  file is emptied (`{}` for JSON), so every test that reads it fails. Every failing test file must be
  in the selection for that one-file change. A failing file outside it is run again on the
  unbroken tree; if it still fails it is flaky, otherwise it is a miss. The script also reports how
  much was selected that did not fail, the measure of over-selection. A run over the Node packages
  takes minutes; browser projects take longer and run in the background, a few mutants each.
- **Verification**, the backstop: the full gate on golden's newest commit after landings. A failure
  there that the landing's selected run passed is a miss by definition.

Every miss caused by a change becomes, in the same fix, a rule in `tools/test-select-rules.json` (or
an nx input, section 4), a mutation case that reproduces it, and an entry in
`design/ci/test-selection-replay.md` naming the reader that was not seen. A package with a second
miss of a kind the rules cannot express goes back to whole-package selection.

## 6. Rollout

Speed first, safety from the checks above:

1. **Today.** `test:changed` lands and goes live for every worktree. The gate gets `PREPUSH_SELECT`,
   off by default, and the mutation script. Both go into the gate's live copy at once with
   `tools/live.sh gate infra/minimal-tests`, not after a landing.
2. **Same day.** Mutation testing runs over the packages allowed file by file (graph-format,
   remote-logger, and the Node projects of compact-mantine and graphty), plus the Node-only packages
   proposed next: graph-io, graph-samples, layout, algorithms-default, cytoscape-extensions and
   graphty-element's default project. Each package with no miss joins the `fileLevel` list.
3. **When that run shows no misses**, `PREPUSH_SELECT` defaults to on in the gate's live copy. The
   advisory log keeps running beside it, so replays keep measuring.
4. **Browser projects** join `fileLevelBrowser` one package at a time as their background mutation
   runs come back clean, smallest first (compact-mantine, graphty's app tests, graph-io-browser,
   algorithms-browser), graphty-element last.
5. **Nx 24** (section 4) runs in parallel on its own branch; step 4 of it waits for the replay
   comparison to come back empty.

To turn selection off for one push: `PREPUSH_SELECT=0`. For every push on the machine: set the
default back to off in the gate's live copy with `tools/live.sh gate <branch>`, or remove a package
from `fileLevel` to stop file-level selection in that package only. Nothing that runs after the
gate (verification, CI on the cut, the release train) depends on the setting, so turning it off
never needs anything else changed.
