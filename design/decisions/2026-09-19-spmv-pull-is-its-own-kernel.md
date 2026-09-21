# `spmvPull` is its own kernel, not a `segmentedReduce` snippet

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 6 row 9 (the `spmv` (pull) primitive), whose
"How" cell opens "`segmentedReduce` specialised". That row is NOT edited; this record supersedes
its first two words. The rest of the row -- the pull formula, the pre-scaled `xNorm`, the `perm`
slot -- stands.

## The decision

`spmv-pull` is a registry entry of its own with its own WGSL body, `src/wgsl/spmv-pull.wgsl.ts`,
prepared by `prepareSpmvPull` in `src/primitives/spmv.ts`. It binds the eight storage buffers of
design 8.10 (`revRowPtr, revColIdx, revWeights | dummy, perm | dummy, xNorm, rankOut,
personalization | dummy, partials`) and computes `y[v] = beta + alpha * sum w * xNorm[u]` over the
in-arcs of `v`. It shares `segmented-reduce`'s thread-per-row loop structure by copying it, not by
composing a VALUE snippet into it.

Nothing else moves: `segmented-reduce` keeps its five storage bindings and its five-word snippet
vocabulary (`row, arc, nbr, weight, v`), its one runtime caller (the PageRank out-weight
normaliser in `src/algorithms/pagerank.ts`) keeps using it unchanged, and the pull formula, the
caller-side `xNorm` pre-scaling of design 8.2 and the bound `perm` slot are exactly as the design
describes them.

## Why

A `segmentedReduce` VALUE snippet may name only `row`, `arc`, `nbr`, `weight` and `v`
(`VALUE_SNIPPET_VOCABULARY`, `src/primitives/segmented-reduce.ts`), and the check is textual:
every other identifier is `E_SHADER_COMPILE { stage: "compose", slot: "VALUE" }` before any
shader is created. The pull's value is `weight * xNorm[nbr]`, and `xNorm` is a binding. A snippet
cannot name it, so `segmentedReduce` as it exists cannot be specialised into the pull.

The design itself already says the pull is a different kernel: the 8.10 binding table gives
`spmvPull` an eight-binding row of its own, and `test/kernel/bind-group-budget.test.ts` pins
`segmented-reduce` at five and `spmv-pull` at eight. G7 tests those counts. A `segmented-reduce`
variant with eight bindings would be a different kernel wearing the old id.

## What we are giving up, and why it is acceptable

The rejected argument was to widen the vocabulary: admit `xNorm`, `personalization`, `alpha` and
`beta` as snippet words and add the three bindings to the `segmented-reduce` module. Design 6 row
9 reads:

> `segmentedReduce` specialised: `y[v] = beta + alpha * sum_{u in in(v)} w * xNorm[u]` where
> `xNorm[u] = x[u] / norm[u]` is PRE-SCALED by the caller's per-node kernel (8.2), so the pull
> binds no normaliser

It is right that the two loops are the same loop, and that one body with a hole is less code than
two bodies. What it gives up is the property the vocabulary exists for: a snippet cannot reach a
binding, so a snippet cannot alias, race or read out of bounds on anything but the five graph
arrays the module already guards. A vocabulary that admits `xNorm` is a per-caller allowlist, and
the three extra bindings would raise `segmented-reduce` from five to eight for every caller,
including the PageRank out-weight normaliser, which needs none of them. (The FA2 attraction pass
is not a caller: `fa2-attraction` is its own kernel with its own body and six bindings.)

The cost is one duplicated row loop, roughly forty lines of WGSL, and a second body to keep in
step when the P4 tiers land. That is acceptable because the tiers are the ONE thing both bodies
will want, and a shared tier mechanism is a P4 design question, not a reason to merge the kernels
before P4 exists.

## What would reverse this

Two conditions, either of which is enough to revisit:

- P4 lands the subgroup-per-row and workgroup-per-row tiers and the two bodies need the same tier
  machinery; if one module with a `PULL` override then costs less than two bodies, merge them
  there, with the eight-binding descriptor kept.
- The snippet vocabulary gains a checked way to name a caller-supplied read-only binding for some
  other primitive (`advance`'s functor is the candidate), at which point a snippet SpMV is free and
  the separate body is the duplicate.
