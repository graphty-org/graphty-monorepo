# Five owner decisions on the extension contracts

Date: 2026-09-28
Decided by: the owner, answering open decisions 1, 5, 14, 15 and 17 of `design/extensions/README.md`
section 12
Changes: those five items, which are marked decided and point here. The graph-format migration
plan (`design/graph-format/migration-plan.md` on branch `feat/graph-format-migration`) must
follow them; where its static-layout, plugin-seam and export items disagree, this record wins.

## The decisions

1. **Where third-party file writers register (open decision 1).** Answer: graphty-element owns
   the registration. `registerFormatWriter({ descriptor, exporter })` wraps a graph-io exporter,
   so the element supplies the catalogue entry, the reserved ids, the option descriptors and the
   error mapping, and `./extend` re-exports graph-io's writer types. Third parties do not register
   with graph-io's registry directly. This replaces an earlier assumption, written into the
   migration's export item without the owner's say, that writers register through graph-io.
2. **Data sources are the seventh official extension point (open decision 15).** Remote and
   streaming loaders (service queries such as STRING, BioGRID or a Neo4j database) get their own
   contract, separate from file-format readers, decided before the file-format contract is
   frozen. The `DataSource` base class stays supported, with an adapter from a graph-io importer.
3. **Third-party layouts get the snapshot contract first (open decision 14).** A layout is an
   async function from a graph-format snapshot, its options, the pinned rows, an abort signal and
   a progress channel to a coordinate array. It is added in a minor release, and the migration
   builds the built-in layouts on the same contract, so a plugin layout can do what a built-in
   can. The class-based `LayoutEngine` / `SimpleLayoutEngine` contract stays supported, deprecated
   with its replacement named, until the next major; nothing it relies on (including the protected
   `pairWeights` helper) is removed in a minor.
4. **Algorithm extensions name edges through an accessor (open decision 5).** The scoped input
   offers `edgeId(row)` on the graph and `subgraphEdgeIds(row)` on a simplified subgraph. A value
   a plugin publishes for a row that merged several parallel edges is copied to every edge behind
   it.
5. **Algorithm extensions read attributes, weights and earlier results as columns (open decision
   17).** `input.column(optionName)` resolves a declared `"attribute"` or `"partition"` option to
   a typed column over the snapshot's rows; `input.weight` names the weight attribute and whether
   it is a distance or a strength, and the element fills the weights and the run's weight caveat
   from it; a simplified subgraph merges every named column by the same rule as the weights; and
   results published by earlier runs are readable as columns under their result paths. Decisions
   4 and 5 were taken together, so a plugin reads exactly what a built-in algorithm reads.

## Why

The owner's rule for every official extension point is that an extension can do anything its
built-in peer can. The migration is moving the built-in layouts and algorithms onto snapshots now;
without these five answers, plugins would have been left on an interface the built-ins no longer
use, with no way to publish per-edge results, read attributes, write files or load from a service.

See also `2026-09-28-graph-format-migration-owner-decisions.md`, the owner's three decisions for the
migration itself.
