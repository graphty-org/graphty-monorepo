# Three owner decisions for the graph-format migration

Date: 2026-09-28
Decided by: the owner, answering the questions the migration plan put to him
Changes: `design/graph-format/migration-plan.md` section 6, "Decisions only the owner can make",
items 1, 2 and 3 (on branch `feat/graph-format-migration`), which still list these as open. This
record supersedes those items; the plan should be edited to point here.

## The decisions

1. **The plugin algorithm seam.** Question: graphty-element exposes `algorithmGraph()` to plugin
   algorithms; what happens to it? Answer: "Deprecate, remove in 4.0". A documented snapshot
   accessor replaces it; `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` export are
   deprecated in a graphty-element 3.x minor and removed in graphty-element 4.0, together with
   `@graphty/algorithms` 3.0.
2. **How graphty-element declares graph-format and graph-io.** Answer: "Regular dependencies",
   not peers.
3. **What an export contains.** Answer, in the owner's own words (not one of the offered options):
   "whatever the format supports".

## What was NOT decided

The owner did not decide where third-party file writers register, nor the name and signature of
the element's export method, nor the name and shape of the snapshot accessor. A workflow summary
written after the answer added "third-party writers register through graph-io's existing
registry"; that clause came from an option the owner did not pick. These remain open decisions in
`design/extensions/README.md` section 12 (items 1 and 5) and in the migration plan.

## How the export answer is read

`design/extensions/file-format.md` section 8.1 states the reading used by the extension
specifications: an export carries nodes, edges, attributes, positions, algorithm results and style
wherever the chosen format has a place for them, and reports every omission as a loss note. Where
that reading goes beyond the owner's words (for example whether a style MAPPING, not only resolved
colours, must be written when the format can hold one) it is marked there as needing the owner's
confirmation.
