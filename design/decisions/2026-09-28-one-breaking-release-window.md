# One breaking release window for the graph-format migration

Date: 2026-09-28
Decided by: the owner
Changes: `design/graph-format/migration-plan.md` (the two-step release: a deprecation release,
then the removals), and decision 1 of `design/decisions/2026-09-28-graph-format-migration-owner-decisions.md` (on
branch `docs/extension-point-specs`, pull request #574)
(deprecate the plugin seam in a 3.x minor, remove it in 4.0), which this record supersedes.

## The decisions

1. **Group the breaking changes into one release.** The migration ships as one set of majors:
   graphty-element 3.0.0, `@graphty/algorithms` 3.0.0 and `@graphty/layout` 2.0.0, released by one
   merge. There is no separate deprecation release first.
    - **graphty-element 3.0.0** carries the migration's element changes, the undo and redo work of
      pull request #553 (whose branch is merged into the migration branch, so both reach 3.0.0
      together instead of 3.0.0 and 4.0.0), and the removal of `Algorithm.algorithmGraph()` and the
      `AlgorithmGraphView` export in favour of the snapshot accessor.
    - **algorithms 3.0.0** removes the legacy `Graph` class, the legacy implementations and the
      Map-of-Maps signatures, and promotes `indexed.*` to the top level.
    - **layout 2.0.0** ships its removals with no 1.x release carrying deprecations first. The owner
      accepted skipping that window.
2. **The flow and cut wrappers delegate to the ports** and accept four result differences, all
   corrections, recorded in the changelog: net flow on opposite directed edges, `minSTCut` cut
   edges on numeric ids, `stoerWagner` summing opposite directed edges, and a seeded (reproducible)
   `kargerMinCut`.
3. **The matching and isomorphism wrappers delegate to the ports** and accept three result
   differences, recorded in the changelog: a deterministic greedy visiting order, edge direction
   ignored by default, and `edgeMatch` callbacks that see every arc and self-loop.

## Why

A major release costs every consumer a migration. The owner's rule, now in the root `CLAUDE.md`
("Breaking changes and major releases"), is to think ahead and group breaking changes into as few
majors as possible. Merging the migration and the undo work separately would have published
graphty-element 3.0.0 and then 4.0.0, and deprecating the plugin seam in 3.0.0 only to remove it in
4.0.0 would have made plugin authors migrate twice.

Still in force from the same day: graph-format and graph-io are regular dependencies of
graphty-element; an export carries whatever the chosen format can represent; and the extension
contract decisions in `2026-09-28-extension-contract-owner-decisions.md` on branch
`docs/extension-point-specs` (element-owned file writers, data sources as an extension point, the
snapshot layout contract, edge ids and attribute columns for plugin algorithms).
