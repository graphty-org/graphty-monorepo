# The shadowed PageRankOptions stays until 2.0

Date: 2026-09-19
Decided by: the owner
Changes: nothing in a design document. This records a fact about the code of
`@graphty/algorithms` and what will be done about it, so the next reader who finds the
duplicate does not "fix" it. The plan that carries the decision is
`design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md`.

## The decision

`@graphty/algorithms` declares `PageRankOptions` twice, and the two differ materially.
`algorithms/src/types/index.ts` line 96 declares `{ alpha?, maxIterations?, tolerance?,
personalization? }`. `algorithms/src/algorithms/centrality/pagerank.ts` line 15 declares
`{ dampingFactor?, maxIterations?, tolerance?, initialRanks?, personalization?, weight?,
useDelta? }`, and that is the one `pageRank()` (line 83 of the same file) takes.

Both declarations survive the dual-API window, byte for byte. Three things happen instead:

- The package barrel, `algorithms/src/index.ts`, gains a comment on the line that re-exports
  `PageRankOptions` from `./types/index.js` (line 28 today), naming exactly what that line
  shadows and why it stays.
- The index-based side gets a THIRD declaration, `indexed.PageRankOptions`, in
  `algorithms/src/indexed/pagerank.ts`: `{ dampingFactor?, maxIterations?, tolerance?,
  weighted? }`, every member `readonly` and `| undefined`, as the graph-format design's Port 3
  writes it. It is also re-exported flat from the barrel under the alias
  `IndexedPageRankOptions`, so a consumer can name it without the namespace.
- At 2.0, when the legacy facades go (the 2.0 row of the graph-format design's landing-order
  table, `design/graph-format/graph-format-design.md` line 4259), the declaration at
  `types/index.ts` line 96 is the one deleted. The `pagerank.ts` declaration, the one that
  describes what the function actually reads, survives.

## Why

The mechanism, verified rather than assumed. The barrel exports the types with an explicit
named list (`export type { ..., PageRankOptions, ... } from "./types/index.js"`) and the
algorithms with a star (`export * from "./algorithms/index.js"`). An explicit named re-export
shadows a star re-export, so the public `PageRankOptions` is the four-member type from
`types/index.ts`, while `pageRank()` takes the seven-member type from `pagerank.ts`.

The consequence is a live, silent defect. This compiles under the package's own strict
configuration:

```ts
import { Graph, pageRank, type PageRankOptions } from "@graphty/algorithms";
const o: PageRankOptions = { alpha: 0.5 };
pageRank(g, o);
```

Weak-type detection does not fire because the two types share `maxIterations`, `tolerance` and
`personalization`, and excess-property checking does not apply to a typed variable. The call
runs with `dampingFactor` at its default of 0.85 (`pagerank.ts` line 85). Checked on
2026-09-19 with a scratch file: `tsc` exits 0, and the ranks it computes with `alpha: 0.5` are
identical to the ranks with no options at all, while `dampingFactor: 0.5` changes them.
`tsc --noEmit` passes on the package today, so nothing in the build reports this.

## What we are giving up, and why it is acceptable

Users keep hitting the silent default until 2.0: a caller who reads the public type, passes
`alpha`, and gets the 0.85 answer has no signal that anything was ignored.

That is acceptable because the alternative is worse in kind. Deleting the `types/index.ts`
declaration now changes what `import type { PageRankOptions } from "@graphty/algorithms"`
resolves to, from a four-member type to a seven-member one. Every consumer who typed a variable
against the public declaration since 1.0 -- and graphty-element depends on this package -- has
been typing against the four-member one. Removing it is a breaking change that happens to look
like a fix, which is the most dangerous shape a change can have on a 1.x package. The
graph-format design's rule for the dual-API window (section 14.1, rule 1) says no public type of
`@graphty/algorithms` changes until 2.0, and both declarations are public today.

The rejected argument, for the record: "delete the `types/index.ts` declaration now, it is
obviously wrong." It is not obviously wrong. It is the declaration the barrel publishes, so it
is the one users have typed against, and it is the seven-member one that is unreachable by
name from outside the package.

## What would reverse this

Either of these buys a `feat!:` commit and a major, and then the deletion happens early:

- A bug report from a real user who passed `alpha` and got the 0.85 result.
- A second option type found to be shadowed the same way, which would mean the barrel's explicit
  list is a pattern and not a one-off.
