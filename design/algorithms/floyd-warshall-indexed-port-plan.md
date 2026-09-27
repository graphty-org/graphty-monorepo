# All-pairs shortest paths over graph-format snapshots -- implementation plan

The design is `design/algorithms/floyd-warshall-indexed-port-design.md`. Section numbers below
refer to it.

Every step is test-first: write the tests named in the step, run them and watch them fail for the
stated reason, write the code, run them green, then commit. Each step is one commit, made from the
worktree with the message in a file under `tmp/floyd-warshall-port/` and
`git -c core.hooksPath=/dev/null commit --gpg-sign -F <file>`, conventional-commit subject under
100 characters, no attribution trailers.

Rules for every step:

- Paths are relative to the worktree root. Run tests from `algorithms/` with
  `npx vitest run --project=default test/unit/indexed/all-pairs.test.ts` (plus the other files the
  step names).
- Plain ASCII in every file. No `eslint-disable`, `@ts-expect-error` or `@ts-ignore`.
- No test asserts a time. Fixtures stay at 90 nodes or fewer.
- The legacy `floyd-warshall.ts` module gets no new tests of its own (`algorithms/CLAUDE.md`); it
  is called only as a reference, in step 6.
- Never `git stash`, `git checkout <branch>`, `git switch`, `git reset` or `git clean`.

## Step 1 -- the reference implementations and the input checks

Files:

- `algorithms/test/helpers/all-pairs-oracle.ts` (new): `floydWarshallOracle(s, weights)` -- the
  textbook f64 k-i-j sweep with `+Infinity` fill, cheapest parallel arc, diagonal 0 written after
  the arcs; `apspRowsOracle(s)` -- one BFS per source, hop counts; `expectMatrixTriangleInequality`
  and `expectSymmetric`. Copied from the GPU branch's
  `webgpu-graph-algorithms/test/oracle/all-pairs.ts` (`git show
  origin/feat/webgpu-all-pairs-shortest-paths:webgpu-graph-algorithms/test/oracle/all-pairs.ts`)
  without the tile and f32 options, and with its BFS written inline so it imports nothing from
  `src/`. Takes an explicit per-arc weight vector or `null` for unit weights.
- `algorithms/src/indexed/all-pairs.ts` (new): `ApspOptions`, `ApspResult` and
  `allPairsShortestPath` with the checks of sections 5.2 and 5.6 and nothing else yet: the
  `maxNodes` check first (default 5,792), then the weight scan (length, `NaN`, infinite). n = 0 and
  n = 1 return their trivial results. Any other input throws `Error("not implemented")` for now.
- `algorithms/test/unit/indexed/all-pairs.test.ts` (new).

Tests: empty graph; one node; one node with a self-loop; `maxNodes: 2` on a three-node path throws
`RangeError` whose message contains `3`, `2` and `72` (8 * 3^2 bytes) and, with `paths: true`,
`108`; a `NaN` and a `+Infinity` weight through the override throw `RangeError`; an override of the
wrong length throws `RangeError`. One test of the oracle itself: on a four-node weighted square its
matrix equals a hand-written one.

Done when: the new tests pass, `npm run lint` in `algorithms/` is clean.
Commit: `feat(algorithms): add the all-pairs shortest-path entry point with its size and weight checks`

## Step 2 -- the Floyd-Warshall strategy

Files: `algorithms/src/indexed/all-pairs.ts`, `algorithms/test/unit/indexed/all-pairs.test.ts`.

Implement `method: "floyd-warshall"` (section 3.1): initialise `Float64Array(n * n)` to `+Infinity`,
take `Math.min` over each row's arcs skipping the diagonal, write the diagonal 0, then sweep k-i-j
with `kr = k * n`, `ir = i * n`, `dik = d[ir + k]` hoisted and `if (dik === Infinity) continue`,
strict `<`. Unit weights when rule 1 of section 4 applies. `method` reports `"floyd-warshall"`.
No negative-weight handling yet (step 3).

Tests, all with `method: "floyd-warshall"`:

- every fixture of `undirectedFixtures()` and `directedFixtures()` (`port-fixtures.ts`) equals
  `floydWarshallOracle` exactly and passes `expectMatrixTriangleInequality`; the undirected ones
  pass `expectSymmetric`;
- a positive self-loop leaves the diagonal 0;
- parallel edges of weights 5 and 2 give 2;
- two components plus an isolated node give `+Infinity` across them;
- a directed chain a->b->c gives `+Infinity` for c->a;
- real weights 0.1 and 0.2 through the f64 override (`expandEdges(s, shadow.data)`) equal the
  oracle exactly;
- every case ends with `s.validate({ checksum: true })`.

Done when: the tests pass; lint clean.
Commit: `feat(algorithms): sweep all-pairs shortest paths with a typed-array Floyd-Warshall`

## Step 3 -- negative weights and negative cycles

Files: `algorithms/src/indexed/all-pairs.ts`, `algorithms/test/unit/indexed/all-pairs.test.ts`.

Implement section 3.3 and 5.3: before allocating the sweep, a negative self-loop, or any negative
weight on an undirected snapshot, gives `hasNegativeCycle: true`; during the sweep, scan the
diagonal after each round k and stop at the first negative entry. On a negative cycle fill `dist`
with `NaN`. Negative weights on a directed graph with no negative cycle sweep normally.

Tests:

- directed a->b 4, a->c 2, c->b -1: a->b is 1;
- directed a->b 1, b->c 1, c->a -10: `hasNegativeCycle`, every cell `NaN`;
- a negative self-loop: `hasNegativeCycle`;
- an undirected edge of weight -1: `hasNegativeCycle`;
- Hougardy's graph, a directed complete graph on 12 nodes with every weight -1: `hasNegativeCycle`,
  and no cell is `-Infinity` (all are `NaN`); the same undirected;
- a graph with no negative weight reports `hasNegativeCycle: false`.

Done when: the tests pass; lint clean.
Commit: `feat(algorithms): stop the all-pairs sweep at the first negative cycle`

## Step 4 -- the per-source strategies and the rule that picks one

Files: `algorithms/src/indexed/all-pairs.ts`, `algorithms/test/unit/indexed/all-pairs.test.ts`.

Implement section 4. BFS rows: one queue of n entries reused across sources, writing hop counts
straight into row i of `dist` (and, for step 5, the discovering arc). Dijkstra rows: call
`dijkstra(s, i, { weights })` from `./dijkstra.js` and copy its `dist` into row i with
`dist.set(r.dist, i * n)`. The `auto` rule: unit weights -> BFS; any negative weight ->
Floyd-Warshall; `arcCount < n * n / 4` -> Dijkstra; else Floyd-Warshall. `method: "per-source"`
with a negative weight throws `Error`. Set `method` in the result to the strategy that ran.

Tests:

- every fixture, `method: "per-source"`, equals the oracle exactly (fixture weights are integers);
- every fixture, default options, equals the oracle exactly;
- unweighted fixtures report `method: "bfs"` and equal `apspRowsOracle`; a weighted fixture with
  `weighted: false` equals `apspRowsOracle` too;
- a 20-node directed graph with 99 arcs (below 400 / 4 = 100) reports `"dijkstra"`, and with 100
  arcs reports `"floyd-warshall"`; weights 2 on every arc so rule 1 does not apply;
- real weights 0.1-0.9 on a 30-node graph: Dijkstra rows equal the oracle within relative 1e-12;
- the tie case of section 8 (a square with two equal routes): all three forced strategies give the
  same matrix;
- `method: "per-source"` on a directed negative weight throws; `auto` on it reports
  `"floyd-warshall"`.

Done when: the tests pass; lint clean.
Commit: `feat(algorithms): route all-pairs to BFS or Dijkstra rows on sparse and unweighted graphs`

## Step 5 -- paths

Files: `algorithms/src/indexed/all-pairs.ts`, `algorithms/test/unit/indexed/all-pairs.test.ts`.

Implement section 5.4. With `paths: true` allocate `Uint32Array(n * n)` filled with
`INVALID_INDEX`. Floyd-Warshall: the chosen (cheapest, first on ties) arc per direct pair at
initialisation, `predArc[ir + j] = predArc[kr + j]` on each strict improvement. Dijkstra rows:
`predArc.set(r.predArc, i * n)`. BFS rows: the arc that discovered each node. `pathTo(i, j)` and
`pathEdges(i, j)` call `walkPredArcs` / `walkPredEdges` with `predArc.subarray(i * n, i * n + n)`.
Without `paths: true` both throw an `Error` naming the option; under a negative cycle both throw
`PathWalkError(i, j, "cycle")`.

Tests:

- on every fixture and each forced strategy, for every reachable pair: `pathTo` starts at i and
  ends at j; `pathEdges` has one fewer entry; each edge joins consecutive `pathTo` nodes; the
  weight sum along `pathEdges` equals `dist[i * n + j]` (exactly on integer weights);
- unreachable pairs give empty arrays; `pathTo(i, i)` is `[i]`, `pathEdges(i, i)` is empty;
- parallel edges of weights 5 and 2: `pathEdges` names the weight-2 edge on every strategy;
- `paths` omitted: `predArc` is `null` and `pathTo` throws;
- negative cycle with `paths: true`: `pathTo` throws `PathWalkError`.

Done when: the tests pass; lint clean.
Commit: `feat(algorithms): record predecessor arcs and walk all-pairs shortest paths`

## Step 6 -- the differential against the shipped function

Files: `algorithms/test/unit/indexed/all-pairs.test.ts`.

Tests: for every fixture of `port-fixtures.ts`, run the shipped `floydWarshall(g)` and the port
with `method: "floyd-warshall"` and the f64 override; for every pair (mapped through `s.ids.idOf`)
the distances are bit-identical (`Object.is`). Repeat with default options and compare exactly
(fixture weights are integers). `hasNegativeCycle` is false on both.

Then check the legacy module's coverage did not rise. On this branch, run
`npx vitest run --project=default --coverage --coverage.include=src/algorithms/shortest-path/floyd-warshall.ts`
twice: once with only `test/unit/floyd-warshall.test.ts`, once with that file and
`test/unit/indexed/all-pairs.test.ts`. The line, branch and function figures must be equal.

Done when: the tests pass and the two coverage figures match.
Commit: `test(algorithms): compare the all-pairs port with the shipped Floyd-Warshall`

## Step 7 -- wiring: namespace, flat types, dispatcher

Files:

- `algorithms/src/indexed/index.ts`: export `allPairsShortestPath`, `type ApspOptions`,
  `type ApspResult` from `./all-pairs.js`.
- `algorithms/src/index.ts`: add `export type { ApspOptions, ApspResult } from
  "./indexed/all-pairs.js";` beside the other indexed type exports.
- `algorithms/src/indexed/accelerator.ts`: `allPairsShortestPath(s, options?: ApspOptions):
  Promise<ApspResultLike>` on `AcceleratedAlgorithms`, and its body in `accelerated()` (section 6);
  extend the JSDoc sentence about methods whose option type is wider than the accelerator's.
- `algorithms/test/unit/indexed/accelerated.test.ts`: "ten methods" becomes eleven with
  `allPairsShortestPath` in the list; a CPU case (no accelerator: the result equals
  `indexed.allPairsShortestPath`); a delegation case (a stub accelerator's
  `allPairsShortestPath` is called once with the snapshot and the options, and its result is
  returned unchanged).
- `algorithms/test/types/accelerator.test-d.ts`:
  `expectTypeOf(indexed.allPairsShortestPath(s)).toMatchTypeOf<ApspResultLike>();`.

Write the two test changes first and watch them fail (the method is missing).

Done when: `npm run lint` (which runs the type tests), `npm run build`, and the default project
pass in `algorithms/`; `pnpm run lint:knip -- --workspace algorithms` from the root reports nothing
new.
Commit: `feat(algorithms): expose all-pairs shortest paths in the indexed namespace and dispatcher`

## Step 8 -- the allocation check in a browser

Files: `algorithms/test/browser/all-pairs-bound.test.ts` (new).

One test in the `browser` project (Playwright Chromium): an edgeless 5,792-node snapshot built with
`GraphBuilder` runs `allPairsShortestPath(s, { paths: true })` without throwing, `dist.length` is
5,792^2, `dist[1]` is `+Infinity` and `dist[0]` is 0. If Chromium refuses the allocation, lower the
default `maxNodes` in `all-pairs.ts` and section 5.6 to the largest size it accepts and record why
in section 5.6.

Done when: `npx vitest run --project=browser test/browser/all-pairs-bound.test.ts` passes.
Commit: `test(algorithms): allocate the all-pairs size bound in Chromium`

## Step 9 -- the benchmark

Files: `algorithms/benchmarks/all-pairs-bench.ts` (new); section 12 of the design document.

Write the script of design section 9: the seeded generator with 10 n unique undirected edges and
integer weights 1-100; the size ladder and arms of the section 9 table; `uptime` printed before
the first size and after the last; one discarded warm-up per arm; arms interleaved within each
pass; median and minimum of N reported per arm and size; every port arm's matrix compared cell by
cell with the first arm's (and with the shipped function's, where it runs) before timing. Sizes
and pass counts come from a `--sizes` / `--passes` argument so a short run is possible.

Run it once in full from `algorithms/` with `npx tsx benchmarks/all-pairs-bench.ts | tee
../tmp/floyd-warshall-port/bench.log`. Add section 12 "Measured" to the design document with the
table, the two load averages, the Node version, and whether the density sweep put the
Floyd-Warshall / per-source crossover within n/4 to n/3 average degree. If it did not, change the
threshold in `all-pairs.ts` and section 4 to the measured one in the same commit.

Done when: the script runs clean and section 12 holds its figures.
Commit: `perf(algorithms): benchmark the all-pairs port against the shipped Floyd-Warshall`

## Step 10 -- documentation

Files: `algorithms/README.md`.

Under the existing "Floyd-Warshall Algorithm" heading, add a short "Index-based all-pairs shortest
paths" subsection: a five-line example (`toSnapshot(graph)`, `indexed.allPairsShortestPath(s)`,
reading `dist[i * n + j]`, mapping indices through `s.ids`), one sentence on the strategy rule, one
on `paths: true`, one on the 5,792-node bound, and one saying it is 20-60x faster than
`floydWarshall` with the figures from section 12.

Done when: `tools/check-links.sh --offline` passes.
Commit: `docs(algorithms): document index-based all-pairs shortest paths`

## Step 11 -- the full gate and the pull request

From the worktree root: `pnpm run build`, `pnpm run lint`, `pnpm run lint:knip`,
`./tools/run-tests.sh algorithms-default` and `./tools/run-tests.sh algorithms-browser` (CI's
commands, with coverage thresholds); `LC_ALL=C grep -nP '[^\x00-\x7F]'` over every file the branch
touched finds nothing. A failure is diagnosed to its mechanism before anything is changed.

Push the branch and open a pull request against `master` whose body states the new public API of
design section 6 and asks the owner to approve it, and states that the shipped `floydWarshall` is
unchanged. Never merge it; the owner merges.

Done when: the pull request is open and its checks are green.
