# Minimal tests: run only what a change can affect

Status: Built, 2026-10-22: `pnpm run test:changed`, selection in the gate (on by default since the
misses mutation testing found were fixed; section 5.1) and `tools/test-select-mutate.mjs`. Issue #3276,
part of the fast pipeline (#3262, `design/ci/fast-pipeline.md`, section 5).

Partly superseded on 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the gate no longer
runs tests, so selection in the gate (section 1.2) stops applying to pushes, and verification (1.3)
is a full CI run. Selection stays for `pnpm run test:changed`, hand runs and bisect.

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

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the landing check runs no test shards (the light gate). Selection in the gate applies only with `PREPUSH_LIGHT=0`.

`tools/prepush-tests.mjs` computes the selector's answer for every push and writes it to
`tmp/test-select/advisory.jsonl` beside what it actually ran. By default (`PREPUSH_SELECT` unset or `1`) it
asks about every shard of the matrix but the "never" ones -- not only the shards of nx's affected packages
and not through the "when-paths-change" policy, both of which drop shards the selector runs whole -- builds
the packages it then runs that nx did not call affected, and uses the answer:

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

### 1.3 Verification, the cut and the release train stay full

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): verification is a full `ci.yml` run in GitHub CI on golden's newest commit; coverage thresholds are checked there. The cut's gate is light; the cut pull request's CI run and the release train are unchanged.

Verification sets `PREPUSH_ALL=1`, and the gate ignores `PREPUSH_SELECT` whenever `PREPUSH_ALL` is
set. A push to golden-cut or master (`land.mjs cut` and `cut-fix` set `PREPUSH_SELECT_BASE` to
`origin/golden-cut`) never selects either, and its gate key says so, so a selected gate's pass never
stands in for it.

The off switch: `PREPUSH_SELECT=0` on one push runs every affected shard whole. For every push on the
machine, set `SELECT_DEFAULT` in `tools/prepush-tests.mjs` back to `"0"` and put it live with
`tools/live.sh gate <branch>`. The release train runs CI's full suite on the commit it releases. Neither changes. They are
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

### 2.2 Across packages: builds followed to their source, reads by path select the readers

Every package's tests read the others through their built `dist/` (the `@graphty/*` exports point
there; the one alias to source is graphty's, which reads graphty-element's source). The tests keep
doing that. Only the selector's graph changes: while it walks a package's imports, each build
output of another package is replaced by the source file it was built from, and the walk goes on
through that source. The source of a build output is known from:

1. a source map that names exactly one source (tsc's output, file for file, and a one-module chunk);
2. an entry's type shim that re-exports one module (`dist/dot.d.ts` holding
   `export * from "./src/formats/dot/index.js"`, written by the bundle-types scripts of graph-io,
   graph-samples, graph-format and webgpu-graph-algorithms);
3. the `"."` export of a package whose build names exactly one entry (`entry: "src/index.ts"` in its
   Vite config or `scripts/build-bundle.js`: compact-mantine, layout).

Every export of graph-format, graph-io, graph-samples, algorithms, layout, compact-mantine,
remote-logger, webgpu-graph-algorithms and cytoscape-extensions maps this way; graphty-element's
bundles do not (graphty reads its source anyway). So a change to `graph-io/src/formats/dot/styles.ts`
appears in graphty-element's graph, and a change to the build of a package another depends on is
judged like this (`throughSources` in `tools/test-select.mjs`):

- every test whose imports reach a changed source file is selected;
- every test that loads a build output whose source is unknown (graphty-element's bundles, the
  dataset files graph-samples' build writes) is selected when that output's package, or a package it
  depends on, holds the change;
- the tests that read files or run programs at run time are selected (one may load the other
  package's build by path);
- a changed code file under `src/` that no test reaches selects nothing more: a bundle holds only
  modules its entry imports, and Vite's walk sees literal, glob and template imports;
- any other changed build input no graph holds (a build script, `package.json`, a tsconfig, a data
  file the build reads) runs the dependent package whole, and so does a package without a graph or a
  build that changed for another reason than its own files (a read into it, below).

A source file the reading project cannot transform does not discard the graph: it stands for its
package's whole build, like a build output of unknown source. Whether a package may use the file
list is still decided by `fileLevel` (section 3); elsewhere it is logged as measured.

A package that reads another package's files without going through its build (graph-io's corpus
read by graphty-element's tests, visual-review's test helpers imported by githerd's) is judged path
by path:

- a test whose imports reach the changed file is selected (graphty's tests import graphty-element's
  source through the alias, and githerd's import visual-review's helpers, so those are graph edges);
- every literal path a file of the reader's graph names inside another package
  (`"../../graph-io/test/corpus/styles"`, `join(__dirname, "..", "..", "..", "graph-io", "test")`,
  `resolve(pkg, "..", "graph-io", ...)`, `{workspaceRoot}/...`) is a prefix; a changed file under it
  selects the tests that reach the file holding the literal. A script a test runs is read on its
  behalf, with its relative imports. A regex replacement (`"../graphty-element/$1.ts"`, a Vite alias)
  is not a read: what it resolves is in the graph;
- a literal in a test config, or a package without a graph, runs the reader whole; a literal in the
  Storybook setup (`.storybook/main.ts` serving graph-samples' datasets as static files) runs only the
  projects that run the Storybook (those with a setup file in `.storybook/`);
- a literal naming a build output (a path git ignores, such as `graph-samples/dist/data/v1`) is read
  when that package's build changes; a literal that names nothing tracked stands for the whole package;
- a read by one of the reader's own build inputs counts as a change to the reader's build, so its
  dependents run whole.
- a package with no build (`noBuild` in `tools/test-select-rules.json`: visual-review, which its
  dependents load as source from their vitest configs, story setups and tests) changes no dependent's
  build: a change to it is only a read, judged as above, so it never runs a package that does not load
  the changed file (the webgpu-graph-algorithms shards, downstream of algorithms and layout);
- a file a graph's vitest config imports (graphty-element's `vitest.config.ts` imports visual-review's
  `story-test.mjs`) selects every test of that graph, which then runs whole; a vitest config is never a
  build input, so such a read does not run the reader's dependents whole;
- a literal path into a folder its package does not have (`"../assets/server/..."`, joined at run time
  onto a directory in `node_modules`) names nothing of that package and is not a read.

A change to a graphty-element test therefore runs graphty's one test that reads graphty-element's
root (`test/config/element-source.test.ts`), not all of graphty. Section 4 moves the remaining
cross-package edges into nx.

An import graph is only used when Vite transformed every file it reached. A file Vite cannot
transform (usually an import of a workspace package whose `dist/` is not built) used to stay in the
graph as a leaf, silently losing its imports; now the whole graph is discarded and its package runs
whole, and the graph is not cached. A stylesheet's `@import` and `url()` (fonts, images) are edges.

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
- **nothing**: design notes, agent settings, the screenshot baselines and approvals, root Markdown --
  unless a test imports or names the file, which is asked first (2.4).
- **also run**: a path one package reads from another without importing it, with the packages it
  then runs (graph-io's corpus also runs graphty-element and cytoscape-extensions).
- **standalone tools**: `tools/pipeline-health/`, `tools/results-service/`, `tools/release-scheduler/`
  and `tools/nx-cache-worker/` are projects of their own with their own tests and workflows. A change
  inside one runs only the package tests that import it or name its path, and otherwise no shard; its
  file name alone (`text.ts`) never names it (issue #4506).

Environment variables that choose a lane (`GRAPHTY_GPU_REQUIRE`, `GRAPHTY_BROWSER_GPU` and the
rest of `laneEnv()` in `tools/prepush-inputs.mjs`) are part of every shard's pass key, so a pass
under one lane never stands in for another.

### 2.4 Anything unknown runs the whole shard

A changed file that no import, rule or test accounts for runs its whole package. A root file (outside
every package) is asked about in this order: does a test import it, or a root file that imports it
(the root import graph: `tools/wait-log.mjs` counts as `tools/test-slots.mjs`, which is in "everything");
does a string literal in a package's test-side files or test and lint configs name its path, a folder
above it, or (under `tools/`) its file name; does an "also run" or "nothing" rule match it. Only then is
it unknown, and an unknown root file runs everything, except code under `tools/` that nothing reads,
which runs nothing and is listed. A deleted or renamed file (the change is read with `--no-renames`) runs
its whole package, because no graph built at the head can have an edge to it. A package whose
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

### 2.6 Re-exports: not followed, and why

A graphty-element source file selects most of its package's browser tests (a mesh: 406 of 1,138 test
files across the projects), and an upstream source file reached through a package's index selects most
of its dependents' tests. It looks like barrel files (modules that only re-export) widen the
selection, so following each import through a barrel to the module that defines the names the importer
uses was tried on 2026-10-22, and dropped:

- **Unsound on its own.** Importing one name from a barrel evaluates every module the barrel
  re-exports. A change at a module's top level (a registration, a thrown error, a changed constant
  that a top-level call reads) is seen by every importer of the barrel, whether or not it uses the
  module. The selector's own mutants (a top-level `throw`) are exactly such a change, so plain
  re-export following misses by construction.
- **The safe form gains nothing.** Following is right only for a change confined to function bodies
  (the module's tokens outside function, method and arrow bodies unchanged) in a module whose top
  level runs no code, and only if every module the barrel evaluates that does run code stays an edge
  (it may hand the changed function to code that never imports it). Built from Vite's record of the
  names each import uses (`importedNames` in the SSR transform) and a TypeScript syntax check, that
  graph selected 4,478 test files where the plain graph selects 4,479, over seven sample files in
  graphty-element (a mesh, a manager, a layout engine, and graph-io, graph-samples, algorithms and
  layout sources), even with built-ins such as `Object.freeze` and `new Set` counted as running no
  code. Half of graphty-element's source modules run code at their top level, and the modules that
  register layouts, algorithms and data sources import nearly everything by name; the shortest path
  from a test to `graph-samples/src/datasets/remote.ts` is `session/data.ts`, which imports
  `fetchDataset` directly.

The wide selections are real dependencies: almost every graphty-element test loads the element, and
the element loads almost everything. Narrowing them needs smaller test entry points in
graphty-element, not a cleverer graph.

## 3. Browser, Storybook and screenshots

Browser-mode tests (graphty-element's browser, interactions and xr projects, graphty's app tests,
compact-mantine, algorithms-browser, graph-io-browser) and the Storybook projects are most of the
gate's time. They are also where hidden inputs are most common: the label font loads through a
`?url` import in every graphty-element browser test, Storybook's preview imports the registries,
the font helper and app modules into every story, and `staticDirs` serve graph-samples' build.

So a shard that runs a browser project is selected file by file only when its package is on the
browser allow list in `tools/test-select-rules.json` (`fileLevelBrowser`), and a package goes on it
only after mutation testing (section 5) of its browser projects finds no miss. compact-mantine,
graphty and graphty-element joined on 2026-10-22 (section 5.2). Until then such a shard runs whole whenever its package is affected, as it does
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
      algorithms and layout, visual-review's of layout. Inputs,
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
  much was selected that did not fail, the measure of over-selection. `--batch K` breaks K files at
  once and runs the shards once: a failing test file is explained only by the broken files that
  selected it, so the files that did not are broken again without the others (one run for the
  group, then one per file): what fails then, and not on the unbroken tree, is a miss. `--reader
<package>` runs another package's shards, for files it reads by path. Every package and every
  import graph is built first, as in the gate, and browser shards take a shared browser slot.
- **Verification**, the backstop: the full gate on golden's newest commit after landings. A failure
  there that the landing's selected run passed is a miss by definition.

### 5.1 The first mutation run, 2026-10-22

An adversarial run of 29 mutations found these misses, each now fixed at its cause and covered by a
case in `tools/test-select.test.mjs` ("misses found by mutation testing") and re-run against the fixed
selector:

| Change                                   | Test it broke                                     | Cause                                              | Fix                                              |
| ---------------------------------------- | ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `tools/wait-log.mjs`                     | every Node vitest config                          | reached only through `tools/test-slots.mjs`        | root import graph                                |
| root `.prettierrc`                       | graph-io and cytoscape-extensions reference tests | read by a generator in a child process             | `alsoRun` entry                                  |
| `design/` fixtures, schema, style record | graphty, graphty-element, graph-io tests          | `^design/` noTests rule applied first              | graphs and literals asked before noTests         |
| a docs page a generator test compares    | graph-io and cytoscape-extensions reference tests | `promisify(execFile)(` not opaque                  | opaque pattern counts `child_process`, `node:fs` |
| a deleted JSON a test imports            | its importer                                      | no edge at the head                                | deleted paths run the package                    |
| a root helper that gained an import      | visual-review and githerd tests                   | cached graph kept old edges                        | graphs carry hashes of outside files             |
| `tools/eslint-rules/*`                   | graphty's restricted-imports test                 | ESLint loads its config at run time                | `eslint.config.*` read for names                 |
| graphty-element source                   | its browser and interactions tests                | shards dropped by the path policy before selection | the selector is asked about every shard          |
| `graphty/public/samples/*`               | graphty's OpensCentered test                      | served by URL from Vite's publicDir                | `public/` is a whole-package rule                |

Every miss caused by a change becomes, in the same fix, a rule in `tools/test-select-rules.json` (or
an nx input, section 4), a mutation case that reproduces it, and an entry in
`design/ci/test-selection-replay.md` naming the reader that was not seen. A package with a second
miss of a kind the rules cannot express goes back to whole-package selection.

### 5.2 Path-level reads and browser projects, 2026-10-22

Every run broke its files together (`--batch`) and broke the files that did not select a failing
test again alone. None found a miss.

| Shards run                                              | Broken files                                                                                                                                              | Result                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| cytoscape-extensions                                    | 6 graph-io test files: the Pajek file it names, and five it does not                                                                                      | the named one selects its 1 reader; the others select none |
| githerd                                                 | 5 visual-review test files and fixtures                                                                                                                   | its 19 tests that import visual-review's helpers           |
| visual-review                                           | layout's `project.json` (named) and 2 layout tests                                                                                                        | 1 test; none                                               |
| compact-mantine (all projects)                          | 12: components, a shared helper, theme styles, the font a stylesheet loads, a test harness helper, the browser setup                                      | no miss                                                    |
| graphty-element default and mesh                        | 17: meshes, managers, session styles and sets, data and catalog code, test and story helpers, 7 graph-io files it reads by path                           | no miss                                                    |
| graphty (all but Storybook, and Storybook)              | 14: components, a stylesheet and the font and image it loads, shared helpers, test and story helpers, the browser setup, and 3 graphty-element test files | no miss; an element test file selects 1 graphty test       |
| graphty-element browser, interactions, xr and Storybook | 14: four source files, test and story helpers, a JSON fixture, a test, and 5 graph-io files it reads by path                                              | no miss (one test failed unbroken too: flaky)              |

Selections are wide for source files that a package's barrel exports (a graphty-element mesh
selects 376 of its 416 browser tests), and narrow for tests, helpers and data, which is where most
landings' changes are.

### 5.3 Upstream source followed into its readers, 2026-10-22

Each run broke 8 source files under one package's `src/` (seeded), built that package with the
mutants in it, and ran the reader's shards whole on its build, four or eight files at a time. None
found a miss.

| Broken package  | Reader's shards                                  | Selected (of the shard's test files)                           | Result                        |
| --------------- | ------------------------------------------------ | -------------------------------------------------------------- | ----------------------------- |
| graph-format    | graphty-element-default                          | 506 of 646 (204 for a types module)                            | 472 failed, all selected      |
| graph-format    | cytoscape-extensions, layout, algorithms-default | 19 of 20, 29 of 36, 48 of 51                                   | 17, 25 and 47 failed, no miss |
| graph-io        | graphty-element-default, cytoscape-extensions    | 373 of 646; 19 of 20                                           | 335 and 5 failed, no miss     |
| algorithms      | graphty-element-default, cytoscape-extensions    | 414 of 646; 19 of 20                                           | 372 and 17 failed, no miss    |
| layout          | graphty-element-default, cytoscape-extensions    | 351 of 646; 19 of 20                                           | 307 and 17 failed, no miss    |
| compact-mantine | graphty (all projects, Storybook)                | 164 of 164, 21 of 21                                           | 133 and 21 failed, no miss    |
| graphty-element | graphty (all projects, Storybook)                | 164 of 164 and 21 of 21; 7 and none for the door list's source | 136 and 21 failed, no miss    |

Two over-selections the runs showed were fixed: webgpu-graph-algorithms' ESLint config names
`"../algorithms/*"` as a restricted import pattern, which counted as its build reading algorithms (a
test or lint config never goes into a build now), and graphty's ESLint config imports a rule that
reads graphty-element's built door list, which ran all of graphty (an ESLint config's read now selects
only the tests that read files, the ones that run ESLint).

The gain is small: the six recent landings priced at 368 minutes of shard time with the previous
selector and 354 with this one (same shard times). An upstream source file reaches most of its
readers' tests (section 2.6), so the saving is in packages whose tests use little of the upstream
package (cytoscape-extensions' 20 test files, graphty-element's Node tests for a graph-format types
module).

### 5.4 The remaining Node packages and two browser projects, 2026-10-25

Each run broke 10 files of one package (seeded, two at a time, `--seed 3` except graph-samples, one
at a time with `--seed 2`) and ran every plain vitest shard of the package whole. None found a
miss, so each package joined `fileLevel`, and graph-io and algorithms, whose browser shards ran
too, joined `fileLevelBrowser`.

| Package              | Shards run                             | Test files one source file selects | Result                                      |
| -------------------- | -------------------------------------- | ---------------------------------- | ------------------------------------------- |
| graph-samples        | graph-samples                          | 6 to 19                            | no miss                                     |
| layout               | layout                                 | 22 to 26                           | no miss (seed 2 broke package.json: no run) |
| graph-io             | graph-io, graph-io-browser             | 181 to 186; 2                      | no miss                                     |
| algorithms           | algorithms-default, algorithms-browser | 42 to 46; 1 or 2                   | no miss                                     |
| cytoscape-extensions | cytoscape-extensions                   | 10 to 19                           | no miss                                     |

webgpu-graph-algorithms has no shard the selector can run file by file: every command goes through
`scripts/run-node-shard.js` or `scripts/run-browser-project.js` with a lane variable, so its shards
always run whole and it stays off the lists. cytoscape-extensions-cytoscape-versions runs whole for
the same reason.

### 5.5 visual-review and githerd, 2026-10-26

The last two packages off `fileLevel` with a plain vitest shard. Each run broke 15 files, five at a
time (`--batch 5`), and ran the package's shard whole. None found a miss, so both joined
`fileLevel`.

| Package       | Seeds and files                                       | Test files one file selects        | Result                                     |
| ------------- | ----------------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| githerd       | seed 3850                                             | 81 or 82 of 82                     | no miss                                    |
| visual-review | seed 3850 (10 files), then 15 named files (`--files`) | 25 of 27; all 27 for setup helpers | no miss; 4 batches inconclusive, see below |

A batch that broke a file the suite's setup reaches (`trusted/gate.mjs`, `trusted/lib/compare.mjs`,
`trusted/lib/config.mjs` or `trusted/vendor/pixelmatch.mjs`, imported by `test/helpers.mjs`, which
the global setup loads) stopped the whole run before any test reported, so the script called it
inconclusive. Each such file selects all 27 test files, so it cannot be missed; the 15 named files
are the rest of the two seeded picks.

Neither package saves much: most of their tests read files or run programs at run time, so almost
any change selects nearly every test file, and a selected shard runs as a bin job of its own
(about 0.8 minutes of setup) instead of inside its group job. On the 79 pull request runs of
2026-10-26 15:59 to 23:00 UTC, visual-review ran whole only because it was off `fileLevel` in 21,
githerd in 1. The shards that run whole on a pull request for other reasons cost far more: in 19 of
the same 79 runs a visual-review change ran every package that depends on it whole ("depends on
visual-review, whose build changed"), the four webgpu-graph-algorithms node shards among them,
although visual-review has no build and its dependents only load it in test and story configs.

### 5.6 visual-review's dependents, 2026-10-27

visual-review has no build, and its dependents load it only from their vitest configs, story setups and
a few tests. The selector had treated any change to it as a change to every dependent's build. On
2026-10-26 that ran every shard of every dependent, the four webgpu-graph-algorithms node shards among
them, in 19 of 79 pull request runs. Each run below broke the same seven visual-review files at once
(`story-test.mjs`, `capture.mjs` and `trusted/lib/compare.mjs`, which the vitest configs load; `trusted/cli.mjs`,
`trusted/lib/accept.mjs`, `trusted/lib/init.mjs` and `test/helpers.mjs`, which no package outside visual-review
loads except githerd's tests) and ran the reader's plain shards whole.

| Reader          | Shards run                            | Result                                                                                                          |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| githerd         | githerd                               | 19 failed, every one selected (they import `test/helpers.mjs`); no miss                                         |
| layout          | layout                                | 0 failed; no miss                                                                                               |
| algorithms      | algorithms-default                    | 0 failed; no miss                                                                                               |
| compact-mantine | compact-mantine                       | 0 failed; no miss                                                                                               |
| graphty-element | graphty-element-default, -storybook-1 | the config does not load (no test runs): what its config loads selects every test; the 4 others alone: 0 failed |
| graphty         | graphty-1, graphty-storybook          | the same                                                                                                        |

webgpu-graph-algorithms has no plain shard (section 5.4); none of its files names or imports
visual-review. Replayed on the 79 runs, the change selects less in the 20 that touch visual-review
code and in no other run, and the webgpu-graph-algorithms node shards no longer run for a
visual-review change.

## 6. Rollout

Speed first, safety from the checks above:

1. **Today.** `test:changed` lands and goes live for every worktree. The gate gets `PREPUSH_SELECT`,
   off by default, and the mutation script. Both go into the gate's live copy at once with
   `tools/live.sh gate infra/minimal-tests`, not after a landing.
2. **Same day.** Mutation testing runs over the packages allowed file by file (graph-format,
   remote-logger, and the Node projects of compact-mantine and graphty), plus the Node-only packages
   proposed next: graph-io, graph-samples, layout, algorithms-default, cytoscape-extensions and
   graphty-element's default project. Each package with no miss joins the `fileLevel` list.
3. **Done 2026-10-22.** `PREPUSH_SELECT` defaults to on in the gate's live copy. The
   advisory log keeps running beside it, so replays keep measuring.
4. **Browser projects** join `fileLevelBrowser` one package at a time as their background mutation
   runs come back clean, smallest first (compact-mantine, graphty's app tests, graph-io-browser,
   algorithms-browser), graphty-element last.
5. **Nx 24** (section 4) runs in parallel on its own branch; step 4 of it waits for the replay
   comparison to come back empty.

To turn selection off for one push: `PREPUSH_SELECT=0`. For every push on the machine: set
`SELECT_DEFAULT` in `tools/prepush-tests.mjs` back to `"0"` and put it live with `tools/live.sh gate <branch>`, or remove a package
from `fileLevel` to stop file-level selection in that package only. Nothing that runs after the
gate (verification, CI on the cut, the release train) depends on the setting, so turning it off
never needs anything else changed.
