# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graphty is a modular graph visualization ecosystem built as a TypeScript monorepo managed by **pnpm** and **Nx**.

## Architectural Principles

These govern every design decision in this repository. A plan or a design document that
contradicts them is wrong and must be changed, not followed.

### graphty-element is a standalone, self-sufficient web component

**graphty-element is intended to be consumed directly by third parties.** It is a standalone web
component for rendering graphs, and it MUST contain all graph functionality on its own:

- rendering
- configuration
- styling
- algorithms
- layout
- WebGPU acceleration
- and any other feature or functionality related to creating and using a graph

Self-sufficient means a consumer who installs `@graphty/graphty-element` and nothing else gets a
working graph, and a consumer who wants an optional capability gets it by installing the optional
package -- never by writing the integration themselves. If using a capability requires a consumer
to write detection, construction, lifecycle or error-handling code, that code belongs INSIDE
graphty-element. Shipping that work to the consumer is the defect.

**Its API and its documentation must be easy to understand and use.** A third party reading the
docs should reach a working graph without reading this repository's source or its design
documents. Treat a capability that only the graphty app knows how to switch on as unfinished.

### The graphty app is only HTML around graphty-element

`@graphty/graphty` is presentation and application chrome: layout, panels, settings UI, routing,
persistence of the reader's own preferences. It MUST NOT contain graph-specific functionality of
any kind other than consuming graphty-element.

Concretely, the app must not: detect or construct graph capabilities, own graph state, implement
or wrap algorithms or layouts, compute anything about a graph, or hold logic that a third-party
consumer of graphty-element would also need. Anything in the app that another consumer would have
to reimplement is in the wrong package.

Reading a property the element exposes and rendering it (a status chip, a settings control that
writes element config) IS consuming the element and is allowed. Deciding, probing, constructing or
recovering is not.

### The app MUST NOT work around graphty-element

**If graphty-element's API is hard to use, has a bug, or is missing something the app needs, the
fix goes in graphty-element.** Not in the app. Every consumer of graphty-element gets the fix, and
the app gets it by being a consumer like any other.

This is not a preference about where code sits. A workaround in the app is strictly worse than the
same effort spent in the element, because it fixes the problem for exactly one consumer and leaves
it broken for everyone else -- while also hiding the defect, so it is never reported and never
fixed. The app is the only consumer today, which means the app is currently the only thing that
can DISCOVER these defects. A workaround throws that information away.

These all count as working around the element, and all of them are forbidden:

- reimplementing something the element does, or should do (computing over nodes and edges,
  format sniffing, neighbour lookups, component counts, cost estimates)
- wrapping the element's API to paper over an awkward shape, instead of fixing the shape
- copying the element's constants, enums, palettes, option schemas or types into the app because
  importing them is impossible or drags in too much
- duck-typing or re-declaring the element's types because it does not export usable ones
- avoiding an element API that is broken and doing it another way
- defining a private subset of a shared schema because round-tripping the real one is lossy
- translating between two spellings or two unit conventions the element never settled

**The tell is a comment.** If a file in the app explains why the element could not be used here,
that comment is a bug report that was never filed. Every one found in the 2026-09-19 audit was
accurate, well reasoned, and pointed at a real element defect: suggested-style layers that
overwrite the whole graph, a calculated value that throws on an unmeasured node and aborts the
repaint loop, `StyleManager.addLayer` not repainting at all, and an entry point that drags in
Babylon.js so a constants import is impossible. The app was right every time, and every defect
survived because being right in the app fixed nothing.

When the element fix genuinely cannot land first -- a release is in flight, the change is large --
the workaround is temporary and must say so: a comment naming the element defect, and a tracking
record. It is not done until the element is fixed and the workaround is deleted.

### graphty-element is neutral about presentation

**graphty-element owns the graph: its data, the computation over it, and drawing it on the canvas.
Applications own everything around the graph: what information to show, how to arrange and group
it, what to call it, and how the controls behave.**

The owner's rule (2026-10-03): "graphty-element MUST be neutral about how information is displayed
and MUST NOT be opinionated about presentation or information structure. the division of labor is
that graphty app (or other apps that use graphty-element) will make ALL presentation decisions, and
all the logic for manging data and rendering it lives in graphty-element."

This is not the Model/View split of MVC: graphty-element also owns a view (the canvas it draws,
styled through style layers) and its controls (what a click, drag, zoom or keyboard walk on the
canvas does). The line runs around the graph, not between layers. Concretely, a graphty-element API
returns neutral, structured facts -- values, descriptors, error and event codes with their
parameters -- and never:

- reader-facing sentences or default English text (return `{ code, params }`; the app writes the
  words)
- headings, section groupings or display order for a panel (the Style tab's sections, the Analyze
  popover's categories)
- choices of what to show a reader, or how much of it

A fact about the data (what a column measures, what an algorithm returns) is graphty-element's. How
a reader sees it is the application's.

A catalog `plainName` is catalog data, not presentation: it is the default name of a thing
graphty-element ships (an algorithm, an option, a format, an attribute), supplied by whoever
registers it, so an extension supplies its own. An application may show it or replace it by id.
This does not extend to sentences, which stay `{ code, params }`, and grouping, ordering and
translation stay the application's.

### graphty-element offers choices; consumers make them

**graphty-element exposes an option for every behavior a consumer might reasonably want either
way, and its default is the neutral behavior of the mechanism underneath -- never one consumer's
preference.** A consumer that wants something particular sets the option itself.

The owner's rule (2026-10-06), on making the default force layout seeded: "the app shouldn't force
opinions on graphty-element. if the app wants a consistent seed it should set a consistent seed."
So the default force layout stays unseeded, and the graphty app or a story that wants the same
drawing on every load passes a seed.

This does not weaken self-sufficiency; it draws the line inside it:

- A **capability** is graphty-element's. If getting a behavior would make a consumer write code --
  detection, construction, sequencing, recovery -- that code belongs in the element. Making a
  passed seed give the same drawing however the data arrives (in one write or split across frames)
  is a capability, so it is the element's job.
- A **choice** is the consumer's. If getting a behavior only takes setting a value, and another
  reasonable consumer would set a different one, it is an option with a neutral default: a seed, a
  palette, a starting camera, how much detail to draw.

The test: would a different reasonable consumer want a different value? Then it is a choice, the
element exposes it and documents it, and the default does nothing opinionated. A need that only
the graphty app has is the app's to set, never a reason to change the element's default.

### Easy things easy, hard things possible

Every public API and extension point has a simple path and an advanced path. The simple path's
first working example fits in about 15 lines of author code and names no internal concept: no
snapshot rows, compressed sparse rows, typed arrays, masks, cost formulas or descriptor
bookkeeping. The advanced path exposes the machinery for authors who need speed or control, and
the simple path wraps it, so the parity rule for extension points still holds.

A spec or design for a public API is not reviewed until an author who sees only the published
docs, and never the repository, has written its canonical example and compiled it against the
published types. Every review workflow includes a developer-experience lens and the developer
personas in `design/designloom/personas/`, alongside security, evolution and implementability. A
spec whose simplest example needs internal knowledge fails review.

### Non-breaking API changes need no owner approval

The owner's rule (2026-10-08), for every session and agent: "if there are non-breaking changes to
APIs, you can make them without getting my approval."

- **Non-breaking** means additive: a new export, method, property, event, error code, attribute or
  entry point, or a new optional parameter or option whose default keeps today's behavior. Choose
  its name and shape yourself, state the choice in one line where the work is recorded (the issue,
  the pull request), and build it. Do not label it `needs-decision` and do not ask.
- **Breaking** changes are still one-way doors that need the owner: removing or renaming anything
  public, changing what an existing API does or returns, changing a default, or anything that
  publishes a major version.
- When unsure whether a change breaks a consumer, it is breaking.

### Why

The failure mode this prevents is silent and expensive: a capability lands "in the product"
because the app wires it up, the element ships without it, and every third-party consumer either
reimplements the wiring or never discovers the feature exists. By the time that is noticed, the
wiring is public API in the wrong package and moving it is a breaking change.

The workaround rule closes the same trap from the other side. Without it, the element's defects
become invisible: the app absorbs each one, the element's API never improves because nothing
pushes back on it, and the first third-party consumer meets every unfixed problem at once with no
workarounds available to them and no way to know they are not alone.

## Naming Conventions

**IMPORTANT**: Always use the full package name to avoid confusion:

| Package | Correct Name | DO NOT Use |
|---------|--------------|------------|
| `@graphty/graphty-element` | **graphty-element** | "graphty" (ambiguous) |
| `@graphty/graphty` | **graphty** or **graphty app** | - |
| `@graphty/algorithms` | **algorithms** | - |
| `@graphty/layout` | **layout** | - |
| `@graphty/graph-format` | **graph-format** | "format", "snapshot package" |
| `@graphty/graph-io` (and `@graphty/graph-io/<format>` subpaths: json, graphml, gexf, csv, gml, dot, pajek, neo4j, xgmml, cx2, cx, obo, cys) | **graph-io** | "io", "importers" |
| `@graphty/webgpu-graph-algorithms` (and `@graphty/webgpu-graph-algorithms/browser`, `/node`, `/acquire` subpaths) | **webgpu-graph-algorithms** | "webgpu", "the GPU package", "the GPU layout" |
| `@graphty/graph-samples` (and `@graphty/graph-samples/generators`, `/datasets/<name>` subpaths) | **graph-samples** | "generators", "samples", "datasets" |
| `@graphty/cytoscape-extensions`, in `cytoscape-extensions/` | **cytoscape-extensions** | "the adapter", "cytoscape" (that is the third-party library) |
| `babylonjs-map` (unscoped; and the `babylonjs-map/location` and `babylonjs-map/projection` subpaths), in `babylonjs-map/` | **babylonjs-map** | "the map package", "@graphty/babylonjs-map" (it has no scope) |

- The Web Component library is **graphty-element** (not "graphty")
- The React application is **graphty** or **graphty app**
- In documentation URLs, use `/graphty-element/` for the Web Component docs
- When referring to the visualization library, always say "graphty-element"

## Package Directory

| Package | Location | Version | Description |
|---------|----------|---------|-------------|
| `@graphty/graph-format` | `graph-format/` | 1.1.2 | Frozen CSR graph snapshot over typed arrays (builder, id map, attribute columns, views, wire form); zero dependencies |
| `@graphty/graph-io` | `graph-io/` | 0.3.20 | Importers and exporters for 13 formats (JSON, GraphML, GEXF, CSV, GML, DOT, Pajek, Neo4j CSV, XGMML, CX2, CX, OBO, Cytoscape sessions) for the graph-format snapshot; subpath exports per format |
| `@graphty/webgpu-graph-algorithms` | `webgpu-graph-algorithms/` | 0.6.12 | WebGPU-accelerated graph algorithms and layouts (ForceAtlas2 first) over the graph-format snapshot, for Node (Dawn) and browsers; never falls back to the CPU |
| `@graphty/graph-samples` | `graph-samples/` | 0.1.7 | Seeded, platform-independent graph generators as typed arrays for the graph-format snapshot, and classic sample datasets downloaded from graphty.app on demand (no dataset's data is in the package) |
| `@graphty/cytoscape-extensions` | `cytoscape-extensions/` | 0.0.4 | Every graphty layout and algorithm as a Cytoscape.js v3 extension, registered with one call, plus graph generators, sample datasets (downloaded from graphty.app) and file import/export (all loaded on first use); WebGPU acceleration loaded on demand, with no extra import |
| `babylonjs-map` | `babylonjs-map/` | 0.0.0 | Maps and globes for Babylon.js scenes (unscoped, knows nothing about graphs); `/projection` and `/location` never load Babylon.js |
| `@graphty/algorithms` | `algorithms/` | 2.1.2 | 60+ graph algorithms (traversal, paths, centrality, clustering, community, flow, link prediction) over the graph-format snapshot |
| `@graphty/layout` | `layout/` | 1.10.5 | 15+ 2D and 3D graph layouts (ported from NetworkX) over the graph-format snapshot, plus steppable ForceAtlas2 and Fruchterman-Reingold simulations |
| `@graphty/graphty-element` | `graphty-element/` | 2.6.2 | Web Component for 3D/2D graph visualization (Lit + Babylon.js) |
| `@graphty/graphty` | `graphty/` | 0.8.18 | React wrapper application (Mantine UI), published as the built static app |
| `@graphty/remote-logger` | `remote-logger/` | 1.3.11 | Remote logging client and server for browser debugging |
| `@graphty/compact-mantine` | `compact-mantine/` | 0.8.11 | Compact size variants for Mantine UI components, for dense UIs |
| `@graphty/visual-review` | `visual-review/` | 0.0.1 | Visual review of any Storybook: capture in GitHub Actions, baselines in git (Git LFS), accept or reject in a local page, a pull request gate; a CLI, configured per repository by `visual-review.config.json` |
| `@graphty/githerd` | `githerd/` | 0.1.0 | Retired 2026-10-18 (code kept, daemon not run). Was the repository pipeline daemon that turned master, pull request and issue events into jobs for Claude sessions; nothing uses it now |

## Where to read more

This file holds only the rules every session needs. Read the rest when your task reaches it:

- `tools/README.md` -- before running builds, tests, servers or any script under `tools/`: commands, the tools
  table, the secret scan, SonarQube, starting servers, test projects, the full testing and quarantine rules, where a
  change takes effect, parallel agents and the GitHub API budget.
- `.github/workflows/README.md` -- before touching CI, a release, versions, screenshots or the held nightly: the
  channels, every workflow, dead links, the full run and nightly, versions and npm, visual review, sites, the build
  system and grouping breaking changes.
- The package's own `CLAUDE.md` -- before working in that package (Claude Code loads it there). graphty-element's
  holds WebGPU ownership, graph styling, algorithm styles, the public API review and the module system; graphty's
  holds the UI component rules.
- `design/` -- architecture and design documents (start at `design/monorepo-design.md`); `.claudehistory/` --
  transcripts of past sessions in this repository, for context from earlier work.

`tools/claude-md-size.test.mjs` fails when this file passes 30 KB or a package `CLAUDE.md` passes 20 KB: move
reference out to one of the files above instead of adding a paragraph.

## Commands

From the root (Nx, cached): `pnpm run build`, `pnpm run test`, `pnpm run lint`; inside a package: `npm run build`,
`npm run test:run`, `npm run lint`. `./tools/run-tests.sh <shard>` runs one CI shard exactly as CI does
(`--list` names them). Every server reads `PORT` and refuses to start without it: start it through servherd with
`{{port}}` (tools/README.md, "Starting Servers").

## Rules for every change

### TypeScript and modules

- Strict mode in every package; never disable `@typescript-eslint/no-explicit-any`; use `import type`.
- Packages are TypeScript project references (each extends `tsconfig.base.json` with `composite: true`), built in
  the order graph-format -> graph-io -> webgpu-graph-algorithms -> graph-samples -> algorithms -> layout ->
  graphty-element -> graphty. ES modules are the default.

### WebGPU

- Never create a silent fallback. The GPU package throws (`E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_TOO_LARGE`, ...) and
  never runs a CPU path. Detecting that WebGPU is unavailable and running the CPU implementation is correct;
  catching a GPU error mid-run and quietly finishing on the CPU is not.
- graphty-element owns WebGPU detection, construction and lifecycle; the graphty app gets no special privileges.
  This overrules design 9.1 of `design/webgpu/webgpu-acceleration-plan.md`. Full text: graphty-element/CLAUDE.md.

### Styling and algorithms

- Node and edge appearance is applied only through a style layer handed to graphty-element's StyleManager, never
  by mutating a mesh, a material or a node or edge object.
- An algorithm's suggested style layers write only to the nodes and edges that carry its own result (scope them
  with a selector on the result); dimming what it did not select is the reader's choice, never in
  `suggestedStyles`. Full rules and why: graphty-element/CLAUDE.md, "Algorithm Styles".
- UI: use the default components and never write a bespoke control to work around one; a wrong shared component
  is fixed in the shared component (graphty/CLAUDE.md, "UI Components").

### Testing

- UI tests drive real input: the browser clicks, drags, scrolls, types or pinches, and the test asserts what a
  reader would see through the public API; never `notifyObservers`, a controller's private state,
  `fireEvent.change` or a fake session standing in for the element. Helpers and the incidents behind the rule:
  tools/README.md, "Testing".
- Tests wait on conditions and assert on counted work, with no timeout, interval or deadline of their own; one
  global hang guard (`tools/test-wait-guard.mjs`) ends a hang. The `local/no-test-timing` lint rule enforces it. A
  measurement goes in a `bench*` project.
- Use `assert` instead of `expect` in layout tests; visual tests run with `--workers=1`.
- Run builds and ad hoc tests through `tools/low-priority.sh`. A vitest run waiting for a machine-wide test slot is
  queued, not hung: leave it.
- A `[FLAKY]`, `[QUARANTINED]` or `[NEW-FLAKY]` line is a real bug at `priority:critical`, never noise: find the
  mechanism and fix it, never by a longer timeout, a fixed wait or deleting the test, and close its issue with
  `Fixes #N`. Never add a test to `tools/test-quarantine.json` by hand, and never re-run hoping for a pass. Full
  rules: tools/README.md, "Quarantined tests".
- Coverage thresholds in every package: 80% lines, functions and statements, 75% branches.

### Secrets, checks and what only the owner does

- Tokens live in the root `.env` (gitignored); never read, print or put one on a command line. A secretlint false
  positive goes in `.secretlintignore`.
- Run `node tools/sonar-gate.mjs` before `pr-open.sh` and fix every finding on your changed lines; a false positive
  gets `// NOSONAR(<rule>): <reason>` (say so in your reply); a function you edit that scores 16 to 20 comes down
  to 15 ("touch it, fix it"). Never bypass without saying so; report "SonarQube step cannot run" to the owner. Full
  rules: tools/README.md, "SonarQube".
- Only the owner approves screenshots, releases and Figma changes. Agents never press Accept or Finish, never write
  under `visual-baselines/` or `visual-review-approvals/`, never edit `visual-review/passkeys.json`,
  `visual-review/trusted/` or the gate step and story-test jobs in ci.yml, and never make a visual check pass by
  changing what is captured or compared (`parameters.chromatic`, a `diffThreshold` above 0.8,
  `visual-review.config.json`). Never ask him to review a pull request's screenshots. Full rules:
  .github/workflows/README.md, "Visual review".
- compact-mantine is locked to Figma (owner, 2026-10-23): no change to its look, behavior, Figma tests, token
  values or `compact-mantine/design/figma-spec.md` section 14 without his `Figma-Approved: <reason>` trailer.
- Never dispatch a promotion or a release, never merge past a check or with `--admin`, and never cancel a master
  build by hand.

### Public API and breaking changes

- graphty-element's public API is committed as `graphty-element/api/<entry>.api.md`: after an API change, build,
  run `npm run api:report` and commit the report. A result type never gains a plain `string` field; the API report
  check enforces it (graphty-element/CLAUDE.md, "Public API review").
- Keep majors few. Before a breaking (`!`) commit to a published package, find the other breaking changes planned
  or in flight for it and group them on one branch as one pull request; prefer deprecating now and removing in a
  major already planned. Details: .github/workflows/README.md, "Breaking changes and major releases".

## Shipping a change

A change moves from its pull request into master (built, deployed to canary.graphty.app, no tests), then through
the 6-hour full run to nightly.graphty.app and npm `next`; only the owner's `promote.yml` moves graphty.app and npm
`latest`. Every change reaches master through its own pull request, opened as graphty-agent with auto-merge on.

1. Work in your own worktree: `./tools/worktree-new.sh <branch>` (from `origin/master`). Every branch belongs to an
   issue: its number in the name (`fix/1234-topic`), `--issue N` or `--new-issue "<title>"`. Every commit pushes
   the branch until its pull request is open. When you stop,
   `node tools/branch-note.mjs update --done "<t>" --left "<t>" --next "<t>"`.
2. Before opening it, run what CI would: `pnpm run check:quick` (in the background; it runs through
   `tools/low-priority.sh` and includes the selected tests, `node tools/sonar-gate.mjs` and every check of CI's
   Checks job). `pnpm run test:changed` alone misses those checks. A long-lived branch -- open more than about two
   days, holding more than a day of work, after a merge of master that brought app or graphty-element changes or
   needed conflicts resolved, or after a large change (a refactor of a shared component, a dependency or lockfile
   upgrade, a change to graphty-element's styling, layout or rendering) -- whose change reaches the graphty app also
   runs the app's dry run: `pnpm run check:quick --with-dry-run`, or `node graphty/acceptance/run.mjs` after
   `pnpm exec nx run graphty:build`. Fix every failed route before opening the pull request
   (design/ci/ai-checked-acceptance-tests.md, 10.4).
3. When the work is finished -- never earlier, auto-merge merges the first green commit -- write a Proof file (the
   commands you ran and what they showed) and run `tools/pr-open.sh --proof tmp/<task>/proof.md` (`--refs` for
   `Refs #N`, `--title` for a better title). It merges GitHub's copy of the branch, refuses a conflict with master
   (exit 2: merge `origin/master`, resolve, run again), runs a fresh-context review (exit 3: fix it, or answer it
   in the Proof and pass `--review-answered`), scans for secrets, pushes, opens the pull request, arms auto-merge
   and returns in seconds. Never wait for CI.
4. A red pull request stays open with auto-merge armed: fix it with ordinary commits and push them once. Never
   merge past a check, never `--admin`.
5. Auto-merge stays off, and the owner merges, for a breaking commit, a change to a file guarding the owner
   (`GUARD_PATHS` in `pr-open.sh`) and a pull request someone else opened. Any other change to CI or to what guards
   the owner merges like any other once green (owner, 2026-10-25). `Lint PR Title` fails a breaking commit until the
   owner adds `breaking-go`.

- **Never copy, always merge.** Never cherry-pick or rebase; the hooks refuse both.
- **Agents act as graphty-agent, never as the owner**; never work around the credential guard. Servers under
  servherd (the status broker, the review server, the watchers) still use the owner's gh login.
- **Nothing tests master itself between full runs**: two pull requests that each pass can break the tests together;
  the 6-hour full run catches that, bisects and files it.
- **Red master first.** While master's build is red, the only pull request to open is its fix or its revert (close
  and reopen master-guard's revert as graphty-agent before arming it). Taking a change out of master is
  `git revert -m 1 <merge sha>` on a branch, then `pr-open.sh`.
- Every pull request names its issue (`Fixes #N`, `Refs #N`, ...) or has the line `No issue`; put what a
  description must say (a breaking change's list, an API report change) in the commit message.
- A broken story (`[BROKEN]`, `[UNSTABLE]`) fails its pull request; a changed picture only holds nightly for the
  owner's review, so it needs no `ACTION NEEDED` line.
- An issue labeled `in-progress` belongs to the session that labeled it. The `pipeline-round` skill handles alarms
  and red pull requests; `issue-round` starts issue work.

**Rolling out a change to this flow.** Sessions read `CLAUDE.md`, the skills and `.claude/settings.json` from the
main checkout at their start, and `worktree-new.sh` runs from `.worktrees/land-live`. Put such a change live as soon
as it is committed, without waiting for its pull request: `tools/live.sh workspace <commit>` merges it into the main
checkout and `tools/live.sh land <commit>` into the land copy; then restart every running session, `/loop` included.
The rounds keep the main checkout following master by merging `origin/master` into it (not only a fast-forward,
since a live change puts a merge there first).

## Working beside other agents

- Scratch files go in `tmp/<task>/`, never in `tmp/` itself. Drive only a browser tab or context you opened.
- Everything that runs on this machine goes live at once, never after CI (owner, 2026-10-11, 2026-10-22,
  2026-11-01): a tool `tools/live.sh --list` names, and the workspace files every session reads from the main
  checkout (CLAUDE.md, the skills, `.claude/settings.json`; tool `workspace`). Run `tools/live.sh <tool> <commit>`
  right after the commit, with its pull request in parallel; a change to CI or npm takes effect only when it
  reaches master.
- Never wait inside a model turn: start a push or a long run in the background and end the turn. A subagent opens
  its pull request and stops. A prompt that starts an agent carries this rule.
- Every session shares graphty-agent's 5,000 GitHub requests an hour: ask about many pull requests in one GraphQL
  query, read pull request status from the broker's `tmp/pr-status/status.json`, poll every 5 minutes or slower,
  and on a 403 rate limit stop and wait. A prompt that starts an agent which talks to GitHub carries these rules.
