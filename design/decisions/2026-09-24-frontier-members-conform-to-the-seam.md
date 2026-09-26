# The four frontier members conform to the seam's option types, type for type

Date: 2026-09-24
Decided by: the owner, through the P8 plan (`design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`,
decisions PD-19 and PD-25 and departure DEP-P8-F)
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 3.3, the `bellmanFord` and
`closenessCentrality` signatures (lines 809-810), which take `BellmanFordOptions` and
`ClosenessOptions`; section 9.2, the same two members of `AlgorithmAccelerator` (lines
2954-2955); section 8.4's closeness paragraph (lines 2695-2698), whose per-source reduction is
"(sum, sum of 1/d, max)"; and section 13 row P8 (line 4268), whose deliverables cell reads
"closeness / harmonic / eccentricity". None of those lines is edited. The design never defines
`BellmanFordOptions` or `ClosenessOptions`; the names point at the legacy package's
`BellmanFordOptions` (`algorithms/src/algorithms/shortest-path/bellman-ford.ts`, one member,
`target?: NodeId`) and `ClosenessCentralityOptions` (`algorithms/src/algorithms/centrality/closeness.ts`:
`normalized`, `harmonic`, and the rest), which the seam plan of 2026-09-19 already ruled "NOT
TOUCHED" (`design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md`, the option-type table).

## The decision

The published seam is `AlgorithmAccelerator` in `algorithms/src/indexed/accelerator.ts`, and the
GPU package's `src/types/accelerator.ts` imports that interface rather than mirroring it
(`test/types/conformance.test-d.ts` holds the two equal). The seam declares:

| Member | Option type | Members |
| --- | --- | --- |
| `breadthFirstSearch(s, source, options?)` | `BfsOptions` (`indexed/bfs.ts`) | `maxDepth` |
| `sssp(s, source, options?)` | `SsspOptions` (`indexed/dijkstra.ts`) | `cutoff`, `weights` |
| `bellmanFord(s, source, options?)` | `SsspOptions` | `cutoff`, `weights` |
| `closenessCentrality(s, options?)` | `HitsOptionsLike` | `maxIterations`, `tolerance`, `weighted` |

The four GPU members take exactly those types, and their results are the design's
`GpuBfsResult`, `GpuSsspResult`, `GpuBellmanFordResult` and `GpuScoresResult`, which satisfy the
seam's `BfsResultLike`, `SsspResultLike`, `BellmanFordResultLike` and `ScoresResultLike`. Every
option the plan of 2026-09-23 had invented is NOT offered: no `direction` or `maxLevels` on BFS,
no `delta` or `weighted` on `sssp`, no `maxRounds` on `bellmanFord`, no `harmonic`,
`wassermanFaust` or `sources` on closeness. Nothing named harmonic or eccentricity ships: the
`closeness-reduce` kernel accumulates the distance sum and the reached count per source and
nothing else. The knobs the tests need (`direction`, `alpha`, `beta`, `fusedMax`,
`edgeCapacity`, `levelsPerSubmit`, `delta`, `maxRetries`, `roundsPerBatch`) are `@internal`
second entry points (`bfsWithTuning`, `ssspWithTuning`, `bellmanFordWithTuning`,
`closenessWithTuning`) that the barrel never exports.

Three consequences are decided here because the type alone does not settle them.

**`maxIterations` and `tolerance` are refused, not ignored.** `HitsOptionsLike` is the option
shape of the power-iteration family, which the seam lends to `closenessCentrality` "until each
one's `indexed.*` port lands and brings its real option type" (its own JSDoc). An exact
traversal has no iteration cap and no tolerance. `closenessCentrality` therefore throws
`E_UNSUPPORTED { option: "maxIterations", hint }` or `{ option: "tolerance", hint }` when either
key is DEFINED, before any device work; `undefined` stays legal, so a bare bag and the
element's no-option call pass. That is the package's standing rule for an option it does not
implement (`forceAtlas2` refuses `nodeSize` the same way): a caller's option is implemented or
refused, never dropped on the floor, because a dropped option is a silently wrong answer the
caller asked for something else and got no signal. Nothing forwards a bag into this member
unseen: `accelerated(acc)` has no `closenessCentrality` method and no `bellmanFord` method
(both are reachable on the accelerator object only), so the only caller that can hand these
keys over is one that typed them. `weighted` is honoured: it defaults to the snapshot's
`flags.weighted`, `true` routes a genuinely weighted run through one `sssp` per source, and
`false` on a weighted snapshot ignores the column by request. `iterations` reports the source
batches run and `converged` is always `true`.

**The closeness score is the legacy default, `1 / sumOfDistances`.** `score[s] = 1 / sum` over
the finite distances from `s` to every other node, `0` when nothing is reached, with NO reached
factor and NO Wasserman-Faust scaling. That is exactly the `normalized: false` default of
`closenessCentrality` in `@graphty/algorithms`, which graphty-element calls with no options and
publishes as `normalization: "none"` (`graphty-element/src/algorithms/ClosenessCentralityAlgorithm.ts`),
and which design 9.7's parity table fixes as the target. The NetworkX / Wasserman-Faust form,
`reached / sum x reached / (n - 1)`, is 33x the legacy number for every node of karate (34
nodes, connected, 33 reached everywhere), so the substitution could never have been silent: the
parity assertion against the legacy function fails on every score. Changing the number a panel
shows is a product decision, not this phase's.

**`cutoff: NaN` is refused on the GPU where the CPU port answers.** This is the ONE
`SsspOptions` value the two backends treat differently. The CPU port's relaxation test is
`dv <= cutoff`, which never holds for `NaN`, so it returns the source alone. The kernel's guard
is `nd > cutoff`, which also never holds for `NaN`, so it would relax EVERYTHING -- the same
option silently inverted. The GPU member normalises `cutoff` on the host before any device work
and throws `E_INVALID_ARGUMENT { argument: "cutoff" }` for `NaN` (`normaliseCutoff` in
`src/algorithms/sssp.ts`, shared by `bellmanFord`). Refused rather than mirrored, because
mirroring would mean special-casing `NaN` to reproduce a CPU answer nobody asked for. Every
other value agrees: absent is no cap, `+Infinity` is no cap, a negative cutoff is the source
alone, and on a unit-weight run the cap becomes the depth bound `floor(cutoff)`.

## Why the seam wins

The seam is the contract the CPU package exports and graphty-element compiles against.
`BFSAlgorithm` and `DijkstraAlgorithm` in the element already call `dispatch.breadthFirstSearch`
and `dispatch.sssp` by these names with no options, and the element's `./webgpu` entry forwards
every callable member of the accelerator by name, so shipping the members with the seam's types
moved the element's two traversal panels onto the GPU with no element change (the browser test
of P8-T13 proves the path). A member with an option type the seam does not declare cannot be
assigned to `AlgorithmAccelerator`; the conformance compile fails, and the only way through is
to widen the seam, which is a public type of `@graphty/algorithms` and a one-way door this phase
does not take.

## What we are giving up, and why it is acceptable

The rejected argument was the plan's own first draft: `direction`, `delta`, `maxRounds`,
`harmonic`, `sources` and the rest are real knobs a GPU traversal has, the design's 3.3 sketches
option types for each member, and design 13 row P8 promises harmonic closeness and
eccentricity.

It is right that the knobs exist and matter: the tests drive every one of them. It is right that
harmonic closeness is one more accumulator in the same reduce, and eccentricity one `max`.

It is acceptable because nothing can call them. Neither the seam nor the element's capability
list names harmonic or eccentricity, so a kernel that accumulates two words nobody reads is a
body to sabotage, a noise row to record and a compile case to pin (design 13 rule (f)) for no
consumer. The tuning knobs are reachable through the `@internal` entry points, so the tests
lose nothing, and a public option that the seam does not carry would be reachable by no
dispatcher and no element anyway. The `HitsOptionsLike` placeholder is the seam's own admission
that the real type is not written yet; refusing its two meaningless keys costs a caller one
thrown error with the key's name in it, where accepting them would cost a caller a silent no-op.

## What would reverse this

Two conditions, counted:

- A `closenessCentrality` port lands in `@graphty/algorithms` with its real option type. Then the
  seam's member narrows from `HitsOptionsLike` to that type, `maxIterations` and `tolerance`
  leave the type and the refusal with them, and any key the GPU member can honour (`harmonic`,
  a `normalized` switch, a source list) is that port's decision -- and if the port's default
  score is not `1 / sum`, the element's `normalization` label changes with it. The two
  accumulators land in `closeness-reduce` in the same phase. This record is superseded by the
  one that records the port.
- A `bellmanFord` or `sssp` port changes `SsspOptions`. Then both GPU members follow the type,
  and the `NaN` rule is re-examined against whatever the port's relaxation test becomes.
