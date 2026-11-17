# tools/ -- reference for agents

The root `CLAUDE.md` points here. Read this before running builds, tests, servers or any script under `tools/`. It
holds the commands, the tools table, the secret scan, lint and duplicate code findings, starting servers, test
projects, the full testing and quarantine rules, where a change takes effect, and the rules for working beside other
agents.

## Development Commands

### From Root (Nx-orchestrated)

```bash
# Build
pnpm run build                    # Build all packages
pnpm exec nx run-many -t build    # Build with Nx caching

# Test
pnpm run test                     # Test all packages
pnpm exec nx run-many -t test     # Test with Nx caching
./tools/run-tests.sh <shard>      # Reproduce one failing CI shard as CI runs it, when asked (--list names them)

# Coverage
pnpm run coverage                 # Run all coverage
./tools/merge-coverage.sh         # Merge coverage reports

# Lint
pnpm run lint                     # Lint all packages

# Watch builds (tsc --watch, no server)
pnpm run dev:algorithms
pnpm run dev:layout
```

Every server below (Vite dev servers, Storybook, docs, coverage previews, interactive
examples) takes its port from `PORT` and refuses to start without it. See "Starting Servers".

```bash
pnpm run dev:graphty-element
pnpm run dev:graphty
pnpm run dev:webgpu-graph-algorithms      # the WebGPU demo page
pnpm run storybook:graphty-element
pnpm run storybook:graphty                # HTTPS only
pnpm run docs:dev                         # VitePress docs
```

### Per-Package Commands

```bash
# Inside any package directory:
npm run build         # Build the package
npm run build:bundle  # Bundle for distribution (algorithms, layout)
npm test              # Run tests (watch mode)
npm run test:run      # Run tests once
npm run coverage      # Run with coverage
npm run lint          # Lint package
npm run lint:fix      # Auto-fix lint issues
```

### Coverage Preview (HTTP servers)

`pnpm run coverage:preview:<package>` for any package (algorithms, layout, graphty-element, graphty,
graph-format, graph-io, webgpu-graph-algorithms, graph-samples, cytoscape-extensions, babylonjs-map, babylonjs-models).
Each package also has its own `npm run coverage:preview`.

## Shared Configuration

The monorepo uses shared configuration files in the root directory:

| File                 | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `vitest.base.mjs`    | Shared Vitest settings every package spreads in (`baseTest()`) |
| `tsconfig.base.json` | Shared TypeScript settings with project references             |
| `eslint.config.js`   | Shared ESLint flat config                                      |

### Lint

ESLint runs SonarQube's rules ("Sonar way" minus the rules this repository turned off) through eslint-plugin-sonarjs,
eslint-plugin-unicorn, typescript-eslint, eslint-plugin-react and eslint-plugin-jsx-a11y; the list, where each rule
applies (main code or tests, as SonarQube split them) and what is left out are in `tools/eslint-rules/sonar-way.mjs`.
`sonarjs/cognitive-complexity` is at 15. The Sonar rules that need type information (`sonarjs/slow-regex` among them)
do not run on JavaScript files, scripts, configs, benchmarks or stories outside a tsconfig, and `.storybook`, the
packages' `examples` and `docs` directories are not linted at all; SonarQube checked both. tools/, benchmarks/ and the
root's script files belong to no package and are linted by `tools/lint-root-scripts.mjs` (`pnpm run lint:eslint-root`).

A disable comment names its rules and gives its reason after `--`, and one that suppresses nothing is an error:

```ts
const c = text.charCodeAt(i); // eslint-disable-line unicorn/prefer-code-point -- reads UTF-16 code units on purpose
```

**Existing findings are suppressed, new ones fail.** The findings the code had when these rules were turned on are
counted, per file and rule, in `eslint-suppressions.json` in each package (beside its `package.json`: Nx runs each
package's lint from there, and ESLint reads the file from its working directory), and at the repository root for
tools/, benchmarks/ and the root scripts. A file whose count for a rule grows reports every finding of that rule in
the file. Every lint script passes `--pass-on-unpruned-suppressions`, so fixing a finding never requires editing the
shared file, and the only way a suppression is added is on purpose. Commands, run in the package directory (the
repository root for tools/, benchmarks/ and the root scripts):

```bash
npx eslint --suppress-rule <rule> <file>      # hold a finding you cannot fix now (say why in the PR); prefer a disable comment
npx eslint --suppress-all <file>              # after moving a file: suppressions are keyed by path and do not follow it
npx eslint --prune-suppressions               # drop counts the code no longer has (whole package; one PR at a time)
```

## Tools Directory

The `tools/` directory holds the build, test, CI and pipeline scripts. The ones an agent uses:

| File                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-open.sh`                        | `--proof <file> [--refs] [--title <header>] [--merge-master] [--review-answered]`: opens the branch's pull request into master as graphty-agent, with auto-merge on. See "Shipping a change"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pr-review.sh`                      | The fresh-context review `pr-open.sh` runs before it pushes; a blocking finding stops it (exit 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `worktree-new.sh`                   | `<branch> [base] [name]`: a worktree in `.worktrees/<name>` with the main checkout's `.env` linked in and `pnpm install --frozen-lockfile` done. It needs the branch's issue (a number of three or more digits in the branch name, `--issue N`, or `--new-issue "<title>"`), pushes the new branch, labels the issue `in-progress` and writes the branch's progress note. The `design/**` images are LFS pointer files there (`--full-images`, or `git lfs pull --include "design/**"`, to get them)                                                                                                                                                                                                                                                                                                                                          |
| `branch-note.mjs`                   | The branch's progress note on its issue: `update --done <t> --left <t> --next <t>` when you stop working                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `issue-queue.mjs`                   | The only way an agent reads issues: `list [--limit N] [--json]` (the issue round's queue, trusted authors only), `show <n>` (untrusted comments withheld), `filter` (withholds untrusted text in a GraphQL answer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `branch-push.sh`                    | Run by `.husky/post-commit`: pushes the current branch in the background after every commit (never master); a branch that moved on GitHub is not merged, `git pull` brings it in. Log: `tmp/branch-push.log` in the main checkout                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `no-copy.sh`                        | Run by the commit and rebase hooks: refuses a cherry-pick or a rebase. Never copy, always merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `live.sh`                           | `<tool> <branch-or-commit>`: merges a branch into a local tool's live worktree, tests it, restarts its servers (`live-tools.json`). See "Where a change takes effect"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `run-tests.sh`                      | `<shard>`, `all` or `--list`: reproduces one failing CI test shard locally with CI's command (from `ci-test-matrix.mjs`), with coverage and its thresholds, when asked; never a pre-push step. Build first                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ci-test-matrix.mjs`                | The CI test shards, their commands, groups and measured durations; ci.yml and `run-tests.sh` both read it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `test-select.mjs`                   | The file-level test selector (design/ci/minimal-tests.md): for a change, per shard all, none or which test files and why, from nx's graph, Vite's import graph and `test-select-rules.json`. A pull request's CI runs by it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `test-changed.mjs`                  | `pnpm run test:changed [--dry-run] [--base <ref>]`: runs only the tests this worktree's change can affect, as `test-select.mjs` decides, building what they need first                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `check-quick.sh`                    | `pnpm run check:quick [--base <ref>] [--with-dry-run] [--whole-browser-shards]`: prettier on the changed files, `nx affected -t build lint typecheck`, the selected tests (a whole browser shard only with `--whole-browser-shards`), the duplicate code check and, when webgpu-graph-algorithms is affected, its tests on the local NVIDIA card, then the rest of ci.yml's Checks job (the tools tests, Knip, published dependencies, the public API report, the source checks), gated as CI gates them, except the docs-site build and the whole-repository format check, which it leaves to CI's Docs and Checks jobs; `--with-dry-run` also builds the graphty app and runs its dry run (`graphty/acceptance/run.mjs`), for a long-lived branch (see "Shipping a change", step 2). Run it in the background before opening a pull request |
| `test-quarantine.mjs`               | Runs every CI shard: retries failed test files once and quarantines a test that failed and then passed. See "Quarantined tests"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `test-quarantine.json`              | The committed quarantine list. Entries come only from the tooling, never by hand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `results/`                          | The results store's clients: `run-group.mjs` runs one test group and posts its record and each failure to the store (`RESULTS_URL`); `cli.mjs` queries and imports. The store itself is `results-service/` (a Cloudflare Worker with D1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ci-budgets.mjs`                    | CI time budgets (`ci-budgets.json`): job timeouts derived from the budgets (`lint`), and the per-run report that raises a budget alarm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `test-slots.mjs`                    | The machine-wide limit on concurrent test runs (one slot per 8 cores by default; `status` lists holders); `--gpu` and `--lint` hold the one GPU slot and the one slot graphty-element's eslint runs in. Every package's vitest config takes a slot through it. The count is `GRAPHTY_TEST_SLOTS`, else the whole number in `tmp/test-slots/.count` in the main checkout (one file every worktree reads, so writing it changes the limit machine-wide), else the default. Off on GitHub Actions and with `GRAPHTY_TEST_SLOTS=0`                                                                                                                                                                                                                                                                                                                |
| `with-browser.sh`                   | Runs a browser-driving command in one of the machine's four shared browser slots                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `low-priority.sh`                   | Runs an agent's build or test run at niceness 10 in the low lane of the test and browser slots                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `full-run.mjs`                      | The 6-hour full run's decisions in release.yml: `pick` (which commit a slot tests) and `verdict` (green-clean, green-images, red or owner-item, recorded in the results store)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `release-due.mjs`                   | ci.yml's `release-due` job: after a green master build, dispatches a full-run restart, a held candidate's re-test or its nightly promotion when the merge calls for one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `channel/`                          | The channels: `nightly.mjs` (the nightly promotion's decision), `hold.mjs` (the held nightly candidate), `screenshot-gate.sh` (a changed picture holds nightly until the owner approves), `promote.mjs` (production promotion for promote.yml), `site-deploy.mjs` (the hash check of a site repository's deploy)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `bisect-core.mjs`, `bisect-ci.mjs`  | bisect.yml's rules and state: which merge turned a full run red                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `release-diff.mjs`                  | `[--accept-merges] <from> <to>`: exit 1 naming every change that is not a version field, a changelog or a consumed version plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `release-scheduler/`                | A Cloudflare Worker that dispatches `release.yml` at 00:00, 06:00, 12:00 and 18:00 UTC; see its `README.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `check-links.sh`                    | Dead-link check (see "Dead Links"). `--offline` for the fast half                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `check-provider-links.mjs`          | Checks that the graphty app's AI provider key and billing links still land where recorded; run by `check-links.sh` (offline half every PR, network weekly)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `assemble-pages-site.sh`            | Builds the graphty.app site from the build outputs; deploy-pages.yml and the link check both run it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `check-committed-images.mjs`        | Fails a push that adds more than 20 images or 20 MB outside the folders that hold them; an `Images-Approved: <reason>` trailer passes a deliberate addition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `check-figma-lock.mjs`              | Fails a commit that changes compact-mantine's Figma spec, tests or token values without the owner's `Figma-Approved: <reason>` trailer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `check-special-layers.mjs`          | The ratchet on style layers treated as special (#5905): `graphty/special-layers-baseline.json` may only shrink, and its lint and API rows may not go stale. The layer equality and panel parity tests read the same file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `check-working-graph.mjs`           | The ratchet on readers that ignore the working graph: `graphty-element/working-graph-whole-readers.json`, the session readers that read the whole graph by the owner's agreement, may only shrink and every row names its case. `graphty-element/test/contracts/working-graph-readers.test.ts` reads the same file and proves every other reader reads the view                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `visual-preview.sh`                 | `<pr>`: captures a pull request's screenshots on this machine, so the owner can review them before CI's capture lands                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `claude-no-foreground-wait.mjs`     | Claude Code hook that refuses a foreground Bash wait (sleep loops, `watch`, `tail -f`, ...); run waits in the background                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `claude-owner-credential-guard.mjs` | Claude Code hook that refuses tool calls reading or using the owner's credentials                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `worktree-cleanup.mjs`              | Removes finished worktrees that pass every safety check (never by age); runs every 15 minutes under servherd                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Secret Scan and Secret Files

`.husky/pre-commit` runs secretlint (`.secretlintrc.json`) on the staged changes and refuses a commit that holds
something shaped like a credential, then runs prettier on the staged files (`tools/format-staged.sh`).
`.husky/pre-push` runs the same scan on every file the branch changed since it left `origin/master` and on every
line each of its commits adds (a secret a later commit removes is still pushed, so it is still refused), the Git LFS
upload (`tools/lfs-pre-push.sh`) and the committed-images limit; `pr-open.sh` runs the scan and the LFS upload
too. For a false positive, add the path to `.secretlintignore`. Tokens live in the root `.env` (gitignored);
scripts read them from there and never print them. `.claude/settings.json` denies agents `Read` on `.env` files,
their backups, `*.pem`, `*.key` and SSH keys; `.env.example` stays readable. `.husky/post-merge` warns when a
merge changed `pnpm-lock.yaml`: run `pnpm install`.

### Lint and duplicate code findings

SonarQube is not used (retired 2026-11-16, issue #8365): its rules run in ESLint (see "Lint") and duplicate code is
checked by jscpd. Both run on every push and in CI, so nothing needs a server or a token.

- **A lint finding on your changed lines: fix it.** That is the default, every time. `sonarjs/cognitive-complexity`
  fails above 15. ESLint judges whole files, not edits: there is no "touch it, fix it" band for a function you edit
  that already scores 16 to 20, and an edit that adds a finding to a file with suppressed ones fails that file.
- **A false positive: `// eslint-disable-next-line <rule> -- <reason>`** (or `eslint-disable-line`) on that line.
  The rule and the reason are required, and a comment that suppresses nothing fails. Say in your reply which ones
  you added and why.
- **Never add to `eslint-suppressions.json` to get a change through.** The only suppression a change adds is a
  deliberate legacy carry-over (a moved file, see "Lint"), and the reply says so.
- **Duplicate code: `pnpm run check:duplicates`** (`tools/duplicates-check.mjs`, jscpd configured by
  `.jscpd.json`) runs in the pre-push source checks, in `check:quick` and in CI's Checks job. It fails on a new
  exact clone between two pieces of non-test code that overlaps a line the branch adds; a new clone that touches a
  test, story, fixture or benchmark is listed and does not fail. Editing inside a clone that was already there, or
  renaming its file, adds no new clone. Reuse or extract the existing code. A
  deliberate parallel goes in `.jscpd.json`'s `ignore`, with its reason in the commit message (JSON holds no
  comments).

The existing suppressions are burned down in separate small pull requests, one rule or one package at a time, never
as part of feature work.

### Starting Servers

No server has a fixed port. Every dev server, Storybook, docs server and coverage preview reads
`PORT` and fails with "start it through servherd, which sets PORT" when it is unset. Start them
through the servherd MCP and let it assign the port: `{{port}}` goes into `env.PORT`. For HTTPS
pass `protocol: "https"` and hand servherd's certificate over as `HTTPS_CERT_PATH` /
`HTTPS_KEY_PATH` -- on the COMMAND, with `env`, because servherd substitutes `{{httpsCert}}` and
`{{httpsKey}}` in the command but not in `env` values, and it runs the command without a shell.
`HOST` (optional) sets what to bind: `{{hostname}}` for Vite and VitePress, `0.0.0.0` for
Storybook (Storybook answers "Invalid host" (403) to a request for the hostname when it is bound
to that hostname). Starting the same name again restarts the server instead of adding a copy.

```jsonc
// Vite dev server (graphty-element, graphty, the webgpu-graph-algorithms demo, examples)
servherd_start({ name: "graphty-element-dev", cwd: "<repo>/graphty-element",
  command: "npm run dev", env: { PORT: "{{port}}", HOST: "{{hostname}}" } })

// Storybook (graphty-element, compact-mantine, algorithms, layout, cytoscape-extensions)
servherd_start({ name: "graphty-element-storybook", cwd: "<repo>/graphty-element",
  command: "npm run storybook", env: { PORT: "{{port}}", HOST: "0.0.0.0" } })

// Storybook over HTTPS (graphty's Storybook requires it; the others accept it)
servherd_start({ name: "graphty-storybook", cwd: "<repo>/graphty", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run storybook",
  env: { PORT: "{{port}}", HOST: "0.0.0.0" } })

// Coverage preview
servherd_start({ name: "graphty-element-coverage", cwd: "<repo>/graphty-element",
  command: "npm run coverage:preview", env: { PORT: "{{port}}" } })

// VitePress docs (root docs/, or a package's docs:dev)
servherd_start({ name: "docs", cwd: "<repo>", command: "pnpm run docs:dev",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

A server you start is yours to stop: before your task ends, `servherd_stop` and then `servherd_remove`
every server you started, and say in your report which you stopped. Only a page the owner must open
may stay up, named in the report. Name a job's servers after its branch (`fix-1234-storybook`) so they
can be found. servherd keys a server by name plus working directory, so stopping by name alone can hit
another worktree's copy: check `servherd_info` first. `tools/worktree-prune.sh` lists the servers in each
finished worktree and stops them (servherd CLI) when you confirm the removal.

CI never starts a dev server (Storybook is built statically for the visual capture, and Vitest browser
mode picks its own ports). A script run outside servherd needs `PORT` set by hand, e.g.
`PORT=6006 npm run storybook`.

## Testing Infrastructure

### Test Projects by Package

Each package's test projects are listed in its own CLAUDE.md ("Test projects", or its testing
section). The packages without a CLAUDE.md:

**babylonjs-map:**

- Single test project (Node.js); shard `babylonjs-map`, in the `small-node` group

**babylonjs-models:**

- Single test project (Node.js) over the Babylon-free half (`src/files/`, `src/detect/`) and the built package
  (build it first); shard `babylonjs-models`, in the `small-node` group. Its Babylon half draws in graphty-element's
  browser tests, which load every model variant in `babylonjs-models/test/fixtures/variants/`

**cytoscape-extensions:**

- Single test project (Node.js, headless Cytoscape); resolves the graphty packages through their dist, so build them first. Dataset downloads are answered from `graph-samples/dist/data/v1/` (`test/setup/local-datasets.mjs`), never the network. `test/gpu-device.test.ts` needs a real GPU and follows the `GRAPHTY_GPU_REQUIRE` rule of webgpu-graph-algorithms
- Storybook demo (`npm run storybook`, `stories/`): every layout, algorithm, generator, small dataset and file format in a real Cytoscape instance, one story per tile; `test/demo-catalog.test.ts` fails when the extension registers something `stories/catalog.ts` does not list. The capture browser has no WebGPU, so the screenshots show the CPU path and leave the Large graphs stories out; those are screenshotted WITH WebGPU on the full run's T4 against owner-approved references (cytoscape-extensions/CLAUDE.md, "GPU screenshots"), and the rest of the GPU path is covered by the package's GPU tests

### Running Specific Test Projects

`npm test -- --project=<name>` inside the package; the project names are in its CLAUDE.md, and
`./tools/run-tests.sh --list` names the CI shards.

### Coverage Thresholds

At least 80% lines, functions and statements and 75% branches in every package; graph-format, graph-io,
graph-samples, babylonjs-map, cytoscape-extensions, algorithms, layout, remote-logger and webgpu-graph-algorithms
require 90% in all four. Every package is moving to 90 (issue #3043); a package's thresholds rise to 90 in the pull
request that brings it there.

## Testing

- **UI tests drive real input.** A test of something a reader does -- click, drag, scroll, type,
  pinch -- makes the browser do it and asserts what the reader would see, read through the public
  API (the camera moved, the node is selected and not pinned, the field holds the text, the
  sheet opened). Never `notifyObservers`, a controller's private state, `fireEvent.change` or a
  fake session standing in for the element.
    - Why: six UI bugs passed every gate because their tests reached the state another way: a
      click that pinned every node (32ab43099), Cmd+Z ignored on macOS and the element stealing
      focus on load (5f3bd991f), a search field that discarded every keystroke and a palette that
      opened unfocused (1d81de253), runs that deleted each other's layers and a Present panel with
      no handlers (a25fe32e5), single-key shortcuts switched off by a hidden list (4e07ebf42), and
      a node left off the plane in 2D (#1341). Each now has a test that fails when it comes back.
    - How: in graphty-element, `test/helpers/real-input.ts` (mouse, wheel, touch and device pixel
      ratio through the DevTools protocol) and `userEvent` from `vitest/browser` for keys, as in
      `test/interactions/real-input.test.ts`. In graphty, `userEvent` from `vitest/browser` in a
      `*.real-element.test.tsx`. A story that exists to show an interaction reaches its state by
      that interaction in its play function (pointer events on the canvas, clicks on the controls),
      and graphty's play functions run as tests in the `storybook` project.
- Use `assert` instead of `expect` in layout tests
- Tests wait on conditions and assert on counted work, with no local deadline anywhere: one global
  hang guard, set in one place (`tools/test-wait-guard.mjs`), ends a hang -- every vitest config is
  wrapped in its `withTestGuards`, which sets every test's, hook's and wait's limit (`vi.waitFor`,
  `expect.poll`, `expect.element`, Testing Library, graphty-element's `waitForStableFrame()`) far
  above the slowest legitimate test. No test, story, helper, setup file or config sets a timeout,
  an interval or a deadline loop of its own, and no override of the guard exists. The
  `local/no-test-timing` lint rule enforces it. A measurement is not a test: it goes in a project
  named `bench*` (started by hand, never by the gate), which carries the same guards: a hung
  benchmark is ended and reported like any other run.
- Those limits are timers in the test's own thread, so a blocked page never runs them and a file of
  slow tests never reaches them. `tools/vitest-file-guard.mjs`, in vitest's own process, ends the run
  when one test file passes `FILE_GUARD_MS`: it prints `[HANG] <file> ran past ... it had reached
test: <name>`, stops the browser and exits 1, here and in CI. A test file is held to that limit
  however its tests are split, so a file that reaches it needs less work, not more tests.
- CI's test job also stops the whole run 26 minutes after its first shard started, before GitHub's job limit, and prints
  `[HANG]` with the test or file still running (`withTestDeadline()` in `tools/results/run-group.mjs`): a job of
  several files can pass the job limit with each file under the file guard, and GitHub keeps no log of a job it cancels.
- Visual tests run sequentially (`--workers=1`) to avoid resource contention
- Never run a whole CI shard before pushing: CI runs them, and two graphty-element browser shards held about
  15 GB of vitest and Chromium on this shared machine. `./tools/run-tests.sh <shard>` is for reproducing one
  failing CI shard (with its coverage thresholds) when someone asks for it
- `pnpm run test:changed` runs only the tests your change can affect (`--dry-run` shows them and why), the
  same selection a pull request's CI runs, except that a browser shard CI runs whole runs only its selected
  files here, or nothing (`--whole-browser-shards` runs it whole); the full run runs everything, so a test the
  selection missed is caught there
- Flaky tests are quarantined automatically; see "Quarantined tests" below
- Run your own builds and ad hoc test runs through `tools/low-priority.sh` (niceness 10, the low slot lanes),
  so other work gets the CPU and the test and browser slots first
- Every `vitest run` on this machine waits for one of the machine-wide test slots
  (`tools/test-slots.mjs`; `GRAPHTY_TEST_SLOTS`, else `tmp/test-slots/.count`, else one per 8 cores) and prints one line naming
  the holders while it waits. A queued run is not hung: leave it. A run nested in one that holds a slot,
  watch mode and GitHub Actions take none. `node tools/test-slots.mjs recount` (issue-round runs it each round)
  rewrites `.count` one step at a time between the default and 6 from MemAvailable, memory pressure and the queue
- A run that holds a test slot and stops using the CPU (its whole process tree under 10 s of CPU in 10 minutes:
  a page that never loads, a wait on a server that never answers) gives its slot back to the runs waiting
  and prints `test-slots: ... gave its test slot back`. It is not killed and keeps running without a slot; end
  it if it is hung. A run that keeps working keeps its slot however long it takes

## Quarantined tests

CI runs every test group through `tools/results/run-group.mjs` and `tools/test-quarantine.mjs` (on by default,
the owner's decision of 2026-10-22). When only tests failed, it runs the failed test files once more. A test that
fails and then passes on the same inputs is flaky: it does not fail the group, the results store quarantines
it, and it gets one issue (`bug`, `priority:critical`, `effort:medium`: a test that fails because of load or
timing is a critical defect, owner 2026-10-22). A quarantined test still runs. It leaves the list when its issue
closes or its entry expires (14 days at most).

- **A `[FLAKY]` or `[QUARANTINED]` line is never ignored.** It is a real bug that was let through, not noise.
- **On a pull request**, `[NEW-FLAKY]` (a test that passed only on its retry and has no earlier failure in the
  store) fails it: the change made the test intermittent; fix it on the branch. A failure in a test the pull
  request did not touch is `[KNOWN]` when master already fails it, or `[UNRELATED]` until `base-check.yml` shows
  whether master does.
- **A quarantined test's issue is real work at `priority:critical`.** Find the mechanism and fix it. Never by
  raising a timeout, adding a fixed wait or deleting the test: "Tests wait on conditions" above and the
  `local/no-test-timing` rule apply, and "timing" or "load" is not a cause without the mechanism.
- **Close the issue with the fix** (`Fixes #N` in the commit), so the test leaves quarantine when it merges.
- **Never add a test to `tools/test-quarantine.json` by hand.** Entries come only from the tooling.
- **GPU tests are never quarantined** (`webgpu-graph-algorithms*`), nor the screenshot gate, nor the style
  fidelity slices (`graphty-element-fidelity-*`: a sample judged two ways on the same inputs is a determinism defect).
- **A consistent failure still blocks.** A test that fails on the retry too fails CI unless it is already
  quarantined. Never re-run hoping for a pass when a non-quarantined test failed: fix it.
- `GRAPHTY_TEST_QUARANTINE=0` switches it off, for debugging only.

## Storybook

- Storybook auto-reloads on changes (no manual rebuild needed)
- Visual regression via visual-review (see "Visual review" below)
- Ports come from servherd (see "Starting Servers"); graphty's Storybook requires HTTPS
- GitHub Pages: https://graphty.app/storybook/

## Before opening a pull request

The root CLAUDE.md, "Shipping a change", steps 2 and 3, holds the rules; this is their reference.

- **`pnpm run check:quick`** (a human's or a long-lived branch's alternative to the pre-push checklist) runs in the
  background, through `tools/low-priority.sh`: the selected tests, which leave whole browser shards to CI,
  the duplicate code check and every check of CI's Checks job except the whole-repository format check; CI's
  Docs job builds the docs site.
- **A long-lived branch** is one open more than about two days, holding more than a day of work, after a merge of
  master that brought app or graphty-element changes or needed conflicts resolved, or after a large change (a
  refactor of a shared component, a dependency or lockfile upgrade, a change to graphty-element's styling, layout
  or rendering). When its change reaches the graphty app it runs the app's dry run and fixes every failed route
  before opening the pull request (design/ci/ai-checked-acceptance-tests.md, 10.4).
- **`tools/pr-open.sh`** merges GitHub's copy of the branch, refuses a conflict with master (exit 2: merge
  `origin/master`, resolve, run again), runs a fresh-context review (exit 3: fix it, or answer it in the Proof and
  pass `--review-answered`), scans for secrets, pushes, opens the pull request, arms auto-merge and returns in
  seconds.

## Where a change takes effect

Before shipping a change, ask where it takes effect, because that decides how it ships:

- **On this machine** -- everything that runs here: the visual-review server, `worktree-new.sh`, design studio
  builds, the XR sandbox, dev servers, local watchers, and the workspace files every session reads from the
  main checkout (CLAUDE.md, the skills, `.claude/settings.json`; tool `workspace`). Put it into the running copy at once with
  `tools/live.sh <tool> <branch-or-commit>`, and open the branch's pull request in parallel as the record.
  live.sh merges the branch (never rebases) into the tool's live worktree, runs the tool's tests on the merge
  first, and only when they pass moves the live copy and restarts its servherd servers; a conflict or a failed
  test changes nothing. It never pushes. The tools are in `tools/live-tools.json` (`tools/live.sh --list`).
  For a change to how sessions work (CLAUDE.md, the skills, `.claude/settings.json`),
  `tools/live.sh workspace <commit>` merges it into the main checkout and `tools/live.sh land <commit>` into the land copy,
  `.worktrees/land-live`, which `worktree-new.sh` runs from; then restart every running session, `/loop` included.
  The rounds keep the main checkout following master by merging `origin/master` into it (not only a
  fast-forward, since a live change puts a merge there first).
- **In GitHub, CI or npm** -- workflows, the full run, published packages. Only a change that reaches master
  (through its pull request) changes these, so test the change before it lands (run the workflow on its
  branch, replay the script against recorded inputs).
- **In shared code another branch needs** -- open its pull request, but do not wait for it: merge the
  fix branch (or master, once it has merged) into the blocked branch right away.

## Parallel agents

Several agents often work in this repository at once. They share one disk and one browser, so:

- Work in your own worktree (`./tools/worktree-new.sh <branch> --issue N`), never by switching branches in
  the main checkout.
- Write scratch files to `tmp/<agent-or-task-name>/`, never to `tmp/` itself, so one agent's
  screenshots and logs do not overwrite another's.
- If you drive a browser, open your own tab or browser context and use only that one. Never
  navigate, close or reuse a tab you did not open.
- A review or audit reads `git diff <base>...HEAD`, not the whole tree, unless the task is
  explicitly a whole-repository audit.
- Report regressions and failures first, then everything else.
- **Never wait inside a model turn.** Start a push or a long run in the background (Bash
  `run_in_background`), then end the turn or do other work; the harness
  notifies you when it finishes. Never poll its log in a `sleep` or `until` loop, and never chain
  sleeps: a wait longer than about five minutes drops the prompt cache, so the next turn re-reads
  the whole conversation at full price. A subagent opens its own pull request with `tools/pr-open.sh`
  (it returns in seconds) and stops; it never waits for CI. A prompt that starts an agent carries this rule.

### The GitHub API budget

Every Claude session in this repository acts as one GitHub account, graphty-agent, and the servers under
servherd (the status broker, the watchers) as the owner's; each account has one limit of 5,000 REST
requests an hour, shared by everything acting as it. Until the limit resets, every `gh` call fails with HTTP 403 and merging stalls.

- **Ask about many pull requests in one GraphQL query, never in a loop of per-pull-request REST
  calls** (`gh pr view`, `gh pr checks`, `gh pr diff` or `gh api .../pulls/<n>` once per pull
  request). One query returns every open pull request's state, labels, merge status and checks:

    ```bash
    gh api graphql -f query='{ repository(owner: "graphty-org", name: "graphty-monorepo") {
      pullRequests(states: OPEN, first: 100) { nodes {
        number title baseRefName isDraft mergeable labels(first: 10) { nodes { name } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state
          contexts(first: 100) { nodes { ... on CheckRun { name status conclusion } } } } } } }
      } } } }'
    ```

- **Read pull request status from the local broker, not from GitHub.** `tools/pr-status-broker.mjs`
  runs under servherd and writes every open pull request's labels, draft and merge state, rollup
  and checks to `<main checkout>/tmp/pr-status/status.json` once a minute, in GraphQL pages of 10
  pull requests (1 point a page: about 4 points a minute, 240 an hour for 35 open; the file's
  `rateLimit.cost` has the real figure). Where a
  check ran more than once on the head commit, the file keeps the newest; `truncated` or
  `checksTruncated` means the list is incomplete.
  Read that file (check `fetchedAt` and `error`). If `servherd_list` does not show
  `pr-status-broker`, start it from the main checkout:

    ```jsonc
    servherd_start({ name: "pr-status-broker", cwd: "<repo>", command: "node tools/pr-status-broker.mjs" })
    ```

- **Poll every 5 minutes or slower**, in the background, never inside a model turn.
- **On a 403 "rate limit exceeded", stop and wait.** `gh api rate_limit` costs nothing and shows the reset
  time; when calls fail while it reports requests left (the secondary limit), retry every 10 minutes.
- A prompt that starts an agent which talks to GitHub carries these rules.

## Design Documents

The `design/` directory contains architecture documentation:

- `README.md` - The index of every design directory
- `ci/channels-pipeline.md` - The pipeline: pull requests, canary, nightly, production
- `graph-format/graph-format-design.md` - The shared graph data format and the consumer migration
- `graph-samples/graph-samples-design.md` - The generators and datasets package: API, the seed determinism contract, dataset hosting and licensing, roadmap
- `webgpu/webgpu-acceleration-plan.md` - WebGPU acceleration: the design, `webgpu/plans/` the contract, the phase plans and the monorepo integration plan

## Key Files to Understand

### Core Implementation Files

| File                                     | Purpose                   |
| ---------------------------------------- | ------------------------- |
| `graphty-element/src/Graph.ts`           | Core orchestration class  |
| `graphty-element/src/graphty-element.ts` | Web Component entry point |
| `graphty-element/src/Node.ts`            | Node implementation       |
| `graphty-element/src/Edge.ts`            | Edge implementation       |
| `algorithms/src/index.ts`                | All algorithm exports     |
| `layout/src/index.ts`                    | All layout exports        |
| `graphty/src/App.tsx`                    | React integration example |

### Package CLAUDE.md Files

Each package has its own CLAUDE.md with package-specific guidance:

- `graph-format/CLAUDE.md` - Snapshot invariants, freeze pipeline, adding a view / a dtype
- `graph-io/CLAUDE.md` - Importer / exporter contract, adding a format
- `graph-samples/CLAUDE.md` - The determinism contract, adding a generator or a dataset
- `webgpu-graph-algorithms/CLAUDE.md` - The GPU context and adapter policy, the kernel layers, the lanes and their environment variables, verified platform facts
- `algorithms/CLAUDE.md` - The package layout, the recorded 2.x results the algorithms are tested against, adding an algorithm
- `layout/CLAUDE.md` - Layout testing patterns
- `graphty-element/CLAUDE.md` - Web component patterns, visual testing
- `graphty/CLAUDE.md` - React app specifics
- `compact-mantine/CLAUDE.md` - The Figma lock

## Monorepo Structure

```
graphty-monorepo/
|-- graph-format/         # @graphty/graph-format package (bottom of the dependency chain)
|-- graph-io/             # @graphty/graph-io package (depends on graph-format)
|-- webgpu-graph-algorithms/  # @graphty/webgpu-graph-algorithms package (depends on graph-format)
|-- graph-samples/        # @graphty/graph-samples package (depends on graph-format)
|-- babylonjs-map/        # babylonjs-map (unscoped): maps and globes for Babylon.js, plus Babylon-free projections and location parsers
|-- babylonjs-models/     # babylonjs-models (unscoped): load 3D models into Babylon.js, plus Babylon-free file checks
|-- cytoscape-extensions/    # @graphty/cytoscape-extensions: graphty layouts and algorithms as Cytoscape.js extensions
|-- algorithms/           # @graphty/algorithms package
|-- layout/               # @graphty/layout package (depends on graph-format, graph-samples)
|-- graphty-element/      # @graphty/graphty-element package
|-- graphty/              # @graphty/graphty React app
|-- compact-mantine/      # @graphty/compact-mantine: the shared Mantine theme and components
|-- remote-logger/        # @graphty/remote-logger: browser console logs to a server and MCP
|-- visual-review/        # @graphty/visual-review: Storybook capture and baseline review
|-- githerd/              # @graphty/githerd: retired pipeline daemon (code kept, not run)
|-- tools/                # Build, test, CI and pipeline scripts (see "Tools Directory")
|-- design/               # Architecture and design documents
|-- .github/workflows/    # CI/CD workflows
|-- nx.json               # Nx configuration
|-- pnpm-workspace.yaml   # pnpm workspace config
|-- tsconfig.base.json    # Shared TypeScript config (project references)
`-- eslint.config.js      # Shared ESLint config
```
