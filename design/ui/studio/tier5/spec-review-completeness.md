# Selection groups spec: completeness review

Reviewed: `design/ui/selection-groups/spec.md` at 0679ce250c. I walked every value kind, every
structural condition and the landing-page hover recipe through both hosts (the style selector and
the import filter), and checked each one against graphty-element's code at the same commit. The
list below holds only problems confirmed in the spec text and in the code. Paths are relative to
the worktree.

Severity: **blocker** means an acceptance check cannot pass as the spec is written. **major**
means a listed behavior has no rule form, or two sections of the spec contradict each other.
**minor** means a gap in wording or a value that is wrong.

## Blockers

### B1. "while <reference> has nodes" has no rule form

- Evidence: section 7 lists the preset, and hover layers 1 and 2 (acceptance 14) depend on it.
  Section 10 adds the `groups`, `measure` and `threshold.from` forms and the two new Scope forms,
  but no leaf that tests whether a scope is empty. `RuleTree` (`graphty-element/src/catalog/types.ts`
  1971-2080) has no such leaf either. `member` tests membership, not emptiness.
- Fix: add to section 10 a leaf `{ kind: "nonempty", of: Scope }` (`@beta`). It speaks both halves:
  everything when the scope holds a node, nothing otherwise.

### B2. An empty "Hovered or selected" reads as pending, so the hover recipe breaks at rest

- Evidence: section 1 makes a step with "no reference" pending, and a pending step makes its group
  pending. When nothing is hovered or selected, `"focus"` is empty, so layer 1's Except "within 1
  hop of Hovered or selected" is pending. That happens even though the Keep above it already left
  nothing in the group. The spec never says what a pending selector paints outside the editor. The
  dashed outline belongs to the editor preview. At rest the layer could keep painting the last
  hover. Separately, BFS's `source` is optional and "uses first node if not set"
  (`graphty-element/src/algorithms/BFSAlgorithm.ts` 70-75). If an empty scope binds to it as
  unset, the step silently runs from node 0.
- Fix: (a) separate "reference not chosen" (pending, `no-reference`) from "reference chosen but
  empty now" (an applied empty set). (b) Make a step whose input is already empty pass none
  without waiting on its own readiness. (c) Make a selector that is pending at rest paint
  nothing, and add a test for it. (d) Make an empty scope bound to a `node-id` option never read
  as unset: the step passes none.

### B3. "Community of Valjean" and "shares a value with" have no rule form

- Evidence: acceptance 2 (B: Add community of Valjean), section 5 (unstable group ids saved as
  "the group of X") and section 7 ("shares a value with", "connected to") all need a leaf. The
  leaf must match the elements whose field equals a reference node's value, and it must follow
  that node across re-runs. Section 10 adds none. `ItemKey` has only `{ field, value }`, and the
  forms `smallestNode` and `op` are reserved and refused (`graphty-element/src/catalog/sets/parse.ts`
  36-50). `categories` stores literal ids, which are exactly the unstable values the spec says
  must never be saved.
- Fix: add to section 10 a leaf `{ kind: "same-value", path, as: Scope }`, or the `ItemKey` form
  `{ field, containing: NodeId | Scope }`. Say which preset compiles to it ("shares a value
  with", "connected to" over components) and how "the group of X" is stored.

### B4. The filter's Results section lists runs made on the filtered picture

- Evidence: section 2 says the import filter reads only runs on the full graph, because reading
  the filtered picture is circular. Section 4 lists "fields of existing runs" for both hosts, and
  acceptance 7 requires both pickers to list the same entries. Runs default to the visible graph
  (`StartOptions.scope`, "Defaults to the visible graph", `graphty-element/src/session/runs/types.ts`
  463-466), so every Analyze run is a visible-scoped run that the filter must not read.
- Fix: in the filter, list visible-scoped runs greyed with a reason code (`circular-scope`). On
  commit, either offer the same algorithm with the same settings on the full graph or exclude the
  run. Reword acceptance 7 as "same entries, same order; states may differ by host". Put the
  scope in the run's title so the two Louvain runs ("on the full graph", "on the drawn graph")
  can be told apart.

## Major

### M1. Most Relative to presets map to no leaf or algorithm

- Evidence: section 7 lists eleven presets "over an algorithm field or rule leaf" but never says
  which leaf or algorithm each one compiles to. Checked against the code:
    - "within k hops of": the `neighborhood` leaf takes `seeds: NodeId[]`, not a Scope (types.ts
      2007). Section 10.2 extends only option values. Going through BFS instead allows one node
      only, so "Selected (3)" is pending. Each hover would also be a new run, listed in Analyze
      (section 6). Whether the reference itself counts (hop 0) is not said.
    - "downstream of / upstream of": BFS is undirected only (BFSAlgorithm.ts 133-141), and
      `neighborhood` has no direction. Nothing computes these.
    - "linked to at least N of": no leaf and no algorithm.
    - "edges leaving": needs `all(member incident, not(member clipped))`. It is expressible, but
      the spec does not say so.
- Fix: add a table that maps each preset to its rule. Extend `neighborhood` additively with
  `seeds?: Scope` (or `of: Scope`) and `direction?: SelectionDirection`. That covers "within k",
  "downstream" and "upstream" with no run and keeps hover cheap. Add `{ kind: "linked", of: Scope,
min: number }`. Otherwise move "linked to at least N of", "downstream" and "upstream" to "Not in
  this build".

### M2. The `groups` leaf cannot say which host's "whole graph" it means

- Evidence: `computedOn: "whole"` means the drawn graph in the style host and everything loaded in
  the filter (section 2). The same goes for count denominators ("24 of 77") and position
  populations. The leaf has no member that says which, and `countSteps(rule)` takes only the rule.
  Today a `threshold` ranks over the whole snapshot (`compileThreshold` uses `graph.nodeCount`,
  `graphty-element/src/session/visibility/filter.ts` 1552). So in a style layer, "top 10 by age"
  ranks hidden nodes too, and draws fewer than 10.
- Fix: add `whole?: Scope` to the `groups` leaf (the style host writes `"visible"`, the filter
  writes `"graph"`, absent means `"graph"`). Have every population, position and denominator
  inside the leaf read it, and let `countSteps` and `histogram` take it.

### M3. Sides and silence inside a group are undefined

- Evidence: `RuleTree` leaves speak nodes, edges or both and are silent about the rest (types.ts
  1959-1969). The spec does not say:
    - which half "Start with All / None" speaks;
    - what Add, Keep and Except do with a step that is silent on the group's side (for example
      a `degree` step in an edge-side group);
    - how a node step reading an edge value is read (`nodes: all | ends | none`) for each verb;
    - how an edge step reading a node value ("Nodes (edge ends)") is read.

    `ReadableValue.end` is one end only (types.ts 1820-1830), so "either end" or "both ends" needs
    an `any` or `all` over the two ends, which the spec leaves out. Mock J set per-verb defaults
    (Add and Keep: nodes touching; Except: edges only), and the spec dropped them.

- Fix: add `side: "nodes" | "edges"` to each group. A silent step is the identity for Keep and
  Except and adds nothing for Add. Restore mock J's per-verb defaults and the both-ends or
  either-end chip, and say which `nodes` reading each default writes.

### M4. "By position" and "By size" have no rule form for several kinds

- Evidence:
    - **time, By position**: `threshold` takes finite numbers only, with no `as: "time"`
      (filter.ts 1531-1562; types.ts 2030-2045). An ISO date column has nothing in its population.
    - **ordered, named levels, By position and By value**: `range` and `threshold` compare
      numbers, and no leaf reads a declared `order`.
    - **category, By size, By position** (largest N groups): `threshold top N` on `groupSize`
      counts elements, not groups. Mock J's `sizeRank` was dropped from section 10.
    - **category, By size, for a data column**: no `groupSize` exists for a data column.
- Fix: add `threshold.as?: "time"`, and an ordinal reading (`range` over the declared order, as
  `as: "order"`). Add `sizeRank` as a field derived from the shape, or `threshold.population:
"groups"`, and say it applies to data columns too. Or drop those segments from the section 5
  table in this build.

### M5. The tags kind has no test the element can run

- Evidence: the `categories` leaf compares a scalar's text (`inCategories`, filter.ts 1071-1077),
  so an array value never matches. `ATTRIBUTE_TYPES` has no array type (types.ts 346), and no
  built-in field is tags-valued. Section 5 offers Any and All.
- Fix: say that `categories` on an array value means "contains any", and add `match?: "any" |
"all"` (or write All as `all` of single-value leaves). Otherwise list tags under "Not in this
  build" until a tags-valued field exists.

### M6. A step's input cannot be named outside the rule

- Evidence: the category checklist counts "members in the step's input" (section 5), and the
  histogram covers the computed-on set. `"so-far"` is only valid inside a `groups` step and is
  `E_BAD_RULE` elsewhere (10.2), so `histogram(path, { within })` (10.6) cannot be pointed at step
  N's input.
- Fix: add a Scope form `{ step: { rule: <groups leaf>, group: id, step: id } }`, or have
  `countSteps` return each step's input as a handle that `histogram` accepts.

### M7. Who starts a card's run, and what happens when it goes away

- Evidence: section 6 says picking an unrun field starts "the ordinary run Analyze makes", listed
  in Analyze. Section 10.3 says the `measure` leaf starts and caches the run, but "only where no
  existing leaf reads the value". Section 10 forbids the app from sequencing a run. So either the
  app calls `runs.start` and writes `range` on `results.<id>`, which is forbidden, or the saved form
  changes depending on whether the run exists. Nothing says what a step becomes when the run it
  reads is removed in Analyze, or whether a focus-driven run (one per hovered node) gets an undo
  step or an Analyze row.
- Fix: every algorithm step saves as `measure` (stable whatever runs exist). The element resolves
  it to the matching session run, starting one listed in Analyze on commit if none exists.
  Removing that run in Analyze makes the step pending (`run-needed`). Runs bound to focus or so
  far are cache-only: not listed, no undo step.

### M8. Structural conditions cannot be picked

- Evidence: section 4's picker has Data, Results, Analyze categories, Added and Relative to. It has
  no place for largest component, a given component, isolated nodes, self-loops or repeated edges.
  All of these are existing leaves (types.ts 2003-2018), and today's filter "+" offers Largest
  component. Today's Largest-component and Neighbors cards
  (`graphty/src/workspace/data-place/filterCards.ts` 112-154) convert (acceptance 6) into steps
  whose value, test and row the spec never describes.
- Fix: add a Structure section (or presets) after Relative to: In the largest component, Isolated,
  Self-loops (edge side), Repeated edges (edge side). Say how a converted `member largest-component`
  step and a `neighborhood` step render (value, short test, card).

### M9. Pending outlines and the table's Group column need element output that section 10 lacks

- Evidence: section 1 draws a pending group's last ready result as a dashed outline. The input to
  `styles.preview` (10.7) has no pending or outline member, and the app may not paint. The table's
  Group column (section 8) needs each row's first matching group. `countSteps` returns counts, so
  the app would have to resolve each group and work out "first group wins" itself, which is a
  workaround.
- Fix: add `pending?: boolean` (draw outlined) per preview group, and a per-element group reading
  (for example `scope.groupOf(rule): ReadonlyMap<NodeId|EdgeId, groupId>`, or a table column the
  element publishes).

### M10. Degree's source is undefined, and its path is refused

- Evidence: section 4 says "Degree is always listed" under the Analyze categories, and acceptance
  1 brushes degree By position. `graphty.degree` is not an allowed root for `threshold` or for a
  `range` at a door (`checkRoot`, `graphty-element/src/catalog/sets/parse.ts` 317 and 385-391). The
  `degree` leaf takes only min and max. So By position needs a Degree run (an extra Analyze row
  each time) or a root extension that is not in section 10.
- Fix: allow `graphty.degree`, `graphty.inDegree` and `graphty.outDegree` as paths for
  `threshold`, `range` and `histogram` (additive). List Degree under Data on the node side, with
  no run.

## Minor

- **m1. The hover recipe's values do not match the landing page.** The spec gives node opacity
  0.25. `graphty/src/workspace/start/HeroGraph.tsx` 189-190 uses 0.3. Layer 3 sets a color,
  opacity 1 and width x1.25, not just "a dark color". Acceptance 14 compares pictures, so give
  the exact values.
- **m2. Algorithms with nothing to pick have no stated entry.** `pair-list` (link prediction),
  `temporal` and `fact` have no per-element fields (`graphty-element/src/session/results/types.ts`
  483-512). State their entry: absent, or greyed with a code. Hierarchical clustering and
  Girvan-Newman publish `community` (shape at line 110 of `HierarchicalClusteringAlgorithm.ts`,
  175 of `GirvanNewmanAlgorithm.ts`), so in this build they are plain categories with the cut in
  Settings. Say so, since "hierarchy cuts" are excluded.
- **m3. `percentile` is reserved and refused** (parse.ts 45). Section 10.4 should say this build
  implements it, including its tie rule for "%".
- **m4. Group colors are not stable.** "Next color" for uncolored groups does not say whether
  deleting or reordering recolors the other groups. Write the resolved color into the group on
  creation. The palette should also be an element option with a neutral default ("offers
  choices").
- **m5. "Save as set" does not say whether live references freeze.** It applies to Hovered or
  selected, Selected and So far. Mock J froze them. Say so.
- **m6. The mock J path is ambiguous.** `j-framework/design.md` is at
  `tmp/query-ui-research/j-framework/design.md` in the main checkout, not under `interactive/`.
