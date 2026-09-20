# A1 lands inside phase M8a, together with the first six indexed ports

Date: 2026-09-19
Decided by: the owner
Changes: `design/graph-format/graph-format-design.md` section 14.6, rows A1 (branch), A1 (merge)
and A2 of the landing-order table (lines 4250, 4252 and 4253), and the M8a entry criterion of
`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (line 3267: "the A1 branch
merged ... prepared on a branch after A1, merged after F2"). Those are NOT edited; this record
supersedes them. The plan that executes this decision is
`design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md`.

## The decision

A1 is the graph-format bridge inside `@graphty/algorithms`: the legacy `Graph` class gains a
`mutationCount` getter, `toSnapshot(graph)` freezes a `Graph` into a `GraphSnapshot` built with
`weightDtype: "f64"` and memoises the result on `(graph, mutationCount)` in a `WeakMap`, and a
differential harness replays every existing test fixture through the snapshot's views to prove
the conversion preserves node sets, neighbour sets, degrees, edge multisets and weights. Public
signatures are untouched.

A1's CONTENT is unchanged. Its ORDER changes: instead of landing on an earlier branch of its own
and merging before anything consumes it, A1 is executed inside phase M8a -- the phase that adds
the accelerator seam (`accelerated(acc)` and the `AlgorithmAccelerator` interface the WebGPU
package satisfies) -- on one branch, in one pull request, alongside the first A2 commit. The same
phase ports six functions to the `indexed` namespace: `breadthFirstSearch`, `dijkstra`,
`pageRank`, `connectedComponents`, `kruskalMST` and `commonNeighborsScore`, which are exactly the
six the graph-format design's section 14.2 names as Ports 1-6.

Nothing else moves. A2 still owes the remaining ports and the widening of every legacy first
parameter to `Graph | GraphSnapshot`; the six ports landing here widen no legacy signature, and
the legacy functions keep their exact shapes.

## Why

Two facts, both checked against the repository on 2026-09-19.

The A1 branch does not exist and nobody was working on it. Before this phase started,
`algorithms/package.json` declared no dependency on `@graphty/graph-format` at all (its whole
`dependencies` block was `{ "typedfastbitset": "^0.6.1" }`), `algorithms/src/` held no
`indexed/` directory and no `toSnapshot`, and no local or remote branch carried any of them.
`design/graph-format/STATUS.md` line 1334 says it in words: "A1 has not started." The
graph-format design's own decision log says it again at line 4980 (the entry that records the
1.0.0 cut) with the same evidence. The gate that 14.6 attaches to A1's merge, "CI dependency
check passes", is vacuous: the entry at line 4982 of the same log records that "No such check
exists in `.github/workflows/` or `tools/`."

A literally scoped M8a would ship nothing. The WebGPU design says the first accelerator
dispatcher "carries only the methods whose `indexed.*` function has landed"
(`design/webgpu/webgpu-acceleration-plan.md` lines 2963-2965), and the integration plan's
deliverables cell repeats it. With no ports landed that set is empty: an `AcceleratedAlgorithms`
type with zero methods and an `accelerated()` that returns `{ accelerator }`. graphty-element's
adapters could call nothing on it and no test could exercise it beyond checking that it
compiles. Meanwhile the element phase and the app phase both sit behind M8a.

The precedent is the 1.0.0 cut itself. On 2026-09-18 graph-format 1.0.0 was cut WITHOUT the A1
gate that 14.6 places before it, on three consumer ports that already exercised the format, and
the decision log entry closes with "A1 keeps its 14.6 content; only its ORDER relative to F2
changes." This record takes the same gate out of order for the same reason and keeps A1's
content the same way.

## What we are giving up, and why it is acceptable

Section 14.6 is not wrong about what a separate branch buys. An A1 branch reviewed alone is a
conversion reviewed alone: the reviewer looks at one thing, the freeze of a legacy `Graph` into
a snapshot, and the harness is the only consumer. Merging it before anything else consumes it
means a bug in `toSnapshot` is found by the harness, which compares the conversion against the
legacy graph directly, rather than by a port, which compares an algorithm's output and can only
say that SOMETHING differs. Landed together, a differential failure could be blamed on a port
when the conversion is at fault, or the other way round.

That is acceptable for two reasons.

The harness lands in its own commit BEFORE any port. The conversion, the counter and the
differential harness are one commit (`feat(algorithms): convert a legacy Graph to a graph-format
snapshot with a mutation counter`); the six ports are a later commit on the same branch. A
bisect therefore still separates the two, and a reviewer who wants to read the conversion alone
reads that one commit.

The alternative is that nothing moves. The element phase needs the seam, the app phase needs
the element phase, and the seam needs at least one port to be more than a type. Waiting for an
A1 branch that nobody had scheduled would hold the whole chain behind a gate whose only check
was never written.

## What would reverse this

Either of these, and if one holds, cut A1 out rather than re-deriving this:

- A second consumer needs `toSnapshot` before the ports are ready. Then A1 is cut out of this
  branch as its own pull request -- the commit boundary above makes that a cherry-pick -- and
  the ports follow.
- The differential harness finds a format-level problem that takes more than a day to resolve.
  Then A1 becomes its own pull request and the ports wait for it.

One slow afternoon is not evidence; a week is.

## A second change to a public method: `Graph.edges()` on mixed-type ids

`toSnapshot` walks `graph.edges()` and hands every edge it yields to the graph-format builder,
which doubles an undirected edge into its two arcs itself. That is only correct if `edges()`
yields each undirected edge once. It did not for a graph whose ids mix strings and numbers: the
mirror skip compared the two endpoints with `source > edge.target`, and a string and a number
compare false in both directions, so an edge between `123` and `"string"` was yielded from both
endpoints. `[...g.edges()].length` disagreed with `uniqueEdgeCount`, and a snapshot built from
it would have carried the edge twice.

The fix lands in `Graph.edges()` itself, in the same commit as `toSnapshot`: ids of one type
still compare by value, ids of different types compare by their type name, so the mirror is
skipped on exactly one side. No signature changes. The observable change is that `edges()` on an
undirected graph with mixed-type ids now yields each edge once, which is what the method's own
comment always promised and what `uniqueEdgeCount` already counted.
`algorithms/test/unit/indexed/to-snapshot.test.ts` carries the regression case (`yields each
undirected edge once when ids mix strings and numbers`).

This is the phase's second behaviour change to an existing function, beyond the `sources` / `k`
guard on `betweennessCentrality`, and the plan allows only that one. Deduplicating inside
`toSnapshot` instead would have hidden a defect of the public method behind the bridge, which is
the workaround pattern this repository forbids. To reverse this, revert the `isMirror` helper in
`algorithms/src/core/graph.ts` together with the regression case.
