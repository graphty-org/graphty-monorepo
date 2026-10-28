# Graphviz layouts come from Graphviz itself, compiled to WebAssembly

Date: 2026-10-17. Decided by the session building DOT import fidelity, under the owner's criteria
(in order: more reliable, more maintainable, more accurate implementation of the algorithms). This
is an additive capability and an optional peer dependency, so it needs no owner approval; renaming
or removing what it adds later would be breaking.

## Context

A DOT file says which Graphviz engine should draw it (`layout=neato` in the file, or `dot` by
default) but usually carries no coordinates. graphty-element today answers `layout: "recommended"`
for such a file with its own force layout, so an imported Graphviz graph looks nothing like what
Graphviz draws, and the reference SVG images graph-io's import is checked against cannot be
compared with what the element shows. The question was how graphty gets Graphviz's eight layouts
(dot, neato, fdp, sfdp, circo, twopi, osage, patchwork): run the real C code compiled to
WebAssembly, or write our own TypeScript implementations.

Both were measured. Raw results and scripts: `tmp/style-oracles/graphviz-wasm/` and
`tmp/style-oracles/graphviz-native/` in the main checkout.

## Options

### A. Real Graphviz in WebAssembly (`@hpcc-js/wasm-graphviz`)

Graphviz 16.1.0's own C code. Corpus: 210 DOT files from graph-io's tests, 8 engines each, every
layout in a fresh wasm instance, against native Graphviz 16.1.0 built the same way (no pango, no
GTS).

- Accuracy: 946 of 1,032 layouts (dot, neato, circo, twopi, osage, patchwork) byte-identical to
  native on glibc; 1,017 of 1,032 (98.5%) once native uses musl's `qsort`, which is the libc wasm
  is built on. The remaining difference is the sort order of tied comparator elements, not the
  algorithm. 12 of the last 15 are one file (`fdpclust.gv`) that switches engine inside itself.
- fdp and sfdp differ at floating-point level (fdp 77 identical and 47 within 1pt of 177; sfdp 45
  of 182), and native 14.1.2 and native 16.1.0 differ from each other as much: these engines are
  numerically sensitive, not mistranslated.
- Same bytes in Node 22, Chromium 143 and Firefox 144, in a page and in a module Worker (17 of 17
  and 16 of 16 hashes). WebKit not measured.
- Size: 632 KB gzipped, one self-contained ESM file, wasm inlined, no extra requests, no `eval`.
  Load 90 to 270 ms in Node, 99 ms in Chromium, 199 ms in Firefox.
- Speed is Graphviz's own: at 10,000 nodes only sfdp (6.8 s), twopi (15 s), osage (1.9 s) and
  patchwork (1.2 s) finish; dot, neato and circo time out at 300 s natively too; fdp crashes in
  wasm where native times out.
- Reliability hazards, all measured and all handled by the conditions in the decision:
    - Reusing one instance across layouts gave 18 wrong outputs and 10 crashes in 8x210 runs;
      `unload()` then `load()` before each layout matched a fresh instance 55 of 55 times, at 80 to
      180 ms a layout.
    - 2 fresh-instance failures where native succeeds (a circo stack overflow, one patchwork
      crash), probably the small wasm stack; 2 genuine Graphviz bugs abort native and wasm alike.
    - Layout is synchronous and cannot be cancelled; only `Worker.terminate()` stops it.
- Maintenance: one dependency. Graphviz upstream fixes arrive by bumping it (hpcc: 10 releases
  July to September 2026, 0 open issues). License: wrapper Apache-2.0, Graphviz EPL-1.0;
  graphty-element (MIT) never redistributes it as an optional peer.
- `@viz-js/viz` 3.31.0 embeds the same Graphviz (468 KB gzipped, faster load, errors returned as
  data instead of thrown) but failed 10 fresh-instance layouts where hpcc failed 2, and the two
  disagree on sfdp in about 56 files. Kept as the fallback behind one internal loader module.

### B. Our own TypeScript implementations

Measured against Graphviz wasm on 104 corpus files (87 laid out by dot, 3 to 800 nodes):

| Layered layout                                    | Ranks equal      | Same-rank order agree, median | Crossings vs dot |
| ------------------------------------------------- | ---------------- | ----------------------------- | ---------------- |
| dot vs itself, input order reversed (noise floor) | 66/87            | 0.96                          | 0.82             |
| dagre (the 1993 paper, ported)                    | 68/86, one crash | 0.82                          | 1.25             |
| elk layered, depth-first cycle breaking           | 50/87            | 0.78                          | 0.99             |
| d3-dag (60 nodes or fewer)                        | 44/70            | 0.88                          | 1.04             |
| dagre with clusters                               | 15/20            | 0.88                          | 1.72             |

- A port gets dot's ranks but not its order (about 0.85) and is worst on clusters, which are
  common in real DOT files (20 of 87).
- neato: `@graphty/layout`'s `kamadaKawai` is as far from neato's drawing (Procrustes 0.173) as
  neato is from itself with another seed (0.194), with equal stress (0.043 vs 0.042). Point for
  point matching would mean copying neato's random generator and floating-point order.
- Cost: dot core plus clusters plus splines is about 7k lines of TypeScript and 10 to 11 weeks,
  a fork that drifts with every Graphviz release; sfdp and circo add 2.3k to 3.7k more.

## Decision

**A.** Graphviz's eight layouts are served by real Graphviz compiled to WebAssembly,
`@hpcc-js/wasm-graphviz`, an optional peer dependency of graphty-element loaded on demand. On all
three criteria it wins: it is the algorithm itself (98.5% byte-identical, against about 0.85 order
agreement for the best port), it is one dependency instead of a 7k-line fork, and its measured
failure modes are each closed by a mechanism below.

We do NOT write TypeScript ports of the Graphviz engines. A native layered layout over the
snapshot (dagre-sized) is a separate question, decided on its own merits if somebody wants one;
it would never be named or documented as dot-compatible, and Graphviz wasm would be its test
reference.

Three conditions are part of the decision, not implementation detail:

1. Every layout runs in a dedicated module Worker, so a long or crashed layout never blocks the
   page and can be stopped.
2. Every layout gets a fresh wasm instance (`unload()` then `load()`), because a reused instance
   gives wrong answers.
3. Every engine has a node budget and a time budget; past either, the Worker is terminated and
   the layout fails with a code, never silently degrades to another engine.

Rejected: shipping the wasm as a hard dependency (632 KB for every consumer, most of whom never
draw a Graphviz layout); running it on the main thread (no cancel, a crash takes the page's state);
reusing one instance for speed (measured wrong output); putting it in `@graphty/layout` (that
package is pure synchronous CPU code over the snapshot with no Worker or loader, and the WebGPU
precedent puts optional accelerators in graphty-element, which owns detection and lifecycle).

## Consequences

- Where it lives: graphty-element, registered through the same snapshot-layout mechanism
  (`registerSnapshotLayout`, whose `compute` may return a Promise) every other layout uses, so the
  catalogue, `setLayout`, undo and the app see nothing new. The loader and Worker are internal to
  graphty-element. graph-io changes nothing about layout: its DOT importer already keeps the graph
  attribute `layout` (and `rankdir`, `nodesep`, ... ) as graph values, and it already decodes the
  file's charset before anything reaches Graphviz.
- How DOT import picks it: with `layout: "recommended"`, a graph that carries no coordinates and
  whose graph value `layout` (or, for a DOT file with none, `dot`) names a Graphviz engine gets
  that engine, when the peer is installed. Without the peer it gets today's recommendation and a
  coded fact saying why. Coordinates in the file still win (`recommend.fixed`).
- Reference images for the import oracle must come from the same layout path (wasm, or native
  built without pango), never a desktop `dot`, whose text metrics differ (457 of 1,032 match).
- Size limits: Graphviz itself does not finish dot, neato, fdp or circo on 10,000 nodes in 300 s.
  The budgets say so up front instead of hanging.
- Pages with a Content Security Policy need `'wasm-unsafe-eval'` to use these layouts.
- Multi-graph DOT files: wasm lays out only the first graph; graph-io already imports one graph.
