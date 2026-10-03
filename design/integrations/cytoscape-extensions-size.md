# What @graphty/cytoscape-extensions costs a page

Measured 2026-10-03 on the `feat/cytoscape-adapter` branch, before the first publish. The question it
answers: should the extension ship as one npm package, or be split into several (per layout, per
algorithm, layouts apart from algorithms)?

## How it was measured

`cytoscape-extensions/scripts/size.mjs --compare` builds small pages with Vite 7.3.6, the way a
browser application's production build would (minified, code-split at every dynamic import), and
gzips each output file at level 9. Each page imports the package from `dist/`, the files a consumer
installs. Cytoscape itself is left out of every number, because the page already has it.

- **Up front** is what `import graphtyCytoscape from "@graphty/cytoscape-extensions"` downloads
  before anything runs: the entry chunk and every chunk it imports statically.
- **On first use** is each chunk that a dynamic import loads, plus what it imports that the page
  does not already hold. The extension loads the WebGPU code, the generators, each bundled dataset
  and the file formats this way, so a page that never calls them never downloads them.
- The three Cytoscape extensions it is compared with were fetched with `npm pack`, installed with
  their dependencies, and bundled the same way, each from a page holding only
  `import x from "<package>"`.

Run it again with `node scripts/size.mjs --compare` in `cytoscape-extensions/` after `npm run build`.
It needs the network for the comparison packages.

## The numbers

| What                                                                                   |   Minified |   Gzipped |
| -------------------------------------------------------------------------------------- | ---------: | --------: |
| **Main entry, up front** (every layout and algorithm registered)                       |  355.3 KiB | 107.1 KiB |
| ... of which the layouts alone                                                         |  224.9 KiB |  65.0 KiB |
| ... of which the algorithms alone                                                      |  282.2 KiB |  83.9 KiB |
| WebGPU code, on the first GPU-eligible call                                            |  391.9 KiB | 102.9 KiB |
| Generators, on the first `graphtyGenerate` or `graphtyDataset`                         |   55.9 KiB |  21.3 KiB |
| File formats, all eight together, on the first `graphtyImport` or `graphtyExport`      |  503.5 KiB | 157.0 KiB |
| One dataset, on first use: karate                                                      |    2.8 KiB |   1.5 KiB |
| One dataset, on first use: openflights (the largest bundled one)                       |  615.7 KiB | 181.2 KiB |
| Everything (every chunk of the build, all 12 bundled datasets included)                | 2288.0 KiB | 699.8 KiB |
| Script-tag bundle (`dist/cytoscape-extensions.bundle.js`, one file holding everything) | 2288.8 KiB | 693.6 KiB |

The two halves of the main entry add up to more than the entry, because they share the
Cytoscape-to-snapshot conversion and the GPU dispatch. Every bundled dataset is its own chunk: the
other ten are between 1.3 KiB and 68.6 KiB gzipped (`size-budgets.json` lists each).

What a smaller package could weigh, at the least:

| What                                                                                     |      Minified |          Gzipped |
| ---------------------------------------------------------------------------------------- | ------------: | ---------------: |
| One layout, imported straight from @graphty/layout (`forceAtlas2`)                       |     187.8 KiB |         53.4 KiB |
| One algorithm, imported straight from @graphty/algorithms (`pageRank`)                   |       1.6 KiB |          0.8 KiB |
| The Cytoscape-to-snapshot conversion with that one algorithm (`toSnapshot` + `pageRank`) |     176.4 KiB |         49.8 KiB |
| One file format alone, from @graphty/graph-io (GML, DOT, Pajek, CSV, Neo4j)              |  68 to 76 KiB | 22.2 to 25.1 KiB |
| One file format alone, from @graphty/graph-io (GraphML, GEXF, JSON)                      | 97 to 101 KiB | 31.2 to 32.6 KiB |

The Cytoscape extensions it is compared with:

| Package                                             |  Minified |  Gzipped |
| --------------------------------------------------- | --------: | -------: |
| cytoscape-fcose 2.2.0 (one layout)                  | 121.7 KiB | 33.6 KiB |
| cytoscape-cola 2.5.1 (one layout)                   |  84.5 KiB | 26.2 KiB |
| cytoscape-graphml 1.0.6 (GraphML import and export) |   3.8 KiB |  1.7 KiB |

cytoscape-graphml's number leaves out jQuery, which it needs as a peer and a page must load too
(about 30 KiB gzipped).

## What the numbers say

**The floor is graph-format, not the layouts or the algorithms.** `pageRank` itself is 0.8 KiB, but
reading a Cytoscape graph into the snapshot it runs on costs 49.8 KiB. Almost all of that is
@graphty/graph-format: its `dist/` is one bundled file that does not tree-shake, so importing only
`fromEdgeArrays` from it costs 49 KiB gzipped. Any package that touches a Cytoscape graph pays it,
whether it holds one algorithm or all of them.

**Splitting saves less than it looks.** Against the 107.1 KiB main entry:

- a package of the layouts only would be 65.0 KiB (a page that uses only layouts saves 42 KiB);
- a package of the algorithms only would be 83.9 KiB (a page that uses only algorithms saves 23 KiB);
- a package per layout would be about 53 KiB for ForceAtlas2, and one per algorithm about 50 KiB,
  because of the floor above. The floor is shared (a bundler includes graph-format once), so the
  rest is small: all sixteen layouts together add only about 15 KiB to it, and a page that uses
  three or four single-layout packages would pay nearly what the layouts-only package costs.

**The large parts are already paid only by those who use them.** The WebGPU code (102.9 KiB), the
file formats (157.0 KiB), the generators (21.3 KiB) and every dataset load on first use. A page that
only lays out graphs never downloads them, so splitting them into packages would save nothing a
bundled application pays today. It would cost the one-line install that makes WebGPU work with no
import.

**Against the alternatives:** one fcose or cola layout costs 26 to 34 KiB; this package costs 107
KiB up front for sixteen layouts and every algorithm. The file formats are much larger than
cytoscape-graphml's 1.7 KiB, because graph-io reads eight formats with validation, a loss report and
streaming input, where cytoscape-graphml reads one format through jQuery; they load only when a file
is read or written.

## Recommendation

**Publish one package.** Splitting it would multiply the installs, the documentation and the
versions to keep in step, and break the "install it and WebGPU just works" promise, for a saving of
23 to 42 KiB on the pages that use only half of it and a loss on the pages that use several pieces.

If the up-front size needs to come down later, in order of what it buys:

1. **Make @graphty/graph-format tree-shakable** (publish its modules unbundled, or mark it free of
   side effects so a bundler can drop what is unused). That lowers the floor under every package,
   this one included, and under every other graphty consumer. It is the largest lever.
2. **Add `./layouts` and `./algorithms` entry points** to this package, each registering only its
   half (65.0 and 83.9 KiB today). That is additive, needs no new package, and keeps the main
   entry as it is.

Separate npm packages per layout or per algorithm are not worth it while the floor is about 50 KiB.

## Keeping it from growing

CI runs `pnpm --filter @graphty/cytoscape-extensions run size` in the build job, and the pre-push
gate runs it when the package is affected. It rebuilds the parts in the first table and fails
when one grows more than 10 percent (at least 1 KiB) over `cytoscape-extensions/size-budgets.json`,
when a new part has no budget, or when a budget names a part that no longer exists. A growth that
is intended is recorded by `node scripts/size.mjs --update` and committed with the reason. The
comparison rows measure other packages and are not budgeted; their growth reaches this package's
budgets through the parts that load them.
