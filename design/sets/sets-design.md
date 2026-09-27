# Sets in graphty-element: design

Status: design, ready for planning. Baseline: master at graphty-element 2.4.1 (published on
npm) and graph-format 1.0.0. Packages touched: graphty-element, plus five bitmap helpers in
graph-format. The graphty app needs no change.

Line references are to master (`3e4e04ff`), relative to `graphty-element/src/` unless a package
is named. Every claim that this design reuses existing behaviour cites the file and line it
reuses.

---

## 1. Problem and goals

### 1.1 What is wrong today

graphty-element already answers "which elements" in five separate grammars:

- `Scope`, for runs, camera framing, selection targets and the cost planner;
- `Selector`, for style layers;
- `SelectionTarget`, for the selection;
- `Filter`, for the visibility filter;
- `fixed: NodeMask`, in the layout packages.

Only `Scope` and `SelectionTarget` can name a saved group of elements (a "saved scope"). Beyond
that gap, the survey of the code found these problems:

1. **A run's scope is recorded but not honoured.** `session.runs.start(..., { scope })` resolves
   the scope, estimates the cost over it, derives the run id from it and records it. The algorithm
   then computes over the whole graph (`managers/AlgorithmManager.ts:340-356`,
   `algorithms/Algorithm.ts:338-372`, and a dozen adapters that read `DataManager` directly,
   section 10.1). A run over a 20-node selection reports 20 nodes and has computed over all of
   them.
2. **A style layer and a filter cannot name a saved scope.** A consumer who wants to paint "my
   suspects" must copy the ids or the query text into the layer. The copy stops following the
   saved scope the moment it is redefined.
3. **Layouts take no scope.** `setLayout(type, opts)` works on the whole graph.
4. **Saved scopes are thin.** They record nothing of what they were created from, and have no
   edge members, no order, no rename and no redefine. `selection.promote` drops the selected edges. `scope.save` stores the caller's spec
   object by reference, so a caller that later mutates it silently changes the saved scope.
5. **A saved scope wrapping `{ where }` over `results.*` serves stale members.** Its cache is not
   invalidated when a run finishes (`session/scope/ScopeApi.ts:390-394`).
6. **Identity values are reissued.** A removed saved scope's id is minted again for the next
   scope of the same name (`ScopeApi.ts:984-993` loops only `while (saved.has(id))`). Edge ids
   restart after Clear or a replacing import, because the counter lives in the store that
   `resetStore` replaces (`data/GraphStore.ts:124`, `managers/DataManager.ts:475-482`). Anything
   that names an id by value silently re-attaches to a different object.
7. **Resolution is expensive.** A resolved scope hands out two JavaScript `Set`s of id strings.
   Over half of a million-node graph that costs 416 ms and retains 82 MB, once per snapshot
   (`ScopeApi.ts:707-724`, `790-792` cache non-predicate specs per snapshot frame). The run code
   also reads the id-string digest of every run's scope on every record read
   (`session/runs/RunsApi.ts:737`, `803-818`).
8. **Algorithms publish partitions and paths as per-element values only.** Nothing turns
   "community 3" or "the path Dijkstra found" into something you can use as a scope, style or
   keep.

### 1.2 Goals

1. A **set** is a first-class, kept, named object in graphty-element: nodes, edges or both,
   defined by a member list, a rule or an ordered path.
2. **One set reference is accepted everywhere** something targets elements: runs, layouts, style
   layers, the visibility filter, selection and camera framing. Callers pass sets around, not
   query strings. Export takes a set when the element gains an export verb (section 11).
3. **Scoped runs compute over their scope**, on the CPU and the GPU, with no kernel changes, and
   elements outside the scope read missing.
4. **Algorithms keep publishing values.** A result offers sets on demand, and only keeping one
   writes state.
5. **Every change is additive to the published 2.x API**, except two narrow behaviour fixes
   flagged in section 15.3.
6. **Set state is ready for undo.** It is one slice-shaped value, changed only through a fixed
   list of operations, and no identity value it holds or reads can repeat.
7. **It is fast at a million nodes and ten million edges.** A set resolves to two packed bitmaps,
   set algebra is word-wise, no id strings are built unless a caller reads ids, a read that may
   resolve is asynchronous, and no cache key is coarser than what the set actually reads.
8. **The persisted form is settled before it is published**: canonical form, revision, edge
   identity, tombstones and unknown kinds (section 12).
9. **Later features have a place to land** (section 20).

### 1.3 Non-goals

- A project file. None exists on master. This design fixes the persisted form and defers the
  writer (section 12).
- An export verb. The element's snapshot carries no user attributes, so a subgraph snapshot is
  not an export (section 11).
- The design studio's ordered filter steps, working sets and the search graph. This design adds
  the leaf those steps will hold (section 20).
- A sets panel in the graphty app (section 17).
- Undo itself. It is being built separately. This design only fits its model (section 13).

---

## 2. The concept

### 2.1 What a set is

A set is a named collection of the nodes and edges of the one graph. It lives in
graphty-element, beside nodes and edges, inside the graph container. A set:

- has **identity**: an element-minted id that is never reissued, and a name that can change;
- has **one membership wherever it is used**: a style layer, a filter and a run that name the same
  set see the same elements. A rule is evaluated exactly as the visibility filter evaluates the
  same tree (section 4.3);
- has a **definition** of one of three kinds (section 4): **fixed** (stored member ids),
  **rule** (a predicate that follows the data) or **path** (an ordered walk);
- has a **stated edge reading**, never inferred (section 4.1);
- records **what it was created from** (`createdFrom`, the studio's "Created from"), and derives
  from its definition what it depends on and whether it is current;
- is **never nested** in another set, and may overlap any other set. Containment is computed on
  demand: A is inside B when `A and not B` is empty. A rule can name another set's members.

Every resolved set satisfies one invariant: **every member edge's endpoints are member nodes.**

Groups, communities, components, kept selections, filter results and paths are all sets. They
differ by what they were created from, not by kind.

### 2.2 Scope is a role, not a thing

"Scope" names a role: what an operation runs over. It is not a kind of object.

- The `scope` parameter keeps its name.
- The published `Scope` type keeps its name, and it becomes **the set reference type**.
- A "saved scope" is a kept set.

| `Scope` form | What it is as a set | Reading |
|---|---|---|
| `"graph"` | Built-in: every element | induced |
| `"visible"` | Built-in: what the visibility filter shows. It can hide edges independently of nodes (`ScopeApi.ts:626-634`, `738-744`) | **clipped** |
| `"selection"` | Built-in: the selected nodes, as in 2.x (`ScopeApi.ts` returns no edge constraint) | induced |
| `"largest-component"` | Built-in: the largest **weakly** connected component (`session/statistics.ts` `labelComponents`) | induced |
| `{ set: SetId }` | A reference to a kept set (unchanged) | the set's own |
| `{ where: Query }` | An inline rule set (unchanged) | induced |
| `{ nodes: NodeId[] }` | An inline fixed set (unchanged) | induced |
| `{ define: SetDefinition }` | **New.** An inline set of any definition kind | the definition's |

Built-ins are resolved live and are never records.

### 2.3 How sets relate to everything that targets elements

| Surface | Today | After |
|---|---|---|
| Runs | Scope recorded, estimated, not executed | Computes over it (section 10). The run record names the set id and revision it ran over, and a caveat states the subgraph size |
| Layouts: `setLayout(type, opts, options)` | Whole graph | `options.scope`. The five physics layouts move only the members and hold the rest (section 11) |
| Style layers: `Selector` | Cannot name a set | New selector `{ match: "scope", scope }`, one bit test per element |
| Visibility filter: `Filter` | Cannot name a set | New leaf `{ kind: "scope", scope }` |
| Selection: `SelectionTarget` | `{ scope }` accepted | Unchanged. Subject to the 5,000-element selection cap, which says when it truncates |
| Camera: `applyCameraView(view, { scope })` | Reads the id `Set` | Reads the bitmap |
| Results | Per-element values | Offer sets (section 8.2). Algorithms never create sets |
| JMESPath `Query` | The only way to write a predicate | One way to write a rule. Never a way to pass a set around |
| Selection as a source | `promote` drops edges | "Create set" freezes it into a kept fixed set, nodes and edges |
| Export | None | Deferred to an element export verb that attaches attributes (section 11) |

### 2.4 Why sets and not queries

- **A copied query stops following its set.** A layer that names `{ set: id }` follows every
  redefinition. A layer that holds the set's query text does not.
- **Some sets have no query.** A hand-picked fixed set, a path, and a set kept from community 3
  of an earlier run cannot be written as a query.
- **A reference is cheaper to use.** Once resolved, a set is a bit test by index, about 2 ns per
  element. Resolving a JMESPath rule costs about 1,322 ns per element, about 1.3 s at a million
  nodes, and that is paid again whenever its inputs change. A kept fixed set pays neither.
- **A reference composes like what it replaces.** Swapping an inline rule for a reference to a
  set holding the same rule changes nothing another leaf sees (section 4.3, the composition
  test).

---

## 3. Definitions and identity

### 3.1 Ids

- `SetId` is an element-minted string. `ScopeId` becomes an alias of it (`type ScopeId = SetId`).
- **Every minted id starts with `set_`**, and no built-in keyword does. That prefix is the only
  part of the format that is a contract. Everything after it is opaque.
- **An id is never reissued within a project.** The project keeps one **issued-id register** of
  every id it has ever issued (section 12.4). Minting is `set_<slug>`, then `set_<slug>_2`, `_3`
  and so on, skipping every id in the committed register, every id live in the draft, and every id
  minted earlier in the open write group (a pending list that the commit appends to the register
  and a rollback discards). Without the last, a group that creates, removes and re-creates
  "Suspects" would issue one id twice. The first mint of each id is byte-identical to today's, so
  existing tests and ids keep working.
- The register is **not slice state**. It is a monotonic register, like the undo design's graph
  token: written when a write commits, never rewound by undo or rollback, persisted with the
  project, so a load can never reissue an id a stored reference names.
- Random suffixes were rejected: the register gives the same uniqueness within a project and keeps
  derived run ids deterministic (a derived run id hashes `{ set: id }`,
  `session/runs/runId.ts:248-289`). Sets imported from another project keep their ids under a
  namespace, `set_<ns>.<rest>`. A slug never contains a dot, so a namespaced id can never equal a
  local mint, and an import re-namespaces any id already in the register. No reference, derived run
  id or `results.<runId>` path has to be rewritten (section 20).
- **Ids are minted at dispatch**, synchronously, in the same tick as the `set.create` that
  records them, together with the `order` and the name check (section 13.3). An asynchronous
  door resolves first and mints only when it dispatches, so two `createFrom` calls in flight can
  never both see `set_suspects` as free. The id is recorded in the concrete command, so a replay
  by a future redo or file loader never mints again.
- The suffix is opaque so that a later minting scheme (for example a per-project nonce) can make
  two copies of one project mergeable. Tests pin only that the first mint of a name matches
  today's id.
- **Rename keeps the id**, because ids are inside derived run ids, `results.<runId>` paths and
  saved style layers.

### 3.2 Names

- A name is trimmed, never empty, and unique among live sets (case-sensitive), as today.
- When no name is given, the element picks "Set N": the smallest N that is free.
- Uniqueness is enforced at the doors only. A restore path (undo rollback, a file load) may
  produce duplicates, so `list()`, the `scope.list()` projection and any UI break ties by id.
- Nothing ever resolves a set by name.

### 3.3 The TypeScript name

The record type is `ElementSet`, never `Set`, which would shadow the JavaScript built-in.

### 3.4 Revision

`ElementSet.revision` is a **versioned digest of the canonical definition**, `r1:<hex>`
(section 12.2). It is never stored in the set record. It is computed on first read and memoised
per frozen record, and a
`set.members` delta updates it in O(delta) because the member part of the digest is an
order-free sum. Rename does not change it. A stored counter was rejected: after a redefine, an
undo and a different redefine, it would repeat. A content digest cannot.

Only the version-prefix scheme is persisted contract. The only stored revisions are the ones run
records hold (`RunScopeRecord.set.revision`). When a stored revision's version differs from the
current one, the comparison is **unknown**, never "changed": the run is not out of date, its
status carries the reason `revision-unknown`, and the next run records the new version. Stored
revisions are never re-stamped, because re-stamping would compute the revision of the set's
current definition and erase a real redefinition made after the run.

---

## 4. Members, edges, order

### 4.1 The definition

```ts
/**
 * Which edges come with a set's nodes. Stored, never inferred. OPEN UNION.
 *   induced -- the node half plus every edge between its nodes (NetworkX G.subgraph(nodes)).
 *   listed  -- the edge half plus its endpoints, plus the node half (NetworkX
 *              G.edge_subgraph(edges) plus any listed nodes). Paths, edge sets and edge rules.
 *   clipped -- the node half, plus the edge half clipped to edges whose endpoints are both in
 *              the node half. Rules only: exactly what the visibility filter shows.
 */
export type EdgeReading = "induced" | "listed" | "clipped";

/**
 * An edge member, by its stable identity (section 12.3). Exactly one of `id`, `key` and
 * `ordinal` is present; the validator refuses anything else. OPEN: may gain optional fields.
 */
export interface EdgeMember {
    readonly source: NodeId;
    readonly target: NodeId;
    /**
     * The file's edge id, read at the element's configured `edgeIdPath`, or for an edge added in
     * the session without one, the id the element minted for it (`graphty:e<n>`).
     */
    readonly id?: string | number;
    /** The file's parallel-edge key. Reserved: refused at the doors until the element reads one. */
    readonly key?: string | number;
    /**
     * Last resort, for file edges without an id: the edge's position, counting from 0, among ALL
     * edges of its pair in the load that ingested it, in ingest order, and `among`, that pair's
     * edge count in that load (so 0 <= ordinal < among). Assigned once, when the load completes,
     * and never recomputed. Both are present, or neither.
     */
    readonly ordinal?: number;
    readonly among?: number;
    // Reserved: dataSource?: string -- the data-source column (section 9); absent matches any.
}

/** What a set holds. OPEN UNION: kinds may be added in a minor release; handle unknown kinds. */
export type SetDefinition =
    | {
          readonly kind: "fixed";
          /** Canonical order, no duplicates. */
          readonly nodes: readonly NodeId[];
          /** Canonical order, no duplicates. Only edges listed explicitly; an induced set derives its edges. */
          readonly edges?: readonly EdgeMember[];
          readonly reading: "induced" | "listed";
      }
    | {
          readonly kind: "rule";
          /** A query, or a rule tree (the visibility filter's `Filter`, grown by three leaves, section 4.3). */
          readonly where: Query | Filter;
          readonly reading: EdgeReading;
      }
    | {
          readonly kind: "path";
          /** The walk, in order. Repeats allowed. One node is a zero-length path. */
          readonly nodes: readonly NodeId[];
          /**
           * Optional; when present, exactly nodes.length - 1 entries. Entry i names the edge, or
           * the group of parallel or reciprocal edges, joining nodes[i] and nodes[i+1]. null:
           * every edge between that pair.
           */
          readonly edges?: readonly (EdgeMember | readonly EdgeMember[] | null)[];
          /** Steps must follow declared edge direction. Default false. */
          readonly directed?: boolean;
      };
```

- A fixed set's reading is `induced` or `listed`. `clipped` is a rule reading: a fixed set's node
  half already holds its edges' endpoints, so clipping changes nothing, and a caller's
  `"clipped"` on a fixed set is canonicalised to `"listed"`.
- **A fixed set read `induced` stores no edges** unless the caller listed some. Its edges are
  derived from its nodes. Switching the reading is a `set.redefine` that changes only `reading`
  and keeps the stored edges, so a node-only set read `listed` has no edges, as the studio defines
  it; the prior and next records share the frozen member arrays, so history copies nothing. This
  is what keeps `createFrom("largest-component")` at 10M edges to a node list (section 6.5).
- **A defaulted listed half that equals the induced half is stored as induced.** When the caller
  did not pass `reading`, a materialising door (`createFrom`, `combine`) compares the edge
  bitmap's popcount with the induced edge bitmap of its nodes (every listed edge's endpoints are
  members, so equal counts mean equal sets) and stores `induced` with no edges.
  `createFrom("visible")` with no edge-hiding filter therefore stores no edges. The consequence is
  documented on `createFrom`: a set stored induced **gains an edge added later between two of its
  members**. An explicit `reading: "listed"` is always stored listed, with its edges, and never
  gains one. Tests: `createFrom("visible")` with no filter, then add an edge between two members
  (the set gains it); the same with `reading: "listed"` (it does not).
- The canonical form of every definition is specified in section 12.1.

### 4.2 Fixed

- A fixed set stores ids, never row indices, and is **never out of date**.
- Its node half is its `nodes` plus the endpoints of its `edges`. Its edge half is its `edges`.
  The reading is applied as in section 4.1.
- **What an edge member that does not bind contributes depends on the reading.** Read `listed`,
  nothing: its ends join the node half only through the bound edge, so a set made from selected
  edges does not keep two nodes nobody chose after the edge is deleted, and the member counts as
  one missing edge. Read `induced`, an edge member names its two ends whether or not the edge is
  still there, because an induced set is a set of nodes and every edge among them; an end the
  graph lacks counts as one missing node, once however many members name it.
- **In an undirected graph an edge member's ends are stored in canonical order** (section 12.1),
  at every door that takes members: `a` to `b` and `b` to `a` are one member, with one revision,
  and adding the other spelling is a no-op. In a graph whose pairs are ordered the order is part
  of the member.
- **In a session**, each edge member a door adds from a session `EdgeId` is bound to that
  edge's counter, which is never reissued: the counter moves from `GraphStore` to `DataManager`,
  so `resetStore` no longer rewinds it. These **seeds** (member to the counter it entered through)
  are a binding cache, not part of the definition or its revision, and they live **outside the
  record**, beside the slice and keyed by set id, so a rename, a member edit or an undo that
  restores an earlier record needs no copy. A seed is written only when its member enters the
  set; a member the set already held keeps its seed, so a no-op writes none. The record stays the
  same frozen object across a rebind, so its identity, and every signature naming it, moves only
  on a write.
- **The rule, one for every case.** A member binds its seeded edge while the snapshot holds that
  counter. Otherwise, whether it was never seeded (a loaded or restored record) or its edge is
  gone (deleted, or its store replaced), it binds **by stable identity** (section 12.3). Because a
  counter is unique for the whole session, a seed can never name a different edge, so no store
  identity is needed to know when seeds apply; that matters because the store instance a
  resolution is tagged with is the `DataManager`, which a replacing import does not replace. A
  store rebuilt from a file that embeds the graph restores its counters, and its seeds apply
  again.
- **By identity** is one edge pass: candidates are found by endpoint pair, an `id` member matches
  the edge whose hash column equals its hash (the column hashes each edge's identity as it was
  ingested), and an ordinal member the edge of its pair with its `ordinal` and `among`. A member
  that no edge matches is missing. A different edge is never bound: an ordinal member binds only
  when exactly one edge carries its pair, `ordinal` and `among`; otherwise it reads missing with
  reason `ambiguous-parallel-edge`. Seeds are what keep two such twins apart inside a session:
  two Add data loads that each give one pair an id-less edge produce one identity, and a member
  added through the first stays bound to the first.
- **The binding table** is a side table keyed by the frozen definition: which members are
  seeded, with their counters sorted, and which are not, rebuilt when the seeds change. A seeded
  member's row comes from one scan of the edge-id column against the sorted counters, a linear
  merge when the column ascends (checked once per snapshot) and a binary search per row
  otherwise.
- Ids the graph no longer holds are **missing**. They are not pruned, so undoing a node removal
  brings them back with no set write.
- The reading is stored, never inferred from whether edges are present. One stray selected edge
  must not change every density and scoped run computed over the set. So `createFrom("selection")`
  reads induced whenever the selection holds nodes, and keeps the selected edges in the record so
  that a hand-traced tree is one visible `redefine` of `reading` away (section 15.2).

### 4.3 Rule

A rule stores `where`: either a JMESPath query or a rule tree. The tree is today's published
`Filter` (`session/visibility/filter.ts:62-77`), grown by three leaves:

```ts
// Filter gains (declared open):
| { readonly kind: "scope"; readonly scope: Scope }
| { readonly kind: "item"; readonly item: ResultItem }
| {
      readonly kind: "threshold";
      /** A value path: `results.<runId>.<field>` or `data.<field>`, as in Selector `top`. */
      readonly path: string;
      /** Exactly one cut. Shipped now: */
      readonly top?: number;
      readonly above?: number;
      // Reserved, refused at the doors until built: percentile?, z?, population?
  }

/** One item of a result. OPEN: may gain optional fields (graph, level). */
export interface ResultItem {
    readonly run: RunId;
    readonly key: ItemKey;
    /**
     * Present: holds that execution of the run (the studio's per-execution run id). Absent:
     * follows the run. Opaque; compare for equality only.
     */
    readonly execution?: string;
}

/**
 * How an item is found in a result. OPEN UNION. A field matches when it equals the value or, for
 * an array-valued field, contains it. Reserved later forms: { smallestNode }, { edges },
 * { binds }, and an optional `op` on this form.
 */
export type ItemKey = { readonly field: string; readonly value: string | number | boolean };
```

- **Stored leaves hold ids and paths, never handles.** `ResultItem.run` is a `RunId`. A door that
  is passed a `Run` or `RunResult` normalises it to its id before canonicalising, so every stored
  tree is plain, cloneable and digestible.
- **`threshold`** is the studio's one leaf, replacing the selection's separate `top` and `above`
  for rules. It is keyed on a value path, not a run, so "top 10 by `data.revenue`" and a
  threshold over an imported score column are as expressible as one over a result, and it uses
  the path grammar the expression leaf already uses for its dependencies (section 5.2). `top`
  uses the selection's tie policy (`TopRanking`, `session/selection/targets.ts:125-130`). Its
  **population**, what `top n` ranks against, is the elements that carry the value within the
  rule's scope; for a run that was itself scoped, that is the run's scope, because values outside
  it read missing (section 10.1). The reserved `population` field will add "each group of" a
  partition.
- The published `SelectionTarget` `top`/`above` and the style `Selector` `{ match: "top", path,
  n }` keep their shapes. The unified route from any grammar is `{ scope: { define: rule with a
  threshold leaf } }`; this design does not claim one spelling everywhere.

**Evaluation is the visibility filter's, unchanged.** Every leaf yields a node half and an edge
half, and a half the leaf does not speak about is **silent**, exactly as the compiler does today
(`filter.ts:10-15`; `compileOne`, about `filter.ts:868-907`). `all` and `any` fold the halves that
are not silent, and `not` negates only those. The new leaves:

- `scope` speaks the referenced set's node half. It speaks the edge half **only when the set's
  reading is `listed` or `clipped`** (including `"visible"`). A scope over an induced set is
  silent on edges, exactly like the node leaf it replaces. Otherwise `any [ {scope: {where: q}},
  degree >= 5 ]` would lose every hub-to-hub edge that `any [ {expression q}, degree >= 5 ]`
  keeps. An optional field that makes an induced set speak its edges can be added when live
  combinations need it (section 7).
- The studio's "without S" (S's nodes removed, with every edge touching them and S's own edges)
  is a rule, not a new form: `{ define: { kind: "rule", where: { kind: "not", of: { kind:
  "scope", scope: S } }, reading: "clipped" } }`. Every edge of S touches one of S's nodes, so
  clipping to the remaining nodes drops them whatever S's reading.
- `item` and `threshold` speak the half or halves whose result field exists. `onPath` is both a
  node and an edge field, so a path item speaks both. A `threshold` over `data.<field>` speaks each
  half in which some element carries a finite number for the field, and ranks that half on its
  own: `top 10` of an attribute both nodes and edges carry is ten nodes and ten edges. A leaf with
  nothing to read (a run with no result, a field the result does not publish per element, a held
  execution that is no longer current before captures exist, a path no element carries) holds
  nothing: its node half matches no node and it is silent on edges, exactly an empty induced set,
  and its path is reported as unresolved beside the counts.
- `threshold` `above` is strict (`value > above`), as the selection's `above` target is. `top` is
  a whole number from 0; `top 0` holds nothing.

A reading does two jobs: at the root it says how the halves become a set, and inside a scope
leaf it says whether the referenced set speaks edges. At the root, the reading is applied once:

| Reading | A silent half means | Nodes | Edges |
|---|---|---|---|
| `induced` | all | the node half | every edge between those nodes |
| `listed` | none | the node half plus the edge half's endpoints | the edge half |
| `clipped` | all | the node half | the edge half, clipped to edges whose endpoints are both nodes |

- A weighted-network threshold is right: `not { edges: weight < 0.5 }` read `clipped` keeps
  every node and only the strong edges.
- Under `listed`, a node leaf inside `all` does not constrain edges, because it is silent on
  them: `all [ degree >= 5, edges: weight > 0.5 ]` read `listed` is every strong edge anywhere,
  with its endpoints, plus the hubs. `all` over a node leaf and an edge leaf constrains edges only
  under `clipped` or `induced`.
- Edge work is lazy. Under `induced`, or when no leaf speaks about edges, only the node half is
  evaluated, and the edges are derived once at the root.

**The identity tests.** (1) For every leaf kind, `visibility.filter = T` and
`visibility.filter = { kind: "scope", scope: { define: { kind: "rule", where: T, reading:
"clipped" } } }` produce identical masks. (2) Composition: for every leaf L that is equivalent to
a scope S, `any [L, X]`, `all [L, X]` and `not L` produce the same masks with L replaced by S,
for every leaf kind X. A node-speaking leaf L is equivalent to `{ define: { kind: "rule", where:
L, reading: "induced" } }` (and an expression leaf also to `{ where }`), because a scope over an
induced set is silent on edges exactly as L is. An `edges` leaf has no equivalent scope: a scope
always speaks its node half.

A cycle refusal's `through` lists the references followed from the definition being written (or
the filter being set), in order, ending with the one that closes the loop: redefining A to read B
when B reads A gives `through: [B, A]`; a filter naming S when S reads `"visible"` gives
`[S, "visible"]`.

**Refusals at write doors**, all `E_BAD_COMMAND`. Each one a UI answers with a verb carries a
typed `details.reason` (listed in section 15.2), so no consumer parses the message:

- A kept rule that reads `"selection"` (`live-selection`). A live "whatever is selected" set would
  change on every click. The UI offers `createFrom("selection")`.
- A dependency cycle, across kinds (section 5.2): a set reaching itself through `scope` leaves;
  a visibility filter reaching `"visible"` or `"search"` through any chain of leaves and kept
  sets; a run whose scope follows the current execution of the result the run is producing. Only
  references that follow the current execution are cycle edges: a held execution is not, so "top
  10% by the previous PageRank" may scope a PageRank re-run. `details: { reason: "cycle",
  through }`; the UI offers "Create set from current members".
- A rule read `induced` that contains a leaf speaking edges (`induced-edge-leaf`: an `edges` leaf,
  a `scope` leaf that speaks edges, an `item` or `threshold` over an edge field). An induced set
  derives its edges from its nodes, so the leaf would be silently ignored; the message says to
  use `clipped` or `listed`. A stored rule of this form reads `invalid`.
- An `item` leaf without `execution` whose field is a partition group (`group` of the
  `community` shape), `details.reason: "follow-group"`. A group number means nothing across
  re-runs. Follow mode is allowed for fields whose value means the same in every run: `in`,
  `onPath`, category values and levels. The door knows the shape only when the run has a result;
  an item over a run that has not produced one yet is accepted, and the visibility filter's door
  refuses the same leaf.
- A `threshold` leaf with no cut or more than one, or with a reserved field (the doors'
  validator mode; loading treats a reserved field as section 12.5 says).

**Inside a pass nothing throws.** A stored rule that cannot compile or resolve at pass time (a
`component` id beyond the current count, a missing source, a cycle made later by a redefine, an
undo or a load, an unknown leaf kind) resolves to empty. The pass caches the compile outcome, and
status reports it (`invalid`, `cycle`, `missing-capability`). The `component` leaf is documented
as unstable across snapshots. A keyed form, `{ kind: "component", containing: NodeId }`, is
reserved.

**The rule scope.** An absent `within` always means the full graph, in every context: a kept
set, an inline scope, and future filter steps alike. A filter step that reads its predecessor
will say so explicitly. Under a future `within?: Scope`, the evaluation context is the
within-set's **derived subgraph** (the induce-then-filter chain of section 10.1), not a candidate
mask: the topology leaves (`degree`, `component`, `neighborhood`, `largest-component`) and the
`threshold` `top` population read that subgraph, so "degree >= 3 within the visible graph" counts
visible neighbours, and iterated steps such as a k-core are expressible. The resolver therefore
takes a **context snapshot** from the start, which is the full graph today, so adding `within`
changes the meaning of no stored rule and needs no refactor.

### 4.4 Path

The studio said a path is its own kind, because a walk can repeat nodes and edges. The owner said
a set may be ordered. **A path is a definition kind of a set**: one id space, one reference type,
one lifecycle, while the definition keeps the walk.

- **As a set** it resolves to its distinct nodes and the edges its steps name (every edge of a
  named group), read `listed`. A `null` step contributes every edge between its pair; under
  `directed: true`, only the edges from `nodes[i]` to `nodes[i+1]`.
- **It is node-first.** Algorithms publish node order (the `path` shape's `order` field) but may
  mark several edges per step: Dijkstra runs on the undirected view
  (`algorithms/DijkstraAlgorithm.ts:135`) and marks both halves of a reciprocal pair and every
  edge of a merged parallel group (`DijkstraAlgorithm.ts:178-186`, `Algorithm.ts:329-342`). A
  step naming a group records what the algorithm actually used instead of guessing one edge.
- **Direction.** A walk is valid regardless of edge direction unless `directed: true`, because a
  route computed on the undirected view traverses directed edges backwards.
- **Validity.** A step whose named edges are all gone counts as missing, and so does, under
  `directed: true`, a named edge whose direction opposes its step. The doors do not refuse such a
  step: they validate a definition without the graph, and a stable member of an undirected graph
  records no direction to check. It is reported where every other unbound member is, in
  `scope.count`'s `missingEdges`, and `pathKind` keys the step on its named edge group as for any
  other step. Resolution never throws. The validator refuses an `edges` array whose length is not
  `nodes.length - 1`.
- **Path kind is a derived read**, `sets.pathKind(id)`, because the studio shows it on every path
  and the app may not compute it. Each step counts as one logical edge, keyed on its named edge
  group (the set of edge identities) when edges are named, and on its end pair (unordered unless
  `directed`) for a `null` step. `trail`: no logical edge repeats. `simple`: no node repeats.
  `cycle`: a closed trail (no logical edge repeats) whose only repeated node is the first equal to
  the last, with at least one step. `walk`: anything else. The most specific kind is returned
  (`cycle`, then `simple`, then `trail`). The test covers A-e1-B-e2-A over two distinct parallel
  edges (a cycle) and A-e1-B-e1-A, out and back over one edge (a walk). Nothing is persisted.
- **`createPath("selection")`** orders the selected edges into the one open chain they form.
  Parallel and reciprocal edges between one pair are one step naming the group. The walk starts
  at the end from which every step follows a declared edge direction when exactly one end allows
  that, else at the end whose id sorts first (a walk and its reverse hold the same members, so
  this picks a presentation, not a membership). One selected node and no edges is a zero-length
  path. Anything else is refused `E_BAD_COMMAND`, `details.reason: "ambiguous-path"`, with
  `details.why`: `no-edges`, `self-loop`, `branch` (a node on three or more selected edges),
  `cycle` (no first node), `disconnected`, or `off-path-nodes` (a selected node the chain does not
  pass through).

### 4.5 Weights

Sets carry no per-member weight. Fuzzy membership is a score column plus a `threshold` rule. An
optional `weights` array on `fixed` can be added later.

### 4.6 The record

```ts
/** A kept set as the session hands it out: plain, frozen, structured-cloneable. */
export interface ElementSet {
    readonly id: SetId;
    readonly name: string;
    /** Listing position. Undoing a removal puts the set back where it was. */
    readonly order: number;
    readonly definition: SetDefinition;
    readonly createdFrom: SetCreatedFrom;
    /** `r1:<hex>`, section 12.2. Derived: an accessor computed on first read, memoised per record. */
    readonly revision: string;
}
```

The stored record is `{ id, name, order, definition, createdFrom }` plus any unknown top-level
fields a newer element wrote (section 12.5). It holds no counts, masks, status, dependency list,
edge binding or resolved ids. Each of those is a function of the record, the graph and the runs.
Storing one would force a graph change or a run to write set state.

`get` and `list` return **the same frozen object** until that record changes, so reference
equality (React memo, selectors) is a valid change test.

---

## 5. Created from, dependencies and status

### 5.1 Created from

```ts
/** How a set came to exist: the studio's "Created from". OPEN UNION. Written once, at create. */
export type SetCreatedFrom =
    | { readonly kind: "user" }
    | { readonly kind: "selection" }
    | { readonly kind: "scope"; readonly from: SetOperand }
    | { readonly kind: "result"; readonly item: ResultItem }        // item.execution is always set
    | { readonly kind: "combine"; readonly op: SetCombine; readonly of: readonly SetOperand[] };

/** A reference as `createdFrom` records it: member lists are replaced by their sizes. */
export type SetOperand = Scope | { readonly inline: { readonly nodes: number; readonly edges: number } };
```

- The name follows the studio's glossary, which rejects "origin" and "source" here: `origin`
  already belongs to attributes (`AttributeDescriptor.origin`, with its own `"result"` value), and
  `source` to edge endpoints and data sources.
- There is one `createdFrom`. A combination lists its operands inside it.
- It holds references (`{ set }`, keywords, `{ where }`, `ResultItem`) and never copies a member
  list. A `{ nodes }` operand or a fixed or path `{ define }` operand is recorded as `{ inline }`,
  so a 200,000-member operand is not stored twice.

### 5.2 Dependencies: follow or hold

Dependencies are **derived from the definition**, never stored. The walk:

| Found in the definition | Dependency | Follows or holds |
|---|---|---|
| `scope` leaf `{ set: id }` | that set's record | Follows |
| `item` leaf without `execution` | that run | Follows its current execution |
| `item` leaf with `execution` | that execution | Holds it |
| `expression`, `edges` or `threshold` leaf naming `results.<run>.<field>` | that run | Follows. The paths come from the compiled expression (`session/styles/predicate.ts:1211-1241`), which has no projections or wildcards, so every path is static |
| `expression`, `edges`, `range`, `categories`, `threshold` leaf | the attribute revision of each top-level field its paths read | Follows (section 6.2) |
| `scope` leaf `"visible"`, `"selection"` | the visibility or selection mask | Follows |
| `scope` leaf `"largest-component"`, `component`, `degree`, `neighborhood` | topology | Follows the snapshot |

The visibility filter and the selection are nodes in this dependency graph, which is what lets the
doors refuse cycles that pass through them (section 4.3).

**Execution identity.** Every execution of every run is stamped with a token: a session nonce plus
a session-wide monotonic counter, never a per-run count. The token is stored on the run's result
entry, beside the values it identifies, so a future undo that restores an earlier result restores
its token with it, and a rerun after that undo gets a new token. It is exposed only as the opaque
`ResultItem.execution`. A persisted token that no live execution carries (a file loaded without
its runs) reads as an earlier run, never as current. `startedAt` was rejected: two executions in
one millisecond compare equal (`session/runs/Run.ts:750`).

**Held items survive a re-run.** Before a run re-executes in place (`RunsApi.ts:713`), the element
captures the members of every item that a live reference holds (a kept rule, a style layer, the
visibility filter). A capture is **state, not cache**: a sorted id list per held
item, interned through the id map, written by the re-run itself onto the **new** run entry, as
`held: { [execution]: { [itemKey]: sortedIds } }`, in the same step that writes the new result.
Undoing the re-run restores the prior entry and its `held` together. A holding reference keeps
resolving to the earlier members (re-resolved through the id map after a freeze, like a fixed
set) and reads "Earlier run". Captures persist with the runs, so a save and reload paints the
same. **Pruning is deterministic and happens only inside run commands**: each run command carries
a capture forward only while live state still holds that execution. Nothing prunes from history
eviction, so the saved file never depends on when eviction ran; removing a layer and undoing the
removal paints what it painted before, because the undone step's run entry still carries the
capture. When no capture exists (the file was written without it), the reference resolves to
nothing with reason `values-not-kept`.

**When a run is out of date, for sets.** Only when a declared input changed: the set it recorded
(`RunScopeRecord.set.revision`) was redefined, or the membership of its frozen scope definition
moved. A change of `"visible"` or `"selection"` membership does not count, because the run froze
its scope at start. Today's `Run.stale` is scope drift ("why a run's numbers no longer describe
what is on screen", `session/runs/types.ts:142-156`) and sets never read it: a different scope is
not out of date.

### 5.3 Status, derived on read

```ts
export interface SetStatus {
    /**
     * OPEN UNION. The screen never says "stale". `detached`: a referent was removed (verb
     * "Restore"). `unresolvable`: nothing was removed, but the definition cannot be evaluated
     * (a cycle, a failed compile, a capability this element lacks; verbs "Edit rule" or
     * "Update graphty-element").
     */
    readonly freshness: "current" | "out-of-date" | "cannot-rerun" | "detached" | "unresolvable";
    /**
     * Why it is not current, or why it resolves to less than its definition names. May be
     * non-empty when current: render reasons whatever the freshness.
     */
    readonly reasons: readonly SetStatusReason[];
    /**
     * Runs whose held execution (in the definition or `createdFrom`) is no longer the run's current
     * one: the studio's "Earlier run". Its verb is "Use current" for follow-safe items and
     * "Carry over to new run" for partition groups. Empty otherwise.
     */
    readonly earlierRuns: readonly RunId[];
}

/** OPEN UNION. */
export type SetStatusReason =
    | { readonly kind: "run-out-of-date"; readonly run: RunId }
    | { readonly kind: "missing-run"; readonly run: RunId }
    | { readonly kind: "missing-set"; readonly id: SetId; readonly name: string }
    | { readonly kind: "cycle"; readonly through: readonly (SetId | "visible" | "search")[] }
    /** `name` is a kind or field; a plugin's is spelled `<package>:<kind>`, naming what to install. */
    | { readonly kind: "missing-capability"; readonly name: string }
    | { readonly kind: "values-not-kept"; readonly run: RunId }
    | { readonly kind: "ambiguous-parallel-edge"; readonly count: number }
    | { readonly kind: "invalid"; readonly message: string }
    /** A run recorded a revision of another scheme version; its freshness is unknown until re-run. */
    | { readonly kind: "revision-unknown"; readonly run: RunId }
    | { readonly kind: "input"; readonly id: SetId; readonly freshness: Exclude<SetStatus["freshness"], "current"> };
```

Status is computed from the definition's dependencies and the last pass's cached compile outcome
(an inline scope with no cached outcome is compiled, never resolved), so it is cheap to call for
every row of a panel. Counts and missing counts
come from `session.scope.count({ set: id })` (section 15.2).

| Case | Freshness | Earlier run | Resolves to |
|---|---|---|---|
| Fixed set kept from community 3, then Louvain re-runs | `current` | the run | its members |
| Rule holding community 3 of execution e, then the run re-executes | `current` | the run | the captured earlier members (section 5.2); verb "Carry over to new run" |
| The same after a reload without execution e's values | `current`, `values-not-kept` | the run | nothing |
| Rule `results.pr.score > 0.01`, then `pr` re-runs | `current` | -- | re-resolves |
| Rule reading `results.pr`, and `pr` is out of date (section 5.2) | `out-of-date`, `run-out-of-date` | -- | re-resolves |
| Rule reading a run whose algorithm is no longer registered | `current`, `missing-capability` | -- | the run's current values |
| The same, after an input of that run changed | `cannot-rerun`, `missing-capability` | -- | the run's current values |
| Names a removed set or run | `detached`, `missing-set` or `missing-run` | -- | nothing, never throws |
| Caught in a cycle, its last compile failed, or holds an unknown kind or field | `unresolvable`, `cycle`, `invalid` or `missing-capability` | -- | nothing, never throws |
| Fixed set after some members were removed | `current` | -- | the rest; `count` reports missing |
| Fixed set after a re-import changed a parallel group's size | `current`, `ambiguous-parallel-edge` | -- | the rest; those members missing |
| Rule set after a data edit | `current` | -- | re-resolves: a rule follows the data |
| An input set is out of date, cannot re-run or is detached | the worse, `input` | -- | as the input |

**Deleting a set cascades nothing.** Every layer, filter, rule and run record that names it
becomes detached and resolves to nothing, and its status names the removed set by its tombstoned
name. The tombstone store keeps recent records (section 12.4), so a later `sets.restore` can
bring one back (section 20).

For the visibility filter, "resolves to nothing" is decided per leaf, not for the whole filter:
the `scope` leaf naming the removed set holds nothing, exactly an empty induced set, and the rest
of the tree is evaluated as written. So `{ scope: S }` then shows nothing and `not { scope: S }`
shows everything. The whole filter is not blanked, because deleting a set must never empty the
reader's screen when the filter only used the set to hide something, and because a leaf that
holds nothing is what a kept rule naming the same set already evaluates; one meaning for the
leaf keeps the filter-to-set identity of section 4.3 true after a deletion too.

---

## 6. Representations and caching

### 6.1 The three representations

| Representation | Form | Lives in | Lifetime |
|---|---|---|---|
| Persisted definition | Plain frozen JSON: ids (never row indices), the rule, or the walk | The sets store; the future undo slice and project file | Durable |
| Runtime resolution | A node bitmap and an edge bitmap in graph-format's packed layout (LSB-first `U32` words, `NodeMask` / `EdgeMask`) | `session/sets/` resolution cache | Per snapshot serial and input signature |
| Algorithm input | The final derived snapshot (induced, edge-filtered, undirected if asked, simplified) | The derived-input cache | Per snapshot, resolution and orientation, reference-counted |

Row indices are never persisted, because they move on every re-freeze.

An edge member's stable identity (section 12.3) is computed once, when the member is added, and
never recomputed from the current graph, so a later deletion of a sibling changes neither the
record nor its revision. In memory, a fixed set's listed edge members are held compactly: the
stable parts in typed arrays with endpoints and string ids interned through the id map. The
`definition.edges` objects are built on the first read of that field. The bound session counter
ids are not in the record; they are the seeds beside the slice (section 4.2).

**Where state lives.** One rule covers every set-related value: a slice holds only definitions
and facts a command wrote; anything derived (a binding, a resolution, a revision, a status) lives
in a side table keyed by record identity; anything minted (a set id, an order, an execution
token) is minted at dispatch; and an element property is a view onto that state, never its owner.

### 6.2 The resolution cache

The resolution is pull-based: nothing is recomputed until something reads it. Every resolution is
**tagged with the snapshot serial and the store instance it was resolved against**. A resolution
is keyed by the set (a kept set's **definition identity**, the frozen definition object its record
holds, or an inline definition's canonical key) plus an **input signature** built only from what
the definition reads (section 5.2). The definition, not the record, because a rename replaces the
record and keeps the definition object, and must not re-resolve:

- the snapshot serial, never the snapshot object;
- the **attribute revision** of each top-level attribute field the rule's compiled paths read, if
  a leaf reads attributes. Attribute writes do not freeze: `updateNodes` assigns into `node.data`
  and repaints (`Graph.ts:2124-2150`), and attribute values live outside the snapshot
  (`filter.ts:106-110`). `updateNodes`, `updateEdges` and ingest bump the revision of each
  top-level field they write, so editing `label` does not invalidate a rule on `data.weight`;
- the visibility and selection mask versions, if it reads them;
- the execution token of every run it reads, and the capture of every execution it holds;
- **the definition identity of every kept set it names**, with an explicit "absent" marker for a
  missing id, recursively (a rename of the named set keeps its definition and moves nothing);
- for a set with edge members, the identity and version of its seeds (section 4.2), which a door
  that names a session edge moves.

The configured `edgeIdPath` is not an input: a resolution reads only the identity columns, and
the path reaches them only through the re-import that applies it, which moves the serial. A path
configured and not yet applied changes nothing a resolution reads, so it misses nothing. A query
whose paths the context cannot enumerate (no path reader, no revisions or no execution tokens)
gets no signature and is resolved on every read, never cached.

There is no global sets counter. Records are frozen and replaced on every write, so identity is
exact: a rename or an unrelated write moves nothing, and an undo, which restores the identical
frozen record, hits the cache again. Signatures are memoised per read epoch, so a diamond of live
combinations is walked once. The epoch is the snapshot serial, the sets map identity and a
session-wide monotonic **input tick** that every attribute-revision bump, mask-version bump,
execution-token mint, sets write and freeze advances, and that also advances whenever a run's
result is published or cleared: the token is minted when the work starts but the result it
stamps lands later, so a memo taken in between would otherwise go on reading "no result". A memo
never outlives an input it summarises. Test: a layer over a rule on `results.pr`, then a re-run of `pr` with no data change;
the layer repaints.

**Every freeze re-resolves every live set.** The snapshot serial is in every signature, so a
structural edit (adding one node, removing one edge) re-resolves every live rule and every fixed
and path set, not only the ones whose fields changed. Fixed and path sets re-resolve through the
new id map: about 38 ms for 500,000 node ids plus one edge pass for the induced reading (section
6.5). An expression rule costs its full evaluation again. That re-resolution is **time-sliced
like the repaint**: it runs in chunks off the input path, and a layer or filter keeps its current
paint until its new resolution is ready, then takes the full-pass repaint. Carrying bitmaps across
a freeze with the freeze report is deferred until the freeze row of section 6.5 is measured worse
than its projection and the owner asks for it: the report's remaps are relative to the previous freeze of the same builder
(`graph-format/src/types/builder.ts:90-100`), so a carry is only sound when the store instance is
the same, the report's predecessor is exactly the tagged snapshot, and no report was skipped. A
replacing import (`DataManager.ts:475-481`) or an undo that rebuilds the builder breaks all three,
and a second resolution path should not exist before a measurement asks for it.

**A `set.members` delta carries.** On the same snapshot, the new record's resolution is the old
one with the delta's bits set or cleared; for the induced reading only the incident edges of the
added or removed nodes are updated (O(sum of their degrees)). The revision and the digest are
updated by adding and subtracting the delta's hashes. A click that adds three nodes costs
O(delta), not a rebuild.

**Budget.** The bitmap cache is bounded in bytes (64 MB, internal), not entries. Entries named by
a live style layer or the visibility filter are pinned; pins are counted
separately and may exceed the bound, and 16 MB is always kept for unpinned entries so runs and
counts do not thrash. A separate summary cache
holds **one entry per set key**: the latest signature and its counts and missing counts, so a panel
counting 200 sets never forces 200 resolutions to stay resident and nothing grows under streaming
data. Summaries of removed sets are dropped once they outnumber the live sets. Lazily built id `Set`s belong to the `ResolvedScope` object that built them and are never
kept in a cache entry.

### 6.3 Shortcuts

- `"graph"` resolves to all-ones bitmaps (`makeMask(n, true)`). It never walks.
- `"visible"` and `"selection"` pack the session's byte `ElementMask` into bitmaps, one O(n + E)
  pass of byte reads, once per mask version.
- A fixed set's nodes convert to indices through the snapshot's id map. Its listed edges resolve
  by one scan of the edge-id column against the sorted counter array: a linear merge when the
  column is monotonic (checked once per snapshot), otherwise a binary search per row, O(E log k).
  The graph-format `EdgeIdIndex` map (`graph-format/src/ids/edge-id-index.ts:109`) is never built
  by a resolution, a re-resolution or a style layer carrying its members across a freeze: the
  carry maps edges by one pass over each snapshot's edge-id column, against the set of the old
  members' counters. **Open item:** four doors that name one session edge by its id still read the
  row through `snapshot.edgeIndexOf`, which builds that index once per snapshot:
  `sessionEdgeMember` (`session/sets/SetsApi.ts`, reached by every door that turns a scope
  listing session edge ids into stable members), the selection's edge rows in `session/sets/algebra.ts`, the membership
  lookup through `edgeRowOf` in `session/sets/offers.ts`, and the session's own edge space
  (`session/scope/ScopeApi.ts`). They should take the row from `Edge.index` (`Edge.ts:110`), or,
  for a list of ids, one merge of the edge-id column like the seeded binding.

### 6.4 The membership digest

`ResolvedScope.digest` stays a string that survives a re-freeze, now versioned: `d1:<hex>`. It is
the member sum of section 12.2 over the resolved members, read from the per-row hash columns
`graphty.nodeHash` and `graphty.edgeHash` (section 12.2), so it is one masked sum over two
columns, about 10 to 20 ms at 10M edges, and no id string or edge data object is read. Exactly:
`"d1:" + hex(H(N(k), N(A(sn)), N(B(sn)), N(m), N(A(se)), N(B(se))))`, where `k` and `m` are the
resolved node and edge counts and `sn` and `se` their member sums (the counts keep a node half
apart from an edge half whose sum happens to agree). It is
computed lazily, on the first read of `digest`, and memoised on the resolution, so runs that
share a scope share one computation. The run code reads it only when the snapshot serial or the
input signature changed (`RunsApi.ts:737`, `803-818` change accordingly). A stored digest of
another version compares as unknown, never as drift. `ResolvedScope.nodes` and `.edges` become
lazy getters (same types).

Because it sums stable identities, two edges that share one (twins: one pair and one file id, or
one pair, ordinal and among from two loads) count as the same member, so memberships that differ
only by which twin they hold share a digest, exactly as they would bind the same way after a
re-import. A `d1:` digest is promised comparable **only within one session and store**. Because the columns
hash stable identities, a clean reload or a replacing import of the same file usually reproduces
it, but an edge minted in a session the source file never saw, or an ordinal that is ambiguous in
the new load, does not. A digest guaranteed across sessions and copies (for notes that cite a set)
is a later `d2:`; a version mismatch reads as unknown, never as drift.

### 6.5 Measured costs and budgets

Barabasi-Albert graph, m = 5, Intel i9-14900, Node 22. The subset is every other node (50%) or
every tenth (10%). The last column is projected from the 5M-edge column by the edge count, and
the plan's benchmark task re-measures it at the stated target.

| Operation | 100k / 500k | 1M / 5M | 1M / 10M (projected) |
|---|---|---|---|
| Today: `resolveNow({ nodes })`, 50% | 38.5 ms, 6.9 MB | 415.9 ms, 82.4 MB | -- |
| Today: `resolveNow("graph")` (once per snapshot) | 58.6 ms | 633.4 ms | -- |
| Bitmap from a 50% id list | 1.7 ms | 37.8 ms | 38 ms |
| Induced edge bitmap from a node bitmap | 4.9 ms | 47.0 ms | about 94 ms |
| Both bitmaps retained | 75 KB | 750 KB | about 1.4 MB |
| Bitmap AND / OR / popcount | under 0.05 ms | 0.02 / 0.03 / 0.03 ms | under 0.1 ms |
| Membership test: `Set.has(id)` against a bit test | 17.0 against 2.0 ns | 37.2 against 1.7 ns | -- |
| `inducedSubgraph`, 50% | 19.6 ms, 6.7 MB | 273.3 ms, 67.0 MB | about 130 MB |
| `inducedSubgraph`, 10% | 5.9 ms, 2.7 MB | 64.2 ms, 27.0 MB | about 50 MB |

- A fixed set costs about 85 ms to resolve at 1M / 5M (about 130 ms at 10M edges) on each new
  snapshot.
- **Derivation is not proportional to the set.** `inducedSubgraph` allocates full-length remaps
  and scans every edge (`graph-format/src/snapshot/derived.ts:820-827`, `845`, `889`): per kept
  node it is 547 ns at 50% and 642 ns at 10%. The planner models it as a + b(N + E) + c(kept
  edges), fitted by the benchmark. **Peak memory is the sum of the live intermediates** (induce,
  edge filter, undirect, simplify each build a snapshot), about 2 to 3 times the result, so each
  intermediate is dropped as soon as the next exists. The cache keeps only the final snapshot and
  its origin maps.
- **Rule resolution is separate from paint.** An XOR dirty set keeps the repaint after a
  membership change inside the 16 ms budget; the resolution in front of it is not in that budget.
  An expression rule costs about 1.3 s at a million nodes, paid when a field it reads changes
  **and on every freeze** (section 6.2). Re-evaluating only dirty rows is in section 20.
- **Write-door projection.** The materialising doors resolve asynchronously and then dispatch one
  synchronous command (section 13.3), so rule resolution never blocks the main thread inside a
  door. The asynchronous step also builds every listed edge member's stable parts, interned ids
  and hashes. The synchronous part only sorts, interns and freezes prebuilt arrays, projected
  under 100 ms for 1M node ids and under 50 ms for 5M edge members. If the measured number is
  worse, the owner decides whether to add an internal typed encoding behind a lazily materialised
  `definition.nodes`. An induced source stores no edges. No
  JSON is built.
- **Load completion is paid by every consumer**, whether or not it uses sets: the identity
  columns are filled when a load closes (section 12.3), because an ordinal counted later would
  move when an edge is deleted. Budget: the completion pass at most about the cost of the first
  freeze it precedes, and never more than twice it; at 100k / 500k it is 160 ms against a 48 ms
  freeze, at 1M / 5M 2.5 s against 1.3 s (Node). Two things keep it there: the float64 bytes of
  each numeric part are read as two words and fed from local variables, and the load's edges are
  grouped by pair with two counting-sort passes (a small load onto a large graph sorts by
  comparator, so its transient memory follows the load, not the graph). The hash bytes are
  unchanged, so no `r1:` revision or `d1:` digest moves. What remains is the builder's cell
  writes (three per edge, about a third of the pass) and one node hash per edge's upper end. If
  the owner wants it lower, the next step is writing the three columns in bulk when a load covers
  every edge of the store, and after that deferring the edge hash (not the ordinals, which must be
  fixed at load) until something first reads it.
- **Size cap on member edits.** `addMembers` and `removeMembers` on a set holding more than 1M
  edge members are refused with `E_TOO_LARGE` until the op-log sub-key of section 20 exists,
  because each step keeps both whole values in history (section 13.2).
- **Scale numbers are projections, never gates.** A wall-clock ceiling in a pass/fail test
  measures the machine running it, and one size cannot tell O(n) from O(delta). So every number in
  this section is a projection: the plan's timing runners record the measured value beside it,
  and a worse number is reported to the owner, who decides what to do. What is asserted is work
  counts at two sizes and the caches' own byte accounting. Rows the plan records, each with its
  projection and its runner (Node: the element's tsx runner over the Node-safe sets modules and
  a session over a store, which is Node-safe too; browser: a non-asserting vitest browser project,
  because the row needs `DataManager` or a run):
  - Node: the digest of `"visible"` at 1M / 10M (under 150 ms); first resolution of a 1M-edge
    fixed set; a three-node `addMembers` on a 500,000-member set; `revisionOf` at 1M members;
    `createFrom("visible")` at 1M / 10M with no filter (stores induced: under 200 ms);
    `createFrom` of a 5M-edge listed scope (under 2 s in total, its synchronous commit under
    50 ms); the four combinations of two large sets.
  - Browser: load completion at 1M / 10M; one 50% scoped run at 1M / 10M needing both
    orientations, which must complete; and **a freeze with live sets**: add one node while five
    layers over expression rules and five over fixed sets are live, under 200 ms to the first
    repaint of an unaffected layer and every layer repainted within the re-resolution time, plus a
    200-row `scope.count` panel after the same edit. If this row is worse than its projection, the
    owner decides whether to build the carry of section 6.2.
- **Memory budget at 1M / 10M**, internal, asserted by the caches' own byte accounting in tests
  (never process heap): bitmap cache 64 MB plus pins; derived-input cache max(256 MB, 1.5 times
  the full snapshot's bytes); definitions 8 bytes per node member (an array slot; the id itself
  is shared with the graph's id map) and 20 bytes per edge member in five typed columns, plus 16
  bytes by the accounting per distinct interned value in the record's id table. Endpoints are
  interned, and so is every member id, numeric or string (a numeric id equal to a node id shares
  its slot), so an ordinal member costs 20 bytes plus its share of the endpoints, and an id member
  costs about 36 bytes plus its share of the endpoints, not the 24 first projected. Once
  something reads `definition.edges`, the materialised objects are charged 72 bytes each; no
  resolution, signature or membership test reads it, so only a consumer's read or a `redefine`
  (which compares the old and new member lists) materialises them. Captures: 8 bytes per captured
  node member, and an edge capture holds its members in the same column form as a definition
  (20 bytes per member plus interned ids), never an object per member; the identity columns of section 12.3, 8 bytes per node (`nodeHash`) and 16
  per edge (`edgeHash`, `edgeOrdinal`, `edgeAmong`), about 168 MB, plus a transient 20 bytes per
  edge of the load being completed and 4 per node; no `EdgeIdIndex` in the sets code; the summary cache tens of
  bytes per set.

**Recorded timings, 2026-09-27** (re-recorded after the load completion pass was made cheaper
and the full repaints after a freeze were coalesced; the 1M / 10M Node door rows were not rerun). Intel i9-14900, Node 22.22.1 (Node runner,
`benchmarks/run.ts`) and headless Chromium 143 (browser runner,
`test/bench-browser/*.bench-browser.ts`). Medians of five runs (Node) or three (browser input
row); the freeze rows are single measurements. Graphs are Barabasi-Albert, m = 5 (m = 10 for the
10M column). A row marked WORSE is worse than its projection and is reported to the owner.

| Row | Runner | Projection | 100k / 500k | 1M / 5M | 1M / 10M |
|---|---|---|---|---|---|
| Digest of `"visible"`, nothing hidden | Node | under 150 ms at 10M | 2.2 ms | 9.5 ms | 17.0 ms |
| First resolution of a listed fixed set, by identity (half the edges at 100k, 1M members at 1M / 5M) | Node | about 85 ms at 1M / 5M | 98 ms | 1,165 ms, WORSE | -- |
| The same, seeded (one merge of the edge-id column) | Node | about 85 ms at 1M / 5M | 114 ms | 504 ms, WORSE | -- |
| Three-node `addMembers` on a set of half the nodes (50,000; 500,000) | Node | O(delta) | 2.6 ms | 28.7 ms, WORSE: grows with the set | -- |
| `revisionOf`, fixed set of every node | Node | none stated | 5.7 ms | 64 ms | -- |
| `revisionOf`, fixed set of as many listed edges | Node | none stated | 65 ms | 706 ms | -- |
| `createFrom("visible")`, no filter | Node | under 200 ms | 23 ms | 235 ms, WORSE | 329 ms, WORSE |
| `createFrom` of a scope listing every other edge, total (250k; 2.5M; 5M edges) | Node | under 2 s at 5M edges | 1,626 ms | 21.3 s | 56.4 s, WORSE; runs out of Node's default 4 GB heap, measured with 24 GB |
| The same, its synchronous commit | Node | under 50 ms at 5M edges | 487 ms, WORSE | 7.4 s | 18.1 s, WORSE |
| `combineMasks` union / intersection / difference / symmetric difference, 50% induced with 33% listed | Node | none stated | 4.5 / 1.4 / 2.2 / 4.0 ms | 46 / 15 / 23 / 47 ms | 88 / 31 / 45 / 85 ms |
| Load completion (`closeLoad`) and first freeze, timed together | browser | completion at most about the freeze | 212 ms | 3,495 ms | 6,712 ms |
| The same, Node: completion pass / first freeze | Node | completion at most about the freeze | 160 / 48 ms | 2,517 / 1,283 ms | -- |
| Freeze with live sets: the freeze itself (add one node) | browser | none stated | 59 ms | 1,094 ms | 2,723 ms |
| Freeze with live sets: to the first layer repainted (a fixed set's, which the new node does not affect) | browser | under 200 ms | 538 ms, WORSE | 4,905 ms, WORSE | 9,979 ms, WORSE |
| Freeze with live sets: to every layer repainted | browser | within the re-resolution time | 851 ms, WORSE | 8.1 s, WORSE | 15.8 s, WORSE |
| Freeze with live sets: the re-resolution alone, all ten sets | browser | none stated | 59 ms | 701 ms | 1,236 ms |
| Freeze with live sets: a 200-row `scope.count` panel after it | browser | none stated | 0.6 ms | 0.3 ms | 0.4 ms |
| One 50% scoped run's input, declared and undirected | browser | must complete | 42 ms | 365 ms | 869 ms |

What the freeze rows say. Re-resolving all ten live sets after the freeze costs about 1 s at
1M / 10M, and the 200-row panel afterwards is served entirely from what the frames resolved. The
time is in the paint: each layer whose resolution is ready asks for a full pass of both halves
(section 6.2). Those full passes are coalesced: while one runs, every further request becomes one
more pass after it, over the graph as it then stands, so ten live sets cost two whole-graph passes
instead of ten (every layer repainted: 3.8 s to 0.85 s at 100k, 34.6 s to 8.1 s at 1M / 5M,
60.7 s to 15.8 s at 1M / 10M). The first layer still waits for one whole-graph pass, 5 to 10 s at
1M. The carry of section 6.2 would remove at most the re-resolution; a repaint that paints only
the carried rows of the layers whose sets moved would remove the rest. Which, if either, to build
is the owner's decision.

What the door rows say. The listed `createFrom` commit, projected under 50 ms at 5M edges, takes
18 s, and the whole door needs more than Node's default heap at 5M edges. This is the case the
write-door projection above leaves to the owner: an internal typed encoding in the asynchronous
step, so the synchronous part stops building and sorting one object per member. A member edit is
not O(delta): the record keeps its node members as one frozen array (section 13.2), so each edit
copies it.

---

## 7. Set algebra

```ts
/**
 * A combination names the set it builds. OPEN UNION. The screen's commands Union, Intersect,
 * Subtract and Exclude map onto these values.
 */
export type SetCombine = "union" | "intersection" | "difference" | "symmetric-difference";
```

- `sets.combine(op, of, options)` takes two or more set references. `difference` is the first
  operand minus the union of the rest. `symmetric-difference` keeps an element in an odd number
  of operands.
- **The result is always a fixed set** of the operands' current members, created from
  `{ kind: "combine", op, of }`: the studio's "Create set always gives a fixed set". A live
  combination is still writable as a rule over `scope` leaves (`sets.create` of `any`, `all`,
  `all [a, not any [rest]]`); a `live` option, and the leaf field that lets an induced operand
  speak its edges inside it, can be added later as optional members.
- **The edge rule:**
  - Every operand induced: the result is induced. Nodes are the node op; edges follow the nodes.
  - Otherwise, edge-first: edges are the op on the operands' edge bitmaps, and nodes are the op on
    the node bitmaps plus the endpoints of those edges. The result is `listed` (or induced when
    the reading was defaulted and the two are equal, section 4.1).
  - Edge-first keeps what users compare: "edges in the Kruskal tree but not the Prim tree" keeps
    the differing edges even though the two trees share every node. Clipping would discard them.
  - **Laws that always hold**, whatever the operands' readings and however calls are nested:
    union and intersection are commutative and idempotent; intersection is associative (an edge
    joining two nodes of `A intersect B` joins two nodes of each, so the induced edges of an
    intersection are the intersection of the induced edges); `A - A` is empty; n-ary
    `symmetric-difference` keeps exactly the odd-count elements; every result keeps every member
    edge's endpoints as member nodes.
  - **Laws that hold only within one regime.** Union is associative within one n-ary call, and
    across nested calls only when every operand is induced or every operand is read edge-first.
    Nesting that mixes readings breaks it, because an all-induced sub-result gains the cross edges
    between its operands' nodes and edge-first does not. Counterexample: edges a-b and c-d;
    A = induced {a}, B = induced {b}, C = listed {c, d} with no edges. `(A union B) union C` holds
    edge a-b (`A union B` is induced {a, b}); `A union (B union C)` holds no edge (`B union C` is
    edge-first). Symmetric difference nested across readings breaks the same way.
  - **Laws edge-first gives up on purpose**, because a differing edge re-adds its endpoints:
    `(A - B) intersect B` need not be empty, and `A - B` need not be disjoint from `B`'s nodes.
  - The two lists that break, and the counterexample above, are pinned by example tests so a
    later change cannot alter them silently.
  - The laws are laws of the edge rule over the readings the operands have. A stored result is an
    operand with its STORED reading, so a defaulted edge-first result that was stored induced
    (section 4.1) takes part in a later nested call as induced: same members at creation, but it
    gains cross edges in an all-induced call.
- **An empty result is kept.** An empty intersection is an answer, not an error; only
  `createFrom` of an empty source refuses, because there it is almost always a mistake.
- **Evaluation** is word-wise, through five graph-format helpers beside `makeMask`
  (`graph-format/src/util/mask.ts`): `maskAnd`, `maskOr`, `maskAndNot`, `maskXor`, `maskNot`,
  exported from the graph-format root (it exports only `.`, `graph-format/src/index.ts:28`).
- **Vocabulary.** The selection keeps `SetOp`. The studio's rename to `SelectionOp` can come as an
  alias at any time.
- **Comparison** (Jaccard, overlap) is popcounts over the same bitmaps (section 20).

---

## 8. Built-in and offered sets

### 8.1 Built-in sets

`"graph"`, `"visible"`, `"selection"` and `"largest-component"` are keywords resolved live, with
the readings in section 2.2. `"largest-component"` is the largest **weakly** connected component,
follows the data and needs no run. A components run also offers its groups, largest first; a
strongly connected components run offers the strong components. The keyword and an offer can
disagree after an edit: the offer holds the run's execution, and the keyword follows the data.

Later additive keywords: `"search"` (the studio's search graph) and `"pinned"`.

### 8.2 Offered sets

```ts
export interface SetOffer {
    /** The item, with the execution it was read from. */
    readonly item: ResultItem;
    /** "Community 3 (1,204 nodes)", "On path", "Level 2". */
    readonly label: string;
    /**
     * Present for an offer read `induced`, counted from the result's values. For an offer read
     * `listed` (an edge set, a path), whose nodes include its edges' endpoints, filled only once
     * the edge-count pass is cached, like `edges`.
     */
    readonly nodes?: number;
    /** Filled only when this execution's edge-count pass is already cached; `offers` never runs it. */
    readonly edges?: number;
    readonly reading: EdgeReading;
    /** A path offer: `createPath` accepts it and keeps its order. */
    readonly path: boolean;
    /** The item may be followed across re-runs (not a partition group). */
    readonly followable: boolean;
    /** Usable at once as a scope: { define: offer.definition }. A rule over one held item leaf. */
    readonly definition: SetDefinition;
}
```

Offers come from the **result's shape** (`session/results/types.ts`), never from the algorithm,
so every registered algorithm, built-in or third-party, gets them.

| Shape | Offers | Reading |
|---|---|---|
| `community` | One per `group`, largest first. A components run's first offer is the largest component | induced |
| `layered-grouping` | One per `level` | induced |
| `category-table` | One per `category` | induced |
| `node-set` | One: `in == true` | induced |
| `edge-set` | One: `in == true` | listed |
| `path` | One: `onPath == true`, `path: true`. Order comes from `order` | listed |
| `node-metric`, `edge-metric` | None. Continuous values have no items; use a `threshold` leaf | -- |
| `temporal` | None. Time windows arrive as a leaf (section 20) | -- |
| `pair-list` | None. A candidate pair is not an existing subgraph, and predicted edges are never written into the graph | -- |

- `sets.offers(run, { limit })` is synchronous and returns the largest `limit` offers (default
  100) and how many were left out. Node counts of an induced offer come from one pass over the
  result's node values, cached per execution and snapshot (the summary's groups are capped at ten,
  and an overlapping partition publishes no size table, so they cannot serve). Everything that
  needs the edge list -- every offer's edge count, and the node count of a `listed` offer, whose
  nodes are its node half plus its edges' endpoints (an edge set has no node half at all) --
  comes from **one O(E) pass**, cached per execution and run by the first resolution of an offer
  (about 94 ms at 10M edges), never by `offers` itself. The pass counts an edge once for every
  group in the intersection of its endpoints' memberships (equality for a scalar group field), the
  containment rule of `ItemKey`, so overlapping communities are counted right. The offers test
  includes an overlapping-community case.
- **Using an offer as a scope writes nothing.** The item holds its execution, so after a re-run
  that use reads "Earlier run" and keeps its captured members (section 5.2).
- **Keeping an offer.** `sets.createFrom(offer)` writes one fixed set of its members, created
  from `{ kind: "result", item }`. `createFrom(offer, { follow: true })` instead keeps a rule over the
  item without its execution, so it follows the run; it is refused for an offer that is not
  `followable`. `sets.createPath(offer)` writes a path in `order`, each step naming the on-path
  edges between its pair. All three refuse an offer whose execution is no longer current
  (`E_BAD_COMMAND`, `stale-offer`), rather than freezing the current execution's members under a
  `createdFrom` that names the old one. The check runs again at dispatch, after the asynchronous
  resolve.
- **Groups of a categorical attribute** are already sets without a run: a `categories` rule.
  Offering them, and listing them under Memberships, comes later (section 20).

---

## 9. Data sources, joins and provenance

- **One joined graph.** graphty-element holds one graph-format `GraphBuilder` for the life of a
  graph (`data/GraphStore.ts:111`). Every import adds to it or replaces it, and every change
  freezes a new snapshot of the whole graph. Sets are defined over that one graph, never per
  source.
- **A source is a group of rows, not a graph-format instance.** Separate snapshots per source
  would need a join on every read, and an edge between two sources would belong to neither.
- **Provenance is a column.** The data layer should stamp a per-row source column at import (the
  reserved name `graphty.source`). "Rows from source B" is then an ordinary `categories` rule, and
  a partition that can offer one set per source. This belongs to the Add data work, and the
  source column then joins the edge stable identity, as the studio specifies, through the
  reserved `EdgeMember.dataSource` (not `source`, which is the source node). An absent
  `dataSource` matches any source, so stored members keep matching and their revisions do not
  change.
- **A pasted id list** is a fixed set: `sets.create({ kind: "fixed", nodes, reading: "induced" })`.
- **Replace data.** Rule sets re-resolve. Fixed and path sets keep their ids and rebind edge
  members by stable identity (section 12.3), so a replacing import of the same file keeps every
  member; ids the new data lacks, and ordinals whose parallel group changed size, count as
  missing. A set holding an execution of a run over the old data reads "Earlier run": the element
  has no data versions yet, so it cannot say "Earlier data" (section 19).
- **Imported groups.** graph-format's membership roles (`subset`, `community`, `labels`,
  `classes`, `parent`, filled by graph-io from DOT clusters, GraphML nested graphs and GEXF `pid`)
  are sets today through a `categories` rule.

---

## 10. Algorithm input, CPU and GPU

### 10.1 One input accessor

Today there are two derivation seams, `Algorithm.accelerated()` (`algorithms/Algorithm.ts:338-372`)
and `toAlgorithmGraph` (`algorithms/utils/snapshotGraph.ts:50-65`), but most adapters bypass both
and read `getDataManager()` or `getSnapshot()` directly: `LouvainAlgorithm.ts:125`,
`LeidenAlgorithm.ts:127`, `GirvanNewmanAlgorithm.ts:106`, `ConnectedComponentsAlgorithm.ts:29`,
`StronglyConnectedComponentsAlgorithm.ts:31`, `LabelPropagationAlgorithm.ts:88`,
`BFSAlgorithm.ts:112-119`, `FloydWarshallAlgorithm.ts:39`, `KruskalAlgorithm.ts:40`,
`PrimAlgorithm.ts:100`, `BipartiteMatchingAlgorithm.ts:46`, `metrics/MetricAlgorithm.ts:84-104`,
and `results/DeclaredAlgorithm.ts:189-201` (`measured`).

- `Algorithm` gains one accessor, `this.input(orientation)`, returning a `ScopedInput`
  (section 10.2). Both existing seams and every adapter above route through it, one plan task per
  adapter. A test fails the build if an adapter reads `DataManager` directly.
- **Derivation, scope first:** `declared -> inducedSubgraph(node bitmap) -> filterEdges(edge
  bitmap) -> toUndirected (if asked) -> simplified (by the asked merge policy)`. The scope is applied in declared space
  before undirecting, because `toUndirected` collapses a reciprocal pair into one edge that keeps
  the lower index's row (`graph-format/src/snapshot/graph-snapshot.ts:833-838`): undirecting
  first would hand a thresholded run the weight of a hidden edge. The edge step runs only when the
  edge bitmap is not the induced edge set of the node bitmap. The input is never built by inducing
  on edge endpoints, so a `"visible"` scope with isolated nodes keeps them.
- **Whole-graph shortcut:** when the node bitmap's popcount is every node and the edge bitmap's
  popcount is every edge, the snapshot passes unchanged, and the per-snapshot undirected cache
  (`GraphStore.ts:289-294`) serves it. The default run over `"visible"` with no filter costs
  nothing extra. Only this shortcut uses that cache.
- **Node options are checked against the scope.** An option of catalogue type node or node-set
  (Dijkstra's source and target, BFS and DFS roots, personalised-PageRank seeds, flow sources and
  sinks) naming a node outside the scope's node bitmap is refused before compute with
  `E_OPTION_RANGE` (a known option, a value not permitted) and `details.reason: "outside-scope"`. Defaults are taken from the scope: a scoped Dijkstra
  with no source uses the scope's first and last nodes, as the unscoped run uses the graph's
  (`DijkstraAlgorithm.ts:144-148`).
- **Mask-back is central.** After an adapter publishes, the result publisher drops every node
  value outside the scope's node bitmap and every edge value outside its edge bitmap, so they read
  missing and are excluded from every population, rank and summary. This covers adapters that
  fill defaults for unindexed elements (Dijkstra's `Infinity` and `onPath: false`,
  `DijkstraAlgorithm.ts:163-176`) and the many-to-one `edgeRemap` (`Algorithm.ts:187-212`), which
  would write both declared edges of a reciprocal pair. Mapping back composes the chain of origin
  maps.
- **The run says what it computed on**, in a caveat note worded from the scope's reading so it can
  be reproduced: "Computed on the induced subgraph of N nodes." for `induced`, and "Computed on the
  subgraph of N nodes and the M edges in scope." for `listed` and `clipped`. `RunScopeRecord` records the
  reading. The option `scopeAs: "subgraph" | "population"` is reserved
  (section 15.3); `"population"` (compute on the whole graph, then mask back and re-rank within
  the set) is built later on the same mask-back.

### 10.2 Plugins and the extension contract

A third-party `DeclaredAlgorithm.compute(context)` receives `AlgorithmRunContext`
(`algorithms/results/types.ts:113-126`, exported from `./extend`), which today has no way to learn
the scope. It gains one method:

```ts
/** What a scoped run computes over. OPEN: may gain members. */
export interface ScopedInput {
    /** The full graph, declared orientation. */
    readonly graph: GraphSnapshot;
    /** The scope's nodes; valid in both orientations (undirecting keeps node rows). */
    readonly nodes: NodeMask;
    /** The scope's edges over the declared `graph` only, whatever orientation was asked. */
    readonly edges: EdgeMask;
    /** True when the scope is the whole graph; `subgraph()` then returns `graph` (or its undirected view). */
    readonly whole: boolean;
    readonly nodeCount: number;
    readonly edgeCount: number;
    /** The derived compact snapshot in the asked orientation (section 10.1). Lazy, cached, shared. */
    subgraph(): GraphSnapshot;
}

// AlgorithmRunContext gains:
input(orientation: "declared" | "undirected", options?: ScopedInputOptions): ScopedInput;

/** OPEN: may gain members. */
export interface ScopedInputOptions {
    /**
     * How parallel edges merge in `subgraph()`. OPEN UNION. Default "sum", today's behaviour
     * (`Algorithm.ts:356`), right for flow, strength and layout; shortest paths want "min".
     */
    readonly simplify?: "sum" | "min" | "max" | "none";
}
// AlgorithmDescriptor gains (OPEN UNION; "mask" is a later value):
scopeInput?: "none" | "subgraph";
```

- **Output stays keyed by element id**, so a plugin never needs the origin maps; they stay
  private.
- The merge policy is part of the derived-input cache key (section 10.3). The built-in Dijkstra
  sums parallel edges today, so over a weighted multigraph it reports summed distances; it will
  ask for `"min"`, shipped as a separate defect fix with its own changelog line. A path step's
  edge group (section 4.4) then records the edges of the group the algorithm actually used.
- The masks and the full graph are there from the start so `scopeAs: "population"` and future
  mask-input kernels use the same member instead of a second, overlapping one. The later
  `scopeInput: "mask"` adds an undirected-space edge mask as a new member.
- A plugin with `scopeInput` absent or `"none"` is run on the whole graph, masked back centrally,
  and its run carries the caveat "Computed on the whole graph; values kept for the scope only."
  The planner estimates and refuses such a run over the **whole graph**, not the scope's counts
  (`session/planning.ts:233-241`), so a small scope cannot admit a whole-graph run that should
  be refused.
- `ScopedInput` publishes graph-format's `GraphSnapshot`, `NodeMask` and `EdgeMask` through
  `./extend`, which ties the extension contract to graph-format 1.x (section 15.3).

### 10.3 GPU

The derived snapshot is an ordinary compact CSR, so webgpu-graph-algorithms takes it as it takes
the full graph, with **no kernel change**. The upload cache is keyed by snapshot identity and
frees nothing on garbage collection (`webgpu-graph-algorithms/src/memory/residency.ts:1-13`,
`756`), `release` destroys device buffers immediately (`residency.ts:756-767`), and `simplified()`
derives afresh on every call (`graph-format/src/snapshot/graph-snapshot.ts:865`). So:

- The derived-input cache holds the **final** snapshot, keyed by (snapshot serial, resolution
  signature, orientation, simplification), so a repeated scoped run hits the upload cache.
- **Derived inputs are reference-counted.** A run holds its input from derivation until its
  result is published or aborted. Eviction, snapshot replacement and dispose only mark an input
  that is held; the accelerator's `release` runs when the last holder lets go. This is the same
  guarantee `Graph.ts:433-446` gives the layout: nothing runs on memory that has gone.
- **The bound is max(256 MB, 1.5 times the full snapshot's bytes)**, so one ordinary scoped run
  always fits. Held inputs count against it. A derivation that cannot fit waits for a holder that
  is a different run to finish, or is refused with `E_TOO_LARGE`; it never evicts an input in use,
  and a run never waits on an input it holds itself: that derivation is admitted over the bound.
  The wait happens once, before the algorithm starts, against an estimate from the scope's counts
  (the full snapshot's bytes in proportion to the elements in scope), because `subgraph()` is
  synchronous and cannot wait; what the run then derives is admitted and counted as it is built.
- **Both orientations share the declared intermediate.** A run that asks for `declared` and then
  `undirected` (as `accelerated()` does, `Algorithm.ts:338-372`) derives the undirected final
  from the cached induce-plus-filter snapshot, which is kept while both orientations are held.
- **Device bytes are counted separately**, by the upload cache, until `release`; they are not in
  this bound.
- Tests count live device bytes across repeated scoped runs and re-freezes, across two
  overlapping scoped GPU runs, and across a freeze in the middle of a run.

### 10.4 Caching and cost

- The derived-input cache is bounded in bytes (section 10.3, internal).
- The cost planner already estimates over the scope's counts (`session/planning.ts:233-241`); it
  adds the derivation model from section 6.5.
- On a refused run, the planner's suggestions (`session/cost/estimate.ts:995-1060`) also list kept
  sets that fit.

### 10.5 Behaviour change

Honouring the scope changes the values of every run already scoped to less than the whole graph,
including default runs over `"visible"` whenever a filter is active. Today those values contradict
the run's own record, so this is a defect fix, shipped with a changelog entry (section 15.3).

---

## 11. Layouts, export and the other targeting APIs

**Layouts.** `setLayout(type, opts, options)` already takes a third argument (`QueueableOptions`,
`Graph.ts:1637`, `graphty-element.ts:2556`). It gains `scope?: Scope` through
`SetLayoutOptions extends QueueableOptions`.

- **Which layouts accept a scope is a fact of the engine class**, following the `honoursWeights`
  precedent (`layout/LayoutEngine.ts:133-145`, `211`, `685-690`; `catalog/types.ts:587-597`): a
  new `scoped?: boolean` on the published `LayoutEngineStatics` and `static scoped = false` on
  `LayoutEngine`, set true on `SimulationLayoutEngine` (forceatlas2,
  spring, spring-electrical) and on the `ngraph` and `d3` engines. `LayoutEngine.register` reads
  it into the published `LayoutDescriptor.scoped`, and `AuthoredLayoutDescriptor` omits `scoped`
  as it omits `honoursWeights`, so no existing third-party registration stops compiling. A layout
  whose engine is not `scoped` refuses a scope with `E_UNSUPPORTED`.
- **The hold is enforced in one place.** The scope-hold mask is ORed into the pinned-row guard in
  `writeNodePosition` (`layout/LayoutEngine.ts:430-435`), so a non-member never moves under any
  engine, whatever its engine-level pinning does. Simulation engines also pass the mask as their
  fixed node mask so held nodes are not integrated.
- **How an engine receives the hold.** `LayoutEngine.setHoldMask(mask: NodeMask | null, rows:
  number)` is public, with the getter `holdMask` and the protected `isHeld(index)`. `LayoutManager`
  calls it on a scoped engine after `init()` and the pin replay, and again after every freeze,
  because a freeze renumbers the rows (the mask is rebuilt from the captured member ids before a
  simulation reloads, so its reload packs the new mask). A set bit is a held row; a row at or past
  `rows` belongs to a node newer than the capture and is held too. A held row that has no
  coordinate yet takes its first layout write, so a newcomer is drawn somewhere, and is held from
  then on. Before holding, the manager writes every held node's current coordinates into the new
  engine, for the reason the pin replay does: d3 fixes a node where its own initialisation put it.
  The three built-in live engines override `setHoldMask` to fix held nodes natively (the
  simulation's fixed mask, d3 `fx`/`fy`/`fz`, ngraph `pinNode`), fix a held newcomer as it
  arrives, and keep a held node fixed when the reader unpins it.
- **A known consequence, shared with pins.** The simulation bridge fits its published rows to the
  configured radius and leaves fixed rows out of the measurement, so a small scope is spread to the
  full envelope around the centre while the held nodes stay put. Pinning most of a graph does the
  same today. Fitting the members inside their held neighbours' extent is in section 20.
- **The hold mask is separate from pins.** It is never written to the persisted `graphty.pinned`
  column (`data/GraphStore.ts:49-53`), so it never leaks into pins or exports, and unpinning a
  non-member does not release it.
- **The members are frozen when the layout starts**, as a run freezes its scope. Every
  `setLayout`, explicit or carried (a `layout` or `layoutConfig` change), resolves the scope once
  and holds every node outside that capture. A later click, filter change or attribute edit does
  not move the hold, and a node added later is not in the capture, so it is held. This matches the
  studio's "a layout run is an operation over a frozen scope" and keeps a click from restarting a
  simulation.
- **Per-tick cost is the full graph's.** Held nodes still exert forces. A faster option (simulate
  the members plus a one-hop boundary held fixed) is in section 20.
- **The scope is durable state owned by `LayoutManager`**, the component `Graph.setLayout` drives,
  so every path gets one behaviour: the element setters, the assistant's layout command
  (`ai/commands/LayoutCommands.ts:52`, which calls `graph.setLayout` directly) and the default
  layout (`Graph.ts:651`). The carry rule lives there: an explicit `setLayout(type, opts, { scope
  })` sets it, `scope: "graph"` clears it, and an absent `scope` keeps it, so changing one force
  parameter never un-scopes the layout. `Graph.setLayout` destructures `scope` out of its options
  before spreading the rest into the queue options (`Graph.ts:1655`). The element's writable
  `layoutScope: Scope | undefined` property and `layout-scope` attribute (JSON) read and write
  through to the manager; the getter reports an unscoped layout as `undefined`, never `"graph"`.
  `usedBy` reads the manager too, and on the undo branch the scope moves into the `layout` slice
  (section 13.4).
- **A carried scope never throws.** Under an engine that is not `scoped`, or when the set it names
  was removed, a carried scope is inactive: the layout runs over the whole graph and `usedBy`
  lists no layout user. Removing the set a running layout holds for releases the hold at once
  (the element hears `set:changed` with `removed` and asks the set's status whether the scope is
  now detached); the carried scope itself is kept, so `layoutScope` still reads it.
- **The property restarts the layout without racing it.** Setting `layoutScope` (or
  `Graph.setLayoutScope`) carries the canonical scope at once, then restarts the running layout
  as a `layout-update` queue operation. A pending `layout-set` is therefore not cancelled -- it
  runs first and carries the new scope -- and a later `layout-set` that cancels the restart loses
  nothing, because the scope is already carried. `Graph.getLayoutScope()` is the read. Only an explicit scope argument is refused, so a property setter that
  calls `setLayout` never produces an unhandled rejection. Tests: scope a force layout, change
  `layoutConfig`, and check that non-members stay held; scope it, switch layouts through the
  assistant command, and check that `layoutScope` and the hold still agree; remove the set a
  running layout is scoped to, and check that nothing throws and the layout runs unscoped.

**Export.** Deferred. User attributes are not snapshot columns (`filter.ts:106-110`,
`session/GraphSession.ts:623-634`; `GraphStore` declares only the seed, `graphty.edgeId`,
`graphty.pinned` and position), so a subgraph snapshot would lose every `data.*` value and every
result. The scoped subgraph stays internal as algorithm input. An element export verb that takes a
`Scope` and attaches attribute and result columns is the door (section 20).

**Style layers.** Selector `{ match: "scope", scope }` tests the resolution's bitmap by index.

- `Selector` is declared twice and both change: the published, stored one
  (`catalog/types.ts:482-492`) and the compiler's (`session/styles/selector.ts:57`, with
  `SELECTOR_KINDS` and `CompiledSelector.match`). A malformed scope selector refuses with
  `E_BAD_SELECTOR`.
- The spelling is `scope`, not `set`, because `LayerSpec.set` already means a layer's static style
  (`catalog/types.ts:511`).
- **Repaint trigger.** Repaint is push-driven: an edit repaints the edited layer's dirty set
  (`session/styles/repaint.ts`, mechanism 3). The style manager records the input signature of
  every scope its layers name. An **internal, synchronous notification**, consumed before any
  public event, re-checks those signatures: on master a subscription to the sets store's committed
  diff, plus the existing selection, visibility, run, attribute-write and snapshot-replacement
  hooks; on the undo branch a `sets` derivation hook (section 13.4). When a signature moves and
  the old and new resolutions share a snapshot serial, that layer's dirty set is the old bitmap
  XOR the new one. Across a freeze the two bitmaps index different rows, so the layer takes the
  existing `renumbered()` full pass (`session/styles/repaint.ts:310-320`), counted per layer in
  the freeze benchmark (section 6.5). Public events, `set:changed` included, are informational and
  fire after the passes.
- A detached or invalid scope compiles to paint-nothing, and the pass continues.
- A style document that names `{ set: id }` is bound to its project. On import, an unknown set is
  reported detached, never dropped. Layer `ids` selectors keep naming session counter edge ids and
  are not rebound on re-import; a layer that must survive one names a set instead.
- "Colour a set" is an ordinary layer. Appearance never becomes a property of the set.

**Visibility filter.** The leaf `{ kind: "scope", scope }` maps the resolution onto the filter's
halves by the composition rule in section 4.3. `visibility.set` refuses a tree that reaches
`"visible"` or `"search"` (section 4.3). The pass tracks its scopes' signatures under the same
internal trigger as layers. A cycle created later resolves to nothing with reason `cycle`; the pass
never recurses into it or reads a half-written mask.

**Selection and camera.** Both already take `{ scope }`: the selection target `{ scope }`, the
`scope` that narrows a `{ where }` or `{ text }` target, and `applyCameraView(id, { scope })`. They
are widened to `ScopeInput`, so an inline definition may name an edge by its session id, and each
admits its scope as every other door does (section 15.2). The camera reads the bitmap.

**Not changed now.** `pin`, `unpin` and `removeNodes` keep their id lists.

---

## 12. Persisted form

There is no project file on master. This section fixes the **logical record and the revision**
that a future file or command log will hold, so neither can drift once published, and defers the
writer. It does not fix a byte encoding: the codec may store member arrays as typed columns. The
stored record is `{ id, name, order, definition, createdFrom }`, keyed `sets` in the future file's
per-graph session part. The issued-id register and the tombstone store are **project-wide**, so
ids stay unique when a second graph arrives. Captures of held items persist with the runs
(section 5.2). **Nothing derived is persisted**: not revision, path kind, status, counts, digest,
masks or edge bindings.

### 12.1 Canonical form

One function canonicalises every definition, at every door, on load and before hashing:

- Object keys are sorted by UTF-16 code unit. Absent optional fields are omitted, never `null`,
  except a path step's `null`, which is meaningful. Fields equal to their default are omitted
  too, so one definition has one spelling: an empty `edges` list and a path's `directed: false`.
  `-0` is stored as `0`.
- Member arrays are sorted by one comparator: numbers before strings, numbers ascending by value,
  strings by UTF-16 code unit. The number `1` and the string `"1"` are different ids and both are
  kept. Duplicates are dropped. Edge members sort by (source, target, id, key, ordinal, among)
  under the same comparator, absent before present.
- Path `nodes` and `edges` keep their order; a step's edge group is sorted as a member array.
- In a graph whose edge pairs are unordered (section 12.3), the doors store an edge member's ends
  in comparator order before canonicalising, so both spellings of one undirected edge are one
  member. This needs the graph, so it is a door step, not part of the pure function; a definition
  loaded from a file is canonicalised as written.
- Every nested `Scope` and definition (inside `scope` leaves, `{ define }`, `{ nodes }`) is
  canonicalised recursively. `all` and `any` keep their operand order, because the user wrote it.
- A one-leaf `expression` tree in `where` becomes the bare query. A fixed `"clipped"` becomes
  `"listed"`. A door-supplied `Run` or `RunResult` becomes its `RunId`. A door-supplied session
  `EdgeId` becomes its stable `EdgeMember`, at every write position that takes a `ScopeInput` or
  a `SetDefinitionInput` (section 15.2), so every getter returns the canonical form and no reader
  ever sees a session counter id.
- Unknown kinds are left exactly as they are (section 12.5). A known node carrying an unknown
  field keeps that field's value, and a fixed set carrying one keeps its member order unsorted, so
  a newer element's parallel array (such as `weights`) is never left misaligned.
- Id strings are interned through the current id map, so a definition shares string storage with
  the graph.

### 12.2 Revision

`revision = "r1:" + hex(H(C))`, where:

- `H` is **two independent 32-bit FNV-1a lanes**, not a 64-bit multiply: lane A starts at
  `0x811c9dc5` and multiplies by `0x01000193`, lane B starts at `0x1b873593` and multiplies by
  `0x85ebca6b`. Each step is `lane = Math.imul(lane ^ unit, multiplier) >>> 0`, on both lanes.
  When the last unit is fed, each lane is passed through the MurmurHash3 32-bit finaliser
  (`h ^= h >>> 16; h = imul(h, 0x85ebca6b); h ^= h >>> 13; h = imul(h, 0xc2b2ae35); h ^= h >>> 16`).
  The hash is the two finalised lanes, A first, as 16 lower-case hex digits.
- **Why the finaliser.** FNV-1a ends in a multiply, so the hashes of short ids that differ only in
  their last unit (`"a"` to `"g"`, `0` to `3`) are near-arithmetic steps of one another, and sums
  of them collide: over the 16,383 non-empty subsets of a 14-node graph, unfinalised member sums
  took only 11,007 distinct values. The member sum and the digest are sums, so every `H` is
  finalised. With it, all 16,383 are distinct, as 64 random bits would be.
- `H` is fed a sequence of tagged parts, one step per unit. A string part is a tag unit (`0x24`)
  then each UTF-16 code unit as **one** step (a 16-bit value, never split into bytes). A numeric
  part is a tag unit (`0x23`) then the eight bytes of its float64 value, **little-endian**, one
  step each; `-0` is fed as `+0`, and `NaN` and infinities are refused at the doors. No string is
  built for a number.
- A node member's hash is `h(node) = H` of its one part.
- An edge member's hash is **compositional**: `mix(e, h(disc))`, where `e` combines the endpoint
  hashes and `h(disc)` is `H` of the one present discriminator. While the pair is unordered
  (section 12.3), `e` is lane-wise `h(source) + h(target)` mod 2^32, commutative, so a direction
  settled later cannot change it. A reserved `dataSource`, when present, is fed last, so a member
  without it hashes as it does now. No JSON is built.
- **The exact unit sequences.** Every `H` below starts on fresh lanes from the two bases. `N(x)`
  is a numeric part: the unit `0x23`, then the eight little-endian bytes of `x` as a float64. A
  32-bit lane value is fed as `N` of that unsigned integer. `S(x)` is a string part: `0x24`, then
  each UTF-16 code unit. `A(h)` and `B(h)` are a hash's two lanes.
  - Node `n`: `h(n) = H(S(n))` for a string id, `H(N(n))` for a numeric id.
  - Discriminator: `id` is `H(0x69, part(id))`, where `part` is `S` or `N` by the id's type;
    `key` is `H(0x6b, part(key))`, since a key, like an id, may be a string or a number; an
    ordinal is `H(0x6f, N(ordinal), N(among))`.
  - Endpoints, undirected: `e = (A(h(s)) + A(h(t)) mod 2^32, B(h(s)) + B(h(t)) mod 2^32)`.
  - Endpoints, directed at ingest: `e = H(N(A(h(s))), N(B(h(s))), N(A(h(t))), N(B(h(t))))`.
  - Edge member: `H(N(A(e)), N(B(e)), N(A(d)), N(B(d)))`, with `d` the discriminator hash; a
    `dataSource` appends `0x73, S(dataSource)`.
  - Example, undirected `{ source: "a", target: "b", id: "x" }`: `d = H(0x69, 0x24, 0x78)`; the
    member is `H` over 36 units, `0x23` and eight bytes for each of `A(e)`, `B(e)`, `A(d)`, `B(d)`,
    where `e` is the lane-wise sum of `H(0x24, 0x61)` and `H(0x24, 0x62)`. The same member
    directed at ingest replaces `e` with `H` over the 36 units of `N(A(h("a")))`,
    `N(B(h("a")))`, `N(A(h("b")))`, `N(B(h("b")))`.
- **The hashes are builder columns.** `graphty.nodeHash` and `graphty.edgeHash` (two uint32 each,
  8 bytes per row) are written once, from the same functions, when a load completes and when a
  node or edge is added. graph-format carries builder columns through every freeze, so they need
  no lineage check, and any digest is one masked sum over two columns.
- **The member sum** of a member array is the lane-wise sum of its members' hashes, each lane mod
  2^32 with no carry between lanes. It is order-free, which is what lets a `set.members` delta
  update it in O(delta). This one rule serves the revision and the digest (section 6.4).
- `C` is the canonical JSON of the definition (no whitespace, `JSON.stringify` numbers) in which
  every member array of a fixed set is replaced by `{"count":k,"sum":"<hex>"}`, and `H(C)` is `H`
  of `S(C)`. In that sum a fixed set's edge members are hashed with the **directed** endpoint
  rule, whatever the graph's direction: the revision digests the definition, whose JSON tells
  `{ source: "a", target: "b" }` from the reverse, so the revision needs no fact about the graph
  and a store can update it from the delta alone. The undirected rule serves the edge-hash column
  and the digest, which describe the graph's edges.
- Golden tests pin the revisions of one fixed, one rule and one path definition, and the hashes
  of a string id, a numeric id, `-0`, a directed and an undirected edge member of each
  discriminator. A change to any of these rules bumps the prefix to `r2`, and section 3.4 says
  what a mismatch means.

### 12.3 Edge identity

The session's edge counter restarts in every session and never reaches the file, so it cannot be a
stored identity. An edge member's **stable identity** is the studio's, with one declared
narrowing. The rules, in the order a member takes them:

1. **`id`, the file's edge id**, read at the element's configured `edgeIdPath`
   (`config/DataConfig.ts:57`). Only a configured path counts; when it is unset, edges have no file
   id, and the import report says so (section 19).
2. **`id`, minted, for an edge added in the session** without a file id: `graphty:e<n>`, where `n`
   is the edge's `DataManager` counter value, which is never rewound (section 4.2). The `graphty:`
   prefix is a reserved namespace. The minted id is the edge's id for every purpose a file id
   serves (the future writer puts it in the file), so ordinals only ever cover file edges, the
   studio's single ordinal exception, and a session edge can never reuse an ordinal.
3. **`key`**, the file's parallel-edge key. Reserved in the shape; the element gains a key-path
   setting before it produces one.
4. **`ordinal` and `among`**, for a file edge without an id or key:
   - **The population is every edge of the pair in the load that ingested it**, with or without a
     file id, in ingest (counter) order. Counting every edge, not only id-less ones, means that
     configuring `edgeIdPath` later, or a future id probe, never moves an ordinal: the id then
     disambiguates first and the ordinal still matches.
   - **A load** is one import, which ingests a contiguous counter range, whatever its chunking
     (`DataManager.ts:1534-1554` streams an additive load's chunks straight into the builder).
     Counting per load means replacing one source never shifts another source's ordinals. The
     store brackets a load explicitly (`GraphStore.openLoad` / `closeLoad`, opened by
     `addDataFromSource` around its chunks, or after the Clear of a replacing load), so a freeze
     in the middle of a load never completes half of it. An edge ingested with no load open -- a
     record push through `addEdges`, a headless session's own ingest -- is a session edge and takes
     rule 2's minted id, with ordinal and among -1.
   - **`among`** is the pair's edge count in that load. Both values are written **when the load
     completes**, not per chunk: the load's edge rows are sorted by (pair, counter) with two
     counting-sort passes in a transient 20 bytes per loaded edge and 4 per node (a load much
     smaller than the graph sorts by comparator in 16 bytes per loaded edge instead), and `graphty.edgeOrdinal` and `graphty.edgeAmong` (int32
     builder columns beside the edge-id column) are filled in one pass. A load completes when it
     closes, not at the next freeze: an edit made after it ended (a removal, or a second load
     opened straight after) belongs to no load and neither moves its ordinals nor joins it. No map
     over the whole graph's pairs is kept. The edge hash column (section 12.2) is written in the same pass.
   - The pair is unordered, its ends stored in the section 12.1 comparator order, unless the graph
     was declared directed at ingest; a direction settled later (`directed: "auto"`,
     `DataConfig.ts:168`) never changes it. A deletion never shifts an ordinal. The rule is
     **latched once per store**, when its first edge is completed: pairs are ordered only when the
     graph was declared directed by then, and the store records the answer as the graph attribute
     `graphty.edgePairsOrdered` (1 or 0), so every snapshot says which rule its edge hashes follow
     and a later load into the same store never switches it. A snapshot without the attribute (a
     raw graph-format or graph-io snapshot) follows its own `directed`.
   - **Only surviving edges count.** Under a merging `repeatedEdges` policy (`first`, `last`,
     `sum`; `DataConfig.ts:67`) a repeated record never becomes an edge, so it takes no ordinal
     and does not count in `among`. Under `keep` every record is an edge and counts. The
     identity names edges the graph holds, not records the file held.

The stable identity is computed when a member is added (a door turns a session `EdgeId` into it)
and frozen into the record (section 6.1). The session counter id it came through is a seed beside
the slice (section 4.2).

**Binding.** An `id` member binds the one edge with that id. An ordinal member binds only when
**exactly one** edge carries its pair, `ordinal` and `among`. Two loads that each contributed an
edge to the same pair can give two edges the same (pair, ordinal, among); both members then read
missing with reason `ambiguous-parallel-edge`, never bound to the wrong edge. The reserved
`dataSource` lifts this: once the data layer stamps a source column, a member records its load's
source and the tie is broken (an absent `dataSource` matches any source, as today). Two load cases:

1. **The file embeds the graph.** The edge-id, ordinal, among and hash columns are restored as
   they were, the `DataManager` counter resumes one past the largest loaded counter, and members
   match the columns on (pair, `ordinal`, `among`) or on `id`.
2. **The graph is re-imported from its source**, and the same for Replace data. The new load's
   columns are computed as above, and each member is rebound in one O(E) scan against a hash of
   the members' identities. A parallel group whose size changed reads missing with
   `ambiguous-parallel-edge`. Minted ids do not come back unless the file carried them. The
   import report says when ordinals were matched by position.

Neither case rewrites a set, a stored revision or a derived run id, so a clean reload never reads
out of date. Tests:

- delete one of three parallel edges, save and reload with the graph embedded: the member binds
  the same edge and its revision is unchanged;
- delete ordinal 2 of three, add a new edge to the same pair (it gets a minted id), save and
  reload embedded: the old member reads missing and never binds the new edge;
- re-import a source file that dropped one of three parallel edges: the ordinal members read
  missing and none binds a sibling;
- configure `edgeIdPath` between save and re-import: ordinal members still bind;
- two Add data loads each contributing one id-less edge to the same pair, then a re-import of
  both: the two members read `ambiguous-parallel-edge`, and neither binds;
- a second Add data load that touches a pair of the first never changes the first load's
  ordinals, and its members still bind.

### 12.4 Issued ids and tombstones

- The register lists every id ever issued. It is monotonic: written when a write commits, never
  by `prepare` and never through the slice's `put` and `delete`, and never rewound by undo or
  rollback (section 13.1).
- **Tombstones** are separate from the register: `{ id, name, record? }` for a removed id. A
  tombstone is authoritative only while its id is absent from the slice, so after an undo of a
  removal, `restore`, the loader and status ignore it. It is rewritten at every commit that removes
  the id, a redo included, so its name and record are the latest.
- Tombstone records sit in a **bounded store** (an internal byte cap, oldest record dropped
  first); the id and name are kept. `sets.restore` of an id whose record was dropped is
  unavailable, and says so. An assistant that creates and removes sets in a loop cannot grow the
  file without bound.

### 12.5 Loading and unknown kinds

- **Load validates.** Every record passes through the same validator and canonicalisation the
  doors use, in an internal load mode (section 15.1). Dangling references load as detached.
  Duplicate names are tolerated (section 3.2). Stored revisions are kept as they are (section
  3.4).
- **Door mode refuses anything unknown or reserved. Load mode keeps it opaque.** An unknown `kind`
  (of a definition, leaf, `Scope` or `ItemKey`) **and** an unknown or reserved field inside a
  known one (a `percentile` on `threshold`, an `op` on `ItemKey`, a `within` on a rule, a `graph`
  on `{ set }`, a `dataSource` on an edge member, a `weights` array on `fixed`) are never ignored,
  because an older element that ignored `op: "le"` or `within` would resolve silently wrong
  members and drop the field on save.
- **The opaque unit is the whole definition.** A definition holding anything opaque round-trips
  value-identical under the canonical form, resolves to nothing, reads `unresolvable` with
  `missing-capability` naming the first unknown kind or field, and supports only `rename` and
  `remove`. A finer unit (one leaf, one member) would need a partial-evaluation rule for every
  node type, and a leaf read as empty under `not` would resolve to wrong members. Load mode is
  internal, so a finer unit can come later without a contract change.
- **Every write carries unknown top-level record fields through unchanged** (a future `meta`), so
  an older element's `rename` never drops them. **Doors that rewrite a definition** (`redefine`,
  `addMembers`, `removeMembers`, a future `extendPath`) refuse an opaque definition with
  `E_UNSUPPORTED` and `details.reason: "opaque-content"`, so a future parallel array such as
  `weights` is never left misaligned. Only a malformed known node is refused at load. So a file
  written by a newer element, or one using a plugin's leaf, loses nothing when opened without it.
- **Plugin kinds are namespaced.** No built-in leaf kind, definition kind, `Scope` keyword or
  `SetCreatedFrom` kind will ever contain a colon. A plugin's kind is spelled `<package>:<kind>`,
  and the future leaf registry refuses any other spelling, so a plugin kind can never collide with
  a later built-in, and `missing-capability` names the package to install.
- **Execution tokens** persist with their runs. The file carries its session nonce, so a loaded
  token never equals a new one.
- **Restore** is the loader (or undo) calling the store's internal `put`. No explicit `id` on the
  public create is published.

---

## 13. Undo readiness

Undo is being built on a separate branch. It turns project state into slices written only through
a command dispatcher, publishes the commands (`SessionCommand` from `./commands`), and classifies
every public member in a door list. Sets are shaped to drop into that model as a **keyed value
slice**, and depend on no undo code.

### 13.1 The slice

- One module, `session/sets/`, owns `Map<SetId, SetRecord>` of deep-frozen records.
- Its only write interface is internal: `put(record)` and `delete(id)`, which become
  `draft.sets.set` and `draft.sets.delete`.
- The issued-id register sits beside the slice, not in it (section 12.4). On master the store
  writes it when a door's write commits; on the undo branch the dispatcher writes it at commit,
  like the graph token.
- `SetRecord` widens the undo branch's `SavedScopeRecord { id, name, spec, order }`: `spec`
  becomes `definition`, and `createdFrom` is added.
- `order` is one past the highest order the store has ever held, minted with the id at dispatch
  (section 3.1). `list()` sorts by it, ties broken by id. A high-water mark rather than the
  highest live order, because a restored record keeps its order: with "highest live", removing
  the last set, creating another and then undoing the removal would give two live sets one order.
- A write group nests: a door called inside an open group is a savepoint, so a refused door
  undoes only its own writes and mints and the group goes on. Without it, a refused `create`
  inside a group would leave its minted id pending, and the commit would register an id no set
  ever held.

### 13.2 The operations

Each is one future command: immediate lane, `moves: false`, key `sets/<id>`. **Public arguments
are separate from the recorded patch**: a consumer cannot supply an id, an order or a
`createdFrom`.

| Future command | Public arguments | Recorded concretely | Doors that reach it |
|---|---|---|---|
| `set.create` | `{ definition, name? }` or `{ from, name?, reading?, follow? }` or `{ path, name? }` or `{ combine, of, name? }` | `{ id, name, order, definition, createdFrom }` | `sets.create`, `createFrom`, `createPath`, `combine`, `scope.save`, `selection.promote` |
| `set.rename` | `{ id, name }` | same | `sets.rename` |
| `set.redefine` | `{ id, definition }` | same | `sets.redefine` |
| `set.members` | `{ id, add?, remove? }` (fixed sets only) | the new record | `sets.addMembers`, `sets.removeMembers` |
| `set.remove` | `{ id }` | same | `sets.remove`, `scope.remove` |

- **Doors resolve late.** The door's resolve step materialises any source (`from`, a `combine`,
  an offer) against the current graph, runs and selection, asynchronously, and produces a concrete
  fixed or path definition only: no id, no order, no name check. `prepare(records, concrete)` is then pure over the records
  and the command: it validates, clones, canonicalises and deep-freezes, and carries any unknown
  top-level record fields through unchanged (section 12.5). A replay never re-resolves.
- **History holds whole values.** The slice is a keyed value slice, so a `set.members` step keeps
  the prior and next record. Adding three nodes to a 200,000-member set retains about 8 bytes per
  node member (1.6 MB) for that step, and about 24 bytes per edge member, so a listed set of 1M
  edges costs about 24 MB per step. Both are rows in the undo design's memory table so eviction
  accounts for them. A reading-only redefine shares the member arrays and costs nothing. Member
  edits above 1M edge members are refused until an op-log sub-key for members, like the `pins`
  slice, is agreed with that branch (sections 6.5, 20).
- **A no-op records nothing**: a `set.members` whose ids are all already present or already
  absent, a rename to the same name, a redefine to the same canonical definition.
- `removeMembers({ nodes: [u] })` also removes every edge member incident to u in the same step,
  so the node is really gone. The member doors accept a session `EdgeId` or an `EdgeMember` and
  refuse an `EdgeId` the graph does not hold (`E_BAD_COMMAND`), because an edge member needs its
  stable identity.
- This is the undo branch's own `ScopeService.prepare` pattern.

### 13.3 Rules the module keeps

- **Commands are synchronous; doors that resolve are not.** `create`, `rename`, `redefine`,
  `addMembers`, `removeMembers` and `remove` resolve nothing and are synchronous, as `scope.save`
  is today. `createFrom`, `combine` and `createPath` materialise a source, so they return
  `Promise<SetId>`: they resolve asynchronously to a definition, then, synchronously and in one
  tick, re-check what the resolve assumed (an offer's execution is still current), mint the id
  and order, check or pick the name ("Set N"), and dispatch one `set.create`. Two calls in flight
  with the same name therefore get distinct ids or the second is refused with `E_DUPLICATE_ID`;
  a test runs two concurrent `createFrom` calls to prove it. Section 6.5 states the projection
  for the synchronous part.
- **An asynchronous door reads its source when it resolves it, not when it is called.** A set the
  source names that is redefined synchronously after `createFrom` is called is frozen as
  redefined, and a run queued over `{ set }` runs over the set as it stands when its work starts
  and records that revision. Both are consistent (each records what it used), and awaiting the
  call before editing what it reads gives the call-time membership. Capturing the record at call
  time instead would make a queued run compute over a membership the reader has already changed.
- **Nothing else writes set state.** Not node removal, not a run finishing, not run or set removal,
  not an event listener.
- **No handle objects with methods.** Every write verb is on `session.sets`.
- **Other state names sets by id** and never copies their members.
- **Identity values never repeat**: set ids (issued register), edge ids (the counter in
  `DataManager`), execution tokens (nonce plus counter, restored with the result). Undo rewinds
  none of the counters.
- **Nothing throws inside a pass** (section 4.3).
- **`membersOf(record)`** is a synchronous internal resolver, for undo's "select what the step
  touched".

### 13.4 Port items for the undo branch

A checklist against the code as merged. Every path is under `graphty-element/src/`. No undo code is
imported anywhere on this branch; each item names where the undo branch plugs in.

- [ ] **The five prepare functions are the command bodies.** `session/sets/prepare.ts` exports
  `prepareCreate`, `prepareRename`, `prepareRedefine`, `prepareMembers` (both `addMembers` and
  `removeMembers`) and `prepareRemove`. Each is pure over a `RecordView` and one concrete command
  and returns the next record (or `null` for a no-op, or the id to delete). They become the
  `prepare` of `set.create`, `set.rename`, `set.redefine`, `set.members` and `set.remove`.
- [ ] **`put` and `delete` are the only writes.** `SetsStore.put(record)` and
  `SetsStore.delete(id)` in `session/sets/store.ts` are called only from `session/sets/SetsApi.ts`
  (the `write` helper and `remove`). They become `draft.sets.set` and `draft.sets.delete`.
  `scope.save` and `scope.remove` (`session/scope/ScopeApi.ts`) and `selection.promote`
  (`session/selection/SelectionApi.ts`, through `createSetAs`) reach the store only through
  `session.sets`.
- [ ] **The write group is `SetsStore.transact(write, cause)`.** Every door opens one; a nested call
  is a savepoint. It maps onto the dispatcher's group. Its commit (`SetsStore.commit`) tells the
  `onCommit` listeners the committed diff, from which `GraphSession` publishes `set:changed`.
- [ ] **One serialiser.** `SetsStore.toLogicalRecords()` and `SetsStore.loadLogicalRecords(stored)`
  are the only code that reads or writes set state as a whole value
  (`{ records, register, tombstones }`). The undo slice's snapshot and the project file both use
  them; nothing else serialises sets.
- [ ] **The register and the pending list.** The issued-id register is `SetsStore.issued`, appended
  only in `commit`. The pending list is the open group's `minted` array (`Group.minted`), consulted
  by `SetsStore.mint` and discarded when a savepoint or group rolls back. On the undo branch the
  dispatcher appends `minted` to the register at commit and never rewinds it. `highestOrder`
  (`nextOrder()`) is the order high-water mark and is not rewound either.
- [ ] **Edge seeds are session state beside the slice, not in it.** `SetsStore.seed` and
  `seedsOf` hold the session edge counter each edge member entered through (written by
  `SetsApi`'s `seed` helper after a door's write). They are not serialised. An undo that restores
  an earlier record leaves seeds for members it no longer holds; the resolver only reads seeds for
  members the record holds, so they are harmless. `delete` keeps a removed set's seeds (ids are
  never reissued, so they cannot attach to another set), which lets an undone removal bind as
  before.
- [ ] **The execution token.** Minted by `createExecutionMinter` in `session/runs/RunsApi.ts` (a
  session nonce plus a counter the dispatcher must never rewind), held while running in
  `Run.executionValue` and written with the result in `Run.resultExecutionValue`
  (`session/runs/Run.ts`). The port moves the result's token onto the runs slice's result entry.
- [ ] **The captures.** Held-item captures live in `Run.heldValue` (read as `Run.held`, and
  through `RunsApi.heldOf(id)`), written only when a re-run replaces a result, through the
  `captureHeld` surrounding that `GraphSession` supplies. The port moves them to `RunEntry.held`,
  written by the re-run command in the same step as the new result; history eviction never
  touches them.
- [ ] **The layout scope.** It lives in `LayoutManager.carriedScope`
  (`managers/LayoutManager.ts`), written by `setLayout(type, opts, { scope })` and
  `Graph.setLayoutScope`, read by `Graph.getLayoutScope`. The port moves it into the `layout` slice
  value as `scope?: Scope`, written by `layout.set`; the hold mask is captured again when the
  restored layout starts.
- [ ] **Rename the slice.** The undo branch's `scopes` slice becomes `sets` and
  `SavedScopeRecord` becomes `ElementSet` (`spec` is `definition`; `createdFrom` added). Whether
  `scope.save` stays an alias op of `set.create` is a one-way door settled with that branch
  (section 15.3, item 12).
- [ ] **Derivation hooks.** Replace the `scopes` hook ("bump savedRevision") with a `sets` hook that
  re-checks the signatures of every layer and filter naming a changed id and repaints the XOR
  dirty set (today `session/sets/notify.ts` does this from `SetsStore.onCommit`). Extend the
  `runs` hook the same way for layers and filters whose scope reads a changed run.
- [ ] **The visibility copy tag.** Add the set input signatures (`session/sets/signature.ts`) to
  `MaskTag.inputs`.
- [ ] **The memory table.** Add the `set.members` whole-value rows (about 8 bytes per node member,
  24 per edge member, per step; section 13.2).
- [ ] **Merge order.** Whichever branch merges second does the renames. Conflicts are confined to
  `ScopeApi.ts` `save`/`list`/`remove`, `SelectionApi.promote` and the type files.

---

## 14. Events

```ts
export interface SetChange {
    readonly id: SetId;
    /** OPEN UNION. */
    readonly change: "created" | "updated" | "removed";
    /** Which fields an "updated" change touched; empty otherwise. OPEN UNION. */
    readonly fields: readonly ("name" | "definition" | "order")[];
    /** The frozen record after the change; null after removal. */
    readonly set: ElementSet | null;
    /** What caused it. OPEN UNION: "command" on master; undo, redo and load are added later. */
    readonly cause: "command";
}
// SessionEventMap gains: "set:changed": SetChange
```

- **It is emitted from the committed diff of each touched key, when the write group seals**, one
  event per key, after the style and visibility passes (driven by the internal notification,
  section 11). On master every door is its own group. A write that a rollback discards emits
  nothing. One group that renames and redefines a key emits one `updated` with both fields.
- Sets get their own event, although the undo design rejected per-slice events, because sets are
  listed and named like layers (`style:changed` exists for layers) and master has no other signal.
- **Membership and freshness have no event.** Both are lazy. A panel re-reads on the events it
  already watches and on `set:changed`.

---

## 15. Public API

### 15.1 Where the types live

All new types go in `catalog/types.ts`, exported from `./session`, and the runtime-free ones also
from `./catalog` and `./schema`. `Filter` moves into `catalog/types.ts`;
`session/visibility/filter.ts` re-exports it. One hand-written, Node-safe validator,
`parseSetDefinition(value: unknown): SetDefinition` (and `parseScope`, the same), is exported
from `./catalog` and used by the doors and future assistant commands. It is door mode only, so its
return type is always true. The load mode of section 12.5, which may return opaque content, stays
internal to the element's loader; an option to reach it can be added when an external codec needs
one. A zod or JSON Schema form is added when assistant commands need one. `ScopedInput` is exported from `./extend`.

### 15.2 The API

**Which calls are synchronous** is decided by whether the call resolves membership, not by verb.
Reads that only look at records (`list`, `get`, `status`, `usedBy`, `offers`, `pathKind`) and
writes that resolve nothing (`create`, `rename`, `redefine`, `addMembers`, `removeMembers`,
`remove`) are synchronous. Every call that may resolve (`containing`, `createFrom`, `createPath`,
`combine`, and `scope.resolve` and `scope.count`) returns a Promise, for the reason
`ScopeApi.ts:329-333` gives: the published surface must keep its shape when a session is hosted in
a worker, and rule evaluation may move to a worker or the GPU.

```ts
// ---- catalog/types.ts ----
export type SetId = string;                                    // NEW
export type ScopeId = SetId;                                   // CHANGED: alias, same type
export type EdgeReading = "induced" | "listed" | "clipped";   // NEW, open
export interface EdgeMember { /* section 4.1 */ }              // NEW
export type SetDefinition = /* section 4.1 */;                 // NEW, open
export interface ResultItem { /* section 4.3 */ }              // NEW
export type ItemKey = /* section 4.3 */;                       // NEW, open
export type SetCombine = "union" | "intersection" | "difference" | "symmetric-difference"; // NEW, open
export type SetCreatedFrom = /* section 5.1 */;                // NEW, open
export type SetOperand = /* section 5.1 */;                    // NEW
export type PathKind = "simple" | "trail" | "walk" | "cycle";  // NEW, open
export function parseSetDefinition(value: unknown): SetDefinition; // NEW, door mode
export function parseScope(value: unknown): Scope;             // NEW, door mode

/** What an operation runs over: a set reference. OPEN UNION. */
export type Scope =                                            // CHANGED: one arm, declared open
    | "visible" | "graph" | "selection" | "largest-component"
    | { set: ScopeId }
    | { where: Query }
    | { nodes: readonly NodeId[] }
    | { define: SetDefinition };                               // NEW

/**
 * What a write position accepts: a Scope whose inline definitions may name edges by session
 * `EdgeId` (applied recursively to `scope` leaves and `{ match: "scope" }` selectors). Every
 * getter returns the canonical `Scope`, with stable members.
 */
export type ScopeInput =                                       // NEW
    | Exclude<Scope, { define: unknown }>
    | { define: SetDefinitionInput };

// Filter (moved here, declared open) gains the leaves scope, item, threshold (section 4.3).
// Selector (both declarations, declared open) gains { match: "scope"; scope: Scope }.

// ---- session/sets ----
export interface ElementSet { /* section 4.6 */ }              // NEW
export interface SetStatus { /* section 5.3 */ }               // NEW
export type SetStatusReason = /* section 5.3 */;               // NEW, open
export interface SetOffer { /* section 8.2 */ }                // NEW
export interface SetChange { /* section 14 */ }                // NEW
/** One thing that names a set: the studio's "Used by". OPEN UNION on `kind`; render `label` for unknown kinds. */
export interface SetUser {                                     // NEW
    readonly kind: "set" | "layer" | "filter" | "layout" | "run";
    readonly id?: string;
    readonly label: string;
}
export interface Memberships {                                 // NEW, open for additions
    /** Kept sets holding the element. */
    readonly sets: readonly SetId[];
    /** The partition items holding it: "Louvain (resolution 1.0): community 4 of 212". */
    readonly items: readonly { readonly item: ResultItem; readonly label: string; readonly of: number }[];
}

export interface SetsApi {                                     // NEW, as session.sets
    /** Every kept set, by `order`. The same frozen objects until a record changes. */
    list(): readonly ElementSet[];
    get(id: SetId): ElementSet | undefined;
    /** Freshness from dependencies and the cached compile outcome. Never resolves. `status({ set: id })`. */
    status(ref: ScopeInput): SetStatus;
    /** A path set's kind (section 4.4); undefined for other kinds. Derived, never resolves. */
    pathKind(id: SetId): PathKind | undefined;
    /**
     * The inspector's "Memberships", per element. A cached bitmap is tested when present; else a
     * fixed set of nodes alone is a binary search of its sorted members, and a rule whose leaves are all
     * element-local (expression, edges, range, categories, degree, item, threshold `above`) is
     * evaluated on this element alone. A rule with a population or topology leaf (threshold `top`, component,
     * largest-component, neighborhood, or a scope over such a rule) is resolved in full, once,
     * and cached. An edge's row comes from `Edge.index`.
     */
    containing(element: { readonly node: NodeId } | { readonly edge: EdgeId }): Promise<Memberships>;
    /** What names this set: the studio's "Used by". A new kind of user appears with its label. */
    usedBy(id: SetId): readonly SetUser[];
    /**
     * Keep a definition as given; created from "user". Edge members may be given as session
     * `EdgeId`s and are stored in stable form; `get()` returns the stable form.
     */
    create(definition: SetDefinitionInput, options?: { readonly name?: string }): SetId;
    /** Create set: freeze a scope's or an offer's current members into a fixed set. */
    createFrom(
        source: ScopeInput | SetOffer,
        options?: { readonly name?: string; readonly reading?: EdgeReading; readonly follow?: boolean },
    ): Promise<SetId>;
    /** Create path: order a path offer, or the selected edges, into a walk. Refuses an ambiguous order, saying why. */
    createPath(source: SetOffer | "selection", options?: { readonly name?: string }): Promise<SetId>;
    /** Two or more sets, combined into one fixed set of their current members. */
    combine(op: SetCombine, of: readonly ScopeInput[], options?: { readonly name?: string; readonly reading?: EdgeReading }): Promise<SetId>;
    rename(id: SetId, name: string): void;
    redefine(id: SetId, definition: SetDefinitionInput): void;
    /** Fixed sets only. */
    addMembers(id: SetId, members: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeRef[] }): void;
    /** Fixed sets only. Removing a node also removes its incident edge members. */
    removeMembers(id: SetId, members: { readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeRef[] }): void;
    /** Removes the set itself. Dependents become detached. */
    remove(id: SetId): void;
    /** The sets a finished run's result offers, largest first. */
    offers(run: RunId, options?: { readonly limit?: number }): { readonly offers: readonly SetOffer[]; readonly more: number };
}

// EdgeRef:                   EdgeId | EdgeMember                                         NEW
// SetDefinitionInput:        SetDefinition with EdgeRef wherever EdgeMember appears      NEW
// GraphSession gains:        readonly sets: SetsApi;                                     NEW
// SessionEventMap gains:     "set:changed": SetChange;                                   NEW
// ScopeCount gains:          readonly missingNodes?: number; readonly missingEdges?: number; NEW optional
// RunScopeRecord gains:      readonly set?: { readonly id: SetId; readonly revision: string };
//                            readonly reading?: EdgeReading;                            NEW optional
// runs.start reserves:      scopeAs, refused at run time with E_BAD_COMMAND; not in the type RESERVED
// AlgorithmRunContext gains: input(orientation, options?: ScopedInputOptions): ScopedInput; NEW (section 10.2)
//                            (code building a context by hand to call compute() must supply it)
// ScopedInput, ScopedInputOptions: section 10.2, exported from ./extend                  NEW, open
// AlgorithmDescriptor gains: scopeInput?: "none" | "subgraph";                           NEW optional, open; derived by register from static scopeInput
// LayoutEngineStatics gains: scoped?: boolean;  LayoutEngine: static scoped = false;    NEW
// LayoutEngine gains:        setHoldMask(mask: NodeMask | null, rows: number): void; get holdMask();
//                            protected isHeld(index: number): boolean                   NEW
// LayoutImplementation gains: scoped: boolean (read off the engine class)               NEW
// Graph gains:               getLayoutScope(): Scope | undefined;
//                            setLayoutScope(scope: ScopeInput | undefined): Promise<void> NEW
// LayoutDescriptor gains:    scoped: boolean  (derived by register; omitted from AuthoredLayoutDescriptor) NEW
// SetLayoutOptions:          interface SetLayoutOptions extends QueueableOptions { scope?: ScopeInput } NEW
// graphty-element gains:     layoutScope: ScopeInput | undefined (getter: Scope | undefined); attribute layout-scope (JSON) NEW
// Positions typed ScopeInput (input only): run options (StartOptions.scope, RunSpec.scope),
//   setLayout, layoutScope, selection targets, applyCameraView, createFrom, combine, status,
//   scope.resolve, scope.count
// Positions typed Scope that accept a session EdgeId at run time: a Filter's scope leaf
//   (visibility.set, a rule set's tree) and a { match: "scope" } selector. These types are also
//   what getters return and what a document persists, so they stay Scope; a door converts.
// Error details:             details.reason on refusals, OPEN UNION: "cycle" (with `through`),
//                            "stale-offer", "live-selection", "induced-edge-leaf", "follow-group",
//                            "opaque-content", "ambiguous-path" (with `why`),
//                            "outside-scope" (existing)                                 NEW
// graph-format root:         maskAnd, maskOr, maskAndNot, maskXor, maskNot                NEW
```

**Reading and counting a set** go through the one resolver: `session.scope.resolve({ set: id })`
and `session.scope.count({ set: id })`. `ScopeCount` gains optional `missingNodes` and
`missingEdges`, filled for kept fixed and path sets (an inline `{ nodes }` or `{ define }` count
keeps its 2.x shape). There is no second count on `session.sets`. The
sets documentation shows both recipes.

`createFrom` defaults, following the studio's "Create set": a selection that holds nodes stores
the selected nodes **and** the selected edges and reads **induced**; a selection of edges alone
reads **listed** (created from `selection`). The reading is never inferred from whether an edge
happens to be selected, so one stray edge cannot change every density and scoped run; the set's
type row shows the reading, and a hand-traced tree is one `redefine` of `reading` to `listed`,
which uses the stored edges. A rule or built-in keeps the reading it resolves with, and a
`clipped` source (such as `"visible"`) freezes to `listed`, which has the same members (created
from `scope`); an offer keeps its reading (created from `result`). `options.reading` overrides. A
defaulted listed result equal to its induced form is stored induced, and follows edges added
later between its members (section 4.1). A source that resolves to nothing is refused with `E_SCOPE_EMPTY`. The
`"selection"` keyword itself stays node-induced, as in 2.x; its `E_SCOPE_EMPTY` for an edges-only
selection points at `createFrom("selection")`.

**Derived run ids.** Before hashing, a `{ define }` whose definition equals a legacy form is
canonicalised to that form (`{ define: fixed induced nodes }` to `{ nodes }`, a rule over one query
to `{ where }`), so one scope has one run id and existing ids are unchanged
(`session/runs/runId.ts:268-289`).

**Refusals reuse existing codes** and the existing error target `{ kind: "scope", id }`:

| Situation | Code |
|---|---|
| Malformed definition, bad or empty name, a cycle, a live `"selection"` in a kept rule, an induced rule with an edge leaf, follow mode on a group, a stale offer, an ambiguous path, a set id never issued or an unknown `EdgeId` at a write door (every door that takes a scope, a
filter, a selector or a definition; a removed set's id is accepted and reads as detached; a
style document's layer is kept detached instead, because it may come from another session), `addMembers` on a non-fixed set, a bad `threshold`, a reserved field | `E_BAD_COMMAND`, with `details.reason` where the UI answers with a verb |
| A definition rewrite (`redefine`, `addMembers`, `removeMembers`) of a definition holding opaque content | `E_UNSUPPORTED`, `details.reason: "opaque-content"` |
| `addMembers` or `removeMembers` on a set holding more than 1M edge members | `E_TOO_LARGE` |
| A visibility filter that reaches `"visible"` or `"search"` | `E_BAD_COMMAND` |
| A malformed scope selector | `E_BAD_SELECTOR` |
| Duplicate name | `E_DUPLICATE_ID` (as `scope.save` today) |
| Unknown run in `offers` | `E_UNKNOWN_RUN` |
| A node option outside a run's scope | `E_OPTION_RANGE`, `details.reason: "outside-scope"` |
| A run over an empty set (any scope but `"graph"` and `"visible"` that holds no node, refused at `start`, or failing the run when it finds the scope empty as its work starts), `createFrom` of an empty source, or the deprecated `scope.save` of an empty `"selection"` or `"visible"` | `E_SCOPE_EMPTY` |
| An explicit scope on a layout that is not `scoped` | `E_UNSUPPORTED` |
| Running, laying out (an explicit scope argument) or `scope.resolve` over a detached reference | `E_BAD_COMMAND`, as an unknown `{ set }` is today. A carried layout scope never refuses (section 11) |

`scope.count` of a tombstoned id or a detached rule returns zeros and `status` explains why, so a
panel counting every row never throws; an id that was never issued still refuses. No new error
code or error target kind is published; the `details.reason` values are new and form an open
union.

### 15.3 Public contract: the one-way doors

Every item becomes published API or a persisted format once released. The owner decides each.

**Status, 2026-09-27: no item has a recorded answer yet.** The branch builds every
recommendation below, so each answer is due before the branch merges, and a "no" is a code change
on the branch, not a follow-up.

1. **`session.sets` and its method names**: `list`, `get`, `status`, `pathKind`, `containing`,
   `usedBy`, `create`, `createFrom`, `createPath`, `combine`, `rename`, `redefine`, `addMembers`,
   `removeMembers`, `remove`, `offers`; which are synchronous, decided by whether the call
   resolves (`createFrom`, `createPath` and `combine` return `Promise<SetId>`, so rule evaluation
   can move off the main thread later, and mint their id at dispatch); `createFrom`'s `follow`
   option and its defaults (a selection with nodes reads induced); `combine` always fixed;
   `status(ref: ScopeInput)`; `usedBy` as an open list; the doors accepting `EdgeId |
   EdgeMember`.
   `remove` removes the set, as `scope.remove` does (section 19 records the studio's `delete`).
2. **The type names** `SetsApi`, `ElementSet`, `SetId`, `SetDefinition`, `EdgeReading`,
   `EdgeMember`, `EdgeRef`, `SetDefinitionInput`, `ScopeInput`, `ResultItem`, `ItemKey`,
   `SetCreatedFrom`, `SetOperand`, `PathKind`, `SetStatus`, `SetStatusReason`, `SetUser`,
   `Memberships`, `SetOffer`, `SetChange`, `SetCombine`, `SetLayoutOptions`, `ScopedInput`,
   `ScopedInputOptions`, and the door-mode functions `parseSetDefinition` and `parseScope`. The
   record field is `createdFrom`, not `origin`, which attributes already publish.
3. **The definition's shape**: `kind` = `fixed | rule | path`; `reading` = `induced | listed |
   clipped` and what each means (section 4.1), with `listed` in the studio's meaning; the rule
   body `where: Query | Filter`; edge members by stable identity; a path node-first with
   `null`-able step edges and `directed`.
4. **The new `Scope` arm `{ define }`**, and the split between `ScopeInput` (write positions,
   session `EdgeId`s accepted) and `Scope` (every getter, stable members only). `{ set: ScopeId }`
   stays a string: widening it would break every reader of `spec.set`.
5. **Declaring the unions open** in the same release that adds them: `Scope`, `Filter`,
   `Selector`, `SetDefinition`, `EdgeReading`, `ItemKey`, `SetCreatedFrom`, `SetStatusReason`,
   `SetCombine`, `PathKind`, `SetChange.change`, `SetChange.fields`, `SetChange.cause`,
   `SetStatus.freshness` (with `unresolvable` beside `detached`), `SetUser.kind`,
   `AlgorithmDescriptor.scopeInput`, `ScopedInputOptions.simplify`, and the refusals'
   `details.reason`; `ScopedInput`, `ScopedInputOptions`, `Memberships`, `EdgeMember` and
   `ResultItem` open for optional members. Declared later, every new member is breaking.
6. **The `Filter` leaves** `scope`, `item` and `threshold` (keyed on a value `path`, not a run,
   so attribute and imported-score thresholds are expressible; with `percentile`, `z` and
   `population` reserved), their evaluation (silent halves, the composition rule, the identity
   with the visibility filter, the refusal of edge leaves under `induced`), and the `Selector`
   kind `scope`. **The colon rule**: no built-in leaf kind, definition kind, `Scope` keyword or
   `SetCreatedFrom` kind will ever contain a colon, and plugin kinds are spelled
   `<package>:<kind>`. It costs nothing now and can only be promised before the first
   third-party leaf exists. `Selector` was published closed, so adding `scope` breaks the build of
   a TypeScript consumer that handles one known kind under `default:`; the graphty app was one
   (section 17). The release notes name it.
7. **The id contract**: a `set_` prefix, opaque after it, never reissued within a project (one
   project-wide register), and namespaced ids for imported sets as `set_<ns>.<rest>`.
8. **`ResultItem { run, key, execution? }`**: `run` is a `RunId`; `execution` is an opaque token
   unique across sessions (the studio's per-execution run id); a key matches by equality or array
   containment; follow mode is refused for partition groups. The studio's `ItemAddress` maps onto
   this shape (section 19).
9. **`"set:changed"`** and its payload, including `fields` and `cause`.
10. **The extension and layout members**: `RunScopeRecord.set` and `.reading`;
    `ScopeCount.missingNodes` and `missingEdges`; `SetLayoutOptions.scope`; `scoped?` on
    `LayoutEngineStatics`, `static scoped` on `LayoutEngine` and the derived
    `LayoutDescriptor.scoped`, which `AuthoredLayoutDescriptor` omits, so third-party layouts keep
    compiling; `LayoutImplementation.scoped`; the hold contract a scoped engine accepts --
    `setHoldMask(mask, rows)`, `holdMask`, the protected `isHeld(index)`, rows past `rows` held,
    held nodes fixed in the engine's own state; `Graph.getLayoutScope` and `setLayoutScope`; the
    writable `layoutScope` and its `layout-scope` attribute, carried across
    `layout` and `layoutConfig` changes, its members frozen when each layout starts, a detached
    carried scope inactive, an unscoped layout read as `undefined`; `AlgorithmRunContext.input`
    with its `simplify` option (default `"sum"`), with `ScopedInput.edges` in declared space
    only; `AlgorithmDescriptor.scopeInput`; the reserved `scopeAs`. `ScopedInput`
    exposes graph-format's `GraphSnapshot`, `NodeMask` and `EdgeMask`, tying `./extend` to
    graph-format 1.x.
11. **The persisted form** (section 12): the record shape, the file key `sets`, the project-wide
    issued-id register, tombstones in a bounded store, captures persisted with runs, the
    canonical form, the `r1:` revision and `d1:` digest schemes (a version mismatch reads as
    unknown and is never re-stamped; `d1:` promised comparable only within a session and
    store), the member hash (two 32-bit lanes, compositional edge hash) and its columns
    `graphty.nodeHash` and `graphty.edgeHash`, edge stable identity (`id` including minted
    `graphty:e<n>` ids, reserved `key`, `ordinal` with `among` counted over every edge of the pair
    per load, the `graphty.edgeOrdinal` and `graphty.edgeAmong` columns, the per-store pair rule
    recorded as the graph attribute `graphty.edgePairsOrdered`, reserved `dataSource`),
    and opaque round-tripping of unknown kinds and fields with the whole definition as the opaque
    unit. The logical form only; the byte encoding is the codec's.
12. **The command op names** `set.create`, `set.rename`, `set.redefine`, `set.members`,
    `set.remove`, and whether `scope.save` stays as an alias op. Settled with the undo branch.
13. **graph-format's five mask helpers**, additive to graph-format 1.x.
14. **Honouring run scopes**, which changes the published values of existing scoped runs.
    Recommendation: ship as a fix with a changelog entry, or hold for graphty-element 3.0.0.
15. **`scope.save` of `"selection"` or `"visible"` freezes** to a fixed set (section 16), a
    behaviour change to a published verb. Recommendation: ship with a changelog entry; the app
    never calls it.
16. **`ResolvedScope.digest` values change** to the versioned `d1:` form (section 6.4). The string
    was always opaque and is not yet persisted anywhere.
17. **`scope.save` never reissues a removed id**, a behaviour change to a published verb: today
    removing "first" and saving "first" again mints the same id (item 7 makes that impossible).
    Recommendation: ship as a fix with a changelog entry; a reissued id silently re-points every
    stored reference to the old set.
18. **`selection.promote` keeps the selected edges** (section 16), a behaviour change to a
    published verb. Recommendation: ship as a fix with a changelog entry.
19. **Dijkstra takes the shortest of parallel edges** (section 10.2), changing its published
    distances on weighted multigraphs. Recommendation: ship as a fix with a changelog entry.
20. **Whether to stamp `graphty.source` now** (section 9). The column name is published once
    stamped. Recommendation: not in this release (section 19 records why); the owner may say
    stamp it now, and the plan then stamps it at load completion.
21. **Session edge ids are never reissued**, a behaviour change to a published value: the edge
    counter behind `EdgeId` moves from the store to its owner (section 4.2), so after a Clear or a
    replacing import the first edge takes the next counter value instead of `"0"`. Recommendation:
    ship as a fix with a changelog entry; a reissued `EdgeId` silently re-points a selection, an
    event subscriber or a stored reference at a different edge.
22. **Where `ScopeInput` is the published type.** `StartOptions.scope`, `RunSpec.scope`, the
    selection targets that take a scope and `applyCameraView`'s `scope` are widened from `Scope`
    to `ScopeInput` (additive: every `Scope` is a `ScopeInput`). A `Filter`'s `scope` leaf and
    the `{ match: "scope" }` selector stay typed `Scope`, because getters return them and
    documents persist them, and accept a session `EdgeId` at run time only (section 15.2).
    Recommendation: ship as described; widening those two later is additive.
23. **A run over an empty set is refused** with `E_SCOPE_EMPTY` (any scope but `"graph"` and
    `"visible"`), a behaviour change to a published verb: in 2.x such a run completed with an
    empty result. Recommendation: ship with a changelog entry; an empty result reads as a finding.
24. **A set id never issued is refused at every write door**, including `visibility.set` and
    `styles.add`, which in earlier builds of this branch accepted one and matched nothing. A style
    document's layer naming an unknown set is kept, detached. Recommendation: ship as described;
    a typo in a filter otherwise hides everything without a word.
25. **The deprecated `scope.save` refuses an empty `"selection"` or `"visible"`** with
    `E_SCOPE_EMPTY`, matching `createFrom` (item 15 makes the save freeze, so an empty save would
    stay empty). Recommendation: ship with item 15's changelog entry.
26. **Edge members' ends in an undirected graph are stored in canonical order** at the doors
    (section 12.1), so `revision` and `definition.edges` of a set created from a reversed spelling
    differ from what earlier builds of this branch stored. Nothing is released yet, so this only
    fixes what the first release promises.

---

## 16. Migration of today's Scope, ScopeApi and SavedScope

| Today | After |
|---|---|
| `Scope`, every arm | Valid and unchanged in meaning. It gains one arm. |
| `ScopeId` | `= SetId`. Existing ids keep resolving. |
| `session.scope.resolve`, `count` | Unchanged signatures. The resolver and counter for every set reference, bitmap-backed. `ScopeCount` gains optional missing counts. |
| `session.scope.save(name, spec)` | **@deprecated**, pointing at `sets.create`. One `set.create`, created from `user`, same minting (never reissued), same refusals, same return. The spec is copied and frozen. `{ where }` becomes a rule; `{ nodes }` fixed induced; `{ define }` its definition; `"graph"`, `"largest-component"` and `{ set }` a rule with one `scope` leaf; **`"selection"` and `"visible"` are frozen** into a fixed set of their current members (`"visible"` as `listed`, or `induced` with no stored edges when no edge was hidden, the section 4.1 rule), as the studio's migration does. A resolver with no selection attached refuses to save `"selection"` with `E_UNSUPPORTED`: there are no members to keep. This removes the only live-selection rule and the self-reference a live `"visible"` rule would give the filter, and lets one `prepare` serve every door. |
| `session.scope.list()` | **@deprecated**, pointing at `sets.list`. A projection to `SavedScope { id, name, spec, bound }`: one-leaf rules map back to `{ where }`, the keyword or `{ set }`; fixed induced sets to `{ nodes }`, returned in canonical order; anything else to `{ define }`. `bound` is freshness neither `detached` nor `unresolvable`, and at least one member present. |
| `session.scope.remove(id)` | **@deprecated**, pointing at `sets.remove`. |
| `SavedScope` | Kept, as the projection. |
| `selection.promote(name)` | **@deprecated**, pointing at `sets.createFrom("selection")`. It stays synchronous: the selection is already materialised, so it dispatches `set.create` directly. It now keeps the selected edges instead of dropping them (`SelectionApi.ts`, about line 709), with the `createFrom("selection")` reading: induced when nodes are selected, listed for edges alone. |
| `ResolvedScope` | Same shape. `nodes`, `edges` and `digest` lazy; `digest` is `d1:` and computed without strings. |
| `RunScopeRecord` | Gains optional `set` and `reading`. |
| `StaleNote` | Unchanged: scope drift, not read by sets. |
| `SetOp` | Unchanged. |

Deprecation is TSDoc only. Nothing is removed and no removal is scheduled.

---

## 17. The graphty app

The app needs **one change** for this release, and it is consumption, not a workaround. Adding
the `scope` kind to the published `Selector` union broke the app's build:
`StyleLayerPropertiesPanel`'s selector summary fell through `default:` to the `ids` case and read
`selector.nodes`, which a `scope` selector does not have. No element change can prevent that short
of not adding the kind, because any consumer that treats `default:` as one known kind breaks when
a kind is added. The app now names the `ids` case, describes a `scope` selector as "the members of
a set", and shows any kind it does not know as read-only, as an open union asks. A third-party
consumer with the same pattern meets the same compile error, so the release notes must say that
`Selector` gained a kind and is now declared open (section 15.3, items 5 and 6).

Otherwise the app is unaffected:

- It never calls `scope.save`, `scope.list` or `selection.promote`, and never reads `spec.set`.
- Its explore search reads `Extract<Scope, "graph" | "visible">`
  (`graphty/src/components/shell/panel/ExplorePanel.tsx:18`), which is unaffected.
- Scoped runs changing their numbers under an active filter reaches the app as a consumer.

Later app features, all pure consumption of the element: a sets list (`list`, `status`,
`scope.count`, re-read on `set:changed`); "Create set" and "Create path" on the selection; offers
under a result; the inspector's Memberships section (`containing`, which includes partition
items); a path's kind (`pathKind`); "Used by" on a set (`usedBy`); kept sets in the explore scope select. None of these may
compute membership, freshness, offers, walk order, path kind or references in the app.

---

## 18. The owner's six questions

1. **Sets versus JMESPath queries.** Pass sets, not queries. A query is one way to write a rule
   (`where: Query`); a member list is the other. Every API that targets elements takes a `Scope`.
   A copied query stops following its set, and hand-picked sets, paths and kept communities have
   no query. A resolved set is a 2 ns bit test against 1,322 ns per JMESPath call, and a reference
   composes exactly like the rule it names.
2. **Sets versus data sources and joins.** Sets are defined over the one joined graph, never per
   source. Provenance belongs in a `graphty.source` column stamped at import, so "from source B"
   is an ordinary rule and a partition that offers one set per source (section 9).
3. **graph-format snapshots versus data sources.** A source is not its own snapshot. The element
   holds one builder and freezes one snapshot of the whole joined graph per change. Definitions
   store ids and stable edge identities, never row indices, so a re-freeze, a reload or Replace
   data loses nothing; each new snapshot re-resolves through the id map (sections 6.2, 9, 12.3).
4. **How algorithms create sets.** They do not. They publish values, and a result's shape offers
   sets on demand. Using an offer writes nothing. `createFrom` keeps one as a fixed set (or a
   following rule with `follow`), and `createPath` keeps a path in its published order
   (section 8.2).
5. **Sets as algorithm input, and the GPU.** Every run gets the scope applied in declared space:
   the induced subgraph of its nodes, edge-filtered to its edges, then undirected and simplified
   if the algorithm asks. It is built lazily through one accessor, cached as the final derived
   snapshot, reference-counted while a run uses it, and released on the GPU when the last holder
   lets go. CPU and GPU take it like the full graph, with no kernel change. Values outside the
   scope are dropped centrally and read missing. Layouts get the node bitmap as a hold mask. Set
   algebra costs under 0.1 ms (section 10).
6. **What sets mean for scopes.** Scope becomes a role. `Scope` becomes the set reference: every
   current form stays valid, and `{ define }` is added. `ScopeId` is an alias of `SetId`. Saved
   scopes are kept sets under `session.sets`, and the old verbs are deprecated delegations.
   `session.scope` stays as the resolver and counter. The largest component stays a keyword and is
   also offered by the components result (sections 2.2, 8.1, 16).

---

## 19. Where this departs from the design studio drafts

The studio drafts (`design/ui/framework/`) are still under review. Points to carry back:

| Topic | Studio draft | This design | Why |
|---|---|---|---|
| Path | Its own kind, "not a set, accepted wherever a set is"; a start node plus an ordered edge sequence; its kind (Path, Trail, Walk, Cycle) a recorded field | A definition kind of a set, node-first, with step edge groups; the kind is a derived read, `sets.pathKind` | One id space and lifecycle; node-first keeps order when an algorithm used a reciprocal pair or merged parallel edges; a derived kind cannot disagree with the walk. The studio's type row reads `pathKind` |
| Edge readings | Induced / Listed (listed = the edge subgraph) | Agreed on both meanings, plus a third, `clipped`, for rules | The visibility filter's view (nodes, plus edges clipped to them) is neither; the studio should add it as a screen value for rule sets |
| Legacy saved `"visible"` | Frozen to a fixed set, read induced | Frozen, read `listed` (glossary 17, item 1) | Induced would re-add every edge the filter hid; `listed` has exactly the visible members |
| Combination result | Open question | Always fixed; a live combination is written as a rule over `scope` leaves | Fixed never depends on hidden history; edge-first keeps edge differences; a `live` option is additive later |
| `SetCombine` values | `union`, `intersection`, `difference`, `symmetric-difference`; screen verbs map onto them | Agreed | -- |
| One "Created from" or several | Open question | One `createdFrom` listing its operands, as references | One "Created from" row, no copied member lists |
| Threshold | One `threshold` leaf replacing `top` and `above`; populations | Agreed: `threshold` ships `top` and `above`, reserves `percentile`, `z`, `population`; keyed on a value path, not a run | Rank and relative thresholds over attributes and imported score columns, as the style selector `top` already allows |
| Rule leaves | `has`, `threshold`, `text`, `window`; a "Membership" predicate over a set, path or item | The Membership predicate is published as the `scope` and `item` leaves; `has`, `text` and `window` reserved (section 20); "without S" is a rule (section 4.3) | The studio's leaf list should add `scope` and `item` |
| Earlier run | A holding reference keeps reading the earlier run; "Use current" | Agreed: held items are captured before a re-run. Partition groups offer "Carry over to new run", not "Use current" | A group number means nothing in a new run |
| Values after a reload | Kept by retention | Captures of held items are state, persisted with the runs; `values-not-kept` only when the file lacks them | The element keeps no values the file did not carry |
| Earlier run in a scope | A scope may read an earlier run of the result being computed | Agreed: only references that follow the current execution are cycle edges | -- |
| Cannot re-run | Inputs changed but it cannot be recomputed | Agreed: an unregistered algorithm reads `current` with `missing-capability` until an input changes | -- |
| Freshness | `current`, `out-of-date`, `cannot-rerun`, `detached` | Agreed, plus `unresolvable` | `detached` keeps the studio's meaning (a referent was removed; verb Restore). A cycle, a failed compile or a missing capability removed nothing, so "Restore" would misstate it; the studio should give `unresolvable` its own screen word and verbs (Edit rule, Update graphty-element) |
| "Out of date" | A declared input changed | Agreed; `Run.stale` (scope drift) is not read | -- |
| Detached | A stored field; a detached dependent keeps its last values | Derived from the absent referent; resolves to nothing | Keeping last values would last only until the next freeze, so behaviour would depend on timing; storing detached needs a write from every removal |
| Restore set | From the kept record, forever | Tombstone records in a bounded store, oldest dropped first; `sets.restore` reserved | Bounded file size |
| Delete verb | `session.sets.delete()` | `remove` | Matches the published `scope.remove` and every other removal verb on the session |
| Edge identity | File id when it has one, else (source, target, key), key being the file's key field or else the ordinal; the source column joins after Add data | `EdgeMember` with `id`, `key` (reserved) or `ordinal` plus `among`, counted over every edge of the pair per load; `dataSource` reserved | Agreed in substance. Only a configured `edgeIdPath` counts as a file id, and the import report says when edges have none; probing files for ids would change existing loads' merge behaviour. Because the ordinal counts every edge, a later probe or path never moves it. Until `dataSource`, two loads that give one pair the same ordinal read ambiguous |
| Data forks | "Earlier data" after Replace data, a published data version | Reads as "Earlier run" until the element has data versions. The element's per-field attribute counter is called the attribute revision, not the data version | Nothing in the element records which data a run saw; a data version is its own design |
| Create set on a selection | Stores what was selected, reads induced when it holds nodes, listed for edges alone | Agreed | An earlier draft read listed whenever one edge was selected; one stray edge would then change every density and scoped run. The type row's toggle recovers a traced tree |
| Layouts | Settings on the graph, a set or a partition; a layout run over a frozen scope, the filtered graph by default; any layout writes only its scope's positions | A scope frozen when each layout starts, like a run; the whole graph by default; only simulation engines (`scoped`) accept one; one element-wide scope | Frozen matches the studio. The whole-graph default is 2.x behaviour and changing it breaks consumers. Where a static layout places a subset needs a placement design. Per-set settings are deferred (section 20) |
| Provenance by source | "From source B" is an ordinary rule over a per-row source column | Agreed as the shape; the `graphty.source` column is not stamped in this release unless the owner decides otherwise (section 15.3 item 20) | What counts as a source (a file, a query, a re-import of the same file) is the Add data work's decision, and the column name is published the moment it is stamped. Until then "from source B" is not expressible; `EdgeMember.dataSource` is reserved so stored members keep matching when it arrives |
| Session-added edges | Ids graphty-element creates come from a reserved namespace and are written to the file | Agreed: `graphty:e<n>`; ordinals cover only file edges | -- |
| Rule persists count and digest | Open question | No | Wrong after any data change |
| `{ set: SetDefinition \| SetId }` | The studio's spelling | `{ set: SetId }` unchanged, plus `{ define }` | Widening an existing field breaks readers |
| Rule body key | `where` | Agreed: `where: Query \| Filter` | -- |
| Rule tree name, `neighborhood.seeds`, `FilterDirection` | `RuleTree`, `nodes`, `SelectionDirection` | `Filter`, `seeds`, `FilterDirection`, as published in 2.x | Already published; an alias can come any time |
| Rule scope | `scope?` | `within?`, reserved; absent always means the full graph | Avoids confusion with the `scope` leaf |
| Item address | `ItemAddress` (graph, result, run, level, item key) | `ResultItem { run, key, execution? }`, open `ItemKey` | Same content; `run` holds the studio's result id, `execution` the studio's run id; `graph` and `level` add as optional fields |
| Follow mode for groups | A reference to one item holds its run | Agreed: refused for partition groups | -- |
| Create set / Create path | Two verbs | Agreed: `createFrom` always fixed unless `follow`, `createPath` separate | -- |
| Memberships | Kept sets plus groups | Agreed: `containing` returns both | -- |
| One grammar for Selector, SelectionTarget, Filter, Scope | All accept one set definition | Each grammar gains a `scope` form; `SelectionTarget` and `Selector` keep their own `top` | Adding a form is additive; replacing grammars is not |
| Resolver export | `snapshot` | Not published; export deferred to an element verb | The snapshot carries no attributes |
| Fixed-set storage | Sorted typed columns | Sorted typed arrays in memory for edges; the logical record fixes no encoding | The codec may store member arrays as typed columns |
| Old names | Removed in one scheduled major | Deprecated in TSDoc, nothing scheduled | Owner's decision |
| `SetOp` renamed `SelectionOp` | Settled | Not done now | An alias can come any time |
| Per-slice events (undo design) | Rejected | `set:changed`, from the committed diff at seal | Sets are listed like layers; master has no other signal |

---

## 20. Future uses

| Use | Built now | Kept possible through |
|---|---|---|
| Kept sets, readings, created from, status, algebra, offers, memberships, "Used by" | Yes | -- |
| Ordered filter steps and working sets | The `scope` leaf; cycles through the filter refused | `session.visibility.steps`, each step holding a `Scope`; a step reading its predecessor names it explicitly |
| The rule scope | A context snapshot inside the resolver (the full graph today) | Optional `within?: Scope` on the rule; topology leaves and `top` read the within-set's derived subgraph |
| Search graph | -- | A `"search"` keyword, already refused inside the filter |
| `has` and `text` leaves | -- | `{ kind: "has" }` (replacing `Selector { match: "has" }`) and `{ kind: "text" }` (replacing `SelectionTarget { text }`), additive to the open `Filter` |
| File parallel-edge keys | `EdgeMember.key` reserved | A key-path data setting; the element then writes `key` |
| Population-scoped runs | Central mask-back; the name `scopeAs`; masks on `ScopedInput` | `scopeAs: "population"` |
| Relative thresholds and grouped ranking | `threshold` leaf | Its reserved `percentile`, `z`, `population` ("each group of" a partition) |
| Incident edges and the cut | -- | An `"incident"` `EdgeReading` (the nodes plus every touching edge) and a `{ kind: "boundary", scope }` leaf (edges with exactly one end in the set), both additive to open unions |
| Time windows | -- | A `window` filter leaf |
| Item comparisons ("within k hops", "the k-core") | Array containment | An optional `op` (`eq`, `le`, `ge`) on `ItemKey`; cumulative level offers; a k-core offer from a k-shell result |
| Keyed items (a component by smallest node, a path by edges, a match) | Open `ItemKey` | `{ smallestNode }`, `{ edges }`, `{ binds }`; `{ kind: "component", containing }` |
| A whole partition as an input (shell layout rings, bipartite sides) | -- | `ResultField { run, field, execution? }`; `node-set` options accept a `Scope`, `partition` options a `ResultField` |
| Carrying groups across re-runs | `earlierRuns`, captured members | "Carry over to new run": a rebind by overlap |
| Extending a path one hop | `set.redefine` | `sets.extendPath(id, edge)` |
| Merge nodes | -- | Fixed, path and item ids resolved through the forwarding map, as a hook inside the resolver |
| Restoring a removed set | Tombstones keep the record | `sets.restore(id)` |
| Attribution | -- | An optional `by?: { kind: "assistant" } \| { kind: "plugin"; name }` create option recorded on `createdFrom` |
| Carrying resolutions across a freeze | Resolutions tagged with snapshot serial and store instance; the freeze benchmark row | Built when that row is measured worse than its projection and the owner asks for it. Carry only when the store is the same, the report's predecessor is the tagged snapshot and no report was skipped; then remap the bitmaps and evaluate element-local leaves only on appended or changed rows |
| Dirty-row rule re-evaluation | Per-field attribute revisions | Re-evaluate element-local leaves on the rows an attribute write touched |
| Members in undo history as an op-log | Whole values | A `sets/<id>/members` sub-key with add and remove primitives, agreed with the undo branch |
| Export | -- | An element export verb taking a `Scope`, attaching attribute and result columns |
| Provenance by source | `EdgeMember.dataSource` reserved | A `graphty.source` column stamped at import |
| Comparison (Jaccard, overlap) | Bitmaps | `sets.compare(a, b)` |
| Faster scoped simulation | Hold mask | Simulate members plus a one-hop boundary held fixed |
| A scoped simulation sized to its neighbourhood | Held rows are left out of the envelope fit | Fit the members inside the extent of the held nodes they touch |
| Static layouts over a set | Refused | A placement design, then the induced subgraph |
| Layout settings kept per set | -- | A map keyed by `SetId` in view state |
| Collapse and combos | Stable ids | View state `collapsed: SetId[]`; graph-format `contract` |
| Neighbourhood of a set | `neighborhood.seeds` | Optional `of?: Scope`, `direction`, `depth: "all"` |
| "Within each group" | -- | An `{ each: ... }` scope form |
| A list of scopes as a run form (each item of a result, without each item, windows, null-model samples) | -- | A run option taking `readonly Scope[]` or a generator form beside `{ each }`, one run record per scope |
| Groups of a categorical attribute as offers and Memberships | `categories` rules | `sets.offers` over an attribute, and an optional attribute-groups field on the open `Memberships` |
| Live combinations | Rules over `scope` leaves via `sets.create` | `combine(..., { live: true })`, and an optional leaf field that makes an induced operand speak its edges |
| External codec reading newer files | Internal load mode | A `mode` option on `parseSetDefinition` |
| Cross-session digests | `d1:` within a session and store | A `d2:` over stable identities, for notes that cite a set |
| The object selection; a selection that remembers its query | -- | `session.selection.object`; `via?: SelectionTarget` on the selection `createdFrom` |
| Metadata (description, colour hint) | -- | Optional `meta` and a `set.meta` op |
| Assistant commands | `parseSetDefinition` | `ai/commands/SetCommands.ts` |
| Plugin rule leaves | Unknown leaves round-trip opaquely; the colon rule | A leaf registry keyed on `<package>:<kind>` |
| GPU kernels with an alive mask | Masks on `ScopedInput` | `scopeInput: "mask"` and an optional mask parameter per kernel |
| Two graphs in one project | -- | An optional `graph` field on the record, `ResultItem` and `{ set }` |
| Library across projects | Namespaced ids | A `library` `createdFrom`; imported ids become `set_<ns>.<rest>`, so no reference or run id is rewritten |
| Membership inside JMESPath | -- | A `sets` query root; the name is reserved |
| Undo | Store, prepare, five operations | A rename onto the dispatcher (section 13.4) |
| Project file | Persisted form, validator | The codec |

---

## 21. Deliberately not built, and why

- **A project file writer.** No project file exists.
- **An export verb and a published subgraph.** The snapshot carries no attributes.
- **`within`, filter steps, working sets, `"search"`.** They need the studio's filter-step design.
- **The `population` meaning of a scoped run.** Reserved; built on the central mask-back.
- **`meta`, `restore`, `compare`, `ResultField`, item `op`, `extendPath`, attribution, a file
  key reader.** Nothing needs them yet; each is additive.
- **A separate `set.reading` operation.** A reading-only redefine shares the frozen member arrays,
  so history copies nothing.
- **Carrying resolutions across a freeze, and dirty-row re-evaluation.** Re-resolving costs about
  130 ms per fixed set and about 1.3 s per expression rule at 1M / 10M on every freeze, time-sliced
  behind the repaint. The carry is a second resolution path with a lineage check that is easy to
  get wrong, so it is built only when the freeze row (section 6.5) is measured worse than its
  projection and the owner asks for it.
- **A live `combine`, and published load mode.** Nothing in this release needs either, and each is
  an optional member to add later.
- **Random id suffixes.** The register gives uniqueness and keeps run ids deterministic.
- **New error codes and a `{ kind: "set" }` error target.** Existing codes carry the same
  information.
- **Static layouts over a set.** Where the subset lands is an unanswered design question.
- **Moving visibility and selection to packed bits.** Converting at the boundary is one pass.
- **Offers from `pair-list`, metric and temporal shapes.** Section 8.2 gives the reasons.

---

## 22. Risks

1. **Honouring scope changes published numbers.** Mitigation: a changelog entry, and the run's
   caveat stating the subgraph size.
2. **Result mapping is the largest implementation risk.** A dozen adapters read the graph directly
   (section 10.1), and an edge result maps through a chain of derivations. Mitigation: one input
   accessor, a build test forbidding direct reads, central mask-back, and a scoped-run test per
   algorithm. Among them: an edge-weight filter leaves isolated nodes, connected components runs
   over `"visible"`, and each isolate must be its own component; a reciprocal pair whose halves
   carry weights 0.1 and 0.9, with only the 0.9 half in scope, where the undirected run must see
   only 0.9; and a node option outside the scope, which must refuse.
3. **Two memberships for one tree** would silently break every filter-to-set move. Mitigation: the
   identity and composition tests (section 4.3), and a property test that `combine` and the
   equivalent rule over `scope` leaves resolve to identical bitmaps for every op when the
   operands are all induced or all listed (section 7).
4. **Reissued or misbound identity values** would re-attach references to the wrong object.
   Mitigation: tests that remove a set a layer names and create one of the same name (the layer
   stays detached); that replace the graph with a different one of identical node and edge counts
   (a kept fixed set's members read missing); that run a replacing import of the same file (edge
   members rebind by stable identity); the parallel-edge tests of section 12.3; two concurrent
   `createFrom` calls with one name (section 13.3); that save and reload (every set's revision matches its run
   records and no scoped run reads out of date); and that rerun after an undo (a held execution
   does not read current).
5. **The persisted form is contract once a file exists.** Mitigation: section 12 in one place,
   golden revision tests, and a round-trip test that loads a record with an unknown leaf, a known
   leaf carrying an unknown field (`ItemKey.op`) and an unknown top-level `meta`, keeps each with
   `missing-capability` where it applies, renames it, and writes the record back value-identical
   with `meta` intact; `redefine` of it refuses with `opaque-content`.
6. **GPU memory.** Derived snapshots stay resident until released, and releasing one in use
   corrupts a run. Mitigation: reference counts, release on the last holder, and the device-bytes
   tests with overlapping runs and a mid-run freeze.
7. **Cache keys.** Too coarse invalidates everything on a label edit; too narrow serves stale
   members after an attribute edit or a re-run. Mitigation: the plan audits every cache (signature
   memo, resolution, summary, digest, derived input, offer edge counts) against its full input list
   in one table; per-record identity, per-field attribute revisions and the input tick, each with
   a test; snapshot serials (never objects) in keys.
8. **Cycles** through the visibility filter. Mitigation: refusal at `visibility.set`, and a test
   that creates the cycle by undoing a filter removal or by a later redefine.
9. **Nothing may throw inside a pass.** A test removes a set that a layer and a filter name, and
   lets a `component` rule go out of range.
10. **The open-union promise has to ship with the types**, and `{ define }` breaks exhaustive
    switches. Mitigation: the declaration, a changelog entry, and the load-mode validator, without
    which an optional field added later is additive in the types but not in stored data.
11. **Merge with the undo branch.** Kept small by putting storage in `session/sets/` and turning the
    old verbs into delegations (section 13.4).
12. **The studio drafts are still moving.** Names that follow them must be checked against the
    final glossary before release (section 19).

---

## 23. Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Per-leaf node and edge "lanes" for rules | A second meaning for the published `Filter` tree; breaks weighted thresholding and the filter-to-set identity |
| A `scope` leaf that always speaks edges | Changes the edges shown when an inline rule is swapped for a reference to the same set |
| Clipping in listed set algebra | Discards the edge differences users compare (two spanning trees share every node) |
| `listed` meaning the clipped reading | Contradicts the studio's word; paths and edge sets would need a fourth name |
| Separate `top` and `above` leaves | Two doors the studio retires in favour of one `threshold` |
| `RunRef` in stored leaves | A live handle cannot be cloned, hashed or persisted |
| Widen `{ set: ScopeId }` to take a definition | Breaks every reader of `spec.set` as a string |
| Several new `Scope` arms (`rule`, `combine`, `item`) | Each is a door; `{ define }` covers all |
| Offers as JMESPath text | 1,322 ns per element, hides its run, cannot hold an execution |
| The rule-first model (combinations live by default) | Contradicts "Create set is always fixed" |
| An edge-first path definition (`start` plus edges) | Fails whenever an algorithm marks a reciprocal pair or a parallel group |
| Reserve the path kind | A path kept as a flat set loses its order |
| Path kind as a stored field | Can disagree with the walk after a redefine; derived costs nothing |
| An ordinal computed at persist time, or from the current graph | Deleting a sibling would change a frozen record and its revision with no set write |
| An ordinal over id-less edges only, or across loads | Configuring `edgeIdPath` later would orphan every stored ordinal; counting across loads makes `among` disagree with the ordinal |
| Ordinals for edges added in the session | Delete-then-add on a pair would reuse an ordinal and bind a different edge after a reload |
| A per-leaf opaque unit on load | A leaf read as empty under `not` resolves to wrong members; needs a partial-evaluation rule per node type |
| The layout scope on the web component | The assistant command and the default layout call `Graph.setLayout` directly and would drop it |
| A layout hold that follows its scope live | A click or a filter change would move the hold of a running simulation; the studio records a layout over a frozen scope |
| Reading a selection as listed when one edge is selected | One stray edge changes every density and scoped run over the set |
| Hashing edge members from their data objects at digest time | 10M property walks and string hashes; seconds at 10M edges |
| `origin` as the record field | Collides with the published `AttributeDescriptor.origin`, which has its own `"result"` value |
| A threshold keyed on a run | Cannot express "top 10 by `data.revenue`"; making `run` optional later breaks readers |
| Ignoring unknown fields on load | An older element evaluates a newer field's rule silently wrong and drops it on save |
| Revision, set id or execution as a per-object counter | Repeats after undo or reload |
| Edge members keyed on the session counter | The counter restarts every session; every edge member would read missing after a reload |
| Storing induced edges in a fixed set | 10M edge objects for one `createFrom("largest-component")` |
| Carrying bitmaps on every freeze report | Binds a set to the wrong rows after a replacing import of equal size |
| Random set id suffixes | The register gives uniqueness; run ids stay deterministic |
| A global `setsRevision()` in every signature | Any write, even a rename, invalidates every resolution; undo always misses |
| One global attribute version | A label edit re-resolves every rule on any field |
| Digest over id strings, or `BigInt` sums | Builds 500,000 strings, or costs about 100 ns per add, on the run hot path |
| Entry-count cache bound | 64 entries could hold gigabytes once id sets attach |
| A synchronous `sets.count` beside `scope.count` | Two ways to count, and a synchronous resolve that cannot move to a worker |
| `session.scope.subgraph` for export | No attributes travel with the snapshot |
| Writing the scope hold into the pin lane | Leaks into persisted pins and exports |
| A required `scoped` on the authored layout descriptor | Breaks every third-party layout registration at compile time |
| Mask input for every algorithm | Needs a change to every CPU and GPU kernel |
| Undirect, then induce | Hands a thresholded run a hidden edge's weight |
| Induce after simplification | Simplifies the full graph even for a 1% set |
| Per-source sets or snapshots | One builder; a cross-source edge would belong to neither |
| Keep resolutions as `Set`s of ids | 416 ms and 82 MB against 85 ms and 0.75 MB |
| Captures of held items as a cache | Undo of a layer removal and a save and reload would change what is painted |
| Synchronous materialising doors | Would fix rule evaluation on the main thread forever |
| A live saved `"selection"` or `"visible"` | Changes on every click; `"visible"` in the filter is a cycle |
| Deleting a set cascades to its layers | One operation writing two slices; not needed now |
