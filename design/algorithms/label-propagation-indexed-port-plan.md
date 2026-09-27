# Label propagation over a graph-format snapshot: implementation plan

Design: `design/algorithms/label-propagation-indexed-port-design.md`. Section numbers below refer to
it.

Branch `feat/algorithms-indexed-label-propagation`, worktree
`.worktrees/feat-algorithms-indexed-label-propagation`. Every step is test-first: write the tests,
run them and see them fail for the stated reason, write the code, see them pass, then commit. Each
step is one conventional commit, message written to a file under `tmp/label-propagation-port/` and
committed with `git commit --gpg-sign -F <file>`. Keep the hooks: `commit-msg` runs commitlint
and `pre-commit` runs the secret scan, and `prepare-commit-msg` skips the Commitizen wizard by
itself when no terminal is attached.

Commands, from `algorithms/`:

- one file: `npx vitest run --project default test/unit/indexed/label-propagation.test.ts`
- the indexed suite: `npx vitest run --project default test/unit/indexed`
- types: `npx tsc --noEmit -p tsconfig.json`
- types as a strict consumer: `npx tsc --noEmit -p tsconfig.json --exactOptionalPropertyTypes`
  (clean on master; the package tsconfig leaves the option off)
- lint: `npm run lint`

No test measures time. No step adds tests for the legacy floyd-warshall.

## Step 1 -- Options, validation and the trivial results

Files: `algorithms/src/indexed/label-propagation.ts` (new),
`algorithms/test/unit/indexed/label-propagation.test.ts` (new).

Tests first:

- Empty snapshot: `count` 0, `labels.length` 0, `iterations` 0, `converged` true, `groups()` is
  `[]`.
- `maxIterations: 0` on the two-triangles fixture: identity labels `[0..6]`, `count` 7,
  `iterations` 0, `converged` false. On an edgeless graph of 5, and on a graph whose arcs all weigh
  0: `converged` true.
- `RangeError` for `maxIterations` -1, 1.5, NaN; for `maxIterations * n > Number.MAX_SAFE_INTEGER`
  (`maxIterations: 2 ** 53` on a 2-node graph); for `randomSeed` 1.5, NaN, Infinity.
- `RangeError` for a negative, a NaN and an infinite arc weight (build with
  `GraphBuilder(...).freeze({ checksum: true })`); `s.validate({ checksum: true })` passes after.

Code: the `LabelPropagationOptions` and `LabelPropagationResult` interfaces exactly as in section
7; argument checks; weight scan (only when `weighted !== false` and `s.weights !== null`), which
also records whether any arc outside a self-loop has positive weight, for the `maxIterations: 0`
`converged` flag; the identity return through `renumberPartition` and `withGroups`. The main loop
is a stub that returns
the identity, so the tests of step 2 fail on labels, not on missing exports.

Done when: the step's tests pass, `tsc` is clean, and the file carries the design's JSDoc.

## Step 2 -- The FLPA kernel on undirected snapshots, and the dominance oracle

Files: `algorithms/src/indexed/label-propagation.ts`,
`algorithms/test/unit/indexed/label-propagation.test.ts`,
`algorithms/test/unit/indexed/port-fixtures.ts` (export `gnm`, today module-private).

Tests first:

- A `referenceFlpa(s, seed, weighted, tieRule)` helper following sections 2.1 and 2.4 literally
  (section 8.2). The port's labels equal `referenceFlpa(..., "uniform")` on the karate club and the
  two random undirected fixtures for seeds 1..20; the `"retain"` and `"double"` variants each differ
  from the port on at least one of those runs.
- Golden: the karate club at `randomSeed` 42 equals a stored label array. Record it from the first
  run that matches the reference, not before.
- A `dominanceHolds(s, labels, weighted)` helper built from `s.edgeList()` and plain arrays (section
  8.1). It skips self-loops, sums parallel arcs, and treats a directed edge as joining both ends.
- Single node; edgeless graph of 5: singletons, `iterations` 1, `converged` true.
- Two triangles plus an isolated node: labels exactly `[0,0,0,1,1,1,2]`.
- K6, and two disjoint five-cliques: one community per clique for seeds 1..10.
- Tie-heavy: even path of 1,000, a star of 50, K(3,4): `converged` true for seeds 1..10 under the
  default cap, and `dominanceHolds` true.
- The karate club (`undirectedFixtures()`): same seed twice gives bitwise-equal labels; seeds 1..10
  give at least two distinct partitions; every result passes `dominanceHolds`.
- `dominanceHolds` on every converged result over all `undirectedFixtures()` entries, seeds 1..10.
- `maxIterations: 1` on a random 1,000-node graph (`gnm(1000, 10000, false, seed)` from
  `port-fixtures.ts`): `iterations` <= 1 and, since one sweep cannot settle it, `converged` false.

Code: section 4's arrays; mulberry32 (private); Fisher-Yates over the initial queue; the visit loop
with the stamp accumulator, two-pass reservoir tie draw, a node with no positive-weight neighbour
keeping its label, and the requeue filter; the visit cap; `iterations = ceil(visits / n)`. Undirected
only in this step: a directed snapshot throws "not yet" so step 4's tests fail visibly.

Done when: the tests pass; `s.validate({ checksum: true })` passes at the end of each test.

## Step 3 -- Self-loops, parallel edges, weights and the unweighted mode

Files: same two.

Tests first:

- A triangle with a self-loop on one node gives the same labels as the triangle without it, for
  seeds 1..10; a node whose only arc is a self-loop stays a singleton.
- Parallel edges, built with `GraphBuilder` (the legacy `Graph` cannot hold them): two five-cliques
  A and B, x joined to a1 of A by two parallel edges and to b1 of B by one. Default `weighted`,
  seeds 1..10: each clique holds one label, `label(x) === label(a1)`, `dominanceHolds`. With
  `weighted: false`, over seeds 1..50, x shares b1's label on at least one seed and a1's on another
  (the tie is real).
- Weighted: the same cliques, x with arc weight 3 to a1 and 1 + 1 to b1 and b2. Seeds 1..10: each
  clique holds one label, `label(x) === label(a1)`, `dominanceHolds`. Do not assert that x's label
  differs from B's: the cliques can merge through x on a valid run (design section 8.2).
- Zero weights: a node whose arcs all weigh 0 keeps its own label.
- `weighted: false` on a weighted snapshot ignores the weights (a 100-weight arc votes like a
  1-weight arc).

Code: self-loop skip; the `seen` stamp array for `weighted: false`.

Done when: the tests pass.

## Step 4 -- Directed snapshots

Files: same two.

Tests first:

- Two triangles given as directed arcs, one per edge, in one direction each: the same partition as
  the undirected triangles.
- Section 8.2's reciprocal-pair fixture: x lands in T1's community on seeds 1..10, and
  `dominanceHolds` passes on the symmetrised view.
- `weighted: false` counts a reciprocal pair once: x has a reciprocal pair to A1 of triangle T1 and
  two one-way arcs, x->B1 and B2->x, to triangle T2. Weighted, T1 and T2 both weigh 2, so both
  communities occur across seeds 1..10; with `weighted: false` T1 counts 1 and T2 counts 2, so x
  lands in T2's community on every seed.
- The requeue side: a directed chain where only in-arcs reach a node still converges with
  `dominanceHolds` true.
- `referenceFlpa` equality and `dominanceHolds` on every `directedFixtures()` entry, seeds 1..10.

Code: read `s.reverse()` when `s.directed`; walk out-row then in-row both for counting and for the
requeue; the `seen` stamp spans both rows.

Done when: the tests pass and the "not yet" throw is gone.

## Step 5 -- Differential against the shipped function, and planted-partition recovery

Files: `algorithms/package.json` (add `"@graphty/graph-samples": "workspace:^"` to
`devDependencies`), `pnpm-lock.yaml` (via `pnpm install` from the worktree root),
`algorithms/test/unit/indexed/label-propagation.test.ts`.

Tests first:

- On "two triangles and an isolated node" and "two five-cliques, disconnected" from
  `undirectedFixtures()`: for seeds 1..10 the port's labels equal the shipped
  `labelPropagation(graph, { randomSeed })` communities read through `s.ids`.
- On every `undirectedFixtures()` entry: whenever both report `converged`, both pass
  `dominanceHolds` (the shipped result is mapped to indices through `s.ids`).
- Planted partition: `plantedPartitionGraph({ groups: 4, groupSize: 50, pIn: 0.3, pOut: 0.01,
seed })` for seeds 1..10, converted to a legacy `Graph` by a small helper, then `toSnapshot`.
  Mean ARI of the port against the `community` column >= 0.9, and >= the shipped function's mean
  ARI minus 0.05. The ARI helper lives in the test file.

Code: none in `src/` expected. If a test fails, find the mechanism before touching anything.

Done when: the tests pass; `pnpm install --frozen-lockfile` succeeds from a clean checkout of the
branch.

## Step 6 -- Exports

Files: `algorithms/src/indexed/index.ts`, `algorithms/src/index.ts`,
`algorithms/test/unit/indexed/package-wiring.test.ts`.

Tests first: `indexed.labelPropagation` is a function reached through the package barrel, and a
type-level use of `IndexedLabelPropagationOptions` and `IndexedLabelPropagationResult` compiles.

Code: `export { labelPropagation, type LabelPropagationOptions, type LabelPropagationResult } from
"./label-propagation.js";` in the namespace barrel; the aliased flat type export next to
`IndexedLouvainOptions` with the same comment convention.

Done when: tests pass, `npm run build` in `algorithms/` succeeds, and the generated `.d.ts` shows
the two new flat names and no change to any existing one.

## Step 7 -- The dispatcher

Files: `algorithms/src/indexed/accelerator.ts`,
`algorithms/test/unit/indexed/accelerated.test.ts`.

Tests first:

- `accelerated(null).labelPropagation(s, { randomSeed: 7 })` resolves to the same labels as
  `indexed.labelPropagation(s, { randomSeed: 7 })`.
- An accelerator with a `labelPropagation` member is called with the same snapshot and options
  object, and its result is returned as-is.
- A throwing `labelPropagation` member rejects with the same error (no fallback).
- "carries exactly the ten methods" becomes "eleven", with `labelPropagation` in the list.

Code: `labelPropagation(s, options?: LabelPropagationOptions): Promise<LabelResultLike>` on
`AcceleratedAlgorithms`, the one-line delegation in `accelerated()`, and a sentence in the
interface's doc comment that an accelerator ignores `randomSeed`. `AlgorithmAccelerator` is not
touched (section 7).

Done when: tests pass; `npx tsc --noEmit -p tsconfig.json --exactOptionalPropertyTypes` is clean
(the options pass through to `HitsOptionsLike` without a cast).

## Step 8 -- The benchmarks

Files: `algorithms/benchmarks/port-bench.ts`, `algorithms/benchmarks/label-propagation-bench.ts`
(new).

Code: in `port-bench.ts`, two rows in the existing pattern -- `["label propagation", legacy
labelPropagation(undirected), indexed labelPropagation(su)]` and "label propagation, one sweep",
the port with `maxIterations: 1` and no legacy side (print `--`). Run it on the shared machine and
keep the output in `tmp/label-propagation-port/port-bench-<date>.log`.

In the new script, section 9's ladder, tiers and protocol. Graphs for the ladder come from the same
seeded LCG
as `benchmarks/port-bench.ts` (copied, as port-bench and port-fixtures each carry their own copy);
the path and planted-partition tiers come from graph-samples.

Run it once on the shared machine from `algorithms/` (`npx tsx
benchmarks/label-propagation-bench.ts`), keeping the output in
`tmp/label-propagation-port/bench-<date>.log`. The load average at start and end is in the log.

Done when: the script runs to completion; every row has median, minimum, ratio of medians, and each
side's `iterations` and `converged`; the output goes into the pull request description.

## Step 9 -- Re-derive the cost record's row

Files: `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`.

Take 100 times the one-sweep minimum from `port-bench.ts` at 10k and 100k as the label propagation
port baseline -- the same 100 passes the GPU is costed at -- and feed it into the appendix B script
of `tmp/gpu-cost-model/final-model.md` in the main checkout, with only that baseline replaced.
First confirm the unchanged script reproduces the current table. Add the row to the "Re-derived
against the measured ports" table. Below the table, not in it, add a "time to answer" line: the
converged port's minimum and the sweep-equivalents it ran, beside the GPU's 100 passes (section 9's
last bullet). Never put the converged time into a table ratio.

Done when: the new row and paragraph are in the record and say where every number came from.

## Step 10 -- Gate, issues, pull request

- From the worktree: `pnpm run build`, `pnpm run lint`, `./tools/run-tests.sh algorithms-default`
  (the CI shard with its coverage thresholds), and `tools/prepush.sh` (knip included). Fix only what
  this branch broke.
- File one GitHub issue per shipped defect in section 6 (six), each with a type label, a
  priority label and an effort label, and one issue for moving graphty-element's
  `LabelPropagationAlgorithm` onto the ported route, marked as needing the owner's decision on
  `randomSeed` and on the changed partitions.
- Push the branch and open a pull request. Its description lists the new exports for the owner's
  approval, the benchmark table with load averages, and links the issues. Never merge it.

Done when: CI is green on the pull request and the owner has the approval request in front of them.
