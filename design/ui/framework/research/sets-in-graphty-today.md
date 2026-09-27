# Sets in graphty today, and the owner's open questions about them

The owner asked these questions while the ontology was being drafted. The ontology, the
glossary and the information architecture must answer each of them explicitly.

1. How should sets relate to queries (graphty's JMESPath expressions)? Should graphty pass sets
   around instead of queries?
2. How should sets relate to data sources? If two sources are loaded and joined, how does a set
   cut across them?
3. How do graph-format's frozen snapshots relate to data sources? Is each source its own
   instance?
4. How do algorithms create sets? Do they today?

## What exists in the code (checked 2026-09-26)

- graph-format has only primitives: bitmap masks over rows (`graph-format/src/util/mask.ts`)
  and `deriveInducedSubgraph` (`graph-format/src/snapshot/derived.ts`). No named or kept sets.
- graphty-element calls a set description a `Scope` (`graphty-element/src/catalog/types.ts`):
  `"visible" | "graph" | "selection" | "largest-component" | { set: ScopeId } | { where: Query }
| { nodes: NodeId[] }`. It already covers both a rule (`where`) and members (`nodes`).
- `session.scope` (`graphty-element/src/session/scope/ScopeApi.ts`) resolves and counts a scope
  and keeps one under a name: `save(name, spec)`, `list()` with a `bound` flag, `remove(id)`.
  Published in graphty-element 2.x. A scope names nodes only; its edges are always induced.
  It is unordered, and it records no origin.
- Runs, layouts and exports accept a `Scope`. Style layers and the visibility filter do not:
  style selectors have four kinds (`expression`, which reaches the JMESPath evaluator; `has`, a
  column-presence test; `ids`, a literal id set; `everything`), and none of them can name a saved
  scope. The selector file measures a presence test at 7.3 ns per element against 1,322 ns for a
  JMESPath call.
- Selection has set operations (replace, add, remove, toggle, intersect) but no identity.
- Data: the element holds ONE graph-format builder for the life of a `Graph`
  (`graphty-element/src/data/GraphStore.ts`). An import either replaces the graph or adds into
  that one builder, and every change re-freezes a new immutable snapshot lazily on first read. A
  data source is not its own snapshot instance. Rows do not record which import brought them in
  (the store keeps one import source descriptor for the graph).
- Algorithms do not create sets. A run publishes values per node, per edge or for the graph
  (`session/results/types.ts`): a community is a community-id value on each node, a path is an
  `isInPath` flag, components are labels. "Community 3" exists only as a query someone writes.
  The only built-in set an algorithm implies is the `largest-component` scope keyword.

## Follow-up question: sets as algorithm input

5. How should sets relate to the inputs of algorithms? graph-format's layout is optimised for
   handing a graph to the GPU; should sets have that option? What does converting a set to a
   graph cost?

What the code has:

- A resolved scope today is two JavaScript `Set`s of ids (`ResolvedScope` in
  `graphty-element/src/session/runs/types.ts`), plus counts and a digest. At a million nodes that
  is tens of megabytes of strings and a hash lookup per membership test.
- graph-format already has the compact forms: packed bitmap masks over row indices (`NodeMask`,
  `graph-format/src/util/mask.ts`, n/8 bytes: 125 KB for a million nodes) and
  `snapshot.inducedSubgraph(indexList | { mask })` (`graph-snapshot.ts`, `derived.ts`), which
  builds a new compact CSR snapshot in one pass over the edges.
- webgpu-graph-algorithms already accepts node masks in places (for example a layout's
  `setFixed(mask: NodeMask)`).

## Follow-up question: what sets mean for scopes

6. Given sets, what happens to graphty-element's published `Scope`, `ScopeId`, `SavedScope` and
   `session.scope`?

A proposal for the vocabulary and ontology sessions to test, not a decision: a SET is the thing
(group, community, path, filter result, selection, kept list), and a SCOPE is a role -- "what this
operation runs over" -- that a set plays for a run, a layout or an export. Today's `Scope` union
already refers to saved scopes as `{ set: ScopeId }`. Under that split, the `scope` parameter keeps
its name and accepts a set reference (a kept set's id, an inline rule, an inline member list, or a
built-in set: whole graph, visible, selection); `largest-component` becomes a set the components
result offers; saved scopes become kept sets under a new `session.sets`; and the existing `Scope`
forms stay valid as a subset, so the change is additive. The alternative is renaming the published
names to sets in the next major version with deprecated aliases. Either way this is a one-way door
(published names and the project file) and belongs in one-way-doors.md with a recommendation.
