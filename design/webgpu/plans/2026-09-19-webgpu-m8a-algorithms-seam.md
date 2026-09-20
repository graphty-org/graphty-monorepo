# @graphty/algorithms M8a -- A1, the first indexed ports and the accelerator seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; most run in `/home/apowers/Projects/graphty-monorepo`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Give `@graphty/algorithms` the three things the WebGPU design's section 9.2 seam cannot exist without -- the graph-format bridge of graph-format design 14.6 row A1 (`Graph.mutationCount`, `toSnapshot(Graph)` with `weightDtype: "f64"` and the differential harness, public signatures UNCHANGED), the first six `indexed.*` ports, which are graph-format design 14.2's own Ports 1-6 (`breadthFirstSearch`, `dijkstra`, `pageRank`, `connectedComponents`, `kruskalMST`, `commonNeighborsScore`) -- four carried there as complete reference implementations and two, Ports 4 and 5, specified there in prose and designed here (DEP-8A-D, DEP-8A-H), and `src/indexed/accelerator.ts` itself (the `*ResultLike` shapes, `AlgorithmAccelerator`, `AcceleratedAlgorithms`, `accelerated(acc)` with the `pathTo` / `pathEdges` decoration, `sources` / `k` on `BetweennessCentralityOptions`, the fake-accelerator tests) -- and then close the W1b algorithms half in the GPU package (`AlgorithmAccelerator` by `import type`, `CpuAlgorithmOptions` retired, the last `implicitDependencies` negation removed, the conformance reverse compile) (gate: the algorithms clause of design G6 plus the algorithms clause of design G10).

**Architecture:** The seam is one-directional and async. `@graphty/algorithms` OWNS the `AlgorithmAccelerator` interface and the `accelerated(acc)` dispatcher; the GPU package satisfies the interface structurally and is never imported at runtime by anybody except the app (design 9.1, `design/webgpu/webgpu-acceleration-plan.md:2870-2899`). Inside algorithms the new code sits strictly UNDER the legacy surface: `src/indexed/*` takes `GraphSnapshot` / `AdjacencyView` first and returns typed arrays; the legacy `Graph`-taking functions keep their exact signatures and shapes (graph-format design 14.1 rule 1, `design/graph-format/graph-format-design.md:3700-3702`). `toSnapshot(Graph)` is the one bridge between the two, memoised on `(graph, mutationCount)` in a `WeakMap` (rule 4, `:3712-3722`). The dispatcher body is fixed by the design: `acc?.x !== undefined ? acc.x(s, ...) : Promise.resolve(indexed.x(s, ...))` (`design/webgpu/webgpu-acceleration-plan.md:2959-2960`, repeated verbatim in the M8a deliverables cell of `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3268`), one dispatcher object owned by algorithms, never `runAlgorithm(snapshot, { accelerator })`. NOTE for an executor: the graph-format design's own record of that spelling, D-INJECT, lives in section 17.8, which is NOT on master -- `graph-format-design.md:4940` says 17.8 "is reserved for the WebGPU W1 amendments (integration plan Task M5b-T4)" and the written section exists only on `feat/webgpu-layout-types`, the branch M8a deliberately does not start from (PD-12). Every citation in this plan is to a line an executor on master can open.

**Tech Stack:** pnpm 10.0.0 workspaces, Nx 22 (`nx:run-commands` targets, `nx release` with conventional commits, independent projects, `{projectName}@{version}` tags), TypeScript 5.9 (strict; `algorithms/tsconfig.json` overrides `moduleResolution` to `"node"` and turns `noUnusedLocals` / `noUnusedParameters` off), vitest 3.2.4 (`default` happy-dom / `browser` Playwright Chromium projects, v8 coverage 80/80/75/80), `@graphty/graph-format` 1.0.0, ESLint 9 flat config with `projectService: true` and `strictTypeChecked`, knip, prettier (tabWidth 4, printWidth 120), GitHub Actions (`ci.yml` 20-shard matrix, `hosts.yml`, `gpu.yml`, `release.yml` with the GPU/Hosts gate).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` (9.1 lines 2870-2899, 9.2 lines 2901-2989 -- the normative text for Part C, 9.7 lines 3262-3284 for the result shapes, 9.8 line 3288 row A2, 13 rows P6 / P10 lines 4213 / 4217) and `design/graph-format/graph-format-design.md` (14.1 lines 3698-3727 for the rules, 14.2 lines 3728-3958 for Ports 1-6 (four as code, Ports 4 and 5 as prose) and the result-conversion table, 14.6 lines 4245-4266 for the landing order, 17.7 lines 4934-4962 for the F2 deviation precedent (4962 is the file's last line)). The WebGPU design is normative for `accelerator.ts`; the graph-format design is normative for `toSnapshot`, for the ports and for the namespace spelling. Where the two disagree, section 0.5 of this plan records the departure.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (Phases M0-M5b, and section 6's M8 block at lines 3264-3272, which this plan decomposes for M8a only). M8b (design phase P7) has its own plan file.

**Gate:** the algorithms clause of G6 (design 13 row P6, `webgpu-acceleration-plan.md:4213`: "`algorithms`: 9.2 interfaces + `accelerated()` with the ported methods + `pathTo` / `pathEdges` decoration + `sources` / `k` + fake tests (first A2 commit)") plus the algorithms clause of G10 (design 13 row P10, `:4217`: the `import type` switch, the retired mirrors and the conformance reverse compile), plus the A1 gate string of graph-format design 14.6 (`graph-format-design.md:4250`: "every existing test's graph converts with `equalsTopology` / neighbour-set parity"). NOT G7: see DEP-8A-A.

**Tasks in this document:** M8a-T1 .. M8a-T14. T1 is a precondition CHECK that edits nothing and may run first or last (the edit it checks for is owned by Task M8b-T1 Step 1). T2 is the precondition of everything else. T3 -> T4 and T3 -> T6/T7 (the ports need `toSnapshot` only for their tests' fixtures, but the differential harness needs it outright). T5 -> T6 -> T7 -> T8 -> T9 -> T10 -> T11 in a straight line (each one's Files block names the file the next one edits). T12 may run any time after T8. T13 is gated on Phase M5b being on master (PD-12) and touches only `webgpu-graph-algorithms/`. T14 is last. Within a phase no two tasks name the same file.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit". A task ends with a Checkpoint or a Commit step, never with a git command.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file. This holds even when a harness reminder says otherwise.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes, ` -> ` for arrows. Verify with `LC_ALL=C grep -nP '[^\x00-\x7F]'` before every Commit step.
- Never run `sudo`; nothing here needs it. Servers only on ports 9000-9099 (algorithms coverage preview is 9051).
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (algorithms' are 80 lines / 80 functions / 75 branches / 80 statements, `algorithms/vitest.config.ts:68-76`).
- Temporary files under `./tmp/`; write a script file there instead of repeating an inline one-liner.
- Project rule (`CLAUDE.md`): never create a fallback when WebGPU is unsupported. `accelerated(acc)` is NOT a fallback: with `acc === null` it runs the CPU port, and with an accelerator whose method THROWS it lets the throw propagate unchanged (design 9.2, `webgpu-acceleration-plan.md:2986-2989`). There is no try/catch anywhere in the dispatcher.
- Public signatures of `@graphty/algorithms` are UNCHANGED by this plan (graph-format design 14.1 rule 1 and 14.6 row A1). Everything added is additive. The one behaviour addition to an existing function is the `sources` / `k` guard of Task M8a-T9, which no code that compiles today can reach.
- algorithms tests use `expect`, not `assert` (the `assert` rule in the root `CLAUDE.md` is the LAYOUT package's rule); they live under `algorithms/test/`, never colocated with `src/`; they import vitest explicitly even though `globals: true`.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason, and a `design/decisions/` record is written by Task M8a-T12.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-19)

| Fact | Evidence |
| --- | --- |
| Main worktree is on `master` at `07fba28b test(webgpu-graph-algorithms): let the minimum confirm the median in bench:compare`, ONE commit ahead of `origin/master` (`cde458a2`) and unpushed -- which matters for Task M8a-T13, whose gate reads `origin/master`; the only thing in the working tree is the four untracked plan files of 2026-09-19 (M6, M7, M8a, M8b), this document among them. | `git log --oneline -3`; `git status --porcelain` (four `??` lines, all `design/webgpu/plans/2026-09-19-webgpu-m*.md`) |
| `@graphty/graph-format` is `1.0.0` in the workspace and on npm; invariants I1-I18 are frozen. | `graph-format/package.json:3`; `design/graph-format/graph-format-design.md:4934-4962` (section 17.7) |
| `@graphty/algorithms` is `1.7.2`. The root `CLAUDE.md` Package Directory says 1.4.0 and is STALE; do not quote it. | `algorithms/package.json:3` |
| `algorithms/src/indexed/` DOES NOT EXIST, on master or on any of the 17 local and remote refs. | `ls algorithms/src/` returns `algorithms benchmark-all-algorithms.ts clustering core data-structures flow index.ts link-prediction optimized pathfinding research types utils`; `git log --all --diff-filter=A -- 'algorithms/src/indexed/*'` is empty |
| algorithms declares NO dependency on graph-format: its whole `dependencies` block is `{ "typedfastbitset": "^0.6.1" }`, there is no `peerDependencies` block, and its tsconfig has neither `references` nor `paths`. | `algorithms/package.json:140-142`; `algorithms/tsconfig.json` (15 lines, read in full) |
| `Graph` has no `mutationCount`; `toSnapshot` exists nowhere in `algorithms/src`. A1 has not started. | `grep -rn "mutationCount\|toSnapshot" algorithms/src/` is empty; `design/graph-format/STATUS.md:1334`; `graph-format-design.md:4960` (D-F2-GATE) |
| `PageRankOptions` is DOUBLY defined and the two differ materially. `algorithms/src/types/index.ts:96` has `alpha`; `algorithms/src/algorithms/centrality/pagerank.ts:15` has `dampingFactor` plus six more (`maxIterations`, `tolerance`, `initialRanks`, `personalization`, `weight`, `useDelta`). The explicit `export type { ... PageRankOptions ... }` at `algorithms/src/index.ts:13-32` SHADOWS the star re-export, so the public type is the first while `pageRank()` at `pagerank.ts:83` takes the second. `tsc --noEmit` passes today. | read in full; see PD-1 |
| `BetweennessCentralityOptions` has exactly three members (`normalized?`, `endpoints?`, `optimized?`), none of them `readonly` and none carrying `\| undefined`. | `algorithms/src/algorithms/centrality/betweenness.ts:15-28` |
| `betweennessCentrality(graph, options)` returns a bare `Record<string, number>` -- there is no wrapper type, no `iterations`, no `converged`. | `algorithms/src/algorithms/centrality/betweenness.ts:204-207` |
| The GPU package still holds the D27 structural mirrors of the algorithms half: `CpuAlgorithmOptions` at `src/types/accelerator.ts:49`, the twelve `*ResultLike` at `:56-170`, `AlgorithmAccelerator` at `:177-204`. `CpuAlgorithmOptions` is PUBLIC (`src/index.ts:57`) and pinned by `test/types/public-api.test-d.ts:255` and `:280`. | read in full |
| `webgpu-graph-algorithms/project.json:7` is `"implicitDependencies": ["!algorithms", "!layout"]` on master and `["!algorithms"]` on `feat/webgpu-layout-types`; no other `project.json` in the repository has the key. | `git show feat/webgpu-layout-types:webgpu-graph-algorithms/project.json` |
| `tools/commit-changes.sh:468-469` carries a hardcoded `VALID_SCOPES` that OMITS `graph-format`, `graph-io` and `webgpu-graph-algorithms`, all three of which `commitlint.config.js:4-27` accepts. The script refuses such a commit before staging anything. The FIX is owned by Task M8b-T1 Step 1 of the M8b plan; Task M8a-T1 only checks for it. | read in full; see Task M8a-T1 and `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` Task M8b-T1 Step 1 |
| CI builds before it lints, on both PR and master ("Build then lint (build first for type dependencies)"), and a PR additionally builds graph-format, graph-io and webgpu-graph-algorithms unconditionally. | `.github/workflows/ci.yml:78`, `:85-92`, `:94-96`, `:98`, `:111-113` |
| `hosts.yml` triggers on `pnpm-lock.yaml`, which every dependency-adding commit touches, so the Windows/macOS lane will run on this phase's PR. | `.github/workflows/hosts.yml:13`, `:15` |
| `design/decisions/` holds two records and its README forbids appending new ones to a design's Review log. | `design/decisions/README.md:14-21`, index table at `:29-32` |

### 0.2 Entry criteria, MET or NOT MET, each with its evidence

The integration plan's Entry cell for M8a (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3267`) is, VERBATIM: "graph-format `>= 1.0.0` on master and the A1 branch merged (graph-format design 14.6); prepared on a branch after A1, merged after F2."

| Criterion | Status | Evidence |
| --- | --- | --- |
| `@graphty/graph-format >= 1.0.0` on master | **MET** | `grep '"version"' graph-format/package.json` -> `"version": "1.0.0",`. The 1.0.0 cut is recorded at `design/graph-format/graph-format-design.md:4934` (section 17.7) and landed as `f6520f85 feat(graph-format)!: freeze the invariants and cut 1.0.0`. |
| The A1 branch merged | **NOT MET, and A1 has not started** | `algorithms/package.json:140-142` declares no `@graphty/graph-format`; `grep -rn "toSnapshot\|mutationCount" algorithms/src/` returns nothing; `ls algorithms/src/indexed` -> "No such file or directory"; `design/graph-format/STATUS.md:1334` states it in words ("The cut did NOT wait for the A1 branch that design 14.6 gates F2 on -- A1 has not started."); `graph-format-design.md:4960` (D-F2-GATE) states it again with the same two pieces of evidence. There is no A1 branch: `git branch -a` lists master, feat/webgpu-layout-types, feat/layout-simulation, land/webgpu-graph-algorithms, babylonjs-inspector-mcp, compact-mantine, docs, graphty-ux, monorepo-review, remote-logging, test-coverage, xr-camera, xr-ui and their origin counterparts. None is A1. |
| The A1 merge gate itself ("CI dependency check passes", `graph-format-design.md:4252`) | **VACUOUS** | 17.7's D-RULE5-CHECK says of that check, VERBATIM: "No such check exists in `.github/workflows/` or `tools/`." Nothing can be scheduled against it. |
| Phase M5 (layout L1-sim) on master | **NOT MET** | draft PR #12 is open; `git branch --merged master` does not list `feat/layout-simulation`. M8a does not depend on it (PD-12). |
| Phase M5b (`feat/webgpu-layout-types`) on master | **NOT MET** | `git branch --merged master` does not list it either. Task M8a-T13 is the one task that depends on it (PD-12). |

**Consequence, stated plainly:** M8a as the integration plan literally scopes it cannot be executed, for two independent reasons.

1. Its stated entry criterion is unmet and nobody is working on making it met.
2. Even if it were met, the M8a deliverable text says the dispatcher "carries only the methods whose `indexed.*` port exists" (`2026-09-16-graphty-monorepo-integration.md:3268`) and the design says the same in its own voice ("`algorithms/src` has no `indexed/` directory today, so the 'first A2 commit' dispatcher carries only the methods whose `indexed.*` function has landed", `webgpu-acceleration-plan.md:2963-2965`). Today that set is EMPTY. A literally-scoped M8a would ship an `AcceleratedAlgorithms` with zero methods and an `accelerated()` that returns `{ accelerator }` -- a type surface with nothing behind it, which M6's adapters cannot call and which no test can exercise beyond checking that it compiles.

So **this plan ABSORBS A1** (Part A) and a MINIMAL set of `indexed.*` ports (Part B), and only then builds the seam (Part C). The port set is not chosen by taste: it is exactly the six `design/graph-format/graph-format-design.md` section 14.2 names as Ports 1-6 -- Port 1 `breadthFirstSearch` (`:3823`), Port 2 `dijkstra` (`:3856`), Port 3 `pageRank` (`:3889`), Port 4 `connectedComponents` (`:3924`), Port 5 `kruskalMST` (`:3930`), Port 6 `commonNeighborsScore` (`:3940`). FOUR of them the design carries in full, as fenced ```typescript blocks that this plan transcribes verbatim: Ports 1 (`:3826-3850`), 2 (`:3859-3880`), 3 (`:3891-3917`) and 6 (`:3942-3954`). TWO of them it specifies in PROSE and this plan therefore designs: Port 4 (`:3924-3928`) is four sentences with a one-line inline fragment -- no signature, no result interface, no `groups()`, no directed check -- and Port 5 (`:3930-3938`) is prose with no code at all. What this plan designs for those two is listed in section 0.5 as DEP-8A-D (Port 5's sort) and DEP-8A-H (Port 4's `LabelResult` shape, its cached `groups()` and its directed-input throw), so a reviewer knows which lines to read as a proposal rather than as a transcription.

The precedent for taking a 14.6 gate out of order is F2's own: graph-format 1.0.0 was cut WITHOUT the A1 gate it names, recorded as D-F2-GATE at `graph-format-design.md:4960`, whose closing clause is "A1 keeps its 14.6 content; only its ORDER relative to F2 changes." This plan keeps A1's content too; it changes A1's ORDER relative to the first A2 commit by putting both in one phase. Task M8a-T12 writes the decision record.

### 0.3 Execution order

The phase numbers are NOT the execution order. The real order is decision D3, stated identically in all four M6 / M7 / M8a / M8b plan documents:

```
merge PR #12 (M5) -> merge M5b -> M8a (A1 + the six ports + the accelerator seam) -> M6 (E0 then E1) -> M7
M8b is independent of that whole chain.
```

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| M5 Layout seam (L1-sim) | `layout/` | F2 (MET) | PR #12 | layout tests + Chromatic re-baseline | in flight |
| M5b GPU layout types (W1b layout half) | `webgpu-graph-algorithms/` | M5 on master (NOT MET) | `feat/webgpu-layout-types`, no PR yet | both software shards green | in flight |
| **M8a Algorithms (A1 + six ports + 9.2), this document** | `algorithms/`, GPU package | graph-format >= 1.0.0 (MET); A1 (NOT MET, ABSORBED here); M5b on master for Task M8a-T13 only | Parts A, B, C below | G6 algorithms clause + G10 algorithms clause + the 14.6 A1 gate string | **15-21 ed** |
| M6 Element (E0 + E1) | `graphty-element/` | M5 on master for E0 (M8a NOT required); M5 and M8a on master for E1 | graph-format 14.4 E0, then design 9.4 items 1-10 | design G6, element part | own plan |
| M7 App (W2) | `graphty/` | M6 on master | design 9.5 `attachAccelerator`, the indicator, the `gpu`-tagged stories | design G12 (W2 subset), as restated by `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` | own plan |
| M8b GPU SpMV family (P7) | `webgpu-graph-algorithms/` | M3 (MET) and the design's P2 gate (MET) | design P7 (the 8.2 / 8.3 kernels) | design G7 | own plan |

Critical path: M5 -> M5b -> M8a -> M6 -> M7 ; M8b in parallel with all of it, and M8b is the ONLY phase whose entry criteria are met today.

**Size of this phase: 15-21 ed.** Breakdown, in the design's own units (`webgpu-acceleration-plan.md:4198`: "sizes are engineer-days (ed) for one engineer familiar with the code base"): Task M8a-T1 0.1 ed (a precondition check and its scratch script; the edit itself is Phase M8b's), Part A 4-5 ed (the conversion is small; the differential harness over the existing fixture corpus is most of it), Part B 6-8 ed (six ports plus two scratch structures plus their differential tests against the legacy implementations), Part C 3-4 ed (the design hands over most of the type block, with the five changes Task M8a-T8 tabulates; the work is the dispatcher, the decoration and the three fake-accelerator tests), Task M8a-T12 0.75-1 ed (three decision records written to a named template at about 95 columns, plus four index-table edits across three READMEs), Task M8a-T13 1-2 ed (the W1b algorithms half, sized by the layout half's precedent on `feat/webgpu-layout-types`), Task M8a-T14 0.5 ed (the eleven-row G6 record plus the full `tools/prepush.sh` run this plan itself prices at 15-25 minutes). The design sizes only the part it can see: "8-10 ed (across three packages...)" for P6 as a whole (`:4213`) and "the first A2 commit is small" (`2026-09-16-graphty-monorepo-integration.md:3272`). Both remain true of Part C alone; neither sizes A1 or the ports, which is why this number is larger than either.

### 0.4 Plan decisions (PD-1 .. PD-13)

Each fills a gap the design leaves or resolves a conflict between two things the design says. None changes a design declaration; where one would, section 0.5 files the departure and Task M8a-T12 writes the record.

**PD-1: the doubly-defined `PageRankOptions`.**

PLAN DECISION: BOTH existing declarations survive M8a, byte for byte. The indexed side gets a THIRD, declared in `algorithms/src/indexed/pagerank.ts` exactly as `graph-format-design.md:3892` writes it (`{ dampingFactor?, maxIterations?, tolerance?, weighted? }`, every member `readonly ... | undefined`), reachable as `indexed.PageRankOptions` and re-exported FLAT from the root barrel under the alias `IndexedPageRankOptions`. The same applies to the result type: `indexed.PageRankResult` (`{ scores, iterations, converged }`) is aliased `IndexedPageRankResult` flat, beside the untouched legacy `PageRankResult` (`{ ranks, iterations, converged }`, `pagerank.ts:51-64`).

Reason: graph-format design 14.1 rule 1 (`graph-format-design.md:3700-3702`) says "No public result type of `@graphty/algorithms` ... changes during the dual-API window", and both declarations are public today. Deleting either is a `feat!:` on a 1.x package with real consumers (graphty-element depends on `@graphty/algorithms`), and M8a is not the place to spend a major on a documentation bug.

What this decision does NOT do, and why that is uncomfortable: the shadowing is a live, silent defect. `const o: PageRankOptions = { alpha: 0.9 }; pageRank(g, o);` COMPILES -- the target type is weak but the two share `maxIterations`, `tolerance` and `personalization`, so weak-type detection does not fire and excess-property checking does not apply to a typed variable -- and the damping factor silently stays at its 0.85 default (`pagerank.ts:76`). M8a therefore does two cheap things: it adds a comment at `algorithms/src/index.ts:28` naming exactly what that line shadows, and Task M8a-T12 writes `design/decisions/2026-09-19-pagerank-options-shadowing.md` recording that the `types/index.ts:96` declaration is the one that dies, at 2.0, when the facades go (graph-format design 14.6's 2.0 row, `:4260`).

REJECTED: "delete `types/index.ts:96` now, it is obviously wrong". It is not obviously wrong -- it is the declaration the barrel publishes, so it is the one users have typed against since 1.0, and removing it changes what `import type { PageRankOptions }` resolves to from a four-member type to a seven-member type. That is a breaking change even though it looks like a fix.

**PD-2: the option types design 9.2 names that do not exist under those names.**

PLAN DECISION: per type, by the following table. The rule, in three clauses:

1. A type one of this plan's six ports actually needs is CREATED under the design's 9.2 name inside `indexed/`. It is a new type with new semantics, not a rename of a legacy one.
2. A type the SEAM's `AlgorithmAccelerator` needs but no M8a port produces is SUBSTITUTED -- the method takes a type that already exists in `indexed/`, or one of the two shared shapes this plan declares (`HitsOptionsLike`, `BetweennessAcceleratorOptions`) -- and the row below says which, and why, and what the parameter narrows to when that port lands. A substitution is visible in the type block, so it is recorded here rather than in section 0.5.
3. NO legacy declaration is renamed, deleted or edited by this plan. Every "NOT TOUCHED" row below means exactly that: the file and the declaration are unchanged on disk.

The table records each ruling so the later port PR does not re-litigate it.

| Design 9.2 name | Exists today as | M8a ruling |
| --- | --- | --- |
| `PageRankOptions` | `algorithms/src/types/index.ts:96` AND `algorithms/src/algorithms/centrality/pagerank.ts:15` | NEW third type in `indexed/pagerank.ts` per `graph-format-design.md:3892`; flat alias `IndexedPageRankOptions` (PD-1). NOT a rename. |
| `SsspOptions` | nothing; nearest is `DijkstraOptions` (`types/index.ts:73-81`, `{ target?, bidirectional? }`) | NEW, in `indexed/dijkstra.ts`, per `graph-format-design.md:3861` (`{ cutoff?, weights? }`). NOT a rename: the two types share no member and `weights` is a per-arc override that has no legacy counterpart. |
| `BfsOptions` | nothing; nearest is `TraversalOptions` (`types/index.ts`), whose members are NodeId-keyed callbacks | NEW, in `indexed/bfs.ts`, per `graph-format-design.md:3826` (`{ maxDepth? }`). NOT a rename. |
| `BetweennessOptions` | `BetweennessCentralityOptions` (`betweenness.ts:15`) | The design's name is a mis-citation of the existing one -- the SAME section 9.2 paragraph that writes `BetweennessOptions` also writes "A2 adds `sources?: readonly number[]` and `k?: number` to `BetweennessCentralityOptions` (today `normalized`, `endpoints`, `optimized`, `betweenness.ts` lines 15-28)" (`webgpu-acceleration-plan.md:2976-2978`). M8a extends the EXISTING type (Task M8a-T9) and introduces no `BetweennessOptions`. The accelerator's two betweenness methods do NOT take that extended type; they take `BetweennessAcceleratorOptions` (last row), because `sources` means the opposite thing on the two sides -- an index list the snapshot understands and the legacy entry points refuse (PD-5). |
| `HitsOptions` | `HITSOptions` (`centrality/hits.ts`) | NOT TOUCHED at M8a (no port, no dispatcher method); `AlgorithmAccelerator.hits` takes `HitsOptionsLike` in the meantime. Ruling for the later PR: keep `HITSOptions`; do not rename a published type to fix a capitalisation in a design sketch. |
| `EigenvectorOptions` | `EigenvectorCentralityOptions` | NOT TOUCHED. Same ruling; `eigenvectorCentrality` takes `HitsOptionsLike`. |
| `KatzOptions` | `KatzCentralityOptions` | NOT TOUCHED. Same ruling; `katzCentrality` takes `HitsOptionsLike`. |
| `ClosenessOptions` | `ClosenessCentralityOptions` | NOT TOUCHED. Same ruling; `closenessCentrality` takes `HitsOptionsLike`. |
| `ApspOptions` | nothing | NOT CREATED at M8a. `AlgorithmAccelerator.allPairsShortestPath` takes `SsspOptions` instead (design `:2939` writes `ApspOptions`): `cutoff` and the per-arc `weights` override are exactly the two things an APSP accelerator can honour, and a one-member placeholder type would have to be renamed when the real port lands. The parameter narrows to `ApspOptions` in the port PR that creates it. |
| `BellmanFordOptions` | `algorithms/src/algorithms/shortest-path/bellman-ford.ts:16`, whose only member is `target?: NodeId` | NOT TOUCHED. `AlgorithmAccelerator.bellmanFord` takes `SsspOptions` instead (design `:2935` writes `BellmanFordOptions`): the existing type's only member is a `NodeId`, and an accelerator method whose first parameter is a `GraphSnapshot` has no NodeId space to interpret it in. This is a SUBSTITUTION, not a rename -- `bellman-ford.ts:16` is untouched and keeps its meaning on the legacy path. |
| `LabelPropagationOptions` | `algorithms/src/algorithms/community/label-propagation.ts:16` (`{ maxIterations?, randomSeed? }`) | NOT TOUCHED. `AlgorithmAccelerator.labelPropagation` takes `HitsOptionsLike` instead (design `:2942` writes `LabelPropagationOptions`). Two reasons: importing a legacy option type into `src/indexed/accelerator.ts` would point the seam back up into the legacy tree, which is the one direction PD-9 keeps clear; and the declaration is neither `readonly` nor `\| undefined`, which the GPU package's `exactOptionalPropertyTypes` compile needs (PD-6). The parameter narrows when the LPA port lands with its own indexed option type. |
| `LouvainOptions` | `algorithms/src/types/index.ts:103` (`{ resolution?, maxIterations?, tolerance?, useOptimized? }`) | NOT TOUCHED. `AlgorithmAccelerator.louvain` takes `HitsOptionsLike` instead (design `:2944` writes `LouvainOptions`), for the same two reasons as `LabelPropagationOptions`. |
| `HitsOptionsLike` -- not in the design's 9.2 block | nothing | NEW public type, declared in `indexed/accelerator.ts` (Task M8a-T8). Design 9.2 names an option type for fourteen accelerator methods and M8a's ports create four of them; rather than invent ten placeholder types that every later port PR would have to rename, the seam declares ONE shared shape (`maxIterations`, `tolerance`, `weighted`) for the power-iteration family -- `hits`, `eigenvectorCentrality`, `katzCentrality`, `closenessCentrality`, `labelPropagation`, `louvain` -- and each method's parameter NARROWS to its real type as that port lands. |
| `BetweennessAcceleratorOptions` -- not in the design's 9.2 block | nothing | NEW public type, declared in `indexed/accelerator.ts` (Task M8a-T8), taken by `betweennessCentrality` and `edgeBetweennessCentrality` where the design writes `BetweennessOptions`. It is NOT the legacy `BetweennessCentralityOptions`: `sources` there is a list the legacy entry points REFUSE (PD-5), and here it is the node-index list an accelerator consumes, so the two cannot be one declaration. `optimized` is absent, because it names a CPU implementation choice an accelerator has no analogue for. |

REJECTED: "rename the four `*CentralityOptions` to the design's shorter names now, so the seam reads like the design". Four breaking renames on a 1.x package to make a future sketch read nicely, before a single one of those four algorithms has a port. The design's sketch is not normative about names it gets wrong about the code it cites two paragraphs later.

**PD-3: `SsspResultLike.dist` is `NumericVector`, the design's own `SsspResult.dist` is `F64`.**

PLAN DECISION: `SsspResult.dist` is widened to `NumericVector`. The single declaration, in `algorithms/src/indexed/dijkstra.ts`, is

```ts
export interface SsspResult {
    readonly dist: NumericVector;
    readonly predArc: U32;
    pathTo(target: number): U32;
    pathEdges(target: number): U32;
}
```

Reason: `AcceleratedAlgorithms.sssp` returns ONE type on both paths (`webgpu-acceleration-plan.md:2953`, which writes `Promise<SsspResult>`, not `Promise<SsspResultLike>`), and the accelerator's contribution is an `SsspResultLike` whose `dist` is a `NumericVector` -- in practice a GPU `Float32Array` (design 9.7 row: "`dist: F32 (+Inf unreached)`", `:3269`). `F64` is assignable to `NumericVector`; `NumericVector` is NOT assignable to `F64`. With the design's literal `dist: F64` the dispatcher's decoration step does not type-check, and the only ways to make it type-check are a cast (forbidden) or a runtime `instanceof Float64Array` narrow that would have to THROW on the GPU's own result. So the field is widened once, at the declaration, and the CPU port's `dist` remains a `Float64Array` at runtime (readers that need f64 precision get it; readers that only index it do not care).

REJECTED: "declare two interfaces, a narrow `IndexedSsspResult { dist: F64 }` for the port and a wide `SsspResult` for the dispatcher". Two names for one shape, and every consumer has to learn which one it is holding. The widening costs nothing that anybody can observe: no code in this repository reads `dist` as a `Float64Array` specifically.

**PD-4: `betweennessCentrality` returns a bare `Record<string, number>`; `ScoresResultLike` demands `{ scores, iterations, converged }`.**

PLAN DECISION: no `betweennessCentrality` method exists in M8a's `AcceleratedAlgorithms` (no port, so no method -- the dispatcher rule of `webgpu-acceleration-plan.md:2963-2966`). The ruling below is recorded NOW, HERE in PD-4 -- this plan is a plan of record and PD-4 is its citable form -- so the later port PR and the GPU side agree without re-deciding. It gets no `design/decisions/` file of its own: it reverses no design declaration, it fills a gap design 9.7 leaves, and Task M8a-T12's two records are for the two departures that do reverse something (DEP-8A-B's ordering and the PageRankOptions shadowing). The ruling:

- `scores`: `Float64Array(nodeCount)`, index-aligned, raw Brandes values with the same normalisation convention the legacy function applies (`betweenness.ts:208-239`).
- `iterations`: **`sourcesUsed`** -- the number of BFS roots the pass actually ran. For exact betweenness that is `nodeCount`; for sampled betweenness (`sources` / `k`, PD-5) it is the length of the source list. `ScoresResultLike.iterations` therefore means "the number of outer passes", which is the reading that also makes design 9.7's "`iterations` +-1" parity check (`:3266`) meaningful on both sides: the GPU reports `sourcesUsed` in its own result (design 9.7 row for `betweennessCentrality`, `:3272`) and the two numbers compare directly.
- `converged`: **`true`, always.** Brandes is an exact single pass; it has no convergence criterion and cannot fail to meet one. Reporting `false` would be a lie that some caller eventually branches on.

REJECTED: "`iterations: 1, converged: true`". It is defensible ("one pass") but it throws away the one number a sampled run needs to report, and it makes the GPU's `sourcesUsed` unrepresentable in the shared shape, which would force an extra field onto `ScoresResultLike` that eleven other algorithms do not have.

**PD-5: `sources` is `readonly number[]` and `k` is a count; both are node INDICES, and the legacy `betweennessCentrality(graph: Graph, ...)` has no index space.**

PLAN DECISION: the legacy path **THROWS**. `algorithms/src/algorithms/centrality/betweenness.ts` gains a module-private guard called as the FIRST STATEMENT of each of the three public entry points that take the options object (`betweennessCentrality`, declared at `:204`, body opens at `:208`; `nodeBetweennessCentrality`, declared at `:248`, body opens at `:253`; `edgeBetweennessCentrality`, declared at `:267`, body opens at `:271`):

```ts
function rejectIndexOptions(options: BetweennessCentralityOptions, fn: string): void {
    if (options.sources !== undefined || options.k !== undefined) {
        throw new Error(
            `${fn}: 'sources' and 'k' are node INDICES and are meaningful only against a GraphSnapshot; ` +
                "call accelerated(accelerator).betweennessCentrality(snapshot, options) instead",
        );
    }
}
```

Reason: the other two candidates are both worse and both silent. IGNORING them means a caller who asks for a 128-source sample gets an exact all-sources run -- the right answer, computed 1000x too slowly, with no signal at all; that is the single most expensive kind of silence a graph library can ship. RESOLVING them through `ids` means the legacy facade builds a snapshot to interpret its own options, which is A2's widening (`graph-format-design.md:4253`), not A1's, and it would silently make a `Graph`-taking function allocate a CSR.

This is additive, not breaking: `sources` and `k` are not members of `BetweennessCentralityOptions` today, so no code that compiles today can reach the throw. Only an untyped JS caller inventing the fields could, and that caller is asking for something the function cannot do.

**PD-6: the style conflict inside `BetweennessCentralityOptions`.**

PLAN DECISION: ONE style for the whole interface -- `readonly <name>?: <T> | undefined` on all five members, including the three that exist today.

```ts
export interface BetweennessCentralityOptions {
    readonly normalized?: boolean | undefined;
    readonly endpoints?: boolean | undefined;
    readonly optimized?: boolean | undefined;
    readonly sources?: readonly number[] | undefined;
    readonly k?: number | undefined;
}
```

Reason: the GPU package compiles its public surface a second time under `exactOptionalPropertyTypes: true` (`webgpu-graph-algorithms/tsconfig.strict-consumer.json`), where `sources?: readonly number[]` and `sources?: readonly number[] | undefined` are DIFFERENT types, and its existing mirror already spells the pair with `| undefined` (`webgpu-graph-algorithms/src/types/accelerator.ts:216-220`). A half-and-half interface makes the conformance compile depend on which member the assertion happens to name.

Verified as non-breaking: `tsconfig.base.json` sets neither `exactOptionalPropertyTypes` nor `noUncheckedIndexedAccess` (read in full, 22 lines), so inside algorithms the two spellings are the same type. Adding `| undefined` WIDENS the property, which is compatible in both directions for readers. Adding `readonly` to an interface property does not block assignability of object types in TypeScript. Nothing that compiles today stops compiling.

REJECTED: "keep the plain style and let the GPU mirror carry the `| undefined`". That is what the mirror does TODAY, and it is exactly what Task M8a-T13 deletes: after W1b the GPU package imports this declaration, so this declaration has to be the one that survives a strict-consumer compile.

**PD-7: retiring `CpuAlgorithmOptions` is a breaking change to a published surface.**

PLAN DECISION: accept the break at 0.x, and mark it with a `feat!:` commit so nx's conventional-commit versioning does the right thing on its own. `@graphty/webgpu-graph-algorithms` is `0.2.1`; the design calls the type "retired" at W1 (`webgpu-acceleration-plan.md:4217`) and D27 says "at W1 the mirrors are deleted" (`:224`). No deprecation window: the type is a placeholder whose whole documented purpose was to stand in until A2 (`webgpu-graph-algorithms/src/types/accelerator.ts:43-48`: "Placeholder for the CPU option types the AlgorithmAccelerator methods take before A2 lands"), and M8a is A2 landing.

Consequence stated out loud: the package's four-line export deletion (`src/index.ts:57`, `test/types/public-api.test-d.ts:14` -- the `type CpuAlgorithmOptions,` in the import list -- `:255` and `:280`) is a major-shaped change on a 0.x version, so nx will publish it as `0.3.0`, not `1.0.0`. Any external consumer writing `import type { CpuAlgorithmOptions }` breaks at that minor. There is one such consumer in the world and it is `webgpu-graph-algorithms`' own type test.

REJECTED: "keep it as `@deprecated export type CpuAlgorithmOptions = Readonly<Record<string, unknown>>` for one minor". It cannot be kept honestly: after the switch, `AlgorithmAccelerator.pageRank`'s second parameter IS `IndexedPageRankOptions`, so a deprecated alias would still be exported but nothing would return or accept it. A type alias nobody can reach is worse documentation than its absence.

**PD-8: how algorithms resolves `@graphty/graph-format`.**

PLAN DECISION: the LAYOUT pattern. `algorithms/package.json` gains `"dependencies": { "@graphty/graph-format": "workspace:^" }` and `"peerDependencies": { "@graphty/graph-format": "^1.0.0" }`; `algorithms/tsconfig.json` is NOT touched -- no `paths` entry, no `include` of graph-format's sources, no `references` array. Resolution goes through pnpm's `node_modules` symlink to graph-format's top-level `"main"` / `"types"`, i.e. to `graph-format/dist/graph-format.d.ts`, which means **graph-format must be BUILT before algorithms is built, linted or tested**.

Reason, and it is decisive rather than a preference: the graph-io / webgpu pattern (`graph-io/tsconfig.json:11-16` plus `"include": [..., "../graph-format/src/**/*.ts"]`) works there only because BOTH of those tsconfigs set `"noEmit": true` and do their emit from a separate `tsconfig.build.json`. `algorithms`' build is the bare command `tsc` (`algorithms/package.json:53`), which reads `algorithms/tsconfig.json`, which does NOT set `noEmit` and DOES set `"outDir": "./dist"`; `tsconfig.base.json` sets no `rootDir`. Adding `"../graph-format/src/**/*.ts"` to that `include` moves the INFERRED rootDir from `algorithms/` up to the monorepo root, which relocates every output: `algorithms.ts` (whose entire content is `export * from "./src/index.js";`) would emit to `dist/algorithms/algorithms.js` instead of `dist/algorithms.js`, and `algorithms/package.json:6`'s `"main": "dist/algorithms.js"` would point at nothing. There is no way to take the sources-paths pattern without either restructuring algorithms' build or setting an explicit `rootDir`, and neither belongs in M8a.

Consequence accepted: `algorithms/project.json`'s `lint` target gains NO `dependsOn`, matching layout on both master and `feat/webgpu-layout-types` (`layout/project.json` read on both; its `lint` is `eslint && tsc --noEmit` with no `dependsOn`, while only `build` carries `["^build"]`). Separately -- and this is NOT a `dependsOn` change -- Task M8a-T10 does edit that target's command string, from the hardcoded `"eslint && tsc --noEmit"` to `"npm run lint"`, because CI runs the nx target rather than the npm script and the type-surface compile would otherwise never execute in the lane. The reasoning is at Task M8a-T10 Step 2. This is safe because every path that lints builds first: `ci.yml:78` and `:98` both say so in a comment ("Build then lint (build first for type dependencies)"), `tools/prepush.sh` runs Build as step 1 and Lint as step 3, and `algorithms:build`'s own `dependsOn: ["^build"]` (`algorithms/project.json:17`) builds graph-format whenever algorithms is built. The residual is R-M8A-2: a bare `pnpm exec nx run algorithms:lint` in a FRESH worktree fails with TS2307 until `nx run graph-format:build` has run. The phase's Step 0 does exactly that.

**PD-9: the namespace spelling.**

PLAN DECISION: the NAMESPACE, exactly as graph-format design 14.1 rule 2 writes it (`graph-format-design.md:3703-3706`): `export * as indexed from "./indexed/index.js";` in `algorithms/src/index.ts`. The flat `export * from "./simulation"` that layout used on `feat/webgpu-layout-types` (`layout/src/index.ts:20-21`) is NOT a precedent for algorithms.

Reason: for layout the flat form was free, because `createSimulation` and friends collided with nothing. For algorithms it is impossible. `indexed.breadthFirstSearch`, `indexed.dijkstra`, `indexed.pageRank`, `indexed.connectedComponents` and `indexed.kruskalMST` all collide by name with the legacy functions the barrel already exports, and `indexed.PageRankOptions` collides with two existing declarations (PD-1). A flat export would force five renames on the ports, which would then not match the design's Port 1-6 text that they are transcribed from.

The accelerator symbols do NOT go through the namespace. `algorithms/src/indexed/accelerator.ts` is exported FLAT from the root barrel (`export { accelerated } from "./indexed/accelerator.js";` plus an `export type { ... }` list), because the GPU package must write `import type { AlgorithmAccelerator } from "@graphty/algorithms"` and a namespace-qualified interface is not reachable that way. This matches design 9.2's own words -- the file is "exported from the barrel next to the `indexed` namespace of design 14.2" (`webgpu-acceleration-plan.md:2902-2903`), NEXT TO it, not inside it.

Consequence, which Task M8a-T7 and M8a-T8 both depend on: `algorithms/src/indexed/index.ts` re-exports the SIX PORTS and the scratch structures and NOTHING ELSE. It does not re-export `accelerator.ts` (which imports `./index.js`, so re-exporting it would make a cycle) and it does not re-export `to-snapshot.ts` (whose parameter is a legacy `Graph`, which is not what the namespace's contract promises). Both are reached flat from the root barrel.

**PD-10: algorithms has no `expectTypeOf` / `*.test-d.ts` convention and no `tsconfig.strict-consumer.json`.**

PLAN DECISION: create the smallest possible one, scoped so it cannot pull in pre-existing fallout. Task M8a-T10 adds `algorithms/tsconfig.typecheck.json`:

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": { "composite": false, "noEmit": true },
    "include": ["src/**/*.ts", "algorithms.ts", "test/types/**/*.test-d.ts"],
    "exclude": ["node_modules", "dist", "coverage", "tmp"]
}
```

and extends `algorithms`' lint script to `eslint && tsc --noEmit && tsc -p tsconfig.typecheck.json`, and adds `"test/types/**/*.test-d.ts"` to the algorithms workspace's knip `entry` list (the webgpu workspace already carries that exact line at `knip.config.ts:60`). The one file in it is `algorithms/test/types/accelerator.test-d.ts`.

Reason: `algorithms/tsconfig.json`'s `include` is `["src/**/*.ts", "algorithms.ts", ".storybook/**/*.ts"]` -- `test/` is NOT in it, so `tsc --noEmit` does not type-check a single one of the 53 test files today, and an `expectTypeOf` assertion dropped into a normal `.test.ts` would be a runtime no-op that nothing checks. Widening the main tsconfig to cover `test/**` would both emit tests into `dist/` and surface an unknown amount of pre-existing type error across those 53 files; a separate config whose `include` names only `test/types/**/*.test-d.ts` has exactly one file in it and therefore exactly zero pre-existing fallout. The three-way precedent is graph-format, graph-io and webgpu, each of which runs a second `tsc` inside `lint`.

The `"composite": false` line is deliberate: `algorithms/tsconfig.json:4` sets `"composite": true` and this config extends it (`tsconfig.base.json` sets no `composite` key at all -- read in full, 22 lines), and a composite project that emits nothing is not what is wanted here (webgpu's `tsconfig.strict-consumer.json` sets exactly the same pair, `"composite": false` + `"noEmit": true`).

The reverse-direction conformance assertion is NOT duplicated here. It lives where the design puts it, in the GPU package's `test/types/conformance.test-d.ts`: the G10 gate cell of `webgpu-acceleration-plan.md:4217` names "the reverse compile", and the M8a deliverables cell of `2026-09-16-graphty-monorepo-integration.md:3268` names "the conformance test's reverse compile" outright. Task M8a-T13 writes it.

A conflict inside `:4217` that Task M8a-T13 resolves deliberately, so nobody has to re-derive it: the P10 DELIVERABLES cell of the same row says `test/types/conformance.test-d.ts` "is RETIRED" once the mirrors are deleted, and D27 (`:224`) repeats that the `implements` clauses do the checking from W1 on. This plan KEEPS the file. Reason: the same row's GATE cell asks for the reverse compile and the integration plan asks for it by name, and there is nowhere else to put it -- `implements` proves the GPU accelerator satisfies the CPU interface, but nothing in an `implements` clause proves that what the GPU package RE-EXPORTS is identical to the CPU declaration rather than a re-introduced structural copy, which is exactly the regression the mirrors' deletion is supposed to make impossible. Retiring the file would delete the only assertion that guards it.

**PD-11: removing the last `implicitDependencies` negation.**

PLAN DECISION: remove the whole key. After Phase M5b `webgpu-graph-algorithms/project.json:7` reads `"implicitDependencies": ["!algorithms"]`; Task M8a-T13 deletes the line, leaving no `implicitDependencies` key at all -- which is what every other `project.json` in the repository has.

Said out loud, because it is a standing cost and not a one-off: `nx.json:11` sets `"updateDependents": "auto"` and nx counts devDependencies as project-graph edges, so from that commit onward **every `@graphty/algorithms` release also patch-bumps and republishes `@graphty/webgpu-graph-algorithms`**, whether or not a single byte of the GPU package changed. algorithms released three times in the last ten commits that touch it (`git log --oneline -10 -- algorithms/` shows three `chore(release): publish [skip ci]` commits: `c8cbe47d`, `b996dd34`, `dbf07650`), so this is not hypothetical. The design records the same consequence in its own voice at `webgpu-acceleration-plan.md:3311-3313` ("every `@graphty/algorithms` or `@graphty/layout` release also patch-bumps and publishes this package ... This is the monorepo's existing convention and is accepted (Q-29 records the `release.groups` / `updateDependents: "never"` alternative)"), and the same thing already happens elsewhere in the repository (commit `5ef67039` shows `graphty` bumped as a dependent of `compact-mantine`).

The negation is not kept, because keeping it is worse than the bumps: with `!algorithms` in place, `nx affected` does NOT retest the GPU package when algorithms changes, which is precisely the case where the conformance compile of Task M8a-T13 needs to run. The negation would hide the one edge the conformance test exists to guard (integration plan risk R-M7).

**PD-12: M5b also edits `webgpu-graph-algorithms/project.json`'s negation line.**

PLAN DECISION: M8a branches from `master` and starts immediately; Tasks M8a-T1 through M8a-T12 touch NO file that Phase M5b touches. Task M8a-T13 -- and only Task M8a-T13 -- is gated: it does not start until `feat/webgpu-layout-types` is on master.

The six files M5b and M8a-T13 share, with the collision handled for each:

| File | M5b leaves it as | M8a-T13 does |
| --- | --- | --- |
| `webgpu-graph-algorithms/project.json:7` | `"implicitDependencies": ["!algorithms"]` | deletes the line (PD-11) |
| `webgpu-graph-algorithms/package.json` devDependencies | `"@graphty/layout": "workspace:^"` present | adds `"@graphty/algorithms": "workspace:^"` above it |
| `webgpu-graph-algorithms/tsconfig.json` paths | `"@graphty/layout": ["../layout/dist/layout.d.ts"]` present | adds `"@graphty/algorithms": ["../algorithms/dist/algorithms.d.ts"]` |
| `webgpu-graph-algorithms/tsconfig.strict-consumer.json` paths | same layout entry present | adds the same algorithms entry |
| `webgpu-graph-algorithms/src/types/accelerator.ts` | layout mirrors gone, `import type` + re-export; algorithms mirrors still structural (its header says so in words) | deletes the algorithms mirrors the same way |
| `webgpu-graph-algorithms/test/types/conformance.test-d.ts` | exists, layout half only | appends the algorithms half |

If M5b has NOT landed when T13 comes up, T13 STOPS and the owner lands M5b first. It does not rebase M8a onto the M5b branch and it does not pre-apply M5b's edits: doing either would make M8a's PR contain M5b's diff, and the two would then have to merge in a fixed order forever.

REJECTED: "branch M8a from `feat/webgpu-layout-types` so T13 has its files". Parts A, B and C are 90% of the phase and have zero overlap with M5b; stacking them behind a branch that has no PR yet would block 15-21 ed of work on a review that has not started.

**PD-13: algorithms' test conventions, and the absent injection pattern.**

PLAN DECISION: state them once here so no task has to re-derive them, and introduce nothing new.

- `expect`, never `assert` (the `assert` rule in the root `CLAUDE.md` is the layout package's; `algorithms/test/unit/betweenness-centrality.test.ts:1` imports `{ describe, expect, it } from "vitest"`).
- Tests live under `algorithms/test/`, never beside the source; `find algorithms/src -name "*.test.ts"` returns nothing and there are 53 `*.test.ts` files under `algorithms/test/`. New tests for `src/indexed/` go under `algorithms/test/unit/indexed/`.
- Imports are deep and relative with a `.js` extension (`../../src/algorithms/centrality/betweenness.js`), and vitest is imported explicitly even though `globals: true`.
- `algorithms/test/**` is in the ESLint IGNORE list (`eslint.config.js:51`, under the comment at `:49-50` "Algorithms tests have pre-existing TypeScript issues"), so no rule fires on a test file at all -- including `simple-import-sort/imports`. Two consequences, both of which some reader will otherwise try to "fix". The import order inside this plan's test files is not lint-checked, so an out-of-order line there (Task M8a-T11 imports `../../../src/index.js` before `../../../src/core/graph.js`) is not an error and must not be reported as one. And the same class of mistake in `src/` IS an error, which is why the `indexed/index.ts` barrel of Task M8a-T7 spells its specifiers in simple-import-sort's case-insensitive order.
- There is NO fake or mock injection pattern to copy. `grep -rln "vi\.fn\|vi\.mock\|vi\.spyOn" algorithms/test/` finds two files and neither is an injection seam. The fake accelerator of Task M8a-T11 is therefore a PLAIN OBJECT LITERAL typed `AlgorithmAccelerator`, with no `vi.fn` anywhere: the three things the design asks it to prove (delegation, the CPU path, an unswallowed throw) are all observable from a literal that records its calls in a closed-over array.

### 0.5 Departures from the design (all of them)

One class is recorded elsewhere and named here so the list is still complete: the option types design 9.2 writes for accelerator methods whose ports do not exist at M8a are SUBSTITUTED rather than created, and each substitution has its own row in PD-2's table with the reason and with what the parameter narrows to later. They are visible in the type block of Task M8a-T8 and in its five-row change table; nothing about them is silent. Everything else that differs from a design document is below.

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-8A-A | The integration plan's M8 block gives one Gate row, "design G7", for BOTH M8a and M8b (`2026-09-16-graphty-monorepo-integration.md:3271`). M8a is gated instead on the algorithms clause of G6 (`webgpu-acceleration-plan.md:4213`) plus the algorithms clause of G10 (`:4217`) plus the A1 gate string of graph-format design 14.6 (`graph-format-design.md:4250`). | G7 is phase P7's gate (`:4214`) and every item in it is a GPU measurement -- "the PageRank pull kernel binds exactly the 8 of 8.2", "no host readback inside a batch of 8 iterations", "T-8 and T-9 recorded". It names no test in `@graphty/algorithms` and cannot be made green by anything in this document. G6's own P6 row is the one that names this phase's deliverables verbatim. |
| DEP-8A-B | A1 is executed INSIDE M8a rather than as the separate, earlier branch graph-format design 14.6 schedules (`:4250` and `:4252`). | Section 0.2. A1 has not started, its merge gate is vacuous (17.7 D-RULE5-CHECK), and M6 -- which depends on M8a -- is blocked behind it. The precedent is D-F2-GATE (`graph-format-design.md:4960`), which took the same 14.6 gate out of order for the same reason and recorded it. Task M8a-T12 writes the record. |
| DEP-8A-C | The design's `SsspResult.dist: F64` (`graph-format-design.md:3860`) is widened to `NumericVector`. | PD-3. The dispatcher's decoration does not type-check otherwise, and the alternative is a cast. |
| DEP-8A-D | Port 5 `kruskalMST` sorts edge indices with a comparator over a `Float64Array` of keys, tie-broken by edge index, instead of the design's "typed radix sort on the bit pattern (stable, no comparator)" (`graph-format-design.md:3930-3939`). | The radix sort has to handle both the f32 arc array and the f64 shadow override, i.e. two key widths and the sign-bit flip for each; the tie-broken comparator is stable BY CONSTRUCTION in twelve lines. Kruskal is not on the GPU critical path (design 8.8 ranks PageRank 25, HITS/eigenvector/Katz 15 and WCC 8 for P7; MST is not in P7 at all, `webgpu-acceleration-plan.md:2789-2791`). The radix sort is owed by the A2 port PR that adds `minimumSpanningTree` to a benchmark. |
| DEP-8A-E | `AcceleratedAlgorithms` carries SIX methods at M8a (`pageRank`, `sssp`, `breadthFirstSearch`, `connectedComponents`, `weaklyConnectedComponents`, `minimumSpanningTree`), not the full 19 of design 9.2's `AlgorithmAccelerator`. Port 6 `commonNeighborsScore` gets NO dispatcher method. | This is the design's own rule, not a departure from it -- "the list GROWS with the A2 ports (each port PR adds its method), it is not complete in the first commit" (`webgpu-acceleration-plan.md:2955`). It is listed here because a reader comparing the two type blocks will otherwise think something was dropped. `commonNeighborsScore` has no method because `AlgorithmAccelerator` declares none: there is no GPU link-prediction method in design 9.2 at all. |
| DEP-8A-F | The G12 clause "nightly GPU lane green for a week" (`webgpu-acceleration-plan.md:4219`) is VOID and is not invoked anywhere in this plan. | `design/decisions/2026-09-19-no-nightly-gpu-lane.md` removed the `schedule` trigger entirely: `gpu.yml` now runs on every push to master, on `workflow_dispatch` and on a same-repo PR labelled `gpu`, and `release.yml`'s `gate` job waits for that run on the released commit and refuses to publish unless it succeeded. The honest restatement, recorded ONCE for the whole programme by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md` as `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`, and CITED here rather than duplicated: **the GPU lane runs on every master push and the release is gated on it; there is no nightly and no week-long soak.** M8a writes no G12 record of its own -- G12 is M7's gate, M8a's are G6 and G10, and two records saying the same thing under two filenames is the drift this reconciliation exists to stop. M8a's own PR does not carry the `gpu` label (nothing in this phase touches a kernel), so the lane runs once, on the merge commit, as the release gate. |
| DEP-8A-G | `AlgorithmAccelerator.minimumSpanningTree` takes a second parameter, `options?: MstOptions`. Design 9.2 declares it as `minimumSpanningTree?(s: GraphSnapshot): Promise<MstResultLike>` with no options at all (`webgpu-acceleration-plan.md:2943`). | `indexed.kruskalMST(s, o)` takes `MstOptions` -- the per-arc `weights` override through which a facade reaches the f64 shadow column (Task M8a-T7 Step 3) -- and `AcceleratedAlgorithms.minimumSpanningTree` passes its options straight through to it. Without the parameter on the accelerator side the dispatcher would silently DROP the override on the GPU path: the CPU branch would honour an exact-f64 weight set and the accelerator branch would compute over the f32 arc array, and the two would disagree by more than the 9.7 tolerance with nothing in the type system to say why. The parameter is optional, so an accelerator that ignores it still satisfies the interface. |
| DEP-8A-H | Port 4's shape is DESIGNED here, not transcribed. `graph-format-design.md:3924-3928` specifies `connectedComponents` in four sentences with a one-line inline fragment (`for (let e = 0; ...) uf.union(src[e], dst[e]); return uf.toLabels();`) and no signature, no result interface, no grouping accessor and no directed check. This plan fixes: the `LabelResult` interface (`{ labels, count, groups() }`), a `groups()` that computes once and caches, and a `connectedComponents` that THROWS on a directed snapshot while `weaklyConnectedComponents` does not. | `LabelResult` has to exist because `LabelResultLike` (design 9.2, `:2917`) already declares `labels`, `count` and a callable `groups(): U32[]`, and the CPU port must satisfy it with no adapter. `groups()` caches because `accelerated(null).connectedComponents(s)` hands the same object to a caller that may group it more than once, and the GPU's own `LabelResultLike` will be a readback that cannot be recomputed. The directed throw mirrors Port 3's own precedent in the design's transcribed code (`pageRank` throws "PageRank requires a directed graph", `:3894`) and is the only way to keep 14.2's "the same function without the directed check" honest: without it, `connectedComponents` on a directed snapshot would quietly return the WEAK partition under the strong name. |

---

## Phase M8a: A1, the first six indexed ports, and the accelerator seam

**Entry criteria:** graph-format `>= 1.0.0` on master (MET, section 0.2). The A1 half of the integration plan's criterion is NOT met and is absorbed here (DEP-8A-B). Work on branch `feat/algorithms-indexed-seam` in a worktree (`git worktree add .worktrees/algorithms-indexed -b feat/algorithms-indexed-seam master`, owner); every commit through `tools/commit-changes.sh`, scope `algorithms` for Tasks M8a-T2..T11, `docs` for M8a-T12, `webgpu-graph-algorithms` for M8a-T13 (M8a-T1 makes no commit at all). The `webgpu-graph-algorithms` scope reaches the script only through Task M8b-T1 Step 1's fix, which Task M8a-T1 checks for. The phase lands as ONE PR whose last commit is the W1b algorithms half. Task M8a-T13 additionally requires Phase M5b on master (PD-12); if it is not, the owner lands M5b and the agent resumes at T13.

**Step 0 of the phase (a fresh worktree has no `node_modules` and no `dist/`, both gitignored):** `cd AT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build`. Every later command in this phase reads `graph-format/dist/` -- algorithms' `tsc` resolves `@graphty/graph-format` through graph-format's top-level `types`, and vitest through its `exports` (PD-8). `AT` below is `/home/apowers/Projects/graphty-monorepo/.worktrees/algorithms-indexed`.

---

### Task M8a-T1: the commit-scope precondition (a CHECK; the edit belongs to Phase M8b)

**Repository:** `/home/apowers/Projects/graphty-monorepo/.worktrees/algorithms-indexed` (`AT` below).

**This task makes NO edit to a tracked file.** `tools/commit-changes.sh:468-469`'s `VALID_SCOPES` omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, all three of which `commitlint.config.js:4-27` accepts, and Task M8a-T13's `feat(webgpu-graph-algorithms)!:` subject is refused by the script before a single file is staged until that is fixed. Three of the four plan documents of 2026-09-19 found the same defect; the fix is OWNED by **Task M8b-T1 Step 1** of `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`, because M8b is the only phase whose entry criteria are met today and every one of its commits is scoped `webgpu-graph-algorithms`. This task CONSUMES that fix as a precondition and verifies it; Task M7-T1 Step 1 of the M7 plan does the same. Do not apply the edit here: two plans landing the same two-line change is a merge conflict on a shared line for no gain.

**Files:**
- Created and NOT committed: `AT/tmp/check-scopes.sh` (a scratch verification script; `tmp/` is gitignored)
- NOT touched: `tools/commit-changes.sh` (Task M8b-T1 Step 1 owns it), `commitlint.config.js` (its scope-enum is already correct), `.husky/commit-msg`, every other `tools/` script

**Interfaces:**
- Consumes: `commitlint.config.js:4-27`, the scope-enum that is enforced at level 2; `tools/commit-changes.sh`'s `VALID_SCOPES` as Task M8b-T1 Step 1 leaves it.
- Produces: no file change. A recorded PASS that Task M8a-T13's `feat(webgpu-graph-algorithms)!:` commit will not be refused before a single file is staged.

- [ ] **Step 1: See whether the fix is on master**

Run: `cd AT && grep -n "VALID_SCOPES" tools/commit-changes.sh`
Expected, when the precondition is MET: `468:VALID_SCOPES="graph-format graph-io webgpu-graph-algorithms algorithms layout graphty-element` plus `516:        for candidate in $VALID_SCOPES; do` and `524:            echo "  allowed: $(echo "$VALID_SCOPES" | tr -s ' \n' ' ')" >&2`.

If line 468 instead begins `VALID_SCOPES="algorithms layout graphty-element ...` the precondition is NOT met: the thirteen-entry list has none of the three, while `commitlint.config.js:8-10` lists all three first. **STOP and tell the owner to land Task M8b-T1 Step 1 first** (it is a two-line edit in one file, committed as `fix(tools): let commit-changes.sh accept the three format and GPU scopes`, which the OLD list already permits because its scope is `tools`). Do not edit the script here. Tasks M8a-T2 through M8a-T12 are all scoped `algorithms` or `docs`, both of which the old list already contains, so they can proceed while the owner lands it; only Task M8a-T13 is blocked.

- [ ] **Step 2: Prove the two lists agree**

Write `AT/tmp/check-scopes.sh`:

```bash
#!/usr/bin/env bash
# Compare tools/commit-changes.sh's VALID_SCOPES with commitlint.config.js's scope-enum.
# Prints one line per scope that is in one list and not the other; prints nothing when they agree.
set -u
cd "$(dirname "$0")/.."
script_scopes=$(sed -n '/^VALID_SCOPES=/,/"$/p' tools/commit-changes.sh | tr -d '"' | sed 's/^VALID_SCOPES=//' | tr -s ' \n' '\n' | grep -v '^$' | sort -u)
# The sed range opens on the `"scope-enum": [` line and the line below it is the applicability
# level `"always",`, so the quoted-token grep picks up two words that are not scopes. Drop them
# by name; every real scope is in the array literal that follows.
lint_scopes=$(sed -n '/scope-enum/,/\],/p' commitlint.config.js | grep -o '"[a-z0-9-]*"' | tr -d '"' | grep -vx 'scope-enum\|always' | sort -u)
diff <(echo "$script_scopes") <(echo "$lint_scopes") && echo "SCOPES AGREE"
```

Run: `cd AT && bash tmp/check-scopes.sh`
Expected: `SCOPES AGREE` and nothing else. Two things that look like bugs and are not. (1) Without the `grep -vx`, the lint side yields eighteen tokens -- the sixteen scopes plus `scope-enum` and `always` -- and `diff` reports `> always` / `> scope-enum` forever; the filter is why the script can print its expected output at all. (2) `commitlint.config.js` lists `compact-mantine` and `remote-logger` TWICE (`:14-15` and `:17-18`, the second pair tab-indented); `sort -u` absorbs the duplicates, so the comparison is unaffected and this plan does NOT "fix" them -- editing `commitlint.config.js` is out of scope for this phase and the duplicate entries change nothing about which scopes are accepted.

If a real `<` or `>` line appears the precondition is not met after all: one list gained an entry the other did not. Tell the owner; the fix belongs in `tools/commit-changes.sh`, never in commitlint (commitlint is what the `commit-msg` hook actually runs), and it belongs in Task M8b-T1 Step 1's commit, not here.

- [ ] **Step 3: Checkpoint** -- no commit. `tmp/check-scopes.sh` is a scratch file under the gitignored `tmp/` and is NOT committed; this task leaves the working tree byte-identical to how it found it. Record the PASS in the task hand-off so Task M8a-T13 Step 6 can rely on it.

---

### Task M8a-T2: The graph-format dependency, the bundle externals and the lockfile

**Repository:** `AT`.

**Files:**
- Modify: `algorithms/package.json:140-142` (a `dependencies` entry and a new `peerDependencies` block)
- Modify: `algorithms/scripts/build-bundle.js:34` (`external: []` becomes `external: [/^@graphty\/graph-format(\/|$)/]`) and `:43-45` (a second `await build(...)` emitting the self-contained `dist/algorithms.standalone.js`, inserted between the first build and its `console.log`)
- Modify: `algorithms/scripts/build-gh-pages.js:99`, `:103` (the copied artefact becomes the standalone bundle)
- Modify: `algorithms/vite-plugin-algorithms-redirect.js` (the dev server serves the same standalone bundle)
- Modify: `pnpm-lock.yaml` (regenerated by `pnpm install`)
- NOT touched: `algorithms/tsconfig.json` (PD-8: no `paths`, no `references`, no `include` of graph-format sources), `algorithms/project.json` (PD-8: `lint` gains no `dependsOn`), `algorithms/vitest.config.ts` (resolution goes through `node_modules`, as layout's does -- `layout/vitest.config.ts` has no graph-format alias either), `algorithms/tsconfig.build.json`

**Interfaces:**
- Consumes: `@graphty/graph-format` 1.0.0 through pnpm's workspace link, resolved by `"main": "dist/graph-format.js"` / `"types": "dist/graph-format.d.ts"`.
- Produces: `import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format"` compiles inside `algorithms/src/`; `algorithms/dist/algorithms.js` (the published bundle) leaves `@graphty/graph-format` external rather than inlining a second copy of it; `algorithms/dist/algorithms.standalone.js` (new, unpublished) inlines everything, for the browser-loaded examples.

- [ ] **Step 1: Write the failing check**

Create `AT/algorithms/test/unit/indexed/package-wiring.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
    readFileSync(fileURLToPath(new URL("../../../package.json", import.meta.url)), "utf8"),
) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};

describe("graph-format wiring", () => {
    it("declares @graphty/graph-format as a workspace dependency and a caret peer", () => {
        // workspace:^ and not workspace:*: pnpm publishes workspace:* as an EXACT pin, which would
        // lock every consumer of @graphty/algorithms to one graph-format patch (design 17.7 D-PEER-1X).
        expect(packageJson.dependencies?.["@graphty/graph-format"]).toBe("workspace:^");
        expect(packageJson.peerDependencies?.["@graphty/graph-format"]).toBe("^1.0.0");
    });

    it("resolves the format at runtime", async () => {
        const format = await import("@graphty/graph-format");
        expect(format.FORMAT_VERSION).toBe(1);
        expect(typeof format.GraphBuilder).toBe("function");
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/package-wiring.test.ts`
Expected: FAIL, both cases -- the first with `expected undefined to be "workspace:^"`, the second with `Cannot find package '@graphty/graph-format'`.

- [ ] **Step 2: The dependency**

In `algorithms/package.json` replace the final block

```json
    "dependencies": {
        "typedfastbitset": "^0.6.1"
    }
}
```

with

```json
    "dependencies": {
        "@graphty/graph-format": "workspace:^",
        "typedfastbitset": "^0.6.1"
    },
    "peerDependencies": {
        "@graphty/graph-format": "^1.0.0"
    }
}
```

Reason: this is the shape graph-io uses on master (`graph-io/package.json:109-114`) and the shape layout takes on `feat/webgpu-layout-types` -- a `workspace:^` dependency so the monorepo builds against the local copy, plus a caret peer so a published consumer that also installs graph-format directly gets ONE copy rather than two. `workspace:*` would publish as an exact pin (17.7 D-PEER-1X), which is the silent failure: `@graphty/algorithms@1.8.0` would then refuse to install beside `@graphty/graph-format@1.0.1`.

- [ ] **Step 3: Externalise graph-format in the npm bundle, and add a self-contained bundle for the examples**

`dist/algorithms.js` wears TWO hats and they pull in opposite directions. It is the package's npm entry (`algorithms/package.json:6` `"main"`, `:11-12` `exports`), where a bare `@graphty/graph-format` specifier is exactly right -- node and every bundler resolve it, and the caret peer then guarantees ONE copy. It is also the file `scripts/build-gh-pages.js` copies verbatim into every static example directory (`:202`, `:223`, `:244`, `:288`, `:293`), where the example pages load it as `./algorithms.js` from a plain `<script type="module">` (`examples/html-legacy/algorithms/**/*.js` all begin `import { ... } from "./algorithms.js";`). A browser cannot resolve a bare specifier, so ANY externalisation in that copy breaks every gh-pages example with "Failed to resolve module specifier". graph-io's bundle has no such consumer, so its precedent does not transfer and `externalDependencies()` must not be copied wholesale.

So: externalise graph-format in `dist/algorithms.js`, and emit a SECOND, fully self-contained bundle for the examples.

(a) In `algorithms/scripts/build-bundle.js` replace `external: [],` (`:34`, inside the first `await build({ ... })` which spans `:22-43`) with

```js
                    // @graphty/graph-format is a declared dependency AND a caret peer, so the npm
                    // entry must not inline a second copy: an app that installs the format directly
                    // would then ship it twice. isGraphSnapshot() is a Symbol.for brand check
                    // (graph-format/src/constants.ts:37), so two copies would still interoperate and
                    // no test would fail -- the bundle would just double in size, silently. Exactly
                    // the reasoning the layout seam used (2026-09-16-graphty-monorepo-integration.md:2245).
                    // NOTHING ELSE is externalised: typedfastbitset stays inlined, as today.
                    external: [/^@graphty\/graph-format(\/|$)/],
```

(b) In the same file, immediately after the first `await build({ ... });` (it ends at `:43`) and before the `console.log("Successfully built dist/algorithms.js");` at `:45`, add the standalone build:

```js
        // The examples (the vite dev server's redirect plugin and the gh-pages copies) load the
        // bundle as a plain relative module from a browser, which cannot resolve a bare specifier.
        // They get their own build with nothing external. It is NOT an entry point -- package.json's
        // "main" and "exports" both stay on dist/algorithms.js -- and it needs no .d.ts, because
        // nothing types against it; it rides along in the published tarball only because "files"
        // names the whole dist/ directory.
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphAlgorithms",
                    formats: ["es"],
                    fileName: () => "algorithms.standalone.js",
                },
                outDir: path.resolve(__dirname, "../dist"),
                emptyOutDir: false,
                rollupOptions: {
                    external: [],
                    output: {
                        preserveModules: false,
                        inlineDynamicImports: true,
                    },
                },
                minify: false,
                sourcemap: true,
            },
        });

        console.log("Successfully built dist/algorithms.standalone.js");
```

(c) In `algorithms/scripts/build-gh-pages.js` change the two lines of the existence check at `:99` and `:103` from

```js
        const algorithmsJsPath = path.join(distDir, "algorithms.js");
```
```js
            console.error('dist/algorithms.js not found. Please run "npm run build:bundle" first.');
```

to

```js
        // The self-contained bundle, not dist/algorithms.js: the example pages load it as a plain
        // relative module and a browser cannot resolve the bare "@graphty/graph-format" specifier
        // the published bundle carries. The DESTINATION file is still named algorithms.js, which is
        // what every example imports, so nothing under examples/html-legacy/ changes.
        const algorithmsJsPath = path.join(distDir, "algorithms.standalone.js");
```
```js
            console.error('dist/algorithms.standalone.js not found. Please run "npm run build:bundle" first.');
```

Every `copyFile(algorithmsJsPath, path.join(<dir>, "algorithms.js"))` below it is UNCHANGED -- there are five of them (`:202`, `:223`, `:244`, `:288`, `:293`) and they all read the same variable.

(d) In `algorithms/vite-plugin-algorithms-redirect.js` change the one path in `load()` from

```js
                const distAlgorithmsPath = path.resolve(process.cwd(), "dist/algorithms.js");
```

to

```js
                const distAlgorithmsPath = path.resolve(process.cwd(), "dist/algorithms.standalone.js");
```

and the error string on the next lines from `'dist/algorithms.js not found. Run "npm run build:bundle" first.'` to `'dist/algorithms.standalone.js not found. Run "npm run build:bundle" first.'`. Reason: the dev server serves that file's CONTENT as a virtual module for `./algorithms.js`, so the dev path and the gh-pages path should load the same artefact. Vite's dev server would in fact resolve the bare specifier for the virtual module, but then `npm run examples:html` and the deployed page would be running different bytes, and the difference would only show up in production.

- [ ] **Step 4: Install and verify**

Run:

```bash
cd AT
HUSKY=0 pnpm install                                                  # writes the lockfile entry; no --frozen-lockfile, the manifest changed
ls -l algorithms/node_modules/@graphty/graph-format                   # a symlink into ../../graph-format
pnpm exec nx run algorithms:build                                     # dependsOn ^build builds graph-format first
node -e "console.log(Object.keys(require('./algorithms/package.json').peerDependencies))"   # [ '@graphty/graph-format' ]
cd algorithms && npm run build:bundle                                 # writes BOTH bundles
ls -l dist/algorithms.js dist/algorithms.standalone.js                # both exist
grep -c "TypedFastBitSet" dist/algorithms.js                          # >= 1: typedfastbitset is still INLINED, exactly as before this task
npm run build:gh-pages
grep -rl 'from "@graphty/' gh-pages/ || echo "no bare specifier in the published examples -- correct"
```

Expected: as commented, and the last line prints `no bare specifier in the published examples -- correct`. If it instead LISTS files, `build-gh-pages.js` is still copying `dist/algorithms.js` -- re-check edit (c) of Step 3; every example page would die in the browser with "Failed to resolve module specifier".

Nothing here greps `dist/algorithms.js` for `@graphty/graph-format` or for the format's symbols, and that is deliberate: at this task NOTHING under `algorithms/src/` imports the format yet (`src/indexed/to-snapshot.ts` is created by Task M8a-T3), so the bundle contains neither an import specifier nor an inlined copy and any such count would be 0 for a reason that has nothing to do with the externals change. The externalisation is asserted in Task M8a-T7 Step 7, once the ports exist.

- [ ] **Step 5: Green check**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/package-wiring.test.ts && npm run lint`
Expected: 2 passed; `eslint` clean and `tsc --noEmit` clean. `tsc` now resolves `@graphty/graph-format` through `graph-format/dist/graph-format.d.ts`; if it reports `TS2307: Cannot find module '@graphty/graph-format'`, graph-format has not been built in this worktree -- run the phase's Step 0.

- [ ] **Step 6: Commit (owner)** -- `build(algorithms): take @graphty/graph-format as a workspace dependency and a caret peer` through `tools/commit-changes.sh` (the lockfile, the bundle-externals change, the new standalone bundle and the two consumers repointed at it all ride in the same commit). The body says: algorithms enters the format's consumer closure, so `nx affected` now builds graph-format on every algorithms-touching PR and `hosts.yml` will run because `pnpm-lock.yaml` changed; resolution is through `node_modules` to `graph-format/dist`, as layout's is, because algorithms' `tsc` EMITS and a sources `paths` entry would move its inferred rootDir (PD-8); and `dist/algorithms.js` now carries a bare `@graphty/graph-format` specifier, which is right for the npm entry and wrong for a browser, so the examples and the gh-pages build move to a second, self-contained `dist/algorithms.standalone.js`.

---

### Task M8a-T3: Graph.mutationCount and toSnapshot(Graph)

**Repository:** `AT`.

**Files:**
- Modify: `algorithms/src/core/graph.ts` (a private counter at `:14`, its initialiser at `:30`, five bump sites at `:38-47`, `:91`, `:144`, `:174`, `:373`, and a public getter beside `nodeCount` at `:222`)
- Create: `algorithms/src/indexed/to-snapshot.ts`
- Test: `algorithms/test/unit/indexed/to-snapshot.test.ts`
- NOT touched: `algorithms/src/index.ts` (the barrel is Task M8a-T10's edit), `algorithms/src/types/index.ts`, every algorithm under `algorithms/src/algorithms/`

**Interfaces:**
- Consumes: `GraphBuilder` and `GraphSnapshot` from `@graphty/graph-format` (`graph-format/src/index.ts:14`, `:17`); `GraphBuilderOptions` (`graph-format/src/types/builder.ts:28-48`, where `directed` is REQUIRED and `weightDtype` defaults to `"f32"`); `builder.addNode(id: NodeId): number` (`:172`), `builder.addEdge(source, target, weight?): number` (`:188`), `builder.freeze(options?): GraphSnapshot` (`:464`). graph-format's `NodeId` is `string | number` (`graph-format/src/types/columns.ts:26`), identical to algorithms' (`algorithms/src/types/index.ts:6`), so no coercion happens anywhere.
- Produces: `Graph.mutationCount: number` (public readonly getter) and `toSnapshot(graph: Graph, options?: ToSnapshotOptions): GraphSnapshot` with `ToSnapshotOptions { readonly checksum?: boolean | undefined }`, both consumed by Task M8a-T4's harness and by every future facade. The options parameter is additive and optional, so `toSnapshot(graph)` is the signature graph-format design 14.6 row A1 names.

- [ ] **Step 1: Write the failing test**

Create `AT/algorithms/test/unit/indexed/to-snapshot.test.ts`:

```ts
import { equalsTopology, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { toSnapshot } from "../../../src/indexed/to-snapshot.js";

function triangle(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b", 1);
    g.addEdge("b", "c", 2.5);
    g.addEdge("c", "a", 0.1);
    return g;
}

describe("Graph.mutationCount", () => {
    it("starts at zero and bumps on every topology change", () => {
        const g = new Graph();
        expect(g.mutationCount).toBe(0);
        g.addNode("a");
        const afterAdd = g.mutationCount;
        expect(afterAdd).toBeGreaterThan(0);
        g.addNode("a"); // an existing id is not a change
        expect(g.mutationCount).toBe(afterAdd);
        g.addEdge("a", "b");
        expect(g.mutationCount).toBeGreaterThan(afterAdd);
        const afterEdge = g.mutationCount;
        g.removeEdge("a", "b");
        expect(g.mutationCount).toBeGreaterThan(afterEdge);
        const afterRemove = g.mutationCount;
        g.removeEdge("a", "b"); // already gone
        expect(g.mutationCount).toBe(afterRemove);
    });

    it("is not bumped by a read", () => {
        const g = triangle(false);
        const before = g.mutationCount;
        expect(g.degree("a")).toBe(2);
        expect([...g.edges()]).toHaveLength(3);
        expect(g.mutationCount).toBe(before);
    });
});

describe("toSnapshot", () => {
    it("carries the direction, the counts and the ids", () => {
        const s = toSnapshot(triangle(true));
        expect(s.directed).toBe(true);
        expect(s.nodeCount).toBe(3);
        expect(s.edgeCount).toBe(3);
        expect(s.arcCount).toBe(3);
        expect(s.ids.indexOf("a")).not.toBe(INVALID_INDEX);
        expect(s.ids.idOf(s.ids.requireIndex("b"))).toBe("b");
    });

    it("doubles the arcs of an undirected graph (invariant I7)", () => {
        const s = toSnapshot(triangle(false));
        expect(s.directed).toBe(false);
        expect(s.edgeCount).toBe(3);
        expect(s.arcCount).toBe(6);
    });

    it("memoises on mutationCount and invalidates on a mutation", () => {
        const g = triangle(true);
        const first = toSnapshot(g);
        expect(toSnapshot(g)).toBe(first);
        g.addEdge("a", "c", 7);
        const second = toSnapshot(g);
        expect(second).not.toBe(first);
        expect(second.edgeCount).toBe(4);
    });

    it("keeps f64 weights exactly through the shadow column", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 0.1 + 0.2); // 0.30000000000000004, not f32-exact
        const s = toSnapshot(g);
        const shadow = s.edges.byRole("weight");
        expect(shadow).not.toBeNull();
        expect(shadow?.dtype).toBe("f64");
        expect((shadow?.data as Float64Array)[0]).toBe(0.1 + 0.2);
    });

    it("is deterministic: the same graph freezes to the same topology twice", () => {
        const g = triangle(false);
        expect(equalsTopology(toSnapshot(g), toSnapshot(g.clone()))).toBe(true);
    });

    it("records checksums on request, and never serves a plain snapshot to a checksum request", () => {
        const g = triangle(true);
        const plain = toSnapshot(g);
        // A plain snapshot has no checksums to compare, and graph-format says so rather than
        // passing vacuously (E_INVALID_SNAPSHOT, details.reason "no-checksum").
        expect(() => {
            plain.validate({ checksum: true });
        }).toThrow();
        const checked = toSnapshot(g, { checksum: true });
        expect(checked).not.toBe(plain); // the plain cache entry cannot answer this request
        expect(() => {
            checked.validate({ checksum: true });
        }).not.toThrow();
        // The reverse direction IS a hit: a checksummed snapshot answers a plain request.
        expect(toSnapshot(g)).toBe(checked);
        expect(toSnapshot(g, { checksum: true })).toBe(checked);
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/to-snapshot.test.ts`
Expected: FAIL to even collect -- `Failed to resolve import "../../../src/indexed/to-snapshot.js"`.

- [ ] **Step 2: The mutation counter**

In `algorithms/src/core/graph.ts` make five edits and add one getter. The counter is private and monotone; nothing ever resets it, including `clear()`, because a reset could collide with a cached value.

At `:14`, after `private edgeCount: number;`, add `private mutations: number;`.
At `:30`, after `this.edgeCount = 0;`, add `this.mutations = 0;`.
In `addNode` (`:38-47`), inside the `if (!this.nodeMap.has(id)) { ... }` body, after the `incomingEdges` branch, add `this.mutations++;`.
In `removeNode`, immediately before the `return true;` at `:91`, add `this.mutations++;`.
In `addEdge`, replace the `this.edgeCount++;` at `:144` with `this.edgeCount++;` then `this.mutations++;` on the next line.
In `removeEdge`, replace the `this.edgeCount--;` at `:174` with `this.edgeCount--;` then `this.mutations++;` on the next line.
In `clear()`, after the `this.edgeCount = 0;` at `:373`, add `this.mutations++;`.

Beside the `nodeCount` getter at `:222`, add:

```ts
    /**
     * A counter that increases on every topology change (`addNode` of a new id, `removeNode`,
     * `addEdge`, `removeEdge`, `clear`) and never on a read. Callers memoise derived structures on
     * `(graph, mutationCount)`; graph-format design 14.1 rule 4 names this counter, and `toSnapshot`
     * is its first consumer. It is monotone and is NOT reset by `clear()`: a reset could hand a
     * stale cache entry a matching key.
     * @returns The number of topology changes made to this graph
     */
    get mutationCount(): number {
        return this.mutations;
    }
```

Reason for "never on a read": the whole point of the counter is that `toSnapshot` can return a cached object without touching the graph. A counter that moved on a read would make the memoisation useless and, worse, would make it useless only under load.

Note that `addEdge` calls `this.addNode(source)` and `this.addNode(target)` first (`graph.ts:103-104`), so adding an edge with two new endpoints bumps three times. That is fine and deliberate: only monotonicity matters, not the magnitude.

- [ ] **Step 3: toSnapshot**

Create `AT/algorithms/src/indexed/to-snapshot.ts`:

```ts
/**
 * Conversion from the legacy `Graph` class to a frozen graph-format snapshot
 * (graph-format design 14.1 rule 4, 14.6 row A1). This is the ONLY bridge between the legacy
 * Map-of-Maps surface and `indexed.*`; nothing under `src/indexed/` other than this file imports
 * `../core/graph.js`.
 * @module
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import type { Graph } from "../core/graph.js";

/** Options of {@link toSnapshot}. @public */
export interface ToSnapshotOptions {
    /**
     * Record FNV-1a checksums at freeze so a caller can assert `snapshot.validate({ checksum: true })`
     * (graph-format design 14.2's first port rule: views are shared, so a port that writes into one
     * has to fail a test rather than corrupt the next call). Default false; the test suites set it.
     */
    readonly checksum?: boolean | undefined;
}

interface CacheEntry {
    readonly mutationCount: number;
    readonly checksum: boolean;
    readonly snapshot: GraphSnapshot;
}

/**
 * One entry per graph, REPLACED rather than appended to on a mutation. The entry holds the
 * mutationCount it was built at, which is what makes a stale hit impossible -- the bug the old
 * `WeakMap<Graph, CSRGraph>` cache had (graph-format design 14.1 rule 4).
 */
const SNAPSHOT_CACHE = new WeakMap<Graph, CacheEntry>();

/**
 * Freeze a legacy `Graph` into a `GraphSnapshot`, memoised on the graph's `mutationCount`.
 *
 * The builder is created with `weightDtype: "f64"` so a legacy graph's double weights survive
 * exactly: at freeze, graph-format keeps the original values in an f64 edge column with role
 * `weight` (the "shadow") whenever at least one of them is not f32-exact, and costs nothing when
 * they all are (graph-format design section 3.7, `graph-format/src/builder/freeze.ts:332-360`).
 * A weighted `indexed.*` port reproduces legacy f64 results by passing
 * `expandEdges(s, shadow.data)` as its per-arc `weights` override.
 *
 * Every legacy edge carries a weight (`Graph.addEdge` defaults it to 1), so the builder's
 * `weighted: "auto"` always allocates the arc weight array -- 4 bytes per arc. That is truthful
 * rather than wasteful: the legacy graph really does store the value.
 * @param graph - The legacy graph to convert
 * @param options - Conversion options
 * @returns A frozen snapshot of the graph's current topology and weights
 * @public
 */
export function toSnapshot(graph: Graph, options: ToSnapshotOptions = {}): GraphSnapshot {
    const checksum = options.checksum === true;
    const cached = SNAPSHOT_CACHE.get(graph);
    // A checksummed snapshot answers a plain request; a plain one cannot answer a checksummed
    // request -- validate({ checksum: true }) throws E_INVALID_SNAPSHOT ("no-checksum") when none
    // were recorded (graph-format/src/types/snapshot.ts:401-405).
    if (cached !== undefined && cached.mutationCount === graph.mutationCount && (cached.checksum || !checksum)) {
        return cached.snapshot;
    }
    const builder = new GraphBuilder({
        directed: graph.isDirected,
        weightDtype: "f64",
        expectedNodes: graph.nodeCount,
        expectedEdges: graph.totalEdgeCount,
    });
    for (const node of graph.nodes()) {
        builder.addNode(node.id);
    }
    for (const edge of graph.edges()) {
        builder.addEdge(edge.source, edge.target, edge.weight);
    }
    const snapshot = builder.freeze({ label: "algorithms.toSnapshot", checksum });
    SNAPSHOT_CACHE.set(graph, { mutationCount: graph.mutationCount, checksum, snapshot });
    return snapshot;
}
```

Four details that are easy to get wrong and are load-bearing:

- The `checksum` option exists because graph-format design 14.2's first port rule demands it: "Views are shared (I17): any port that decrements degrees, peels, or sorts a degree array works on `view.outDegree().slice()`; the differential suite freezes with `checksum: true` and asserts `validate({ checksum: true })` after every `indexed.*` call, so a write into a view fails a test rather than corrupting the next call" (`graph-format-design.md:3776-3781`). None of M8a's six ports writes into a view -- `indexed.pageRank` reads `s.outDegree()` / `s.weightedOutDegree()` directly, and that is exactly the shape the guard polices -- so the guard's whole value is that it catches the FIRST port that gets it wrong, before anyone knows they got it wrong. It is off by default (a production `toSnapshot` should not pay for FNV-1a over the core arrays) and the test suites of Tasks M8a-T4, M8a-T6 and M8a-T7 turn it on.

- Nodes are added BEFORE edges, in `nodeMap` insertion order, so the snapshot's node indices follow the legacy graph's own iteration order (graph-format invariant I14, first-appearance order). An isolated node would otherwise be missing entirely: `addEdge` creates unknown endpoints, but a node with no edges is never mentioned by `graph.edges()`.
- `graph.edges()` yields each undirected edge ONCE (`graph.ts:254-264` skips the mirror when `source > edge.target`), so `s.edgeCount === graph.totalEdgeCount` on both directions and graph-format does the doubling itself (invariant I7).
- `freeze()` is used, not `freezeWithReport()`, and `release` is left at its default `false`. `release: true` empties staging (`graph-format/src/types/builder.ts:72-88`) and the builder here is single-use anyway, but passing it would make a future change to reuse the builder fail in a way that looks like data loss.

- [ ] **Step 4: Run the test green**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/to-snapshot.test.ts`
Expected: 8 passed. If the f64 shadow case fails with `expected null not to be null`, the builder was constructed without `weightDtype: "f64"` -- the shadow column is only written when the staging precision is f64 AND a value is not f32-exact (`graph-format/src/builder/freeze.ts:339-352`).

- [ ] **Step 5: Prove nothing else moved**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default && npm run lint`
Expected: the whole default project green with the same counts as before this task plus the new files, and `eslint` + `tsc --noEmit` clean. `Graph` gained one public getter and no signature changed, so no existing test can move. If any does, the counter was bumped from a read path.

- [ ] **Step 6: Checkpoint** -- no commit by this task; Task M8a-T4's harness is written on top of this tree. Leave `algorithms/src/core/graph.ts` modified and the two new files untracked.

---

### Task M8a-T4: The differential harness

**Repository:** `AT`.

**Files:**
- Create: `algorithms/test/helpers/snapshot-differential.ts` (the reusable assertion)
- Test: `algorithms/test/unit/indexed/to-snapshot-differential.test.ts` (the fixture corpus)
- NOT touched: `algorithms/src/**` (this task adds no production code), `algorithms/test/helpers/` existing files

**Interfaces:**
- Consumes: `toSnapshot` (Task M8a-T3); `equalsTopology` (`graph-format/src/index.ts:26`, implemented at `graph-format/src/snapshot/graph-snapshot.ts:1385`); `snapshot.ids.idOf/indexOf/requireIndex` (`graph-format/src/ids/node-id-map.ts:464`, `:479`, `:526`); `snapshot.edgeList()` and `snapshot.outArcs(u)` (`graph-format/src/types/snapshot.ts:502`, `:578`).
- Produces: `assertSnapshotMatchesGraph(graph: Graph): GraphSnapshot`, the executable form of graph-format design 14.6's A1 gate string ("every existing test's graph converts with `equalsTopology` / neighbour-set parity", `graph-format-design.md:4250`), and `checksummedSnapshot(graph: Graph): GraphSnapshot`, the fixture builder every `test/unit/indexed/*.test.ts` uses so the I17 view-write guard of `graph-format-design.md:3776-3781` is on for the port tests too.

- [ ] **Step 1: The harness**

Create `AT/algorithms/test/helpers/snapshot-differential.ts`:

```ts
/**
 * The A1 differential harness (graph-format design 14.6 row A1): a legacy `Graph` and the snapshot
 * `toSnapshot` builds from it are compared on every property a snapshot can answer DIRECTLY --
 * the node set, the neighbour sets, the out-degrees, the edge multiset with weights, the self-loop
 * count, and topological determinism. It deliberately does NOT compare algorithm results: no legacy
 * algorithm consumes a snapshot until A2 widens its first parameter.
 */

import { equalsTopology, type GraphSnapshot } from "@graphty/graph-format";
import { expect } from "vitest";

import type { Graph } from "../../src/core/graph.js";
import { toSnapshot } from "../../src/indexed/to-snapshot.js";

function edgeKey(u: string, v: string, weight: number, directed: boolean): string {
    const [a, b] = directed || u <= v ? [u, v] : [v, u];
    // Six significant digits: enough to separate distinct fixture weights, loose enough that an f32
    // arc array and an f64 shadow agree. A weighted port's own tests assert exact equality.
    return `${a}|${b}|${weight.toPrecision(6)}`;
}

/**
 * Assert that `toSnapshot(graph)` reproduces every property of `graph` a snapshot can answer.
 * @param graph - The legacy graph under test
 * @returns The snapshot that was compared, so a caller can make further assertions on it
 */
export function assertSnapshotMatchesGraph(graph: Graph): GraphSnapshot {
    // checksum: true is the design's rule for the differential suite (graph-format-design.md:3776-3781):
    // FNV-1a over the core arrays at freeze, compared again at the end of this function, so a port
    // that wrote into a shared view fails a test instead of corrupting the next call.
    const s = toSnapshot(graph, { checksum: true });

    // ---- 1. shape
    expect(s.directed).toBe(graph.isDirected);
    expect(s.nodeCount).toBe(graph.nodeCount);
    expect(s.edgeCount).toBe(graph.totalEdgeCount);

    // ---- 2. the node set, as a bijection over [0, nodeCount)
    const seen = new Set<string>();
    for (let i = 0; i < s.nodeCount; i++) {
        const id = s.ids.idOf(i);
        expect(graph.hasNode(id)).toBe(true);
        seen.add(String(id));
    }
    expect(seen.size).toBe(graph.nodeCount);

    // ---- 3. the edge multiset, with weights, in id space
    const el = s.edgeList();
    const fromSnapshot: string[] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        const weight = el.weights === null ? 1 : el.weights[e];
        fromSnapshot.push(edgeKey(String(s.ids.idOf(el.src[e])), String(s.ids.idOf(el.dst[e])), weight, s.directed));
    }
    const fromGraph: string[] = [];
    for (const edge of graph.edges()) {
        fromGraph.push(edgeKey(String(edge.source), String(edge.target), edge.weight ?? 1, graph.isDirected));
    }
    expect(fromSnapshot.sort()).toEqual(fromGraph.sort());

    // ---- 4. neighbour sets and out-degrees, per node
    const outDegree = s.outDegree();
    for (let u = 0; u < s.nodeCount; u++) {
        const id = s.ids.idOf(u);
        const [start, end] = s.outArcs(u);
        const fromArcs: string[] = [];
        for (let a = start; a < end; a++) {
            fromArcs.push(String(s.ids.idOf(s.colIdx[a])));
        }
        const fromGraphNeighbours = [...graph.outNeighbors(id)].map((v) => String(v));
        expect(fromArcs.sort()).toEqual(fromGraphNeighbours.sort());
        // outDegree() counts ARCS, and the legacy graph forbids parallel edges by default
        // (`allowParallelEdges: false`, graph.ts:24), so arcs and distinct neighbours coincide.
        expect(outDegree[u]).toBe(fromArcs.length);
    }

    // ---- 5. self-loops. graph-format's degree() follows the NetworkX convention (a self-loop counts
    // twice on an undirected graph, `graph-format/src/types/snapshot.ts:591-593`) while the legacy
    // `Graph.degree` counts a self-loop once (it is one entry in the adjacency Map, graph.ts:310-311).
    // The two are NOT expected to agree; the self-loop COUNT is what both can state.
    let legacySelfLoops = 0;
    for (const edge of graph.edges()) {
        if (edge.source === edge.target) {
            legacySelfLoops++;
        }
    }
    expect(s.selfLoopCount).toBe(legacySelfLoops);

    // ---- 6. arc accounting (invariants I6 and I7)
    expect(s.arcCount).toBe(s.directed ? s.edgeCount : 2 * s.edgeCount - s.selfLoopCount);

    // ---- 7. determinism and memoisation
    expect(toSnapshot(graph)).toBe(s);
    expect(equalsTopology(s, toSnapshot(graph.clone()))).toBe(true);

    // ---- 8. nothing above wrote into the snapshot or into one of its cached views (I17)
    s.validate({ checksum: true });

    return s;
}

/**
 * The same checksummed fixture a port test needs: freeze once, run the port, assert nothing moved.
 * Every `test/unit/indexed/*.test.ts` fixture goes through this rather than through bare
 * `toSnapshot`, so the I17 guard is on by default for the ports too.
 * @param graph - The legacy graph to convert
 * @returns A checksummed snapshot
 */
export function checksummedSnapshot(graph: Graph): GraphSnapshot {
    return toSnapshot(graph, { checksum: true });
}
```

- [ ] **Step 2: The fixture corpus**

Create `AT/algorithms/test/unit/indexed/to-snapshot-differential.test.ts`:

```ts
import { describe, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import { assertSnapshotMatchesGraph } from "../../helpers/snapshot-differential.js";

function build(directed: boolean, edges: [string | number, string | number, number][], isolated: (string | number)[] = []): Graph {
    const g = new Graph({ directed });
    for (const id of isolated) {
        g.addNode(id);
    }
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w);
    }
    return g;
}

const KARATE_EDGES: [number, number, number][] = [
    [1, 2, 1], [1, 3, 1], [1, 4, 1], [2, 3, 1], [2, 4, 1], [3, 4, 1], [1, 5, 1], [1, 6, 1],
    [1, 7, 1], [5, 7, 1], [6, 7, 1], [1, 8, 1], [2, 8, 1], [3, 8, 1], [4, 8, 1], [1, 9, 1],
    [3, 9, 1], [3, 10, 1], [1, 11, 1], [5, 11, 1], [6, 11, 1], [1, 12, 1], [1, 13, 1], [4, 13, 1],
];

describe("A1 differential harness (graph-format design 14.6 row A1)", () => {
    it("empty graph", () => {
        assertSnapshotMatchesGraph(new Graph({ directed: false }));
    });

    it("isolated nodes only", () => {
        assertSnapshotMatchesGraph(build(false, [], ["a", "b", "c"]));
    });

    it("undirected triangle, unit weights", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "b", 1], ["b", "c", 1], ["c", "a", 1]]));
    });

    it("directed triangle, distinct weights", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "b", 1.5], ["b", "c", 2.25], ["c", "a", 3.75]]));
    });

    it("directed graph with a self-loop", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "a", 2], ["a", "b", 1]]));
    });

    it("undirected graph with a self-loop", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "a", 2], ["a", "b", 1], ["b", "c", 1]]));
    });

    it("numeric ids mixed with an isolated node", () => {
        assertSnapshotMatchesGraph(build(true, [[1, 2, 1], [2, 3, 1]], [99]));
    });

    it("f64 weights that are not f32-exact", () => {
        assertSnapshotMatchesGraph(build(true, [["a", "b", 0.1 + 0.2], ["b", "c", 1 / 3]]));
    });

    it("disconnected components and dust", () => {
        assertSnapshotMatchesGraph(build(false, [["a", "b", 1], ["c", "d", 1], ["d", "e", 1]], ["z"]));
    });

    it("karate-shaped undirected fixture", () => {
        assertSnapshotMatchesGraph(build(false, KARATE_EDGES));
    });

    it("a path after a removal (the graph's own index space is unchanged; the snapshot's is fresh)", () => {
        const g = build(false, [["a", "b", 1], ["b", "c", 1], ["c", "d", 1]]);
        g.removeEdge("b", "c");
        assertSnapshotMatchesGraph(g);
        g.removeNode("a");
        assertSnapshotMatchesGraph(g);
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/to-snapshot-differential.test.ts`
Expected: 11 passed. If the "undirected graph with a self-loop" case fails on the arc accounting line, `s.selfLoopCount` and the legacy count disagree -- check that `graph.edges()` yields the self-loop exactly once (it does: the skip condition at `graph.ts:258` is `source > edge.target`, which is false when they are equal).

- [ ] **Step 3: Green check and coverage**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default && npm run lint && pnpm exec vitest run --project=default --coverage`
Expected: the whole default project green; lint clean; coverage at or above 80 / 80 / 75 / 80. `src/indexed/to-snapshot.ts` is 100% covered by the two test files. Thresholds are SKIPPED when `--project=` is passed (`algorithms/vitest.config.ts:68-76`), so read the printed table rather than trusting the exit code.

- [ ] **Step 4: Commit (owner)** -- `feat(algorithms): convert a legacy Graph to a graph-format snapshot with a mutation counter` through `tools/commit-changes.sh` (Tasks M8a-T3 and M8a-T4 ride in one commit; the counter is useless without its consumer and the conversion is unreviewable without the harness). No `!`: `Graph` gained one getter, `toSnapshot` is new, and no existing signature or result shape moved -- graph-format design 14.1 rule 1. The body says what the harness compares and what it deliberately does not (algorithm results, which wait for A2's widening).

---

### Task M8a-T5: indexed/structures -- IntUnionFind, IndexedMinHeap, arcSourceIn

**Repository:** `AT`.

**Files:**
- Create: `algorithms/src/indexed/structures/union-find.ts`, `algorithms/src/indexed/structures/min-heap.ts`, `algorithms/src/indexed/structures/arc-source.ts`, `algorithms/src/indexed/structures/index.ts`
- Test: `algorithms/test/unit/indexed/structures.test.ts`
- NOT touched: `algorithms/src/data-structures/union-find.ts` and `priority-queue.ts` (the legacy NodeId-keyed pair stays exactly as it is until 2.0 -- graph-format design 14.6's D1 row tags it `@deprecated` only after the last internal caller moves)

**Interfaces:**
- Consumes: `INVALID_INDEX` and `renumberPartition` from `@graphty/graph-format` (`graph-format/src/index.ts:10`, `:25`); `renumberPartition(labels: U32, out?: U32): { labels: U32; count: number }` (`graph-format/src/snapshot/derived.ts:1155`).
- Produces: `IntUnionFind`, `IndexedMinHeap`, `arcSourceIn(rowPtr, arc)`, all re-exported by `structures/index.ts` and, through it, by the `indexed` namespace. These are the scratch structures graph-format design 14.2 assigns to `algorithms/src/indexed/structures/` (`graph-format-design.md:3771-3773`) and that 14.6's helper-ownership sentence gives to algorithms (`:4270`).

- [ ] **Step 1: The three files**

`algorithms/src/indexed/structures/union-find.ts`:

```ts
import { renumberPartition, type U32 } from "@graphty/graph-format";

/**
 * Index-keyed union-find over `[0, size)` with union by rank and path halving. The legacy
 * `UnionFind` (`src/data-structures/union-find.ts`) is NodeId-keyed and stays where it is.
 * @public
 */
export class IntUnionFind {
    private readonly parent: U32;
    private readonly rank: U32;

    /**
     * @param size - The number of elements, each initially its own singleton set
     */
    constructor(size: number) {
        this.parent = new Uint32Array(size);
        this.rank = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            this.parent[i] = i;
        }
    }

    /**
     * @param x - An element index
     * @returns The representative of x's set
     */
    find(x: number): number {
        let node = x;
        while (this.parent[node] !== node) {
            this.parent[node] = this.parent[this.parent[node]]; // path halving
            node = this.parent[node];
        }
        return node;
    }

    /**
     * @param a - An element index
     * @param b - An element index
     * @returns True when the two sets were distinct and have now been merged
     */
    union(a: number, b: number): boolean {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra === rb) {
            return false;
        }
        if (this.rank[ra] < this.rank[rb]) {
            this.parent[ra] = rb;
        } else if (this.rank[ra] > this.rank[rb]) {
            this.parent[rb] = ra;
        } else {
            this.parent[rb] = ra;
            this.rank[ra]++;
        }
        return true;
    }

    /**
     * Dense labels in FIRST-SEEN order, which is what makes `groups()` identical to the legacy
     * iteration order and identical to the GPU's after its own `renumberPartition` readback
     * (design 9.7's connectedComponents row).
     * @returns The labels and the number of distinct sets
     */
    toLabels(): { readonly labels: U32; readonly count: number } {
        const roots = new Uint32Array(this.parent.length);
        for (let i = 0; i < roots.length; i++) {
            roots[i] = this.find(i);
        }
        return renumberPartition(roots);
    }
}
```

`algorithms/src/indexed/structures/min-heap.ts`:

```ts
import { INVALID_INDEX, type F64, type U32 } from "@graphty/graph-format";

/**
 * A binary min-heap over node indices with O(log n) decrease-key, keyed by `Float64Array` values
 * (graph-format design 14.2, `graph-format-design.md:3771`). `pushOrDecrease` is the only operation
 * Dijkstra's inner loop needs: it inserts an absent node and decreases a present one, so the heap
 * never holds a stale duplicate and `pop()` needs no "is this entry current" check.
 * @public
 */
export class IndexedMinHeap {
    private readonly heap: U32; // slot -> node
    private readonly slot: U32; // node -> slot, INVALID_INDEX when absent
    private readonly key: F64; // node -> key
    private size = 0;

    /**
     * @param capacity - The number of distinct node indices the heap may hold
     */
    constructor(capacity: number) {
        this.heap = new Uint32Array(capacity);
        this.slot = new Uint32Array(capacity).fill(INVALID_INDEX);
        this.key = new Float64Array(capacity);
    }

    /**
     * @returns True when the heap holds no entries
     */
    isEmpty(): boolean {
        return this.size === 0;
    }

    /**
     * Insert a node that is not in the heap.
     * @param node - The node index
     * @param key - Its key
     */
    push(node: number, key: number): void {
        this.key[node] = key;
        this.heap[this.size] = node;
        this.slot[node] = this.size;
        this.size++;
        this.siftUp(this.size - 1);
    }

    /**
     * Insert the node, or lower its key if it is already present and the new key is smaller.
     * @param node - The node index
     * @param key - Its candidate key
     */
    pushOrDecrease(node: number, key: number): void {
        const at = this.slot[node];
        if (at === INVALID_INDEX) {
            this.push(node, key);
            return;
        }
        if (key < this.key[node]) {
            this.key[node] = key;
            this.siftUp(at);
        }
    }

    /**
     * Remove and return the node with the smallest key. Undefined behaviour on an empty heap;
     * callers guard with `isEmpty()`.
     * @returns The node index
     */
    pop(): number {
        const top = this.heap[0];
        this.slot[top] = INVALID_INDEX;
        this.size--;
        if (this.size > 0) {
            const moved = this.heap[this.size];
            this.heap[0] = moved;
            this.slot[moved] = 0;
            this.siftDown(0);
        }
        return top;
    }

    private siftUp(from: number): void {
        let at = from;
        const node = this.heap[at];
        const key = this.key[node];
        while (at > 0) {
            const parent = (at - 1) >> 1;
            const parentNode = this.heap[parent];
            if (this.key[parentNode] <= key) {
                break;
            }
            this.heap[at] = parentNode;
            this.slot[parentNode] = at;
            at = parent;
        }
        this.heap[at] = node;
        this.slot[node] = at;
    }

    private siftDown(from: number): void {
        let at = from;
        const node = this.heap[at];
        const key = this.key[node];
        for (;;) {
            const left = 2 * at + 1;
            if (left >= this.size) {
                break;
            }
            const right = left + 1;
            const child = right < this.size && this.key[this.heap[right]] < this.key[this.heap[left]] ? right : left;
            const childNode = this.heap[child];
            if (key <= this.key[childNode]) {
                break;
            }
            this.heap[at] = childNode;
            this.slot[childNode] = at;
            at = child;
        }
        this.heap[at] = node;
        this.slot[node] = at;
    }
}
```

`algorithms/src/indexed/structures/arc-source.ts`:

```ts
import type { U32 } from "@graphty/graph-format";

/**
 * The source node of an arc, by binary search on `rowPtr`. `GraphSnapshot` exposes `arcSource(a)`
 * (`graph-format/src/snapshot/graph-snapshot.ts:544`), but an `AdjacencyView` -- which is what the
 * Port 1 and Port 2 signatures take, so that `reverse()` works as an input for free -- does not,
 * so the predecessor walk carries its own.
 * @param rowPtr - The view's nodeCount + 1 row offsets
 * @param arc - An arc index in `[0, arcCount)`
 * @returns The node index whose row contains the arc
 * @public
 */
export function arcSourceIn(rowPtr: U32, arc: number): number {
    let lo = 0;
    let hi = rowPtr.length - 1; // nodeCount
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (rowPtr[mid + 1] <= arc) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}
```

`algorithms/src/indexed/structures/index.ts`:

```ts
/**
 * Scratch structures for the index-based ports (graph-format design 14.2, section 14.6's
 * helper-ownership sentence at `graph-format-design.md:4270`).
 * @module
 */

export { arcSourceIn } from "./arc-source.js";
export { IndexedMinHeap } from "./min-heap.js";
export { IntUnionFind } from "./union-find.js";
```

- [ ] **Step 2: The test**

Create `AT/algorithms/test/unit/indexed/structures.test.ts`:

```ts
import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { arcSourceIn } from "../../../src/indexed/structures/arc-source.js";
import { IndexedMinHeap } from "../../../src/indexed/structures/min-heap.js";
import { IntUnionFind } from "../../../src/indexed/structures/union-find.js";

describe("IntUnionFind", () => {
    it("starts as singletons", () => {
        const { labels, count } = new IntUnionFind(5).toLabels();
        expect(count).toBe(5);
        expect([...labels]).toEqual([0, 1, 2, 3, 4]);
    });

    it("collapses a chain to one set", () => {
        const uf = new IntUnionFind(4);
        expect(uf.union(0, 1)).toBe(true);
        expect(uf.union(1, 2)).toBe(true);
        expect(uf.union(2, 3)).toBe(true);
        expect(uf.find(0)).toBe(uf.find(3));
        const { labels, count } = uf.toLabels();
        expect(count).toBe(1);
        expect([...labels]).toEqual([0, 0, 0, 0]);
    });

    it("returns false for a union inside one set", () => {
        const uf = new IntUnionFind(3);
        expect(uf.union(0, 1)).toBe(true);
        expect(uf.union(1, 0)).toBe(false);
        expect(uf.union(0, 0)).toBe(false);
    });

    it("renumbers to dense first-seen labels whatever the representatives are", () => {
        // Deliberately NOT asserted through the representatives: union by rank chooses those, so a
        // test that pinned them would be testing the rank heuristic rather than the renumbering.
        // What is pinned is the property renumberPartition guarantees: labels 0..count-1 in the
        // order each set is first seen while scanning i = 0, 1, 2, ...
        const uf = new IntUnionFind(5);
        uf.union(0, 1);
        uf.union(2, 3);
        const { labels, count } = uf.toLabels();
        expect(count).toBe(3);
        expect([...labels]).toEqual([0, 0, 1, 1, 2]);
    });
});

describe("IndexedMinHeap", () => {
    it("pops in ascending key order", () => {
        const heap = new IndexedMinHeap(100);
        for (let i = 0; i < 100; i++) {
            heap.push(i, 99 - i); // node i has key 99 - i, so node 99 is the minimum
        }
        const popped: number[] = [];
        while (!heap.isEmpty()) {
            popped.push(heap.pop());
        }
        expect(popped).toHaveLength(100);
        for (let i = 0; i < 100; i++) {
            expect(popped[i]).toBe(99 - i);
        }
    });

    it("pushOrDecrease inserts an absent node", () => {
        const heap = new IndexedMinHeap(4);
        heap.pushOrDecrease(2, 5);
        expect(heap.isEmpty()).toBe(false);
        expect(heap.pop()).toBe(2);
        expect(heap.isEmpty()).toBe(true);
    });

    it("pushOrDecrease with a larger key is a no-op and the node keeps its place", () => {
        const heap = new IndexedMinHeap(4);
        heap.push(0, 1);
        heap.push(1, 2);
        heap.pushOrDecrease(1, 9);
        expect(heap.pop()).toBe(0);
        expect(heap.pop()).toBe(1);
    });

    it("a decrease to the new minimum makes that node pop first", () => {
        const heap = new IndexedMinHeap(4);
        heap.push(0, 1);
        heap.push(1, 2);
        heap.push(2, 3);
        heap.pushOrDecrease(2, 0);
        expect(heap.pop()).toBe(2);
        expect(heap.pop()).toBe(0);
        expect(heap.pop()).toBe(1);
    });
});

describe("arcSourceIn", () => {
    // Three nodes: node 0 owns arcs 0 and 1, node 1's row is EMPTY, node 2 owns arcs 2, 3 and 4.
    const rowPtr = Uint32Array.of(0, 2, 2, 5);

    it("maps every arc to the node whose row contains it", () => {
        expect(arcSourceIn(rowPtr, 0)).toBe(0);
        expect(arcSourceIn(rowPtr, 1)).toBe(0);
        expect(arcSourceIn(rowPtr, 2)).toBe(2);
        expect(arcSourceIn(rowPtr, 3)).toBe(2);
        expect(arcSourceIn(rowPtr, 4)).toBe(2);
    });

    it("never returns a node whose row is empty", () => {
        // This is the case that separates the correct search from the off-by-one one. With
        // `rowPtr[mid] <= arc` instead of `rowPtr[mid + 1] <= arc`, arc 2 walks lo 0 -> 2 -> 3 and
        // returns 3: past the last node here, and a node with an empty row in general. Asserting
        // the PROPERTY rather than the wrong answer keeps the test meaningful on any rowPtr.
        for (let arc = 0; arc < 5; arc++) {
            const u = arcSourceIn(rowPtr, arc);
            expect(u).toBeLessThan(rowPtr.length - 1);
            expect(rowPtr[u]).toBeLessThanOrEqual(arc);
            expect(rowPtr[u + 1]).toBeGreaterThan(arc);
        }
    });

    it("agrees with GraphSnapshot.arcSource on every arc of a fixture", () => {
        const builder = new GraphBuilder({ directed: true });
        for (const id of ["a", "b", "c", "d"]) {
            builder.addNode(id);
        }
        builder.addEdge("a", "b");
        builder.addEdge("a", "c");
        builder.addEdge("c", "d");
        builder.addEdge("d", "a"); // node "b" keeps an empty out-row
        const s = builder.freeze({ label: "arc-source", checksum: true });
        for (let arc = 0; arc < s.arcCount; arc++) {
            expect(arcSourceIn(s.rowPtr, arc)).toBe(s.arcSource(arc));
        }
        s.validate({ checksum: true });
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/structures.test.ts`
Expected: 11 passed. If "never returns a node whose row is empty" fails with `expected 3 to be less than 3`, the binary search is the `rowPtr[mid] <= arc` variant; the comparison must be against `rowPtr[mid + 1]`.

- [ ] **Step 3: Checkpoint** -- no commit; Task M8a-T6 imports all three.

---

### Task M8a-T6: Ports 1 and 2 -- breadthFirstSearch, dijkstra, and the predecessor walk

**Repository:** `AT`.

**Files:**
- Create: `algorithms/src/indexed/bfs.ts` (Port 1, `graph-format-design.md:3823-3854`), `algorithms/src/indexed/dijkstra.ts` (Port 2, `:3856-3887`, plus `walkPredArcs` / `walkPredEdges`)
- Test: `algorithms/test/unit/indexed/bfs.test.ts`, `algorithms/test/unit/indexed/dijkstra.test.ts`
- NOT touched: `algorithms/src/algorithms/traversal/*`, `algorithms/src/algorithms/shortest-path/*` (the legacy implementations and their signatures are untouched by this plan)

**Interfaces:**
- Consumes: `AdjacencyView` (`graph-format/src/types/snapshot.ts:257-272`: `directed`, `nodeCount`, `arcCount`, `rowPtr`, `colIdx`, `arcToEdge`, `weights`); `INVALID_INDEX`; `IndexedMinHeap` and `arcSourceIn` (Task M8a-T5). `GraphSnapshot` and `ReverseView` both satisfy `AdjacencyView`, so `indexed.breadthFirstSearch(s.reverse(), ...)` is an in-neighbour BFS for free.
- Produces: `BfsResult`, `BfsOptions`, `breadthFirstSearch(g, start, options)`; `SsspResult` (PD-3), `SsspOptions`, `dijkstra(g, source, options)`, `walkPredArcs(g, predArc, source, target)`, `walkPredEdges(g, predArc, source, target)`. The last two are what Task M8a-T8's dispatcher uses to DECORATE an accelerator's `SsspResultLike`.

- [ ] **Step 1: Port 1**

Create `AT/algorithms/src/indexed/bfs.ts`. The body is `graph-format-design.md:3827-3847` verbatim (the two interfaces at `:3827-3828` and the function at `:3829-3847`); the JSDoc and the explicit return types are this plan's (the repository's ESLint config sets `@typescript-eslint/explicit-function-return-type`).

```ts
import { INVALID_INDEX, type AdjacencyView, type U32 } from "@graphty/graph-format";

/** Result of the index-based BFS (graph-format design 14.2 Port 1). @public */
export interface BfsResult {
    /** Visit order, one entry per visited node; a subarray of length `visitedCount`. */
    readonly order: U32;
    /** Parent of every node, INVALID_INDEX for the start node and for unvisited nodes. */
    readonly parent: U32;
    /** Hop depth of every node, INVALID_INDEX for unvisited nodes. */
    readonly depth: U32;
    /** How many nodes were visited. */
    readonly visitedCount: number;
}

/** Options of the index-based BFS. @public */
export interface BfsOptions {
    /** Stop expanding at this depth; unbounded when omitted. */
    readonly maxDepth?: number | undefined;
}

/**
 * Breadth-first search over out-neighbours. Takes any `AdjacencyView`, so `s.reverse()` gives an
 * in-neighbour BFS with no extra code.
 * @param g - The adjacency to traverse
 * @param start - The node index to start from
 * @param options - Traversal options
 * @returns The visit order, the parent array, the depth array and the visited count
 * @public
 */
export function breadthFirstSearch(g: AdjacencyView, start: number, options: BfsOptions = {}): BfsResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const order = new Uint32Array(nodeCount);
    const maxDepth = options.maxDepth ?? INVALID_INDEX;
    let head = 0;
    let tail = 0;
    order[tail++] = start;
    depth[start] = 0;
    while (head < tail) {
        const u = order[head++];
        const d = depth[u];
        if (d >= maxDepth) {
            continue;
        }
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[a];
            if (depth[v] === INVALID_INDEX) {
                depth[v] = d + 1;
                parent[v] = u;
                order[tail++] = v;
            }
        }
    }
    return { order: order.subarray(0, tail), parent, depth, visitedCount: tail };
}
```

Note that `order.subarray(0, tail)` keeps the `Uint32Array<ArrayBuffer>` buffer parameter that `U32` requires (`graph-format/src/types/columns.ts:59-61` documents that `subarray()` preserves it), so no cast is needed and none is allowed.

- [ ] **Step 2: Port 1's test**

Create `AT/algorithms/test/unit/indexed/bfs.test.ts`. The fixture is built in EXACTLY this order, because the assertions below are written in the index space it produces and `toSnapshot` follows the legacy graph's own node-insertion order (invariant I14, first appearance):

```ts
function pathPlusIsolated(directed: boolean): Graph {
    const g = new Graph({ directed });
    g.addEdge("a", "b"); // creates a (index 0) then b (index 1)
    g.addEdge("b", "c"); // c is index 2
    g.addEdge("c", "d"); // d is index 3
    g.addNode("z"); // isolated, index 4 -- added LAST on purpose
    return g;
}
```

Every fixture is frozen through `checksummedSnapshot` (Task M8a-T4) and every case ends with `s.validate({ checksum: true })`.

Cases. Over `checksummedSnapshot(pathPlusIsolated(false))` with `start = 0`: `[...result.depth]` is `[0, 1, 2, 3, INVALID_INDEX]`; `[...result.parent]` is `[INVALID_INDEX, 0, 1, 2, INVALID_INDEX]`; `[...result.order]` is `[0, 1, 2, 3]`; `result.visitedCount === 4`. With `{ maxDepth: 1 }`: `result.visitedCount === 2`, `[...result.order]` is `[0, 1]`, and `depth[2] === INVALID_INDEX`. Over the DIRECTED fixture with `start = 3` (`d`): `breadthFirstSearch(s, 3).visitedCount === 1` while `breadthFirstSearch(s.reverse(), 3).visitedCount === 4` and its `depth` in index order is `[3, 2, 1, 0, INVALID_INDEX]`. And the cross-check against the legacy `breadthFirstSearch(graph, "a")` (`algorithms/src/algorithms/traversal/bfs-unified.ts:46`): the visited SET, mapped through `s.ids.idOf`, is equal.

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/bfs.test.ts`
Expected: green. The legacy cross-check compares SETS, not orders: the legacy BFS iterates `graph.neighbors(id)` in adjacency-Map insertion order while the port iterates `colIdx` in ascending index order (invariant I4), so the two visit orders differ legitimately within a level.

- [ ] **Step 3: Port 2 and the predecessor walk**

Create `AT/algorithms/src/indexed/dijkstra.ts`:

```ts
import { INVALID_INDEX, type AdjacencyView, type NumericVector, type U32 } from "@graphty/graph-format";

import { arcSourceIn } from "./structures/arc-source.js";
import { IndexedMinHeap } from "./structures/min-heap.js";

/**
 * Single-source shortest paths, index-based (graph-format design 14.2 Port 2, line 3860).
 * `dist` is a `NumericVector` rather than the design's `F64` because ONE declaration serves both
 * the CPU port (which produces a `Float64Array`) and the dispatcher's decoration of an
 * accelerator's f32 result (plan decision PD-3, departure DEP-8A-C).
 * @public
 */
export interface SsspResult {
    /** Distance per node; +Infinity for unreached nodes. */
    readonly dist: NumericVector;
    /** The ARC that relaxed each node; INVALID_INDEX for the source and for unreached nodes. */
    readonly predArc: U32;
    /**
     * Node indices from the source to `target` inclusive; empty when `target` is unreached.
     * @param target - The node index to walk back from
     */
    pathTo(target: number): U32;
    /**
     * LOGICAL EDGE indices along that path, one fewer than `pathTo`; this is what graphty-element's
     * `isInPath` writes through. Empty when `target` is unreached.
     * @param target - The node index to walk back from
     */
    pathEdges(target: number): U32;
}

/** Options of the index-based SSSP. @public */
export interface SsspOptions {
    /** Stop relaxing beyond this distance. */
    readonly cutoff?: number | undefined;
    /** Per-arc weight override, arcCount long -- the facade passes `expandEdges(s, shadow.data)`. */
    readonly weights?: NumericVector | undefined;
}

/**
 * Walk the predecessor arcs back from `target` and return the node path, source first.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from
 * @returns Node indices from source to target inclusive, or an empty array when unreached
 * @public
 */
export function walkPredArcs(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source) {
        return Uint32Array.of(source);
    }
    if (predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    const reversed: number[] = [target];
    let node = target;
    while (node !== source) {
        node = arcSourceIn(g.rowPtr, predArc[node]);
        reversed.push(node);
    }
    const out = new Uint32Array(reversed.length);
    for (let i = 0; i < reversed.length; i++) {
        out[i] = reversed[reversed.length - 1 - i];
    }
    return out;
}

/**
 * Walk the predecessor arcs back from `target` and return the logical edges on the path.
 * @param g - The adjacency the search ran on
 * @param predArc - The search's predecessor-arc array
 * @param source - The search's source node index
 * @param target - The node to walk back from
 * @returns Logical edge indices from source to target, or an empty array when unreached
 * @public
 */
export function walkPredEdges(g: AdjacencyView, predArc: U32, source: number, target: number): U32 {
    if (target === source || predArc[target] === INVALID_INDEX) {
        return new Uint32Array(0);
    }
    const reversed: number[] = [];
    let node = target;
    while (node !== source) {
        const arc = predArc[node];
        reversed.push(g.arcToEdge[arc]); // the EXACT parallel edge, not a (u, v) lookup
        node = arcSourceIn(g.rowPtr, arc);
    }
    const out = new Uint32Array(reversed.length);
    for (let i = 0; i < reversed.length; i++) {
        out[i] = reversed[reversed.length - 1 - i];
    }
    return out;
}

/**
 * Dijkstra over an adjacency view, with the predecessor recorded as the relaxing ARC so a parallel
 * edge on the path is identified exactly.
 * @param g - The adjacency to search
 * @param source - The node index to start from
 * @param options - Cutoff and per-arc weight override
 * @returns The distances, the predecessor arcs, and the two path accessors
 * @public
 */
export function dijkstra(g: AdjacencyView, source: number, options: SsspOptions = {}): SsspResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const weights: NumericVector | null = options.weights ?? g.weights;
    const dist = new Float64Array(nodeCount).fill(Infinity);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const heap = new IndexedMinHeap(nodeCount);
    const cutoff = options.cutoff ?? Infinity;
    dist[source] = 0;
    heap.push(source, 0);
    while (!heap.isEmpty()) {
        const u = heap.pop();
        const du = dist[u];
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const w = weights === null ? 1 : weights[a];
            const v = colIdx[a];
            const dv = du + w;
            if (dv < dist[v] && dv <= cutoff) {
                dist[v] = dv;
                predArc[v] = a;
                heap.pushOrDecrease(v, dv);
            }
        }
    }
    return {
        dist,
        predArc,
        pathTo: (target: number): U32 => walkPredArcs(g, predArc, source, target),
        pathEdges: (target: number): U32 => walkPredEdges(g, predArc, source, target),
    };
}
```

Two things the design's sketch leaves implicit and that a reader will otherwise get wrong. First, `walkPredArcs` returns NODE indices and `walkPredEdges` returns LOGICAL EDGE indices -- the design fixes the second (`graph-format-design.md:3737`: "`pathEdges` gives logical edge indices for graphty-element's `isInPath`") and leaves the first to be inferred from `pathTo`'s role as the replacement for `ShortestPathResult.path: NodeId[]`. Second, `options.weights` overrides `g.weights` wholesale rather than merging: `snapshot.weights` is the f32 arc array, and the f64 shadow is a separate EDGE column, so a facade that wants exact legacy weights passes `expandEdges(s, shadow.data)` and must not get the f32 values mixed in.

- [ ] **Step 4: Port 2's test**

Create `AT/algorithms/test/unit/indexed/dijkstra.test.ts`. Every `Graph`-built fixture goes through `checksummedSnapshot` (Task M8a-T4) and every case ends with `s.validate({ checksum: true })`; the two fixtures built through `GraphBuilder` directly pass `freeze({ checksum: true })` themselves. Cases: the weighted diamond `a-b(1) a-c(4) b-d(1) c-d(1)` where `dist[d] === 2` and `pathTo(d)` is `[a, b, d]` and `pathEdges(d)` has length 2; an unreached node keeps `Infinity`, `predArc === INVALID_INDEX`, and both accessors return a zero-length array; `pathTo(source)` is `[source]` while `pathEdges(source)` is empty; `{ cutoff: 1.5 }` leaves `d` at `Infinity`; PARALLEL EDGES -- build `a->b` twice with weights 5 and 1 through `GraphBuilder` directly (the legacy `Graph` forbids them), and assert `pathEdges(b)[0]` is the edge whose weight is 1, which is the claim `predArc` exists to make; an `options.weights` override of `expandEdges(s, shadow.data)` reproduces an f64 total exactly where the f32 arc array does not; and a cross-check against the legacy `dijkstra(graph, "a")` (`algorithms/src/algorithms/shortest-path/dijkstra.ts:21`) that every finite distance agrees to within `1e-12`.

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/dijkstra.test.ts`
Expected: green. If the parallel-edge case returns the weight-5 edge, `predArc` is being written as a NODE rather than an arc -- the assignment is `predArc[v] = a`, never `= u`.

- [ ] **Step 5: Checkpoint** -- no commit; Task M8a-T7 adds the remaining four ports and the barrel that exports all six together.

---

### Task M8a-T7: Ports 3 to 6 and the indexed barrel

**Repository:** `AT`.

**Files:**
- Create: `algorithms/src/indexed/pagerank.ts` (Port 3, `graph-format-design.md:3889-3922`), `algorithms/src/indexed/components.ts` (Port 4, `:3924-3928`, PROSE in the design, with DEP-8A-H), `algorithms/src/indexed/mst.ts` (Port 5, `:3930-3938`, PROSE in the design, with DEP-8A-D), `algorithms/src/indexed/common-neighbors.ts` (Port 6, `:3940-3954`), `algorithms/src/indexed/index.ts` (the namespace barrel)
- Test: `algorithms/test/unit/indexed/pagerank.test.ts`, `algorithms/test/unit/indexed/components.test.ts`, `algorithms/test/unit/indexed/mst.test.ts`, `algorithms/test/unit/indexed/common-neighbors.test.ts`
- NOT touched: `algorithms/src/index.ts` (Task M8a-T10 owns the root barrel), `algorithms/src/indexed/accelerator.ts` (Task M8a-T8 owns it and is deliberately NOT re-exported by `indexed/index.ts`, PD-9)

**Interfaces:**
- Consumes: `GraphSnapshot` and its views -- `reverse(): ReverseView`, `edgeList(): EdgeListView`, `outDegree(): U32`, `weightedOutDegree(): F64` (`graph-format/src/types/snapshot.ts:568`, `:578`, `:583`, `:601`); `renumberPartition`; `IntUnionFind` (Task M8a-T5).
- Produces: `pageRank`, `PageRankOptions`, `PageRankResult` (the indexed ones, PD-1); `connectedComponents`, `weaklyConnectedComponents`, `LabelResult`; `kruskalMST`, `MstOptions`, `MstResult`; `commonNeighborsScore`, `CommonNeighborsOptions`; and the `indexed` namespace barrel that Task M8a-T8's dispatcher imports as `import * as indexed from "./index.js"`.

- [ ] **Step 1: Port 3 -- pageRank**

Create `AT/algorithms/src/indexed/pagerank.ts`. The function body is `graph-format-design.md:3893-3916` verbatim.

```ts
import type { F64, GraphSnapshot, NumericVector } from "@graphty/graph-format";

/** Options of the index-based PageRank (graph-format design 14.2 Port 3, line 3892). @public */
export interface PageRankOptions {
    /** Probability of following a link; default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** L1 convergence tolerance; default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Use the snapshot's arc weights; default false. */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based PageRank. @public */
export interface PageRankResult {
    /** Score per node index. */
    readonly scores: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Whether the L1 delta fell below the tolerance. */
    readonly converged: boolean;
}

/**
 * PageRank by pull over `reverse()`, with the dangling mass redistributed uniformly.
 * @param s - A DIRECTED snapshot
 * @param o - Algorithm options
 * @returns The scores, the iteration count and the convergence flag
 * @public
 */
export function pageRank(s: GraphSnapshot, o: PageRankOptions = {}): PageRankResult {
    if (!s.directed) {
        throw new Error("PageRank requires a directed graph");
    }
    const n = s.nodeCount;
    const d = o.dampingFactor ?? 0.85;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const rev = s.reverse();
    const weighted = o.weighted === true && rev.weights !== null;
    const outW: NumericVector = weighted ? s.weightedOutDegree() : s.outDegree();
    let rank = new Float64Array(n).fill(1 / n);
    let next = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        let dangling = 0;
        for (let u = 0; u < n; u++) {
            if (outW[u] === 0) {
                dangling += rank[u];
            }
        }
        const base = (1 - d) / n + (d * dangling) / n;
        let delta = 0;
        for (let v = 0; v < n; v++) {
            let acc = 0;
            const end = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < end; a++) {
                const u = rev.colIdx[a];
                const ow = outW[u];
                if (ow > 0) {
                    acc += (rank[u] * (weighted && rev.weights !== null ? rev.weights[a] : 1)) / ow;
                }
            }
            next[v] = base + d * acc;
            delta += Math.abs(next[v] - rank[v]);
        }
        [rank, next] = [next, rank];
        converged = delta < tol;
    }
    return { scores: rank, iterations: it, converged };
}
```

`outW` is a CACHED, SHARED view (`outDegree()` and `weightedOutDegree()` are memoised per snapshot, invariant I17) and is only ever READ here. A port that needed to mutate a degree array would have to `.slice()` it first -- the rule at `graph-format-design.md:3777-3782`.

- [ ] **Step 2: Port 4 -- connected components (DESIGNED here, not transcribed -- DEP-8A-H)**

`graph-format-design.md:3924-3928` gives Port 4 as four sentences and a one-line inline fragment; there is no signature, no result interface, no grouping accessor and no directed check in the design. The `LabelResult` shape below, its cached `groups()` and the directed-input throw are this plan's, and departure DEP-8A-H carries the argument for each. Read this file as a proposal, not as a transcription.

Create `AT/algorithms/src/indexed/components.ts`:

```ts
import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { IntUnionFind } from "./structures/union-find.js";

/** A partition of the node set (graph-format design 14.2's result table, line 3738). @public */
export interface LabelResult {
    /** Dense label per node index, in first-seen order. */
    readonly labels: U32;
    /** Number of distinct labels. */
    readonly count: number;
    /**
     * Node indices grouped by label, computed once and cached.
     * @returns One array per label
     */
    groups(): U32[];
}

function withGroups(labels: U32, count: number): LabelResult {
    let cached: U32[] | null = null;
    return {
        labels,
        count,
        groups(): U32[] {
            if (cached === null) {
                const sizes = new Uint32Array(count);
                for (let i = 0; i < labels.length; i++) {
                    sizes[labels[i]]++;
                }
                const out: U32[] = [];
                for (let c = 0; c < count; c++) {
                    out.push(new Uint32Array(sizes[c]));
                }
                const fill = new Uint32Array(count);
                for (let i = 0; i < labels.length; i++) {
                    const c = labels[i];
                    out[c][fill[c]++] = i;
                }
                cached = out;
            }
            return cached;
        },
    };
}

function unionEdges(s: GraphSnapshot): LabelResult {
    const uf = new IntUnionFind(s.nodeCount);
    const el = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        uf.union(el.src[e], el.dst[e]);
    }
    const { labels, count } = uf.toLabels();
    return withGroups(labels, count);
}

/**
 * Connected components of an UNDIRECTED snapshot.
 * @param s - An undirected snapshot
 * @returns The partition
 * @public
 */
export function connectedComponents(s: GraphSnapshot): LabelResult {
    if (s.directed) {
        throw new Error(
            "Connected components requires an undirected graph. Use weaklyConnectedComponents, or pass s.toUndirected().snapshot.",
        );
    }
    return unionEdges(s);
}

/**
 * Weakly connected components: the same union-find pass with the direction check dropped.
 * @param s - Any snapshot
 * @returns The partition
 * @public
 */
export function weaklyConnectedComponents(s: GraphSnapshot): LabelResult {
    return unionEdges(s);
}
```

`edgeList()` visits every LOGICAL edge exactly once on a directed and an undirected snapshot alike (`graph-format/src/types/snapshot.ts:300-311`), which is why the same loop is correct for both and why it does not double-count an undirected edge's two arcs.

- [ ] **Step 3: Port 5 -- kruskalMST (with DEP-8A-D)**

Create `AT/algorithms/src/indexed/mst.ts`:

```ts
import type { GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

import { IntUnionFind } from "./structures/union-find.js";

/** Options of the index-based MST. @public */
export interface MstOptions {
    /** Per-arc weight override, arcCount long; gathered back to per-edge through `edgeToArc`. */
    readonly weights?: NumericVector | undefined;
}

/** Result of the index-based MST (graph-format design 14.2's result table, line 3745). @public */
export interface MstResult {
    /** Logical edge indices of the spanning forest, in the order they were accepted. */
    readonly edges: U32;
    /** Sum of the accepted edges' weights. */
    readonly totalWeight: number;
}

/**
 * Kruskal's minimum spanning forest over logical edges.
 *
 * The sort is a comparator over an f64 key array, tie-broken by edge index, rather than the
 * design's radix sort on the f32 bit pattern (plan departure DEP-8A-D): the tie-break makes it
 * stable by construction and it has to serve both the f32 arc array and an f64 override.
 * @param s - The snapshot
 * @param o - The optional per-arc weight override
 * @returns The accepted edge indices and their total weight
 * @public
 */
export function kruskalMST(s: GraphSnapshot, o: MstOptions = {}): MstResult {
    const el = s.edgeList();
    const m = s.edgeCount;
    const keys = new Float64Array(m);
    if (o.weights !== undefined) {
        // The override is per ARC; edgeList().arc holds the arc of each edge's declared orientation.
        for (let e = 0; e < m; e++) {
            keys[e] = o.weights[el.arc[e]];
        }
    } else if (el.weights !== null) {
        for (let e = 0; e < m; e++) {
            keys[e] = el.weights[e];
        }
    } else {
        keys.fill(1);
    }
    const order: number[] = new Array<number>(m);
    for (let e = 0; e < m; e++) {
        order[e] = e;
    }
    order.sort((a, b) => keys[a] - keys[b] || a - b);
    const uf = new IntUnionFind(s.nodeCount);
    const accepted = new Uint32Array(Math.max(s.nodeCount - 1, 0));
    let taken = 0;
    let totalWeight = 0;
    for (const e of order) {
        if (uf.union(el.src[e], el.dst[e])) {
            accepted[taken++] = e;
            totalWeight += keys[e];
        }
    }
    return { edges: accepted.subarray(0, taken), totalWeight };
}
```

`o.weights` is indexed through `el.arc`, NOT through `el.weights`: `edgeList().arc` holds the arc carrying each edge's declared orientation (`graph-format/src/types/snapshot.ts:306`), so a per-arc override gathers back to per-edge with one read. A facade passing `expandEdges(s, shadow.data)` therefore reaches the f64 shadow values here without this file importing `expandEdges` at all.

- [ ] **Step 4: Port 6 -- commonNeighborsScore**

Create `AT/algorithms/src/indexed/common-neighbors.ts`. The body is `graph-format-design.md:3943-3953` verbatim (the options interface at `:3943`, the function at `:3944-3953`), with the adjacent-skip idiom that gives simple-graph semantics on a multigraph without calling `simplified()`.

```ts
import type { AdjacencyView, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based common-neighbour score. @public */
export interface CommonNeighborsOptions {
    /** Intersect out(u) with in(v) instead of the two undirected rows. */
    readonly directed?: boolean | undefined;
}

/**
 * The number of distinct common neighbours of two nodes, by a merge of their sorted rows.
 * @param s - The snapshot
 * @param u - A node index
 * @param v - A node index
 * @param o - Options
 * @returns The count of distinct common neighbours
 * @public
 */
export function commonNeighborsScore(s: GraphSnapshot, u: number, v: number, o: CommonNeighborsOptions = {}): number {
    const fwd: AdjacencyView = s;
    const bwd: AdjacencyView = o.directed === true ? s.reverse() : s;
    let i = fwd.rowPtr[u];
    const iEnd = fwd.rowPtr[u + 1];
    let j = bwd.rowPtr[v];
    const jEnd = bwd.rowPtr[v + 1];
    let count = 0;
    while (i < iEnd && j < jEnd) {
        const a = fwd.colIdx[i];
        const b = bwd.colIdx[j];
        if (a === b) {
            count++;
            i++;
            j++;
            while (i < iEnd && fwd.colIdx[i] === a) {
                i++;
            }
            while (j < jEnd && bwd.colIdx[j] === b) {
                j++;
            }
        } else if (a < b) {
            i++;
        } else {
            j++;
        }
    }
    return count;
}
```

The merge is valid only because rows are sorted by `colIdx` -- invariant I4, which graph-format states as "rows sorted by colIdx, ties by ascending arcToEdge, no unsorted mode". A port that assumed row order elsewhere would be wrong; here it is guaranteed.

- [ ] **Step 5: The namespace barrel**

Create `AT/algorithms/src/indexed/index.ts`:

```ts
/**
 * Index-based implementations over `@graphty/graph-format` snapshots (graph-format design 14.1
 * rule 2): every function takes a `GraphSnapshot` or an `AdjacencyView` first and an options object
 * last, and returns typed arrays plus scalars. Reached as the `indexed` namespace of
 * `@graphty/algorithms`.
 *
 * NOT re-exported here, deliberately (plan decision PD-9):
 * - `./accelerator.js`, which imports this barrel -- re-exporting it would make a cycle, and its
 *   symbols are exported FLAT from the package barrel because the GPU package must write
 *   `import type { AlgorithmAccelerator } from "@graphty/algorithms"`.
 * - `./to-snapshot.js`, whose parameter is a legacy `Graph`, which is not what this namespace
 *   promises. It is exported flat too.
 * @module
 */

export { type BfsOptions, type BfsResult, breadthFirstSearch } from "./bfs.js";
export { type CommonNeighborsOptions, commonNeighborsScore } from "./common-neighbors.js";
export { connectedComponents, type LabelResult, weaklyConnectedComponents } from "./components.js";
export {
    dijkstra,
    type SsspOptions,
    type SsspResult,
    walkPredArcs,
    walkPredEdges,
} from "./dijkstra.js";
export { kruskalMST, type MstOptions, type MstResult } from "./mst.js";
export { pageRank, type PageRankOptions, type PageRankResult } from "./pagerank.js";
export { arcSourceIn, IndexedMinHeap, IntUnionFind } from "./structures/index.js";
```

The specifier order inside each brace is NOT cosmetic: `eslint.config.js:197` sets `"simple-import-sort/exports": "error"` for every `**/*.ts`, and simple-import-sort orders specifiers case-INSENSITIVELY, so `BfsOptions` precedes `breadthFirstSearch` ("bf" before "br") and `CommonNeighborsOptions` precedes `commonNeighborsScore` ("...o" before "...s"). The same convention is visible in `webgpu-graph-algorithms/test/types/public-api.test-d.ts:7-8`, where `ApspResultLike` precedes `ARC_WINDOW_ALIGN`, and at `:18-19`, where `EdgeScoresResultLike` precedes `EXACT_MAX_NODES`. Writing them in the "value first, then types" order a reader might expect fails `npm run lint` on a file that is otherwise correct.

- [ ] **Step 6: The four tests**

Every fixture built from a legacy `Graph` goes through `checksummedSnapshot` (Task M8a-T4) and every case ends with `s.validate({ checksum: true })`; fixtures built through `GraphBuilder` directly pass `freeze({ checksum: true })` themselves. That is the I17 view-write guard of `graph-format-design.md:3776-3781`, and `indexed.pageRank` -- which reads `s.outDegree()` and `s.weightedOutDegree()` directly -- is exactly the shape it exists to police.

`pagerank.test.ts`: an undirected snapshot throws; a directed 4-cycle gives four equal scores summing to 1 within `1e-12`; a two-node chain `a->b` puts more mass on `b`; a dangling node (out-degree 0) does not leak mass -- the score sum stays 1 within `1e-9`; `maxIterations: 1` returns `iterations === 1` and `converged === false`; `weighted: true` on a graph whose two in-arcs carry 3 and 1 splits the contribution 3:1.

The legacy cross-check needs both sides PINNED, and the test says so in a comment, because the two implementations converge on different norms and the legacy one has a second algorithm hiding behind a size heuristic:

```ts
// Both sides are run to a tolerance neither can reach before maxIterations, so neither stopping
// rule decides the answer. They differ: the port's `converged` is an L1 delta over all nodes
// (`delta += Math.abs(next[v] - rank[v])`), the legacy one is L-infinity
// (`maxDiff = Math.max(maxDiff, ...)`, pagerank.ts:257-267), both against 1e-6 by default -- so at
// the default tolerance the legacy loop stops up to n iterations earlier and the two answers differ
// by about its residual, which on scores near 0.25 is several times 1e-6 relative.
// `useDelta: false` is MANDATORY, not tidiness: `options.useDelta !== false && n > 100`
// (pagerank.ts:110) switches the legacy call to SimpleDeltaPageRank, a different algorithm that
// then reports `iterations: maxIterations, converged: true` unconditionally (pagerank.ts:146-147).
const legacy = pageRank(g, { dampingFactor: 0.85, maxIterations: 200, tolerance: 1e-12, useDelta: false });
const ported = indexed.pageRank(s, { dampingFactor: 0.85, maxIterations: 200, tolerance: 1e-12 });
for (let u = 0; u < s.nodeCount; u++) {
    expect(ported.scores[u]).toBeCloseTo(legacy.ranks[String(s.ids.idOf(u))], 9); // 1e-9 absolute
}
```

`components.test.ts`: a directed snapshot throws from `connectedComponents` and does not from `weaklyConnectedComponents`; two disjoint triangles plus one isolated node give `count === 3` and `groups()` of sizes `[3, 3, 1]`; labels are first-seen (`labels[0] === 0`); `groups()` returns the SAME arrays on a second call (`expect(r.groups()).toBe(r.groups())`); a snapshot with `arcCount === 0` gives `count === nodeCount`; and the cross-check against the legacy `connectedComponents(graph)` -- the partitions, compared as sets of id sets, are equal.

`mst.test.ts`: the weighted diamond gives three edges and the minimum total; a disconnected input gives a FOREST (`edges.length === nodeCount - componentCount`); equal weights are broken by edge index, so two runs give an identical `edges` array; an `o.weights` per-arc override changes which edge is chosen; and a cross-check against the legacy `kruskalMST` (`algorithms/src/algorithms/mst/`) that `totalWeight` agrees to `1e-12`.

`common-neighbors.test.ts`, in full -- the expectations here are arithmetic on the Port 6 body above, not conventions to be chosen at the keyboard:

```ts
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { commonNeighborsScore } from "../../../src/indexed/common-neighbors.js";

/** The undirected star c-a, c-b, c-d. */
function star(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (const id of ["a", "b", "c", "d"]) {
        b.addNode(id);
    }
    b.addEdge("c", "a");
    b.addEdge("c", "b");
    b.addEdge("c", "d");
    return b.freeze({ label: "star", checksum: true });
}

function directedOn(edges: readonly (readonly [string, string])[]): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    for (const id of ["a", "b", "c"]) {
        b.addNode(id);
    }
    for (const [u, v] of edges) {
        b.addEdge(u, v);
    }
    return b.freeze({ label: "directed", checksum: true });
}

describe("commonNeighborsScore", () => {
    it("counts the one neighbour two leaves of a star share", () => {
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("b"))).toBe(1);
        s.validate({ checksum: true });
    });

    it("scores zero when the two rows are disjoint", () => {
        // row(a) = [c] and row(c) = [a, b, d]: c is not its own neighbour and a is not its own,
        // so the merge finds nothing.
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("c"))).toBe(0);
        s.validate({ checksum: true });
    });

    it("a node against itself counts its own neighbours", () => {
        // The function is a row intersection and makes no special case for u === v: row(a) merged
        // with row(a) matches on every entry, so the answer is the node's own degree. It is 1 for a
        // leaf and 3 for the hub -- NOT zero.
        const s = star();
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("a"))).toBe(1);
        expect(commonNeighborsScore(s, s.ids.requireIndex("c"), s.ids.requireIndex("c"))).toBe(3);
        s.validate({ checksum: true });
    });

    it("directed: out(u) against in(v)", () => {
        const fanIn = directedOn([
            ["a", "c"],
            ["b", "c"],
        ]);
        const fa = fanIn.ids.requireIndex("a");
        const fb = fanIn.ids.requireIndex("b");
        // out(a) = [c], in(b) = [] -- nothing points at b.
        expect(commonNeighborsScore(fanIn, fa, fb, { directed: true })).toBe(0);
        fanIn.validate({ checksum: true });

        const chain = directedOn([
            ["a", "c"],
            ["c", "b"],
        ]);
        const ca = chain.ids.requireIndex("a");
        const cb = chain.ids.requireIndex("b");
        // out(a) = [c], in(b) = [c].
        expect(commonNeighborsScore(chain, ca, cb, { directed: true })).toBe(1);
        chain.validate({ checksum: true });
    });

    it("without { directed: true } a directed snapshot merges the two OUT rows", () => {
        // s.rowPtr / s.colIdx of a directed snapshot are the out rows, and the default sets
        // bwd = s, so this is out(a) against out(b) -- both [c].
        const fanIn = directedOn([
            ["a", "c"],
            ["b", "c"],
        ]);
        const a = fanIn.ids.requireIndex("a");
        const b = fanIn.ids.requireIndex("b");
        expect(commonNeighborsScore(fanIn, a, b)).toBe(1);
        fanIn.validate({ checksum: true });
    });

    it("counts a repeated neighbour once (the adjacent-skip idiom)", () => {
        // GraphBuilder's duplicateEdges default is "keep" (graph-format/src/builder/graph-builder.ts:117),
        // so this really is a multigraph: row(a) is [c, c]. The skip loops after a match are what
        // give simple-graph semantics without calling simplified().
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        b.addEdge("a", "c");
        b.addEdge("a", "c");
        b.addEdge("b", "c");
        const s = b.freeze({ label: "multi", checksum: true });
        expect(commonNeighborsScore(s, s.ids.requireIndex("a"), s.ids.requireIndex("b"))).toBe(1);
        s.validate({ checksum: true });
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed && npm run lint`
Expected: all six indexed test files green (`common-neighbors.test.ts` is 6 passed); `eslint` and `tsc --noEmit` clean.

- [ ] **Step 7: Prove the published bundle leaves graph-format external, and the examples' bundle does not**

This is the assertion Task M8a-T2 could not make: until this task nothing under `algorithms/src/` imported the format, so the bundle contained neither an import specifier nor an inlined copy.

Run:

```bash
cd AT/algorithms
npm run build && npm run build:bundle
grep -c 'from "@graphty/graph-format"' dist/algorithms.js              # >= 1: one bare import specifier
grep -c "SNAPSHOT_BRAND" dist/algorithms.js                            # 0: the format's internals are NOT inlined
grep -c 'from "@graphty/graph-format"' dist/algorithms.standalone.js   # 0: nothing bare in the examples' bundle
grep -c "SNAPSHOT_BRAND" dist/algorithms.standalone.js                 # >= 1: the format IS inlined there
```

Expected: as commented. `SNAPSHOT_BRAND` is the honest probe for "was the format inlined": it is defined only inside graph-format (`graph-format/src/constants.ts:37`) and is never named by algorithms' own source. Do NOT probe with `GraphBuilder` -- `src/indexed/to-snapshot.ts` imports it as a VALUE, so the externalised bundle emits `import { GraphBuilder } from "@graphty/graph-format"` and the name appears in `dist/algorithms.js` whether or not anything was inlined.

If the first count is 0 and the second is non-zero, edit (a) of Task M8a-T2 Step 3 did not land; if the third count is non-zero, edit (b) did not.

- [ ] **Step 8: Commit (owner)** -- `feat(algorithms): port six algorithms to graph-format snapshots under the indexed namespace` (91 characters; every subject in this plan was measured with `printf '%s' "$s" | wc -c`, and `tools/commit-changes.sh:472` sets `SUBJECT_MAX=100`, which commitlint's `header-max-length` matches -- a longer subject is refused before anything is staged) through `tools/commit-changes.sh`. Tasks M8a-T5, M8a-T6 and M8a-T7 ride in one commit: the structures have no callers without the ports and the ports do not compile without the structures. The body says these are the six ports graph-format design 14.2 names -- four transcribed from its own code, two (Ports 4 and 5) specified there in prose and designed here -- names the three departures (DEP-8A-C, DEP-8A-D, DEP-8A-H), and states that no legacy function's first parameter has widened: the widening is A2's and waits.

---

### Task M8a-T8: indexed/accelerator.ts -- the result shapes, AlgorithmAccelerator, AcceleratedAlgorithms, accelerated()

**Repository:** `AT`.

**Files:**
- Create: `algorithms/src/indexed/accelerator.ts`
- NOT touched: `algorithms/src/indexed/index.ts` (PD-9: the accelerator is not in the namespace), every port file, `algorithms/src/index.ts` (Task M8a-T10)

**Interfaces:**
- Consumes: `F32`, `F64`, `GraphSnapshot`, `NumericVector`, `U32` from `@graphty/graph-format`; `indexed.*` through `import * as indexed from "./index.js"`; `SsspResult`, `SsspOptions`, `walkPredArcs`, `walkPredEdges` (Task M8a-T6); `PageRankOptions` (Task M8a-T7); `BfsOptions` (Task M8a-T6); `MstOptions` (Task M8a-T7).
- Produces: the twelve `*ResultLike` interfaces, `AlgorithmAccelerator`, `AcceleratedAlgorithms`, `accelerated(acc)`. This is the file design 9.2 declares (`webgpu-acceleration-plan.md:2903`) and the one Task M8a-T13 makes the GPU package import.

- [ ] **Step 1: The file**

Create `AT/algorithms/src/indexed/accelerator.ts`. The type block below is design 9.2's, lines 2907-2957, with FIVE changes and nothing else. Each one is ruled on elsewhere in this document; nothing here is decided in passing.

| # | Change against `webgpu-acceleration-plan.md:2907-2957` | Ruled by |
| --- | --- | --- |
| 1 | The option types of `pageRank`, `personalizedPageRank`, `breadthFirstSearch` and `sssp` are the real ones this phase created (`PageRankOptions` from `indexed/pagerank.ts`, `BfsOptions` from `indexed/bfs.ts`, `SsspOptions` from `indexed/dijkstra.ts`) instead of the design's same-named sketches. | PD-2 clause 1 |
| 2 | `bellmanFord` and `allPairsShortestPath` take `SsspOptions` where the design writes `BellmanFordOptions` (`:2935`) and `ApspOptions` (`:2939`); `hits`, `eigenvectorCentrality`, `katzCentrality`, `closenessCentrality`, `labelPropagation` and `louvain` take `HitsOptionsLike` where it writes `HitsOptions` (`:2928`), `EigenvectorOptions`, `KatzOptions`, `ClosenessOptions`, `LabelPropagationOptions` (`:2942`) and `LouvainOptions` (`:2944`); `betweennessCentrality` and `edgeBetweennessCentrality` take `BetweennessAcceleratorOptions` where it writes `BetweennessOptions`. | PD-2 clause 2, row by row |
| 3 | Two public types the design's block does not declare are declared here: `HitsOptionsLike` and `BetweennessAcceleratorOptions`. | PD-2's last two rows |
| 4 | `minimumSpanningTree` gains `options?: MstOptions`; the design declares it with no options parameter (`:2943`). | DEP-8A-G |
| 5 | `AcceleratedAlgorithms` carries the six methods whose ports exist, and its `sssp` returns the widened `SsspResult`. | DEP-8A-E, PD-3 |

```ts
/**
 * The accelerator seam of `@graphty/algorithms` (WebGPU design section 9.2,
 * `design/webgpu/webgpu-acceleration-plan.md:2901-2989`). It contains NO WebGPU types: an
 * accelerator is anything that satisfies `AlgorithmAccelerator` structurally, and this package
 * never imports the GPU package (design 9.1, the dependency direction).
 *
 * `accelerated(acc)` is the ONE dispatcher object (`webgpu-acceleration-plan.md:2959-2960`); the
 * spelling is `accelerated(acc).pageRank(s, options)`, never
 * `runAlgorithm(snapshot, { accelerator })`. There is no try/catch anywhere below: an accelerator
 * method that throws propagates its throw unchanged, because a silent CPU fallback would hide a
 * broken device behind a slow answer.
 * @module
 */

import type { F32, F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

import type { BfsOptions } from "./bfs.js";
import { type SsspOptions, type SsspResult, walkPredArcs, walkPredEdges } from "./dijkstra.js";
import * as indexed from "./index.js";
import type { MstOptions } from "./mst.js";
import type { PageRankOptions } from "./pagerank.js";

// ============================================================ result shapes (design 9.2 lines 2909-2922)
// Scores may be f32 (an accelerator) or f64 (the CPU ports), so every score field is NumericVector.

/** A score vector with its convergence report. @public */
export interface ScoresResultLike {
    readonly scores: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}
/** ScoresResultLike plus the mass held by dangling nodes. @public */
export interface PageRankResultLike extends ScoresResultLike {
    readonly danglingMass?: number | undefined;
}
/** The two HITS vectors with their convergence report. @public */
export interface HitsResultLike {
    readonly hubs: NumericVector;
    readonly authorities: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}
/** A partition: dense labels, a count, and the grouped node indices. @public */
export interface LabelResultLike {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}
/** A breadth-first traversal. @public */
export interface BfsResultLike {
    readonly depth: U32;
    readonly parent: U32;
    readonly order: U32;
    readonly visitedCount: number;
}
/** Single-source distances plus the relaxing arc per node. @public */
export interface SsspResultLike {
    readonly dist: NumericVector;
    readonly predArc: U32;
}
/** SsspResultLike plus the negative-cycle flag. @public */
export interface BellmanFordResultLike extends SsspResultLike {
    readonly hasNegativeCycle: boolean;
}
/** A per-logical-edge score vector. @public */
export interface EdgeScoresResultLike {
    readonly scores: NumericVector;
}
/** An all-pairs distance matrix, row-major, n by n. @public */
export interface ApspResultLike {
    readonly dist: NumericVector;
    readonly n: number;
}
/** Per-node coreness. @public */
export interface CorenessResultLike {
    readonly coreness: U32;
}
/** A spanning forest as logical edge indices. @public */
export interface MstResultLike {
    readonly edges: U32;
    readonly totalWeight: number;
}
/** A partition with its modularity. @public */
export interface CommunityResultLike extends LabelResultLike {
    readonly modularity: number;
}

// ============================================================ the injected object (design 9.2 lines 2925-2948)

/**
 * The structural contract an injected accelerator satisfies. EVERY member except `kind` is
 * optional: an accelerator declares only what it implements, and the dispatcher runs the CPU port
 * for everything else. The list is the design's, in full, so that an accelerator written against
 * it needs no change as the ports land.
 * @public
 */
export interface AlgorithmAccelerator {
    readonly kind: string;
    pageRank?(s: GraphSnapshot, options?: PageRankOptions): Promise<PageRankResultLike>;
    personalizedPageRank?(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptions,
    ): Promise<PageRankResultLike>;
    hits?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<HitsResultLike>;
    eigenvectorCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    katzCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    breadthFirstSearch?(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<BfsResultLike>;
    sssp?(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<SsspResultLike>;
    bellmanFord?(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<BellmanFordResultLike>;
    closenessCentrality?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<ScoresResultLike>;
    betweennessCentrality?(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<ScoresResultLike>;
    edgeBetweennessCentrality?(
        s: GraphSnapshot,
        options?: BetweennessAcceleratorOptions,
    ): Promise<EdgeScoresResultLike>;
    allPairsShortestPath?(s: GraphSnapshot, options?: SsspOptions): Promise<ApspResultLike>;
    kCoreDecomposition?(s: GraphSnapshot): Promise<CorenessResultLike>;
    triangleCount?(s: GraphSnapshot): Promise<{ readonly perNode: U32; readonly total: number }>;
    labelPropagation?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<LabelResultLike>;
    minimumSpanningTree?(s: GraphSnapshot, options?: MstOptions): Promise<MstResultLike>;
    louvain?(s: GraphSnapshot, options?: HitsOptionsLike): Promise<CommunityResultLike>;
    release?(s: GraphSnapshot): void;
    dispose?(): void;
}

/**
 * The option shape of the power-iteration family until each one's `indexed.*` port lands and
 * brings its real option type (plan decision PD-2's "NOT TOUCHED" rows). It is DELIBERATELY not
 * `Record<string, unknown>`: these three are the members every one of those algorithms takes, so
 * an accelerator can honour them today and the type narrows rather than widens as ports arrive.
 * @public
 */
export interface HitsOptionsLike {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/**
 * Betweenness options as the accelerator sees them: node INDICES, which is the only form that
 * means anything on a snapshot (plan decision PD-5).
 * @public
 */
export interface BetweennessAcceleratorOptions {
    readonly normalized?: boolean | undefined;
    readonly endpoints?: boolean | undefined;
    readonly sources?: readonly number[] | undefined;
    readonly k?: number | undefined;
}

// ============================================================ the dispatcher (design 9.2 lines 2950-2957)

/**
 * The async dispatcher: one method per accelerable `indexed.*` function. Each delegates to the
 * accelerator when it has the method and runs the CPU port otherwise, wrapped in `Promise.resolve`
 * so both paths are async and graphty-element's `async run()` adapters treat them alike.
 *
 * The list GROWS with the A2 ports -- each port PR adds its method. Today it carries the six whose
 * ports exist (plan departure DEP-8A-E).
 * @public
 */
export interface AcceleratedAlgorithms {
    readonly accelerator: AlgorithmAccelerator | null;
    pageRank(s: GraphSnapshot, options?: PageRankOptions): Promise<PageRankResultLike>;
    sssp(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<SsspResult>;
    breadthFirstSearch(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<BfsResultLike>;
    connectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents(s: GraphSnapshot): Promise<LabelResultLike>;
    minimumSpanningTree(s: GraphSnapshot, options?: MstOptions): Promise<MstResultLike>;
}

/**
 * Attach `pathTo` / `pathEdges` to an accelerator's bare `{ dist, predArc }`, so both paths return
 * the design's `SsspResult` and the element keeps ONE result-writing loop. The GPU package cannot
 * attach them itself: it must not depend on the CPU package at runtime (design 9.2 line 2971, D3).
 * @param s - The snapshot the search ran on
 * @param source - The search's source node index
 * @param like - The accelerator's result
 * @returns The decorated result
 */
function decorateSssp(s: GraphSnapshot, source: number, like: SsspResultLike): SsspResult {
    const { predArc } = like;
    return {
        dist: like.dist,
        predArc,
        pathTo: (target: number): U32 => walkPredArcs(s, predArc, source, target),
        pathEdges: (target: number): U32 => walkPredEdges(s, predArc, source, target),
    };
}

/**
 * Build the dispatcher for an accelerator, or for none.
 * @param acc - The injected accelerator, or `null` / `undefined` for the CPU path
 * @returns A dispatcher whose methods delegate where they can and run the CPU port otherwise
 * @public
 */
export function accelerated(acc: AlgorithmAccelerator | null | undefined): AcceleratedAlgorithms {
    return {
        accelerator: acc ?? null,
        pageRank: (s, options) =>
            acc?.pageRank !== undefined ? acc.pageRank(s, options) : Promise.resolve(indexed.pageRank(s, options)),
        sssp: (s, source, options) =>
            acc?.sssp !== undefined
                ? acc.sssp(s, source, options).then((like) => decorateSssp(s, source, like))
                : Promise.resolve(indexed.dijkstra(s, source, options)),
        breadthFirstSearch: (s, source, options) =>
            acc?.breadthFirstSearch !== undefined
                ? acc.breadthFirstSearch(s, source, options)
                : Promise.resolve(indexed.breadthFirstSearch(s, source, options)),
        connectedComponents: (s) =>
            acc?.connectedComponents !== undefined
                ? acc.connectedComponents(s)
                : Promise.resolve(indexed.connectedComponents(s)),
        weaklyConnectedComponents: (s) =>
            acc?.weaklyConnectedComponents !== undefined
                ? acc.weaklyConnectedComponents(s)
                : Promise.resolve(indexed.weaklyConnectedComponents(s)),
        minimumSpanningTree: (s, options) =>
            acc?.minimumSpanningTree !== undefined
                ? acc.minimumSpanningTree(s, options)
                : Promise.resolve(indexed.kruskalMST(s, options)),
    };
}
```

Three notes a reviewer will ask about.

`LabelResult` (the port's return type, `indexed/components.ts`) satisfies `LabelResultLike` structurally -- both carry `labels: U32`, `count: number` and a callable `groups(): U32[]` -- so no adapter is needed on the CPU branch and the type is NOT imported here (an unused `import type` is an ESLint error in this repository); Task M8a-T10's `test/types/accelerator.test-d.ts` is what asserts the structural match. `indexed.dijkstra` already returns a decorated `SsspResult`, so only the ACCELERATOR branch of `sssp` needs `decorateSssp`. And `acc?.x !== undefined ? acc.x(...)` is written twice per method rather than hoisted into a local, because hoisting loses the narrowing that makes `acc.x(...)` type-check without a non-null assertion.

- [ ] **Step 2: Compile it**

Run: `cd AT/algorithms && npm run lint`
Expected: `eslint` and `tsc --noEmit` both clean. Two failures point at a skipped step. `TS2339: Property 'pageRank' does not exist on type 'typeof import(".../indexed/index")'` means `indexed/index.ts` is missing a Port re-export (Task M8a-T7 Step 5). `TS2322` on the `connectedComponents` branch of `accelerated()` means the port's `LabelResult` and the seam's `LabelResultLike` have drifted -- both must carry `labels: U32`, `count: number` and a callable `groups(): U32[]`, and neither may add a required member the other lacks. `HitsOptionsLike` and `BetweennessAcceleratorOptions` are declared BELOW their first use on purpose: interface declarations hoist, and keeping the result shapes, then the accelerator, then the dispatcher in the design's own order is worth more than declaration-before-use.

- [ ] **Step 3: Checkpoint** -- no commit; Task M8a-T11's tests are the first thing to exercise this file and the two ride in one commit.

---

### Task M8a-T9: sources / k on BetweennessCentralityOptions, and the legacy guard

**Repository:** `AT`.

**Files:**
- Modify: `algorithms/src/algorithms/centrality/betweenness.ts:12-28` (the interface, restyled and extended per PD-6), plus a module-private guard and its three call sites -- the first statement of `betweennessCentrality` (declared `:204`), of `nodeBetweennessCentrality` (declared `:248`) and of `edgeBetweennessCentrality` (declared `:267`)
- Test: `algorithms/test/unit/indexed/betweenness-options.test.ts`
- NOT touched: `algorithms/src/algorithms/centrality/index.ts` (the type is already re-exported at `:5`), the Brandes implementation itself, `accumulateBetweenness` / `accumulateEdgeBetweenness` (module-private helpers, reached only through the three guarded entry points)

**Interfaces:**
- Consumes: nothing new.
- Produces: `BetweennessCentralityOptions` with five `readonly ... | undefined` members, the shape `webgpu-graph-algorithms/src/types/accelerator.ts:216-220` already mirrors on its side.

- [ ] **Step 1: Write the failing test**

Create `AT/algorithms/test/unit/indexed/betweenness-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
    type BetweennessCentralityOptions,
    betweennessCentrality,
    edgeBetweennessCentrality,
    nodeBetweennessCentrality,
} from "../../../src/algorithms/centrality/betweenness.js";
import { Graph } from "../../../src/core/graph.js";

function path(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    return g;
}

describe("BetweennessCentralityOptions sources / k", () => {
    it("accepts the index-space members at the type level", () => {
        const options: BetweennessCentralityOptions = { normalized: true, sources: [0, 1], k: 2 };
        expect(options.sources).toEqual([0, 1]);
        expect(options.k).toBe(2);
    });

    it("throws from every legacy entry point that is given them", () => {
        const g = path();
        expect(() => betweennessCentrality(g, { sources: [0] })).toThrow(/node INDICES/);
        expect(() => betweennessCentrality(g, { k: 1 })).toThrow(/node INDICES/);
        expect(() => nodeBetweennessCentrality(g, "b", { k: 1 })).toThrow(/node INDICES/);
        expect(() => edgeBetweennessCentrality(g, { sources: [0] })).toThrow(/node INDICES/);
    });

    it("leaves the existing three members working exactly as before", () => {
        const g = path();
        expect(betweennessCentrality(g, { normalized: false })["b"]).toBe(1);
        expect(betweennessCentrality(g)["a"]).toBe(0);
        expect(nodeBetweennessCentrality(g, "b")).toBe(1);
        expect(edgeBetweennessCentrality(g, { normalized: true }).size).toBe(2);
    });
});
```

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit/indexed/betweenness-options.test.ts`
Expected: FAIL -- the first case is a type error that vitest reports at runtime as a passing assertion (the object literal still has the properties), the second fails with "expected [Function] to throw error matching /node INDICES/ but it didn't". Run `npm run lint` as well: `tsc --noEmit` does NOT cover `test/`, so the type error in the first case is reported only by ESLint's type-aware pass, if at all -- this is exactly the gap Task M8a-T10's `tsconfig.typecheck.json` closes for the accelerator surface.

- [ ] **Step 2: The interface and the guard**

In `algorithms/src/algorithms/centrality/betweenness.ts` replace the whole block at `:12-28` with:

```ts
/**
 * Betweenness centrality options.
 *
 * Every member is `readonly` and carries `| undefined`: the GPU package compiles this declaration
 * a second time under `exactOptionalPropertyTypes`, where `sources?: readonly number[]` and
 * `sources?: readonly number[] | undefined` are different types (plan decision PD-6).
 */
export interface BetweennessCentralityOptions {
    /** Whether to normalize the centrality values (default: false) */
    readonly normalized?: boolean | undefined;
    /** Whether to use endpoints in path counting (default: false) */
    readonly endpoints?: boolean | undefined;
    /** Whether to use optimized BFS implementation for large graphs */
    readonly optimized?: boolean | undefined;
    /**
     * Sampled betweenness: the source NODE INDICES to run from. Indices are meaningful only against
     * a `GraphSnapshot`, so the legacy `Graph`-taking entry points below THROW when this is set.
     */
    readonly sources?: readonly number[] | undefined;
    /** Sampled betweenness: how many sources to draw when `sources` is not given. */
    readonly k?: number | undefined;
}

/**
 * Refuse the index-space options on a path that has no index space.
 *
 * Ignoring them would be the expensive silence: a caller asking for a 128-source sample would get
 * an exact all-sources run, correct and a thousand times too slow, with no signal at all.
 * @param options - The caller's options
 * @param fn - The entry point's name, for the message
 */
function rejectIndexOptions(options: BetweennessCentralityOptions, fn: string): void {
    if (options.sources !== undefined || options.k !== undefined) {
        throw new Error(
            `${fn}: 'sources' and 'k' are node INDICES and are meaningful only against a GraphSnapshot; ` +
                "call accelerated(accelerator).betweennessCentrality(snapshot, options) instead",
        );
    }
}
```

Then add one line as the first statement of each of the three public entry points. ANCHOR ON THE TEXT, not on a line number -- the interface edit above changes every number below it, and the declarations' own line numbers (`:204`, `:248`, `:267`) name the `export function` line, not the body:

| Entry point | Insert `rejectIndexOptions(options, "<name>");` | Immediately before |
| --- | --- | --- |
| `betweennessCentrality` | `rejectIndexOptions(options, "betweennessCentrality");` | `const nodes = Array.from(graph.nodes()).map((node) => node.id);` |
| `nodeBetweennessCentrality` | `rejectIndexOptions(options, "nodeBetweennessCentrality");` | `if (!graph.hasNode(targetNode)) {` |
| `edgeBetweennessCentrality` | `rejectIndexOptions(options, "edgeBetweennessCentrality");` | `const nodes = Array.from(graph.nodes()).map((node) => node.id);` |

`nodeBetweennessCentrality` delegates to `betweennessCentrality` (`allCentralities = betweennessCentrality(graph, options)`), so without its own guard it would still throw -- but with the OUTER function's name in the message. Its own guard fires first and names the function the caller actually called.

Nothing that compiles today can reach the throw: `sources` and `k` are not members of the interface on master (`betweenness.ts:15-28`, three members), so only an untyped JavaScript caller inventing the fields can trigger it, and that caller is asking for something the function cannot do.

- [ ] **Step 3: Green check**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default test/unit && npm run lint`
Expected: the new file green and every existing centrality test unchanged -- `test/unit/betweenness-centrality.test.ts` in particular, which exercises all three entry points with the old option shape. If it moves, the guard was placed after work rather than first, or `readonly` was added to a member some internal caller assigns to.

- [ ] **Step 4: Commit (owner)** -- `feat(algorithms): express sampled betweenness on the shared option type` through `tools/commit-changes.sh`. The body says: `sources` and `k` are node indices and only mean something against a snapshot, so the three legacy entry points throw rather than silently running exactly; the whole interface moves to one `readonly ... | undefined` style because the GPU package compiles it under `exactOptionalPropertyTypes`; no existing member's meaning changed.

---

### Task M8a-T10: The root barrel, the type-surface compile and knip

**Repository:** `AT`.

**Files:**
- Modify: `algorithms/src/index.ts` (the namespace line, the accelerator exports, the shadowing comment at `:28`)
- Modify: `algorithms/package.json:49` (`lint` gains the second `tsc`)
- Modify: `algorithms/project.json:38-44` (the `lint` target's hardcoded `"command": "eslint && tsc --noEmit"` becomes `"command": "npm run lint"`, so the nx target and the npm script cannot drift)
- Create: `algorithms/tsconfig.typecheck.json`, `algorithms/test/types/accelerator.test-d.ts`
- Modify: `knip.config.ts:72` (the algorithms `entry` list gains `test/types/**/*.test-d.ts`)
- NOT touched: `algorithms/tsconfig.json`, `algorithms/tsconfig.build.json`; `algorithms/project.json`'s `lint` target gains no `dependsOn` (PD-8) -- only its command string changes

**Interfaces:**
- Consumes: everything Tasks M8a-T3 and M8a-T5..T9 produced.
- Produces: the package's public surface -- `indexed` as a namespace, the accelerator symbols flat, `toSnapshot` flat -- plus a second `tsc` pass that actually checks the one file asserting it.

- [ ] **Step 1: The barrel**

In `algorithms/src/index.ts`, annotate the existing shadowing hazard by replacing the bare `    PageRankOptions,` at `:28` with

```ts
    // NOTE: this explicit re-export SHADOWS the `PageRankOptions` that `export * from
    // "./algorithms/index.js"` below re-exports from centrality/pagerank.ts, which is the one
    // pageRank() actually takes. The two differ (`alpha` here, `dampingFactor` there), so
    // `const o: PageRankOptions = { alpha: 0.9 }` compiles and is silently ignored. Neither is
    // changed during the dual-API window (graph-format design 14.1 rule 1); this one is removed at
    // 2.0. See design/decisions/2026-09-19-pagerank-options-shadowing.md.
    PageRankOptions,
```

and append after the existing `export * from "./optimized/index.js";` at `:44`:

```ts
// Index-based implementations over @graphty/graph-format snapshots (graph-format design 14.1 rule 2).
// A NAMESPACE, not a flat re-export: indexed.pageRank, indexed.dijkstra, indexed.breadthFirstSearch,
// indexed.connectedComponents and indexed.kruskalMST all collide by name with the legacy functions above.
export * as indexed from "./indexed/index.js";

// The graph-format bridge (graph-format design 14.6 row A1).
export { toSnapshot } from "./indexed/to-snapshot.js";

// The accelerator seam (design/webgpu/webgpu-acceleration-plan.md section 9.2). Flat, NOT through the
// namespace: the GPU package writes `import type { AlgorithmAccelerator } from "@graphty/algorithms"`.
export { accelerated } from "./indexed/accelerator.js";
export type {
    AcceleratedAlgorithms,
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
} from "./indexed/accelerator.js";
export type { BfsOptions, BfsResult } from "./indexed/bfs.js";
export type { CommonNeighborsOptions } from "./indexed/common-neighbors.js";
export type { LabelResult } from "./indexed/components.js";
export type { SsspOptions, SsspResult } from "./indexed/dijkstra.js";
export type { MstOptions, MstResult } from "./indexed/mst.js";
// Aliased: the flat names are taken twice over (types/index.ts:96 and centrality/pagerank.ts:15).
export type {
    PageRankOptions as IndexedPageRankOptions,
    PageRankResult as IndexedPageRankResult,
} from "./indexed/pagerank.js";
```

Verified before writing this list: none of `BfsOptions`, `BfsResult`, `LabelResult`, `MstOptions`, `MstResult`, `SsspOptions`, `SsspResult`, `CommonNeighborsOptions`, `accelerated`, `toSnapshot`, `AlgorithmAccelerator` or any `*ResultLike` name is exported anywhere in `algorithms/src/` today. `MstResult` sits one capital away from the existing `MSTResult` (`types/index.ts`, in the barrel's explicit list at `:25`); TypeScript is case-sensitive so they coexist, and the alias-free name is kept because it has to match `MstResultLike`.

- [ ] **Step 2: The type-surface compile**

Create `AT/algorithms/tsconfig.typecheck.json`:

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "composite": false,
        "noEmit": true
    },
    "include": ["src/**/*.ts", "algorithms.ts", "test/types/**/*.test-d.ts"],
    "exclude": ["node_modules", "dist", "coverage", "tmp"]
}
```

In `algorithms/package.json` change `"lint": "eslint && tsc --noEmit"` to `"lint": "eslint && tsc --noEmit && tsc -p tsconfig.typecheck.json"`.

Then, in `algorithms/project.json`, change the `lint` target (`:38-44`) from

```json
        "lint": {
            "executor": "nx:run-commands",
            "options": {
                "command": "eslint && tsc --noEmit",
                "cwd": "algorithms"
            }
        },
```

to

```json
        "lint": {
            "executor": "nx:run-commands",
            "options": {
                "command": "npm run lint",
                "cwd": "algorithms"
            }
        },
```

This one is easy to skip and skipping it makes the whole task decorative. The nx target does NOT delegate to the npm script today: it repeats the command string, and CI runs the TARGET -- `pnpm exec nx affected -t lint` on a PR (`.github/workflows/ci.yml:96`) and `pnpm exec nx run-many -t lint` on master (`:113`). With the string left hardcoded, the new `tsc -p tsconfig.typecheck.json` pass would run only under `tools/prepush.sh:63` (`pnpm -r run lint`), locally, and `test/types/accelerator.test-d.ts` -- the single artefact that proves the whole design 9.2 type surface -- would be unguarded on every pull request and on master, while the G6 record below claimed a green lane that never executed the check. Delegating to the npm script also removes the drift for good: there is then one definition of what linting algorithms means. The `dependsOn` question is untouched and PD-8's ruling stands -- this target still has none. `layout/project.json:38-44` has the same hardcoded shape and the same trap one line away; it is NOT changed here, because layout has no second `tsc` pass to lose and a drive-by edit to another package's target does not belong in this commit.

Create `AT/algorithms/test/types/accelerator.test-d.ts`:

```ts
// Compiled by `tsc -p tsconfig.typecheck.json` inside `npm run lint`, never executed. Imports go
// through the package barrel, as the GPU package's equivalent files do, so what is pinned here is
// the PUBLIC surface rather than a source path.
import type { GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";
import { expectTypeOf } from "vitest";

import {
    accelerated,
    type AcceleratedAlgorithms,
    type AlgorithmAccelerator,
    type BfsResultLike,
    indexed,
    type LabelResultLike,
    type MstResultLike,
    type PageRankResultLike,
    type ScoresResultLike,
    type SsspResult,
    type SsspResultLike,
    toSnapshot,
} from "../../src/index.js";

declare const s: GraphSnapshot;
declare const acc: AlgorithmAccelerator;

// ---- the shapes design 9.2 fixes
expectTypeOf<ScoresResultLike["scores"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<PageRankResultLike>().toMatchTypeOf<ScoresResultLike>();
expectTypeOf<PageRankResultLike["danglingMass"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<LabelResultLike["labels"]>().toEqualTypeOf<U32>();
expectTypeOf<LabelResultLike["groups"]>().returns.toEqualTypeOf<U32[]>();
expectTypeOf<BfsResultLike["depth"]>().toEqualTypeOf<U32>();
expectTypeOf<SsspResultLike["dist"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<MstResultLike["edges"]>().toEqualTypeOf<U32>();

// ---- every accelerator member is optional but `kind`
expectTypeOf<AlgorithmAccelerator["kind"]>().toBeString();
expectTypeOf<AlgorithmAccelerator>().toMatchTypeOf<{ readonly kind: string }>();
// `kind` is the ONLY required member: an accelerator with nothing else still satisfies the type.
const minimal: AlgorithmAccelerator = { kind: "fake" };
expectTypeOf(minimal).toMatchTypeOf<AlgorithmAccelerator>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().parameter(0).toEqualTypeOf<GraphSnapshot>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().returns.resolves.toEqualTypeOf<PageRankResultLike>();

// ---- the dispatcher: six methods, and sssp returns the DECORATED result (plan decisions PD-3, DEP-8A-E)
expectTypeOf(accelerated).parameter(0).toEqualTypeOf<AlgorithmAccelerator | null | undefined>();
expectTypeOf(accelerated).returns.toEqualTypeOf<AcceleratedAlgorithms>();
expectTypeOf(accelerated(acc).accelerator).toEqualTypeOf<AlgorithmAccelerator | null>();
expectTypeOf(accelerated(acc).sssp(s, 0)).resolves.toEqualTypeOf<SsspResult>();
expectTypeOf<SsspResult["pathEdges"]>().returns.toEqualTypeOf<U32>();
expectTypeOf(accelerated(null).pageRank(s)).resolves.toMatchTypeOf<ScoresResultLike>();

// ---- the CPU port's own result satisfies the shared shape, with no adapter
expectTypeOf(indexed.connectedComponents(s)).toMatchTypeOf<LabelResultLike>();
expectTypeOf(indexed.kruskalMST(s)).toMatchTypeOf<MstResultLike>();
expectTypeOf(indexed.dijkstra(s, 0)).toMatchTypeOf<SsspResultLike>();

// ---- the bridge keeps its legacy parameter and is NOT in the namespace
expectTypeOf(toSnapshot).returns.toEqualTypeOf<GraphSnapshot>();
```

In `knip.config.ts`, change the algorithms workspace's `entry` at `:72` from
`entry: ["src/index.ts", "test/**/*.test.ts", "examples/**/*.ts", "scripts/**/*.{ts,js}"],`
to
`entry: ["src/index.ts", "test/**/*.test.ts", "test/types/**/*.test-d.ts", "examples/**/*.ts", "scripts/**/*.{ts,js}"],`
matching the line the webgpu workspace already carries at `knip.config.ts:60`.

- [ ] **Step 3: Run everything**

Run:

```bash
cd AT/algorithms
npm run lint                                                    # eslint, then two tsc passes, all clean
npm run build                                                   # tsc; the probe below imports what it writes
node -e "import('./dist/algorithms.js').then((m) => console.log(typeof m.accelerated, typeof m.toSnapshot, typeof m.indexed.pageRank))"   # function function function
cd .. && pnpm exec knip --workspace algorithms                  # no findings
pnpm exec nx run algorithms:lint                                # the lane CI actually runs; must now do all three passes
```

Expected: as commented. `npm run build` is a real step, not a parenthetical: a fresh worktree has no `dist/` (it is gitignored) and the `node -e` probe would otherwise fail with `ERR_MODULE_NOT_FOUND`. `tsc -p tsconfig.typecheck.json` is the pass that fails if any `expectTypeOf` above is wrong; the plain `tsc --noEmit` never sees `test/`, which is why the second pass exists (PD-10). The last line is the one that proves the CI lane is covered -- `nx run algorithms:lint` must print the same three passes as `npm run lint`; if it prints only two, the `project.json` edit above did not land. If knip reports the `*ResultLike` types as unused exports, add the `@public` tag with its clause at the declaration (they already carry one in the file Task M8a-T8 wrote) -- never an ignore pattern, per `knip.config.ts`'s own comment block.

- [ ] **Step 4: Checkpoint** -- no commit; the barrel is meaningless without Task M8a-T11's tests and the two ride together.

---

### Task M8a-T11: The fake-accelerator tests

**Repository:** `AT`.

**Files:**
- Test: `algorithms/test/unit/indexed/accelerated.test.ts`
- NOT touched: everything else

**Interfaces:**
- Consumes: `accelerated`, `AlgorithmAccelerator`, `toSnapshot`, `indexed` from `../../../src/index.js`.
- Produces: the three proofs design 9.2 asks for (`webgpu-acceleration-plan.md:2986-2989`) -- delegation, the CPU path, and a throw that propagates unchanged.

- [ ] **Step 1: The tests**

Create `AT/algorithms/test/unit/indexed/accelerated.test.ts`:

```ts
import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { accelerated, type AlgorithmAccelerator, type PageRankResultLike, toSnapshot } from "../../../src/index.js";
import { Graph } from "../../../src/core/graph.js";

// No vi.fn anywhere: algorithms has no mock-injection convention (plan decision PD-13) and a plain
// literal with a closed-over call log proves everything the design asks for.
function cycle(): GraphSnapshot {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    return toSnapshot(g);
}

describe("accelerated(acc)", () => {
    it("delegates to a method the accelerator has", async () => {
        const s = cycle();
        const calls: string[] = [];
        const fixture: PageRankResultLike = {
            scores: Float64Array.of(0.5, 0.25, 0.25),
            iterations: 7,
            converged: true,
            danglingMass: 0,
        };
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: (snapshot) => {
                calls.push("pageRank");
                expect(snapshot).toBe(s);
                return Promise.resolve(fixture);
            },
        };
        const result = await accelerated(fake).pageRank(s);
        expect(calls).toEqual(["pageRank"]);
        expect(result).toBe(fixture);
        expect(result.iterations).toBe(7);
    });

    it("runs the CPU port for a method the accelerator does NOT have", async () => {
        const s = cycle();
        const bare: AlgorithmAccelerator = { kind: "fake" };
        const result = await accelerated(bare).pageRank(s);
        expect(result.scores).toBeInstanceOf(Float64Array);
        expect(result.scores.length).toBe(3);
        let sum = 0;
        for (let i = 0; i < result.scores.length; i++) {
            sum += result.scores[i];
        }
        expect(sum).toBeCloseTo(1, 9);
    });

    it("runs the CPU port for null and for undefined, and reports the accelerator as null", async () => {
        const s = cycle();
        expect(accelerated(null).accelerator).toBeNull();
        expect(accelerated(undefined).accelerator).toBeNull();
        const viaNull = await accelerated(null).connectedComponents(s.toUndirected().snapshot);
        expect(viaNull.count).toBe(1);
    });

    it("lets a throwing accelerator method propagate unchanged -- there is no fallback", async () => {
        const s = cycle();
        const boom = new Error("E_DEVICE_LOST");
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: () => Promise.reject(boom),
        };
        await expect(accelerated(fake).pageRank(s)).rejects.toBe(boom);

        const throwsSync: AlgorithmAccelerator = {
            kind: "fake",
            connectedComponents: () => {
                throw boom;
            },
        };
        expect(() => accelerated(throwsSync).connectedComponents(s)).toThrow(boom);
    });

    it("decorates an accelerator's bare SSSP result with pathTo and pathEdges", async () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 1);
        g.addEdge("a", "c", 5);
        const s = toSnapshot(g);
        const a = s.ids.requireIndex("a");
        const c = s.ids.requireIndex("c");
        // The fake returns exactly what a GPU would: an f32 dist and the relaxing arcs, nothing else.
        const cpu = await accelerated(null).sssp(s, a);
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            sssp: () =>
                Promise.resolve({ dist: Float32Array.from(cpu.dist), predArc: cpu.predArc }),
        };
        const decorated = await accelerated(fake).sssp(s, a);
        expect(decorated.dist).toBeInstanceOf(Float32Array);
        expect([...decorated.pathTo(c)]).toEqual([...cpu.pathTo(c)]);
        expect([...decorated.pathEdges(c)]).toEqual([...cpu.pathEdges(c)]);
        expect(decorated.pathEdges(c).length).toBe(2); // a->b->c, not the direct weight-5 edge
    });

    it("carries exactly the six methods whose ports exist", () => {
        const dispatcher = accelerated(null) as unknown as Record<string, unknown>;
        const methods = Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function");
        expect(methods.sort()).toEqual([
            "breadthFirstSearch",
            "connectedComponents",
            "minimumSpanningTree",
            "pageRank",
            "sssp",
            "weaklyConnectedComponents",
        ]);
    });
});
```

The last case is the one that keeps the design's "additive at every step" rule honest: a port PR that adds a method to `AcceleratedAlgorithms` and forgets to add it to `accelerated()` fails here, and a PR that adds it to both has to update this list deliberately.

- [ ] **Step 2: Green check**

Run: `cd AT/algorithms && pnpm exec vitest run --project=default && npm run lint && pnpm exec vitest run --project=default --coverage`
Expected: the whole default project green; lint clean (three passes); coverage at or above 80 / 80 / 75 / 80 with `src/indexed/**` near 100. The throwing-sync case is the one to watch: `accelerated(throwsSync).connectedComponents(s)` throws SYNCHRONOUSLY because the dispatcher calls `acc.connectedComponents(s)` without awaiting -- that is the design's behaviour, not a bug, and the assertion says so.

- [ ] **Step 3: Commit (owner)** -- `feat(algorithms): add the accelerator seam and the accelerated() dispatcher` through `tools/commit-changes.sh` (Tasks M8a-T8, M8a-T10 and M8a-T11 ride in one commit; the barrel, the types and the tests are one reviewable unit). The body says: `accelerated(acc)` is the ONE injection spelling (`webgpu-acceleration-plan.md:2959-2960`, restated in the M8a deliverables cell of `2026-09-16-graphty-monorepo-integration.md:3268`), the dispatcher carries the six methods whose `indexed.*` ports exist and grows with each later port, `sssp` is decorated with `pathTo` / `pathEdges` because the GPU package cannot attach them itself (D3), and there is no try/catch: a throwing accelerator method propagates.

---

### Task M8a-T12: The two decision records and the corpus index

**Repository:** `AT`.

**Files:**
- Create: `design/decisions/2026-09-19-a1-lands-inside-m8a.md`, `design/decisions/2026-09-19-pagerank-options-shadowing.md`
- Modify: `design/decisions/README.md:29-32` (two rows appended to the index table)
- NOT created: any G12 record. `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` is owned by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`, which is the plan whose gate G12 is; DEP-8A-F cites that file. The M6 plan cites it too. One record, one filename.
- Modify: `design/webgpu/README.md:7-16` (one row for this plan file)
- Modify: `design/README.md:14`, `:21` (the per-directory file counts: `decisions/` 2 -> 4, `webgpu/` 8 -> 9)
- NOT touched: `design/graph-format/graph-format-design.md`, `design/webgpu/webgpu-acceleration-plan.md`, and both Review logs. `design/decisions/README.md:14-21` retired that practice on 2026-09-19 after three branches collided on the shared end of one file.

**Interfaces:**
- Consumes: the record template of `design/decisions/2026-09-19-no-nightly-gpu-lane.md` (H1 with no trailing period; `Date:` / `Decided by:` / `Changes:` block whose last sentence says the superseded sections are NOT edited; then `## The decision`, `## Why`, `## What we are giving up, and why it is acceptable`, `## What would reverse this`, optionally `## What still exists`).
- Produces: two records and three index rows.

- [ ] **Step 1: A1 lands inside M8a**

Create `design/decisions/2026-09-19-a1-lands-inside-m8a.md`, hard-wrapped at about 95 columns. H1: `A1 lands inside phase M8a, together with the first six indexed ports`. `Changes:` names `design/graph-format/graph-format-design.md` 14.6 rows A1 (branch), A1 (merge) and A2, and `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3267`'s M8a entry criterion; those are NOT edited and this record supersedes them.

`## The decision` says: A1's content is unchanged -- `Graph.mutationCount`, `toSnapshot(Graph)` with `weightDtype: "f64"`, the differential harness, public signatures untouched -- and its ORDER changes: it is executed in the same phase as the first A2 commit, on one branch, in one PR, rather than on an earlier branch of its own. The same phase also ports six `indexed.*` functions. Nothing else moves: A2 still owes the other 89 ports and the `Graph | GraphSnapshot` widening, and the six ports landing here do not make any legacy signature widen.

`## Why` carries the two facts from section 0.2 with their evidence: the A1 branch does not exist (`algorithms/package.json:140-142`, `design/graph-format/STATUS.md:1334`, `graph-format-design.md:4960`), and a literally-scoped M8a would ship a dispatcher with zero methods, which is the design's own arithmetic (`webgpu-acceleration-plan.md:2963-2965`). It names the precedent: D-F2-GATE took the same 14.6 gate out of order on 2026-09-18 and closed with "A1 keeps its 14.6 content; only its ORDER relative to F2 changes."

`## What we are giving up, and why it is acceptable` is the honest half, and it quotes what 14.6 gets right: an A1 branch reviewed alone is a conversion reviewed alone, and merging it before anything consumes it means a bug in `toSnapshot` is found by the harness rather than by a port. Merged together, a differential failure could be blamed on a port instead. That is acceptable because the harness of Task M8a-T4 is committed BEFORE any port (its own commit, `feat(algorithms): convert a legacy Graph...`), so a bisect still separates the two, and because the alternative is that nothing moves at all: M6 and M7 both sit behind M8a.

`## What would reverse this` lists: a second consumer needs `toSnapshot` before the ports are ready (then cut A1 out as its own PR from this branch); or the differential harness finds a format-level problem that takes more than a day (then A1 becomes its own PR and the ports wait). One slow afternoon is not evidence; a week is.

- [ ] **Step 2: The PageRankOptions shadowing**

Create `design/decisions/2026-09-19-pagerank-options-shadowing.md`. H1: `The shadowed PageRankOptions stays until 2.0`. `Changes:` names nothing in a design -- this records a code fact -- and says so.

`## The decision`: both declarations survive the dual-API window; `algorithms/src/index.ts:28` gains a comment naming the shadowing; the indexed side gets a third declaration under `indexed.PageRankOptions`, aliased `IndexedPageRankOptions` flat; at 2.0, when the facades go (14.6's 2.0 row, `graph-format-design.md:4260`), `algorithms/src/types/index.ts:96` is the one deleted.

`## Why`: the mechanism, verified rather than assumed. An explicit named re-export shadows a star re-export, so the public `PageRankOptions` is the four-member one at `types/index.ts:96` while `pageRank()` at `pagerank.ts:83` takes the seven-member one at `pagerank.ts:15`. `const o: PageRankOptions = { alpha: 0.9 }; pageRank(g, o);` COMPILES -- weak-type detection does not fire because the two share `maxIterations`, `tolerance` and `personalization`, and excess-property checking does not apply to a typed variable -- and the damping factor silently stays at 0.85 (`pagerank.ts:76`). `tsc --noEmit` passes today, so this is live.

`## What we are giving up, and why it is acceptable`: users keep hitting the silent default until 2.0. Acceptable because the alternative is worse in kind: deleting `types/index.ts:96` changes what `import type { PageRankOptions }` resolves to, from a four-member type to a seven-member one, which is a breaking change that happens to look like a fix -- the most dangerous shape a change can have on a 1.x package.

`## What would reverse this`: a bug report from a real user who passed `alpha` and got 0.85, or a second option type found to be shadowed the same way. Either one buys a `feat!:` and a major.

- [ ] **Step 3: G12's nightly clause is CITED, not recorded again**

Write nothing. The restatement DEP-8A-F relies on lives in `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`, created by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`. M7 owns it because G12 is M7's gate; M8a's gates are the G6 and G10 algorithms clauses plus the 14.6 A1 gate string, none of which mentions a nightly. The M6 plan cites the same file (its DEP-M6-I) and the M8b plan defers to it in its section 0.7, so the whole programme has ONE record under ONE filename.

Nothing in this phase is blocked on it: M8a does not invoke G12, so the record may land before or after this PR. The only thing this step produces is the citation already written into DEP-8A-F.

Run: `cd AT && grep -rn "nightly" design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md`
Expected: every hit is inside DEP-8A-F or this step, and every one of them points at `2026-09-19-no-nightly-gpu-lane.md` or `2026-09-19-g12-without-the-nightly-clause.md`. A hit that asserts a nightly soak as a live gate clause is a document that was not reconciled.

- [ ] **Step 4: The three index rows**

Append to `design/decisions/README.md`'s table, in the order the records were written:

```markdown
| [2026-09-19-a1-lands-inside-m8a.md](2026-09-19-a1-lands-inside-m8a.md) | A1 lands inside phase M8a, together with the first six indexed ports |
| [2026-09-19-pagerank-options-shadowing.md](2026-09-19-pagerank-options-shadowing.md) | The shadowed PageRankOptions stays until 2.0 |
```

The `Decision` cell is each record's H1 verbatim, which is the convention the two existing rows follow.

Append to `design/webgpu/README.md`'s table, after the integration-plan row at `:12`:

```markdown
| `plans/2026-09-19-webgpu-m8a-algorithms-seam.md`                                | Phase M8a: the graph-format bridge (A1), the first six `indexed.*` ports, `indexed/accelerator.ts` with `accelerated()`, and the GPU package's W1b algorithms half                                                                                                                | live plan     |
```

That table is prettier-formatted (padded columns) unlike the plans themselves; match the existing padding.

In `design/README.md` change the `decisions/` count at `:14` from **2 to 4** and the `webgpu/` count at `:21` from **8 to 9**.

Read both cells before editing, and do not derive either from a rule: the two rows count differently today and the plan does not "fix" that here. `:14` currently ends `never edited after it lands | 2 |` while `design/decisions/` holds THREE tracked files (two records plus its README), so that cell counts records and excludes the README -- the TWO new records of this task take it to 4. `:21` currently reads `8` and `git ls-files design/webgpu | wc -l` is also 8, so that cell includes the README -- this plan file takes it to 9.

**Both cells are shared lines that four plans of 2026-09-19 bump, so neither number may be copied from this paragraph.** The resolution rule is the same one Task M7-T1 Step 3 states and it is NOT "take one side": re-run the two commands in the tree being committed and copy THEIR output.

```bash
cd AT
find design/webgpu -name '*.md' | wc -l       # the number design/README.md's webgpu/ cell must carry
ls design/decisions/*.md | grep -cv README    # the number its decisions/ cell must carry
```

The corpus-table rows do not collide, because each plan adds its own line.

- [ ] **Step 5: ASCII and link check**

Run:

```bash
cd AT
LC_ALL=C grep -rnP '[^\x00-\x7F]' design/decisions/ design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md   # no output
ls design/decisions/*.md | grep -cv README                                                                         # 4 (two existing records plus this task's two)
grep -c '^| \[' design/decisions/README.md                                                                         # 4 (two existing rows plus two)
sed -n '14p' design/README.md | grep -oP '\| \d+ \|$'                                                              # the same number the line above printed
sed -n '21p' design/README.md | grep -oP '\| \d+ \|$'                                                              # one more than before the edit
```

Expected: as commented. Any hit from the first command is a smart quote or an em dash that has to be spelled `--` or `'` before the commit. The last two lines are what catch a mis-typed count: `ls | wc -l` and `grep -c '^| \['` check the directory and the decisions index, and neither one looks at `design/README.md`'s cells at all.

- [ ] **Step 6: Commit (owner)** -- `docs: record the A1 ordering and the PageRankOptions shadowing` through `tools/commit-changes.sh`, scope `docs`. The plan file itself and the three README edits ride in the same commit. No G12 record is in this commit: Task M7-T1 Step 2 carries it. No design document is edited in place: `design/decisions/README.md:14-21` retired that practice.

---

### Task M8a-T13: The GPU package's W1b algorithms half

**Repository:** `AT`. **GATED (PD-12): do not start until `feat/webgpu-layout-types` (Phase M5b) is on master.** Check with `git log --oneline origin/master -1 -- webgpu-graph-algorithms/src/types/accelerator.ts` and `git show origin/master:webgpu-graph-algorithms/project.json | grep implicitDependencies` -- the second must print `"implicitDependencies": ["!algorithms"],` with no `"!layout"`. If it prints both negations, STOP and tell the owner to land M5b first.

**Files:**
- Modify: `webgpu-graph-algorithms/package.json` devDependencies (one entry)
- Modify: `webgpu-graph-algorithms/tsconfig.json` paths (one entry), `webgpu-graph-algorithms/tsconfig.strict-consumer.json` paths (one entry)
- Modify: `webgpu-graph-algorithms/src/types/accelerator.ts` (delete `CpuAlgorithmOptions` and the twelve `*ResultLike` and `AlgorithmAccelerator` mirrors; `import type` and re-export the real ones)
- Modify: `webgpu-graph-algorithms/src/index.ts:49-68` (drop `CpuAlgorithmOptions` from the export list)
- Modify: `webgpu-graph-algorithms/test/types/public-api.test-d.ts:14`, `:255`, `:278-280`
- Modify: `webgpu-graph-algorithms/test/types/conformance.test-d.ts` (append the algorithms half)
- Modify: `webgpu-graph-algorithms/project.json:7` (delete the `implicitDependencies` line)
- NOT touched: `webgpu-graph-algorithms/eslint.config.js` -- `src/types/accelerator.ts` is ALREADY the one file allowed to `import type` from `@graphty/algorithms` (`:153-170`, `CPU_PATHS_TYPES_ALLOWED`), so no zone changes and `test/layers.test.ts` does not move. Also NOT touched: `src/accelerator.ts` and every kernel. Two orders are possible and this task is written for both (M8b's PD-19, `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`). If Phase M8b has NOT landed, the GPU implements none of these methods and `src/accelerator.ts` has nothing to change. If M8b HAS landed, `GpuAccelerator` at the bottom of `src/types/accelerator.ts` already declares its seven P7 members and `src/accelerator.ts` already returns them -- leave both exactly as M8b left them. This task deletes the `AlgorithmAccelerator` / `*ResultLike` MIRRORS above `GpuAccelerator` and nothing else in the file, which is why the two phases merge rather than collide. Step 5's conformance compile is what proves the members still satisfy the real interface: M8b spells its option records member for member against this plan's `IndexedPageRankOptions` and `HitsOptionsLike` (M8b Task M8b-T1 Step 4), and its `connectedComponents` keeps its extra `ComponentsOptions` parameter OPTIONAL, which is what lets it satisfy this plan's `connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>`.

**Interfaces:**
- Consumes: `@graphty/algorithms`' flat accelerator exports (Task M8a-T10) through `../algorithms/dist/algorithms.d.ts`.
- Produces: a GPU package whose `AlgorithmAccelerator` IS the CPU package's declaration, asserted by identity rather than by assignability.

- [ ] **Step 1: The dependency and the two paths entries**

In `webgpu-graph-algorithms/package.json` add `"@graphty/algorithms": "workspace:^",` as the first devDependencies entry (above `"@graphty/layout": "workspace:^"`). It stays an OPTIONAL PEER as well -- the existing `peerDependencies` entry `"@graphty/algorithms": "^1.0.0"` with `peerDependenciesMeta.optional: true` is correct and unchanged (D27).

In both `webgpu-graph-algorithms/tsconfig.json` and `webgpu-graph-algorithms/tsconfig.strict-consumer.json` add to `paths`, beside the layout entry M5b added:

```json
            "@graphty/algorithms": ["../algorithms/dist/algorithms.d.ts"],
```

The target is the BUILT declaration, exactly as layout's is. `algorithms/dist/algorithms.d.ts` is a one-line shim (`export * from "./src/index.js";`) with the real declarations under `algorithms/dist/src/`, which resolves correctly; pointing at `../algorithms/src/index.ts` instead would pull algorithms' sources into the GPU package's program, and algorithms does not compile under `noUncheckedIndexedAccess` or `exactOptionalPropertyTypes`.

Run: `cd AT && HUSKY=0 pnpm install && pnpm exec nx run algorithms:build && ls -l webgpu-graph-algorithms/node_modules/@graphty/algorithms`
Expected: the install updates the lockfile, the build writes `algorithms/dist/algorithms.d.ts`, and the last command shows a symlink into `../../algorithms`.

- [ ] **Step 2: Delete the mirrors**

In `webgpu-graph-algorithms/src/types/accelerator.ts` replace the whole block from the comment at `:40-41` ("mirrors of @graphty/algorithms (spec 9.2); the option types named there do not exist before A2, so they are mirrored as empty-extensible records") through the end of `AlgorithmAccelerator` (`:204` on master; after M5b the line numbers shift, so anchor on the two comment markers, not on numbers) with:

```ts
// ---- the real @graphty/algorithms interfaces (spec 9.2, D27): imported at W1b now that A2's first
// commit exists, re-exported so this package's public surface is unchanged. `export type`, never a
// bare `export { ... }`: isolatedModules makes the bare form TS1205.

import type {
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
} from "@graphty/algorithms";

export type {
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
};
```

and update the file's header comment: the sentence "the ALGORITHMS mirrors stay structural until A2/M8a gives them something real to point at" that M5b left behind becomes "both halves are now `import type` of the real packages; `test/types/conformance.test-d.ts` is the cross-compile that holds them honest."

`CpuAlgorithmOptions` is deleted outright -- no alias, no `@deprecated` (PD-7). The `import type { F32, F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format"` line at `:9` loses `NumericVector` and `U32` if nothing else in the file uses them after the deletion; check with `tsc` rather than by eye, because `GpuAccelerator` at the bottom still names `GraphSnapshot` and `AcceleratorOptions` names neither.

In `webgpu-graph-algorithms/src/index.ts` delete the `CpuAlgorithmOptions,` line at `:57` and add `BetweennessAcceleratorOptions,` and `HitsOptionsLike,` in its place (alphabetical order: `BetweennessAcceleratorOptions` after `BellmanFordResultLike`, `HitsOptionsLike` before `HitsResultLike`), so the re-export list matches what the file now re-exports.

- [ ] **Step 3: The two type-test files**

In `webgpu-graph-algorithms/test/types/public-api.test-d.ts`: delete `type CpuAlgorithmOptions,` from the import list at `:14`; delete line `:255` (`expectTypeOf<CpuAlgorithmOptions>().toEqualTypeOf<Readonly<Record<string, unknown>>>();`); and replace the assertion at `:278-280` with

```ts
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>()
    .parameter(1)
    .toEqualTypeOf<IndexedPageRankOptions | undefined>();
```

adding `type IndexedPageRankOptions` to the file's `@graphty/algorithms` imports. Every other `*ResultLike` assertion in that file (lines 256-277) is UNCHANGED and is now checking the real declarations rather than the mirrors -- which is the whole point, and the reason not to delete them.

A deliberate departure from the letter of the P10 row, decided in PD-10 and repeated here because this is the step that would otherwise do the opposite: `webgpu-acceleration-plan.md:4217`'s DELIVERABLES cell says `test/types/conformance.test-d.ts` "is RETIRED" once the mirrors are deleted, and D27 (`:224`) says the `implements` clauses do the checking from W1 on. This plan KEEPS the file and appends to it, because the GATE cell of the same row asks for "the reverse compile" and the integration plan asks for "the conformance test's reverse compile" by name (`2026-09-16-graphty-monorepo-integration.md:3268`), and because an `implements` clause proves the GPU accelerator satisfies the CPU interface while proving nothing about whether what this package RE-EXPORTS is the CPU declaration or a re-introduced structural copy. The identity assertions below are the only guard on that, and retiring the file would delete them.

Append to `webgpu-graph-algorithms/test/types/conformance.test-d.ts` the algorithms half, mirroring the layout half M5b wrote:

```ts
// ---- the algorithms half of W1b (design 9.8's W1 row, G10). Forward: the GPU accelerator satisfies
// the REAL @graphty/algorithms interface, not a mirror of it.
expectTypeOf(createAccelerator(ctx)).toMatchTypeOf<AlgorithmAccelerator>();
expectTypeOf<GpuAccelerator>().toMatchTypeOf<AlgorithmAccelerator & LayoutAccelerator>();
const injectedAlgorithms: AlgorithmAccelerator = createAccelerator(ctx);
expectTypeOf(injectedAlgorithms).toMatchTypeOf<AlgorithmAccelerator>();

// ---- IDENTITY, not merely assignability: what this package re-exports IS the algorithms
// declaration. These lines are what a re-introduced structural copy would break.
expectTypeOf<ReExportedAlgorithmAccelerator>().toEqualTypeOf<AlgorithmAccelerator>();
expectTypeOf<ReExportedScoresResultLike>().toEqualTypeOf<ScoresResultLike>();
expectTypeOf<ReExportedPageRankResultLike>().toEqualTypeOf<PageRankResultLike>();

// ---- the REVERSE compile G10 names: the CPU dispatcher accepts this package's accelerator, and the
// option type it hands the method is the CPU package's own.
declare const dispatch: (acc: AlgorithmAccelerator | null | undefined) => AcceleratedAlgorithms;
expectTypeOf(dispatch(createAccelerator(ctx))).toEqualTypeOf<AcceleratedAlgorithms>();
expectTypeOf<IndexedPageRankOptions | undefined>().toEqualTypeOf<
    Parameters<NonNullable<AlgorithmAccelerator["pageRank"]>>[1]
>();
```

with the imports extended: `AcceleratedAlgorithms`, `AlgorithmAccelerator`, `IndexedPageRankOptions`, `PageRankResultLike` and `ScoresResultLike` from `@graphty/algorithms`, and `AlgorithmAccelerator as ReExportedAlgorithmAccelerator`, `ScoresResultLike as ReExportedScoresResultLike`, `PageRankResultLike as ReExportedPageRankResultLike` from `@graphty/webgpu-graph-algorithms`. `declare const dispatch` stands in for `accelerated` so the file stays type-only and imports no value from the CPU package -- `accelerated` is a runtime export, and importing it here would break the no-runtime-import rule the eslint zone enforces on `src/` and the bundle tests assert.

- [ ] **Step 4: The negation**

In `webgpu-graph-algorithms/project.json` delete the whole line `    "implicitDependencies": ["!algorithms"],` at `:7`, leaving no such key -- the shape every other `project.json` in the repository has.

Run:

```bash
cd AT
pnpm exec nx show project webgpu-graph-algorithms --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).implicitDependencies))"
pnpm exec nx graph --file=tmp/graph.json && node -e "const g=require('./tmp/graph.json');console.log(g.graph.dependencies['webgpu-graph-algorithms'].map(d=>d.target).sort())"
```

Expected: the first prints `undefined`; the second lists `algorithms`, `graph-format` and `layout`. If `algorithms` is absent, the devDependency did not land or nx's cache is stale (`pnpm exec nx reset`).

Say it out loud in the commit body (PD-11): from here on, `nx.json:11`'s `"updateDependents": "auto"` patch-bumps and republishes `@graphty/webgpu-graph-algorithms` on EVERY `@graphty/algorithms` release, whether or not a byte of the GPU package changed. That is the accepted monorepo convention (design Q-29, `webgpu-acceleration-plan.md:3311-3313`) and it is the price of not hiding the edge the conformance test exists to guard.

- [ ] **Step 5: Green check**

Run:

```bash
cd AT
pnpm exec nx run-many -t build --projects=graph-format,algorithms,layout,webgpu-graph-algorithms --parallel=1
cd webgpu-graph-algorithms && npm run build:bundle && npm run lint            # eslint + tsc + the strict-consumer compile
pnpm exec vitest run test/layers.test.ts                                      # the eslint-zone assertions, unchanged
GRAPHTY_GPU_REQUIRE=any npm run test:node
grep -rn "@graphty/algorithms" dist/webgpu-graph-algorithms.js || echo "no runtime specifier -- correct"
```

Expected: all green, and the last line prints `no runtime specifier -- correct` (the imports are types and are erased at build; the bundle tests already assert this for layout). `npm run lint`'s third pass -- `tsc -p tsconfig.strict-consumer.json` -- is the one that fails if `BetweennessCentralityOptions` was left in the mixed style PD-6 removes: under `exactOptionalPropertyTypes` the two spellings of `sources?` are different types.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms)!: import the real AlgorithmAccelerator and retire CpuAlgorithmOptions` (99 characters, one inside the 100 cap) through `tools/commit-changes.sh`. The `!` is deliberate and is the only breaking marker in this phase: `CpuAlgorithmOptions` was a public export (`src/index.ts:57`) and is gone (PD-7), so the package versions as a 0.x major -- `0.3.0`. The body says: the D27 mirrors of the algorithms half are deleted now that A2's first commit exists, `test/types/conformance.test-d.ts` gains the reverse compile design G10 names, the last `implicitDependencies` negation goes and with it `nx release` will patch-bump this package on every algorithms release. This commit requires the `tools/commit-changes.sh` scope fix owned by Task M8b-T1 Step 1 of `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`, whose stale `VALID_SCOPES` would otherwise refuse the scope; Task M8a-T1 is the check that confirms it is in place.

---

### Task M8a-T14: The gate record and the phase's close

**Repository:** `AT`.

**Files:**
- Create: `webgpu-graph-algorithms/docs/decisions/G6-algorithms.md` (the algorithms slice of the G6 record; the G0..G3 records already live in that directory)
- NOT touched: every source file

**Interfaces:**
- Consumes: the outputs of every command in appendix 7.2.
- Produces: the record the owner signs, and the phase's exit condition.

- [ ] **Step 1: Write the record**

Create `webgpu-graph-algorithms/docs/decisions/G6-algorithms.md` with this content; every `<...>` cell is a number or a string copied from the named command's output, and the owner signs the last section.

````markdown
# G6 (algorithms slice) -- the first A2 commit (spec 13 row P6; plan 2026-09-19-webgpu-m8a-algorithms-seam)

Recorded by: <owner name>, <date>. Commits: the nine of phase M8a (<short hashes once committed>), in the order of appendix 7.1's command sheet.
Environment: Node <version>, pnpm 10.0.0, vitest 3.2.4, TypeScript <version>, `@graphty/graph-format` 1.0.0,
`@graphty/algorithms` <version after release>. Every command ran from the repository root or from `algorithms/`.

## 1. The 9.2 deliverables, each mapped to its evidence

| # | Deliverable (design 9.2 / plan line) | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | `algorithms/src/indexed/accelerator.ts` exists and contains no WebGPU type | `grep -c "webgpu\|GPUDevice\|GPUBuffer" algorithms/src/indexed/accelerator.ts` | <0> | pass / fail |
| 2 | the twelve `*ResultLike` shapes, scores as `NumericVector` | `pnpm exec nx run algorithms:lint` (its third pass is `tsc -p tsconfig.typecheck.json`) | <clean> | pass / fail |
| 3 | `AlgorithmAccelerator`, every method optional, `GraphSnapshot` in | `test/types/accelerator.test-d.ts`, compiled by that same third pass | <clean> | pass / fail |
| 4 | `accelerated(acc)` with the design's dispatcher body | `test/unit/indexed/accelerated.test.ts` | <n passed> | pass / fail |
| 5 | `pathTo` / `pathEdges` decoration for SSSP | the decoration case of the same file | <n passed> | pass / fail |
| 6 | `sources` / `k` on `BetweennessCentralityOptions` | `test/unit/indexed/betweenness-options.test.ts` | <n passed> | pass / fail |
| 7 | fake-accelerator tests: delegation, CPU path, throw propagates | the same file, three cases | <n passed> | pass / fail |
| 8 | W1b: `AlgorithmAccelerator` by `import type`, mirrors deleted | `grep -c "interface AlgorithmAccelerator" webgpu-graph-algorithms/src/types/accelerator.ts` | <0> | pass / fail |
| 9 | `CpuAlgorithmOptions` retired | `grep -rc CpuAlgorithmOptions webgpu-graph-algorithms/src webgpu-graph-algorithms/test` | <0> | pass / fail |
| 10 | `implicitDependencies` negation removed | `nx show project webgpu-graph-algorithms --json` | <undefined> | pass / fail |
| 11 | the G10 reverse compile | `pnpm exec nx run webgpu-graph-algorithms:lint` (its third pass is `tsc -p tsconfig.strict-consumer.json`; that target already delegates to the npm script, `webgpu-graph-algorithms/project.json:46`) | <clean> | pass / fail |

## 2. The A1 gate of graph-format design 14.6, discharged here (plan departure DEP-8A-B)

| Item | Evidence | Result | Status |
| --- | --- | --- | --- |
| every fixture graph converts with `equalsTopology` / neighbour-set parity | `test/unit/indexed/to-snapshot-differential.test.ts` | <11 passed> | pass / fail |
| `mutationCount` memoisation, no stale hit | `test/unit/indexed/to-snapshot.test.ts` | <8 passed> | pass / fail |
| `weightDtype: "f64"` keeps a non-f32-exact weight exactly | the shadow-column case of the same file | <pass> | pass / fail |
| public signatures UNCHANGED | `git diff --stat master -- algorithms/src/algorithms algorithms/src/types` | <only betweenness.ts> | pass / fail |

## 3. The six ports, against their legacy counterparts

| Port | Design line | Cross-check | Tolerance | Result |
| --- | --- | --- | --- | --- |
| breadthFirstSearch | 3823 | visited set vs `bfs-unified.ts:46` | exact | <...> |
| dijkstra | 3856 | finite distances vs `dijkstra.ts:21` | 1e-12 | <...> |
| pageRank | 3889 | scores vs `pagerank.ts:83`, both sides pinned at `maxIterations: 200`, `tolerance: 1e-12`, legacy additionally `useDelta: false` | 1e-9 absolute | <...> |
| connectedComponents | 3924 | partition vs `connected.ts:17` | exact | <...> |
| kruskalMST | 3930 | `totalWeight` vs the legacy MST | 1e-12 | <...> |
| commonNeighborsScore | 3940 | counts on the star and the multigraph | exact | <...> |

## 4. Coverage (algorithms, `--project=default --coverage`)

| lines | functions | branches | statements | threshold | wall time |
| --- | --- | --- | --- | --- | --- |
| <...> | <...> | <...> | <...> | 80 / 80 / 75 / 80 | <...> |

## 5. Lanes

| Lane | Run | Result |
| --- | --- | --- |
| `ci.yml` (20 shards) | <run id> | <...> |
| `hosts.yml` (triggered by `pnpm-lock.yaml`) | <run id> | <...> |
| `gpu.yml` on the merge commit (the release gate) | <run id> | <...> |

## 6. Findings, owner decisions, re-fixed numbers

Signed off: <owner>, <date>.
````

- [ ] **Step 2: The final green check**

Run:

```bash
cd AT
LC_ALL=C grep -rnP '[^\x00-\x7F]' algorithms/src/indexed algorithms/test/unit/indexed algorithms/test/types design/decisions
pnpm exec nx run-many -t build --parallel=3
pnpm -r run lint
pnpm run lint:knip
./tools/prepush.sh
```

Expected: the first command prints nothing; the rest exit 0. `tools/prepush.sh` takes 15-25 minutes and is what `.husky/pre-push` runs anyway, so running it here means the push does not discover a failure an hour later. If step 7 (the webgpu node suite on the local adapter) is the only red one, check `LD_LIBRARY_PATH`; that lane is environmental and is not this phase's.

- [ ] **Step 3: Commit (owner)** -- `docs(webgpu-graph-algorithms): record the algorithms slice of the G6 gate` through `tools/commit-changes.sh`. Then push the branch and open ONE pull request carrying all nine commits, in this order: `fix(tools)`, `build(algorithms)`, `feat(algorithms)` (A1), `feat(algorithms)` (the ports), `feat(algorithms)` (betweenness options), `feat(algorithms)` (the seam), `docs`, `feat(webgpu-graph-algorithms)!`, `docs(webgpu-graph-algorithms)`. The PR does NOT carry the `gpu` label: nothing in this phase touches a kernel, so the GPU lane runs once, on the merge commit, as the release gate (DEP-8A-F).

- [ ] **Step 4: Checkpoint** -- the phase is closed when `all-checks` is green on the PR, the owner has signed section 6 of the G6 record, and `@graphty/algorithms` has released with the `indexed` namespace on npm. Phase M6 may then start: its entry criterion "the first A2 commit (Phase M8a) on master" is met by this merge.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| before M8a-T1 | `git fetch origin && git merge --ff-only origin/master && git worktree add .worktrees/algorithms-indexed -b feat/algorithms-indexed-seam master` |
| phase Step 0 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/algorithms-indexed && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build` |
| before M8a-T13 | if `tools/commit-changes.sh:468` does not yet list the three scopes, land Task M8b-T1 Step 1's `fix(tools): let commit-changes.sh accept the three format and GPU scopes` first; Task M8a-T1 is the check that says whether it is needed. M8a-T1 itself makes no commit |
| M8a-T2 | `... && ./tools/commit-changes.sh` for `build(algorithms): take @graphty/graph-format as a workspace dependency and a caret peer` |
| M8a-T4 | `... && ./tools/commit-changes.sh` for `feat(algorithms): convert a legacy Graph to a graph-format snapshot with a mutation counter` |
| M8a-T7 | `... && ./tools/commit-changes.sh` for `feat(algorithms): port six algorithms to graph-format snapshots under the indexed namespace` |
| M8a-T9 | `... && ./tools/commit-changes.sh` for `feat(algorithms): express sampled betweenness on the shared option type` |
| M8a-T11 | `... && ./tools/commit-changes.sh` for `feat(algorithms): add the accelerator seam and the accelerated() dispatcher` |
| M8a-T12 | `... && ./tools/commit-changes.sh` for `docs: record the A1 ordering and the PageRankOptions shadowing` |
| before M8a-T13 | land Phase M5b on master, then `cd /home/apowers/Projects/graphty-monorepo/.worktrees/algorithms-indexed && git fetch origin && git merge origin/master` |
| M8a-T13 | `... && ./tools/commit-changes.sh` for `feat(webgpu-graph-algorithms)!: import the real AlgorithmAccelerator and retire CpuAlgorithmOptions` |
| M8a-T14 | `... && ./tools/commit-changes.sh` for `docs(webgpu-graph-algorithms): record the algorithms slice of the G6 gate`, then `git push -u origin feat/algorithms-indexed-seam` (the pre-push gate runs, 15-25 minutes) and `gh pr create` |

The agent never runs any of these; it prepares the tree and verifies the results.

Subject lengths, measured with `printf '%s' "<subject>" | wc -c`, in the order of the rows above: 88, 91, 91, 71, 75, 62, 99, 73. `tools/commit-changes.sh:472` sets `SUBJECT_MAX=100` and commitlint's `header-max-length` from `@commitlint/config-conventional` is the same 100, so all eight pass -- the longest, `feat(webgpu-graph-algorithms)!: ...`, by one character. Re-measure before editing any of them.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| commit scopes agree (a precondition, not an edit) | M8a-T1 | `bash tmp/check-scopes.sh` | the script accepts every scope commitlint accepts, i.e. Task M8b-T1 Step 1 has landed |
| the format resolves | M8a-T2 | `cd algorithms && pnpm exec vitest run --project=default test/unit/indexed/package-wiring.test.ts` | `workspace:^` + `^1.0.0` peer, and the module imports |
| the published bundle stays thin | M8a-T7 | `grep -c "SNAPSHOT_BRAND" algorithms/dist/algorithms.js` = 0 and `grep -c 'from "@graphty/graph-format"' algorithms/dist/algorithms.js` >= 1 | graph-format is external, not inlined |
| the examples' bundle is self-contained | M8a-T2, M8a-T7 | `grep -c "SNAPSHOT_BRAND" algorithms/dist/algorithms.standalone.js` >= 1 and `grep -rl 'from "@graphty/' algorithms/gh-pages/` empty | no bare specifier reaches a browser |
| A1 differential | M8a-T4 | `cd algorithms && pnpm exec vitest run --project=default test/unit/indexed/to-snapshot-differential.test.ts` | every fixture converts with neighbour-set and edge-multiset parity |
| memoisation has no stale hit | M8a-T3 | the `memoises on mutationCount` case of `to-snapshot.test.ts` | a mutation replaces the cached snapshot |
| the six ports | M8a-T6, M8a-T7 | `cd algorithms && pnpm exec vitest run --project=default test/unit/indexed` | each port matches its legacy counterpart at the stated tolerance |
| the seam compiles as declared | M8a-T10 | `cd algorithms && tsc -p tsconfig.typecheck.json` | `test/types/accelerator.test-d.ts` holds |
| delegation / CPU path / throw | M8a-T11 | `cd algorithms && pnpm exec vitest run --project=default test/unit/indexed/accelerated.test.ts` | the three proofs design 9.2 asks for |
| the dispatcher's method list | M8a-T11 | the `carries exactly the six methods` case | a port PR cannot add a type without adding the implementation |
| knip | M8a-T10 | `pnpm exec knip --workspace algorithms` | no unused export under `src/indexed/` |
| coverage | M8a-T11 | `cd algorithms && pnpm exec vitest run --project=default --coverage` | at or above 80 / 80 / 75 / 80 |
| no mirrors left | M8a-T13 | `grep -c "interface AlgorithmAccelerator" webgpu-graph-algorithms/src/types/accelerator.ts` = 0 | the GPU package imports the real declaration |
| no runtime coupling | M8a-T13 | `grep -rn "@graphty/algorithms" webgpu-graph-algorithms/dist/webgpu-graph-algorithms.js` empty | the type imports were erased |
| the G10 reverse compile | M8a-T13 | `cd webgpu-graph-algorithms && npm run lint` | eslint + two tsc runs, including the strict-consumer pass |
| the nx edge is real | M8a-T13 | `pnpm exec nx show project webgpu-graph-algorithms --json` | `implicitDependencies` is `undefined` and the graph lists `algorithms` |
| ASCII | M8a-T12, M8a-T14 | `LC_ALL=C grep -rnP '[^\x00-\x7F]' algorithms/src/indexed design/decisions` | no output |
| pre-push gate | M8a-T14 | `./tools/prepush.sh` | exit 0 |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M8A-1 | A port's differential test passes because both the port and the legacy function share a bug, so the "parity" proves nothing. | Every port's test has an INDEPENDENT hand-computed case as well as the legacy cross-check: the weighted diamond's `dist[d] === 2` (M8a-T6), PageRank's uniform 4-cycle and its unit sum (M8a-T7), the two-triangle partition (M8a-T7). A shared bug has to survive both. |
| R-M8A-2 | `pnpm exec nx run algorithms:lint` in a fresh worktree fails with TS2307 because graph-format is unbuilt -- algorithms' `lint` gains no `dependsOn` (PD-8). | The phase's Step 0 builds graph-format; `algorithms:build`'s own `dependsOn: ["^build"]` covers every nx path; CI builds before it lints on both PR and master (`ci.yml:78`, `:98`) and additionally builds graph-format unconditionally on a PR (`:85-92`); `tools/prepush.sh` runs Build as step 1. |
| R-M8A-3 | The `readonly ... \| undefined` restyle of `BetweennessCentralityOptions` breaks an internal caller that assigns to one of the three existing members. | M8a-T9 Step 3 runs the whole `test/unit` suite, and `betweenness.ts`'s five internal consumers (`:69`, `:129`, `:204`, `:248`, `:267`) only READ the options -- verified before the edit. `readonly` on an interface property does not block object assignability in TypeScript, and `\| undefined` is a widening under the `exactOptionalPropertyTypes: false` that `tsconfig.base.json` leaves unset. |
| R-M8A-4 | Task M8a-T13 collides with Phase M5b on six files and one of them silently loses M5b's half. | PD-12 gates T13 on M5b being on master and the task's first line is a check that prints M5b's own edit; every T13 edit is written as an ADDITION beside the layout entry M5b left, never as a replacement of the block. |
| R-M8A-5 | Removing the `implicitDependencies` negation makes every algorithms release republish the GPU package, and a GPU-lane flake then blocks an unrelated algorithms publish. | Accepted and stated (PD-11); it is the existing monorepo convention (design Q-29). The escape, if it bites twice, is `release.groups` with `updateDependents: "never"`, which the design already records as the alternative. One occurrence is not evidence; a second is. |
| R-M8A-6 | The dispatcher grows a method in `AcceleratedAlgorithms` without a matching branch in `accelerated()`, so a call is `undefined is not a function` at runtime. | The `carries exactly the six methods whose ports exist` case of M8a-T11 enumerates the dispatcher's own keys; adding one to the interface without the implementation fails it. |
| R-M8A-7 | `tools/prepush.sh` takes 15-25 minutes and the push discovers a failure long after the work looks done. | M8a-T14 Step 2 runs the same gate before the push, and every task ends with `npm run lint` plus its own vitest run, so the gate finds nothing new. |
| R-M8A-8 | `hosts.yml` runs on this PR (its `paths:` includes `pnpm-lock.yaml`, `.github/workflows/hosts.yml:13`) and its known WARP `E_DEVICE_LOST` flake blocks the merge on a change that touches no kernel. | Re-run the lane; it is environmental and the phase changes nothing it exercises. If it fails twice on the same commit, the owner decides at the gate -- a flake is not silently waived (design 13 rule (a)). |
| R-M8A-9 | The A1 harness is committed in the same PR as the ports, so a differential failure could be blamed on a port. | M8a-T4's commit lands the harness BEFORE any port commit (the command sheet fixes the order), so `git bisect` separates them; the decision record `2026-09-19-a1-lands-inside-m8a.md` names this as the cost being accepted. |
