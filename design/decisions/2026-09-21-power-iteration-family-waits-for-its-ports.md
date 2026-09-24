# HITS, eigenvector, Katz and personalized PageRank wait for their CPU ports

Date: 2026-09-21
Decided by: the owner, in the M6 plan
(`design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md`, departure DEP-M6-G and plan
decision PD-17)
Changes: `design/webgpu/webgpu-acceleration-plan.md` 9.7 (`:3307-3329`), whose parity table lists
`hits`, `eigenvectorCentrality` and `katzCentrality` among the accelerated results the element
consumes. That section is NOT edited; this record supersedes it for phase M6.

## The decision

graphty-element routes five algorithm adapters to an accelerator: PageRank, Dijkstra (SSSP),
breadth-first search, connected components and Kruskal (minimum spanning tree). Each goes through
`Algorithm.accelerated(capability, mode)`, which asks the acceleration controller once, then runs
either `accelerated(accelerator).<method>` or the same dispatcher with no accelerator, and labels
the run's `caveats.precision` with what actually ran.

HITS, eigenvector centrality, Katz centrality and personalized PageRank are NOT routed, although
`@graphty/webgpu-graph-algorithms` 0.5.1 implements all four on the device. They stay on the
element's legacy path until `@graphty/algorithms` has an `indexed.*` port of each.

## Why

The dispatcher is the whole reason the element has one result loop. `accelerated(acc)` carries six
methods (`algorithms/src/indexed/accelerator.ts`), and it carries exactly six because a method
needs a CPU port to dispatch to when no accelerator has the member: `indexed.pageRank`,
`indexed.sssp`, `indexed.breadthFirstSearch`, `indexed.connectedComponents`,
`indexed.weaklyConnectedComponents` and `indexed.minimumSpanningTree` exist, and no indexed port
exists for the power-iteration family.

Calling `accelerator.hits(snapshot)` from the element directly would mean the element writing the
fork the dispatcher exists to remove. The GPU answer is index-aligned typed arrays; the legacy CPU
answer is an id-keyed object from `@graphty/algorithms`' object graph. Two shapes is two result
loops in the adapter, and WebGPU design 9.4 item 3 forbids exactly that: one loop reads the
result, whoever computed it.

Two loops is not merely untidy. The bugs it produces are the ones nobody sees in review -- a
normalisation applied on one branch, a tie broken in a different order, a `NaN` handled once --
and they only appear on the machine that has the hardware.

## The argument that was rejected

Routing the four straight to the accelerator and keeping the legacy path as the fallback, which is
what 9.7's table implies and what the GPU package is ready for today. It would have given the phase
four more accelerated algorithms for roughly the cost of the adapters.

Rejected because the seam, not the algorithm count, is what M6 is establishing. An adapter that
reads two result shapes teaches the next adapter to do the same, and the fork is far cheaper to
refuse now than to unpick from four call sites later.

## The follow-up, and what it costs

The route lands when the CPU package has the ports. In `@graphty/algorithms`: four `indexed.*`
implementations over the graph-format snapshot with the existing object-graph implementations as
the oracle, and four methods on `accelerated()` (about 1.5 ed). In graphty-element: four adapters
moved onto `Algorithm.accelerated`, which is written and tested (about 0.5 ed). The GPU side is
already done and under gate G7.

## What would reverse this

Nothing reverses it; the ports land or they do not. What would CHANGE it is the GPU package
growing an algorithm with no plausible CPU port at all, at which point the element needs a stated
rule for a result shape that exists on one path only -- and that rule is a design decision, not an
adapter.
