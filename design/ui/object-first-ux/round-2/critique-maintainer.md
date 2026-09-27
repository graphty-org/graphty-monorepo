# Round 2 critique: the graphty-element maintainer and the weekly analyst read revision.md

This checks `design/ui/object-first-ux/round-2/revision.md` (and the twelve screen specs in
`round-2/screens.md` beside it) against graphty-element as it stands on master today. Two
readers: the maintainer of graphty-element, who asks "is there an API for this row, or is it a
named gap, and does the design keep the three styling rules"; and the weekly analyst, who asks
"does this let me do a week's work without the design lying to me". Every claim about the element
below was checked against source under `graphty-element/src/`, `graph-io/src/` and
`graphty-element/test/`, and the file is named where it matters.

Terms used here, defined once: a **layer** is one styling rule in the element's style stack (a
selector saying which elements, plus the channel values it writes; later layers win per channel).
A **scope** is "which elements a piece of work may look at" (`Scope` in
`graphty-element/src/catalog/types.ts`). A **filter** is what hides elements
(`Filter` in `graphty-element/src/session/visibility/filter.ts`). A **time window** is the second
thing that hides elements (`TimeWindow`, same file). A **run** is one execution of an algorithm,
a filter pass or a style edit, kept with a status and a result. A **highlight** is the element's
verb for "paint the elements a run chose" (`session.styles.highlight`). A **saved scope** is a
scope stored under a name (`session.scope.save`), the element's nearest thing today to a named
set. `#NNN` is an open issue in graphty-org/graphty-monorepo.

The decisions the owner settled (the element owns the tree; one set vocabulary; highlights are
not exclusive) are taken as given and not re-argued.

## 1. Verdict in ten lines

1. The frame (no rail, one bottom dock, tabs per kind, a labelled toolbar) is sound and every
   list it draws is a catalogue or a session call. No app-side computation over nodes and edges
   is asked for. That is the single most important property and the revision holds it.
2. The timeline does NOT match the element's temporal model in three places: the window treats
   an element with no time value as visible (so an edge-only time column hides no nodes, and
   screen 10's "412 of 1,204 showing" cannot happen); a rule Set's count does not tick under a
   window because filters read whole-graph degree; and GEXF's start/end/spells intervals have no
   home in a single-instant window (section 6 below).
3. Several stacked paths work with the layer model, provided the highlight verb is used as a
   plain layer verb (or bypassed for `styles.add` with the same generated selector). The
   per-channel rule the revision describes is exactly the repaint's rule. One correction: the
   generated selector must be the value test `== true`, never a presence test, or a route paints
   its whole neighbourhood (section 5).
4. The styling rules hold: every paint row is a layer on an object; "Dim the rest" is a reader's
   linked Set, not a suggested style; the suggested first paint is scoped to the run's result.
   One rule is bent: the "Look" preset (Canvas > Look) is a template applied over a populated
   tree, and the revision's own note L says why that must be restricted (5.6 says medium work;
   it is the one style operation that can overwrite object rows).
5. About a third of the "today" status words in section 3 are optimistic. Six rows marked
   "today" depend on a gap (section 3 below has the corrected table).
6. Three inspector tabs are drawn from APIs that do not exist: a node's Connections tab (there
   is no neighbours read on `session.data`), the Dataset's and a Group's "reading" sentence (only
   a run result has `reading()`), and a Set's "Findings" (density, diameter on a Set).
7. The objects API is presumed to nest layers ("a child layer above its parent") but the stack is
   flat (`Layer` in `graphty-element/src/session/styles/Layer.ts` has no parent). Fine as long as
   the objects API owns the order; the revision should say that tree order is projected onto a
   flat stack and that a Group's override is inserted directly above its Grouping's layer.
8. Undo is unowned. Now that the element owns the tree, "Ctrl+Z after a creation removes the row
   and cancels its run" must be an objects-API verb or the app is holding graph state (the
   element's own design says the undo stack is the consumer's; that was written when the tree
   was the app's).
9. Twenty-nine inventory capabilities are still unplaced (section 8, every one by name). Most are
   settings; four are things a reader will meet in week one: layout recommendation, load
   progress and cancel, "show hidden faintly" (`visibility.showContext`), and the element's
   own refused-painting event (`style:problem`).
10. Nothing here blocks drawing the twelve screens. Screens 10 (timeline) and 9 (the table) need
    the corrections in sections 6 and 2 before they are drawn, or they will draw a state the
    element cannot produce.

## 2. The inspector, row by row: API today or named gap

Section 2.4 of the revision lists every row per kind. This table names the API behind each row
group, and the gap where there is none. "today" means the call exists on `session` and returns
what the row needs; "gap" means nothing on the element answers it and the issue number, when one
exists, is given.

### 2.1 Dataset

| Rows                                                                                                                   | Backed by                                                                                                                                                                                 | Verdict                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nodes, Edges, Direction "(from file)", Density, Mean links, Parts, Weighted, Self-loops                                | `session.data.statistics()` (`GraphStatistics`, `directednessSource`)                                                                                                                     | today                                                                                                                                                                                                       |
| Direction as an editable select                                                                                        | `el.directed` is a load-time setting; changing it after a load re-imports                                                                                                                 | gap: no post-load re-direction. Draw it read-only with "Change..." reopening import options, or name the element work                                                                                       |
| Drawing 200,000 of 350,000                                                                                             | `DEFAULT_LIMITS` (`session/limits.ts`) published, not enforced                                                                                                                            | #302, as the revision says                                                                                                                                                                                  |
| "3 objects are stale [Re-run all]"                                                                                     | `run.stale` per run; `run.rerun()`                                                                                                                                                        | today per run; "all" is an objects-API loop                                                                                                                                                                 |
| Import report disclosure                                                                                               | `session.data.lastImport()`                                                                                                                                                               | today                                                                                                                                                                                                       |
| Findings section (diameter, likely missing links)                                                                      | `all-pairs-distance` graph fields today; #310, link prediction unregistered                                                                                                               | as stated                                                                                                                                                                                                   |
| Reading row "34 nodes joined by 78 edges in one connected part"                                                        | nothing: `reading()` lives on `RunResult` (`session/results/RunResult.ts`), not on statistics                                                                                             | **gap, unnamed**: a `statistics().reading()` or the app writes the sentence (which is the app computing prose over graph facts; borderline, but it is formatting, not computing)                            |
| Layout tab: Layout select, engine gear, Dimensions                                                                     | `el.layout`, `el.layoutConfig`, `session.catalog.layouts()`                                                                                                                               | today                                                                                                                                                                                                       |
| Transport row (Pause, Step, Re-run, "Settling 62%")                                                                    | no public transport                                                                                                                                                                       | #144, as stated                                                                                                                                                                                             |
| Group by, Root, Order by                                                                                               | `LayoutDescriptor` structural inputs (`needs`)                                                                                                                                            | today for the descriptor; binding a Grouping object as the partition input is objects-API work                                                                                                              |
| "Ring on 12 of 34 (Group 2)" (a scoped layout)                                                                         | none                                                                                                                                                                                      | #144, as stated                                                                                                                                                                                             |
| Pinned N, Unpin all                                                                                                    | `el.pinnedNodes`, `el.unpin`                                                                                                                                                              | today                                                                                                                                                                                                       |
| Acceleration line                                                                                                      | `session.capabilities.acceleration`                                                                                                                                                       | today                                                                                                                                                                                                       |
| Canvas tab: Background, Look, Labels budget, Edge labels, Tooltip, Arrows, Legend, Minimap, Note markers, Default look | `el.background` today; Look #331; label budget needs a top-N selector (round-1 A8); Legend `session.styles.legend()` data today, drawing #292; Minimap #293; markers #295                 | as stated, with one addition: **Arrows [switch] on directed data** has no single switch; it is `edge.arrowHead` on the element's base layer, which is locked. Needs the "base look" template scope from 5.6 |
| Data tab: Attributes with type, completeness                                                                           | `session.data.attributes()`                                                                                                                                                               | today                                                                                                                                                                                                       |
| Column "..." verbs: Colour by, Size by, Filter by, Group by, Label by, Set as weight, label, time, type                | encode by path today (no app UI, #190); Set as time #333; Set as type #299; **Set as weight and Set as label after a load** are load-time paths (`el.edgeWeightPath`, `el.nodeLabelPath`) | gap: re-mapping known fields after a load is a re-import today; say so or name the element work (#297 covers attribute updates, not role changes)                                                           |
| Join a table, New from formula                                                                                         | #298; `data.compute` design                                                                                                                                                               | as stated                                                                                                                                                                                                   |
| Export section                                                                                                         | image today; data proposed (graph-io has exporters); report #187; recipe proposed                                                                                                         | as stated                                                                                                                                                                                                   |
| Time tab                                                                                                               | section 6 of this file                                                                                                                                                                    | see there                                                                                                                                                                                                   |

### 2.2 Set

| Rows                                                                                                     | Backed by                                                                                                                                                  | Verdict                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Definition by kind (rule, range, categories, degree, neighbours, path, network, cut, fixed, combination) | filters today for range, categories, degree, neighbourhood, component; runs today for path, MST, cut, matching; `{nodes}` scope for fixed; expression #149 | as stated, once decision 2 lands (a filter as a scope). Until then a rule Set has no saved form: `Filter` is not a `Scope`                |
| **Fixed Set of edges**; a Path as a scope; "Within [Path >]"                                             | `Scope` has `{nodes: NodeId[]}` and no edge list (`catalog/types.ts:710`)                                                                                  | **gap, unnamed**: decision 2 must add `{edges}` (and a run-result set) to `Scope`, or an edge Set cannot be saved, scoped to, or combined |
| Invert                                                                                                   | selection target `{invert}` today; a scope has no `not`                                                                                                    | decision 2                                                                                                                                |
| Within [Everything v]                                                                                    | `Scope.set` references a saved scope                                                                                                                       | today                                                                                                                                     |
| "Live" or "Re-run on Enter"                                                                              | `session.estimate`                                                                                                                                         | today                                                                                                                                     |
| Run / Approximate instead (waiting)                                                                      | `gateRun`, `StartOptions.exact/sample`                                                                                                                     | today                                                                                                                                     |
| Members: Nodes, Edges, Inside edges, Cut edges                                                           | `session.selection.statistics()` gives induced and cut edges for the SELECTION only                                                                        | gap: no `scope.statistics(spec)`. The objects API can select-then-read, but that clobbers the reader's selection. Name it                 |
| Hops, Cost (a path); Total weight (a network)                                                            | `path` and `edge-set` graph fields                                                                                                                         | today                                                                                                                                     |
| Member rows with hop order                                                                               | `RunResult.column()` for `order`; #148 (column to ids) for a Set from a filter                                                                             | partial: a filter result has counts and masks, not an ordered id list with values                                                         |
| Findings on a Set (density, diameter of the subgraph)                                                    | nothing computes statistics over a scope                                                                                                                   | **gap, unnamed**                                                                                                                          |
| Style tab                                                                                                | section 5                                                                                                                                                  | see there                                                                                                                                 |
| Record: method, params, scope size, engine, time, seed, caveats                                          | `run.record`, `run.caveats`, `run.engine`                                                                                                                  | today for a run; a filter pass is a run with `caveats` too                                                                                |
| "on the GPU" per object                                                                                  | `Caveats.precision` is `f32` on an accelerator; no backend field on a run record (`session/runs/types.ts`)                                                 | **gap, unnamed**: a `backend` on `RunRecord`. Today "on the GPU" would be inferred from precision, which is a guess                       |
| Export Members CSV, Subgraph GraphML                                                                     | ranking readable today; exporters proposed                                                                                                                 | as stated                                                                                                                                 |

### 2.3 Group

| Rows                                                         | Backed by                                                                                  | Verdict                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Of, Label, "11 nodes, 32% of the scope"                      | `community` result `groupSize`, `sizes`                                                    | today                                                                                                                               |
| Profile                                                      | #193                                                                                       | as stated                                                                                                                           |
| Reading "Group 2 of Communities. Mostly the nodes around 1." | nothing per group; `reading()` is per run                                                  | **gap, unnamed** (or omit the reading row on a Group; screen 3 draws one)                                                           |
| Members, Select members, Focus                               | a Group's members as a scope: `{where: "results.<run>.group == 2"}` needs the query engine | #149, or decision 2's "a group" scope kind; today a Group has no resolvable membership. Screen 3's "11 selected" halo depends on it |

### 2.4 Measure

| Rows                                     | Backed by                                                                     | Verdict                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Field select (hub, authority; in, out)   | `FieldDescriptor` on the run                                                  | today                                                                                                      |
| Min, Max, Mean, Median                   | `RunResult.column()`                                                          | today                                                                                                      |
| Widest, Narrowest (diameter, radius)     | `all-pairs-distance` graph fields                                             | today                                                                                                      |
| Histogram, linear or log                 | `RunResult.histogram()`                                                       | today                                                                                                      |
| Top N rows, click selects                | `RunResult.ranking()`; selection target `{top}`                               | today                                                                                                      |
| Drag across the histogram selects a band | targets have `top` and `above` (`selection/targets.ts:111-113`), no `between` | **gap, unnamed**: a `{between: {run, field, min, max}}` target, or a range filter on a result field (#192) |
| Definition option rows from descriptors  | `AlgorithmDescriptor.options` today; bounds #336; weights and direction #313  | as stated                                                                                                  |
| Exact switch                             | `StartOptions.exact`                                                          | today                                                                                                      |
| Style                                    | section 5                                                                     | see there                                                                                                  |

### 2.5 Grouping

| Rows                                   | Backed by                                                                                            | Verdict                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Groups, Modularity, Sizes              | `community` graph fields                                                                             | today                                                                                    |
| Show the largest N, Other              | `EncodingSpec.overflow`                                                                              | today                                                                                    |
| Names from                             | #191                                                                                                 | as stated                                                                                |
| Sort groups by                         | app-side ordering of the tree; fine                                                                  |
| "6 of 6 matched to their predecessors" | nothing matches groups across re-runs                                                                | #191 as the revision says; note the caveat text it proposes is honest                    |
| Attribute Grouping ("By attribute...") | encode by data path paints today; the Group CHILDREN (members, select, focus) need a per-value scope | **status correction**: "today" in 3.3 is only the paint. The rows are #149 or decision 2 |

### 2.6 Node and edge

| Rows                                                                   | Backed by                                                                                                                                                                                       | Verdict                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Values per Measure ("0.031, rank 12 of 115")                           | `RunResult.node(id)` gives value, rank, percentile                                                                                                                                              | today                                                                                                                                                                       |
| Member of (chips per Set)                                              | objects-API membership lookup over saved scopes; `scope.resolve` per Set is O(sets x n)                                                                                                         | design it as a mask intersection (the revision's "coverage from member masks" covers it)                                                                                    |
| Look rows                                                              | `session.styles.explain({node})`                                                                                                                                                                | today                                                                                                                                                                       |
| "Style this node..." (a one-node Set)                                  | `scope.save({nodes:[id]})` plus a layer                                                                                                                                                         | today; note the element ALSO has `resolveToStatic` for this and the revision does not say which door the objects API takes                                                  |
| Position                                                               | `el.getNode(id).position`                                                                                                                                                                       | today                                                                                                                                                                       |
| Attributes tab                                                         | `session.data.node(id)`                                                                                                                                                                         | today                                                                                                                                                                       |
| **Connections tab**: Neighbours 17, In 9, Out 8, rows with edge labels | nothing on `SessionDataApi` (`session/types.ts:299-350`): node, edge, attributes, statistics, fingerprint. The snapshot is CSR so the element can answer in O(degree); the app must not walk it | **gap, unnamed**: `session.data.neighbours(id, {direction})` returning ids and edge ids. Without it the tab is either app computation (forbidden) or a selection round-trip |
| Locate                                                                 | `zoomToNodes` exists only as an AI command                                                                                                                                                      | partial, as the inventory says                                                                                                                                              |
| Expand from server                                                     | `el.layoutBehavior.fetchNodes`, on double-click                                                                                                                                                 | today, but see the toolbar conflict in 3.2                                                                                                                                  |
| What breaks if removed                                                 | #311, #180                                                                                                                                                                                      | as stated                                                                                                                                                                   |
| Remove from data                                                       | `el.removeNodes`                                                                                                                                                                                | today                                                                                                                                                                       |
| Edge inspector                                                         | edges are unpickable                                                                                                                                                                            | #319, as stated                                                                                                                                                             |
| Several elements: Statistics with means against the graph              | `session.selection.statistics()`                                                                                                                                                                | today (the app marks it Coming, #322)                                                                                                                                       |
| Several objects: Combine                                               | no scope combinators                                                                                                                                                                            | decision 2                                                                                                                                                                  |

### 2.7 View

Camera presets store a camera snapshot only (`Graph.ts:4402` `saveCameraPreset`). Mode and mask
are not in it; the revision names this gap (6.2). One addition: `applyCameraView` refuses a
snapshot name that shadows a built-in view (`camera/resolve.ts`), so a reader's View named "Fit"
will be refused. The Views list needs to either namespace saved names or show the refusal.

## 3. The toolbar: the status words, corrected

Section 3.2 and 3.3 are the first complete specification and they are checkable. Where the
status word is wrong it is corrected here; everything not listed is right.

| Button or row                                         | Revision says                          | Actually                                                                                                                                                                                                                                                                                                                                                                                       | Why                                                                                                                          |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Select: "double-click a node selects its neighbours"  | proposed                               | **conflicts with a shipped behaviour**: double-click is the server-expansion gesture (`NodeBehavior.ts:555-565`, registered unconditionally, fires `fetchNodes` when `layoutBehavior` names one). Two meanings on one gesture                                                                                                                                                                  | pick one: double-click expands when a fetcher exists, else selects neighbours; or move expansion to the node's overflow only |
| Hand: "wheel zooms toward the cursor"                 | today (2D)                             | 2D zoom is about the centre                                                                                                                                                                                                                                                                                                                                                                    | #290 covers 2D too; mark it proposed                                                                                         |
| Filter > By id list                                   | today                                  | today as a Set (`{nodes}` scope, `scope.save`); NOT today as a filter or a Focus (`Filter` has no `ids` kind)                                                                                                                                                                                                                                                                                  | mark "Create today; Focus with decision 2"                                                                                   |
| Filter > By range on a Measure                        | today for attributes, #192 for results | correct; add that `{above}` exists as a selection target so "Select" works on a result today even though "Create" does not                                                                                                                                                                                                                                                                     |
| Filter > Target [Nodes / Edges]                       | edges by expression #149               | correct, and stronger: an edge filter by categories or range does not exist at all (`Filter` kinds are node-only except `edges` by expression)                                                                                                                                                                                                                                                 | say "edge categories and ranges: gap, small" (the revision says this; keep it)                                               |
| Neighbours (E)                                        | today                                  | today: `neighborhood` filter AND `neighborsOf` selection target both exist, so the tool's Select and Create both work; the depth cap #160 is for BFS as a run, not for this                                                                                                                                                                                                                    | fine; the #160 note is misleading here, move it to Groups > Steps away                                                       |
| Path > Shortest route                                 | today                                  | today                                                                                                                                                                                                                                                                                                                                                                                          | fine                                                                                                                         |
| Path > Most that can flow                             | today                                  | today; note the result is `edge-metric`, so the object is a Measure on edges, and the Style tab must offer the edge encoding block (5.2 lists Edge width, Edge colour: good)                                                                                                                                                                                                                   | fine                                                                                                                         |
| Groups > By attribute...                              | today in the element                   | paint only (see 2.5); Group rows need per-value scopes                                                                                                                                                                                                                                                                                                                                         | mark "paint today; Group children with decision 2 or #149"                                                                   |
| Groups > Several...                                   | today (`runs.batch`)                   | today; the auto-apply policy already coalesces a batch to one layer per channel (`styles/autoApply.ts` rule 3), which is the revision's "eye off after the first" by another mechanism. Choose: coalesce (element today) or eye-off (A4). They are not the same picture: coalesced means five objects with NO layers; eye-off means five objects with disabled layers the reader can switch on | decide; eye-off is the better fit for the tree, and it is the policy change A4 names                                         |
| Rank > Connections                                    | today (#161)                           | today; `degree` publishes inDegree and outDegree fields, so "Field [in / out / total]" in Values works today without #161                                                                                                                                                                                                                                                                      | soften #161                                                                                                                  |
| Structure > Separate pieces                           | today                                  | today; but its object is a Grouping with one Group per part: on a 50,000-node graph with 3,000 isolated nodes that is 3,000 Group rows. "Show the largest N" bounds the tree (5.3), so it is fine ONLY if that default applies to components                                                                                                                                                   | say the default (8) applies to every Grouping                                                                                |
| Structure > How far from everything                   | today, cubic                           | today; over the gate on anything but a toy, as stated                                                                                                                                                                                                                                                                                                                                          | fine                                                                                                                         |
| Note (N) on an edge or a point                        | #145                                   | #145 for notes; anchoring to an EDGE also waits on edge picking #319; a point on the canvas needs `screenToWorld` (today)                                                                                                                                                                                                                                                                      | add #319                                                                                                                     |
| Ask                                                   | today                                  | today (`el.aiCommand`); the "Made: Bridges" link needs `ai-stream-tool-result` to carry object ids, as 6.5 says                                                                                                                                                                                                                                                                                | fine                                                                                                                         |
| Mode switch: VR/AR drawn only when supported          | today                                  | today (`el.isVRSupported()`, `isARSupported()`)                                                                                                                                                                                                                                                                                                                                                | fine                                                                                                                         |
| Parameters popover cost line "About 4 min on the GPU" | today                                  | `session.estimate` returns seconds and confidence; it does not say which backend the estimate assumes                                                                                                                                                                                                                                                                                          | small gap: `CostEstimate.backend`                                                                                            |
| Flyout "in tree" marker                               | --                                     | `session.catalog.metrics()` says whether a metric already ran                                                                                                                                                                                                                                                                                                                                  | today                                                                                                                        |
| Flyout population from `category`                     | `category` exists                      | yes: `centrality`, `community`, `path`, `flow`, `structure`, `prediction` (`catalog/types.ts:508`). The revision's four questions map onto six categories: `flow` rows go to Path and `prediction` to Structure; say so, or the placement rule has two unassigned categories                                                                                                                   |

One analyst note on the toolbar: Groups, Rank and Structure "run the face variant on what is
showing with default parameters" on a plain click. On a 50,000-node graph with the face set to
Bridges, a plain click lands a waiting row (the gate), which is right. On Karate Club it runs.
The cost gate is what makes the plain click safe, and the revision should say in 3.2 that the
plain click is gated, not only in 4.

## 4. Running an algorithm: the states against the run model

The thirteen steps map onto the element's run states as follows. `Run.status` is queued,
running, succeeded, failed, canceled (`session/runs/types.ts`); `run.stale` is a `StaleNote`
with `ranOn`, `nowVisible`, `scopeSpec`; there is no "waiting" and no "frozen" on the element.

| Revision state                            | Element today                                                                                | Gap                                                                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| waiting (gated, not started)              | `gateRun` returns a decision; nothing is created. A waiting row is an OBJECT with no run     | the objects API must hold a "defined, not started" object. Small, but it is the one state the run model does not have, and it is the state the whole cost story rests on                                                                           |
| computing, "42%", phase, queued 3rd       | `run.progress` (phase, fraction, ETA), queue position                                        | today                                                                                                                                                                                                                                              |
| blocks the frame, no Cancel               | `CostEstimate.blocksFrame`                                                                   | today                                                                                                                                                                                                                                              |
| cancelled sampling keeps what it has, "~" | `canceled` status; a partial result is NOT kept today (a cancelled run has no result)        | gap: partial results on cancel; small for sampled betweenness, not general                                                                                                                                                                         |
| current, "~ sampled"                      | `caveats.exact === false`                                                                    | today                                                                                                                                                                                                                                              |
| stale after a Definition edit             | `run.rerun()` reruns with the SAME params; a changed parameter is a NEW run                  | the objects API must map "edit a parameter" to start-new-and-replace, keeping the object id. Small, but say it: otherwise Ctrl+Z after a re-run ("restores the previous result") has nothing to restore from, because the previous run was removed |
| stale after Add data                      | `run.stale` derived from the scope digest (`RunScopeRecord.digest`)                          | today, for scope "visible" (the default, `RunsApi.ts:399`)                                                                                                                                                                                         |
| "Re-run all respects the gate"            | per run `gateRun`                                                                            | today                                                                                                                                                                                                                                              |
| failed with [Retry on the CPU]            | `acceleration.policy` is session-wide (`auto`, `off`, `required`); no per-run backend choice | gap: a per-run `backend: "cpu"` option, or Retry on the CPU sets the policy to off for that one start and restores it. Name it; the explicit-choice rule (root CLAUDE.md, WebGPU) is respected either way                                          |
| frozen (input deleted)                    | `runs.remove(id)` removes the layers a run created; nothing links a Top N set to its Measure | objects-API work; the revision's "Unfreeze as fixed set" is `scope.save({nodes})` of the last resolved ids. Fine                                                                                                                                   |
| Ctrl+Z after creation cancels the run     | `run.cancel()`                                                                               | today; but see section 7 on who owns undo                                                                                                                                                                                                          |

The step-8 first paint: "Colour if no visible object above writes it, else Size, else Outline,
else Colour anyway" is the OPPOSITE of the auto-apply policy today, which DROPS a suggestion when
an authored layer drives the channel (`styles/autoApply.ts`, rule 2). The revision names the
change (5.7, A3). One consequence it does not name: once the objects API creates every layer as
"authored" (source `user`), rule 2 would drop every suggestion after the first object. So A3 is
not optional polish; without it the second algorithm never paints.

## 5. Styling: the three rules, the layer model, and stacked paths

### 5.1 "Styling only through style layers"

Every paint row in section 5 is a layer: a Set's rows are static layers over its scope; a
Measure's blocks are `encode()` layers; a Grouping's palette is one categorical encoding and each
Group override is one static layer above it. The node inspector's "Style this node..." creates a
one-node Set, so even the per-node door is a layer on an object. The rule holds.

Two places to watch:

- **Canvas > Look**: a preset applied through `applyTemplate` replaces the stack. The revision
  restricts it to "match-everything layers" (5.6, #331). That restriction is what keeps the rule;
  it should be listed as a precondition of the Look row, not as element work that can slip.
- **Canvas > Default look: Node [chit] [size], Edge [chit] [width] (locked)**: these edit the
  element's own base layers, which are locked (`source.by == "element"`). The row needs either an
  unlocked "dataset default" layer just above the base (the round-1 "Dataset Fill", which the
  revision keeps as the "+") or the base-and-palettes template scope. Say which.

### 5.2 "Suggested styles paint only their results"

The suggested first paint is applied through `encode()` and `highlight()`, both of which generate
a selector scoped to the elements carrying the run's value (`autoApply.ts`, "WHAT THIS DOES NOT
DO"). The revision keeps that: a Path's three starting rows paint its edges and its endpoint
nodes only; "Dim the rest" is a linked Set the reader creates from the overflow, inserted below
the path, movable and deletable. Correct, and it is the right reading of the root CLAUDE.md rule.

One detail that must survive into the objects API: a Path's `set` may name node and edge
channels together, and the highlight verb splits them into two layers, one per half
(`StylesApi.ts:1598-1610`, "(nodes)" and "(edges)"). So one tree row (a Path) is two layers. The
revision's Style tab already draws Nodes and Edges as two groups, so the mapping is one row to
one or two layers. Say so in the objects API sketch, because coverage counts ("Covered by X on
12 of 12") are per layer.

### 5.3 Do several stacked paths work with the layer model?

Yes, with one mechanism and one caution.

The mechanism: the repaint keeps one column per channel and later layers win per channel
(`styles/repaint.ts`, "one column per channel"). So a higher path writing Colour and Width, and a
lower path writing Colour, Width and Arrows, produce on the shared edge the higher Colour, the
higher Width and the lower Arrows. That is precisely what 5.4 and screen 8 describe. The
`HighlightSpec.set` already accepts a `StaticStyle` with `edge.color`, `edge.width`, `edge.style`
(the pattern), `edge.arrowHead` and `edge.animationSpeed`, so a Path with width, pattern and
animation is a highlight today. Only the exclusivity stands in the way, and it is a `filter` in
one place (`StylesApi.ts:1626`, `doomed = ... kind === "highlight"`).

The caution: the generated selector MUST stay `results.<run>.onPath == true` (an expression, the
value test), not `{match: "has", path}`. The element's own comment explains why: the membership
column carries FALSE for every element the run looked at and did not choose, so a presence test
would paint the route's whole neighbourhood (`StylesApi.ts:1596-1600`). The revision's terms
define a Set as "an object whose members are a list of elements"; if the objects API ever
materialises a Set as a saved scope of ids and paints it with `{match: "ids"}` that is fine too.
What it must never do is paint a run-backed Set with a `has` selector.

Two smaller points:

- **Highlight colour cycling** (A6) is a palette question, not a layer question: the three
  highlight palettes have capacity 2 each (highlighted and muted). The cycle the revision names
  (blue, green, orange, then the categorical palette) is fine; say that the fourth Set onward
  reads Okabe-Ito, and that the legend's swatch for a Set carries width and pattern. Today the
  legend block for a highlight is `kind: "highlight"` with swatches only (`styles/legend.ts:96`,
  `137`); width and pattern in the legend are a small addition to `LegendBlock`.
- **The expression selector needs the query engine** in one sense only: selectors compile inside
  the style engine (they work today); it is scopes, filters and selection that lack the engine
  (#149). So stacked paths do not wait on #149.

### 5.4 Continuous and group values (5.2, 5.3 of the revision)

The Measure's encoding rows are `EncodingSpec` one to one: channel, scale (`scalesForDomain`),
palette, domain, clamp, reverse, missing, range, overflow. Nothing is invented. Two notes:

- "Clamp cuts the domain at the 2nd and 98th percentiles" -- `EncodingSpec.clamp` clamps to the
  DOMAIN the caller gave; percentile clamping is the caller computing p2 and p98 from
  `RunResult.column()`, which is a session read, not app computation. Fine, but say the objects
  API does it.
- A Group override as "a child layer above the parent" is a flat-stack insertion directly above
  the Grouping's encoding layer, with an `{match: "expression", where: "results.<run>.group == 2"}`
  selector. Works today. The identity-across-re-runs caveat (labels renumber) is real and the
  revision's caveat text is honest.

The Grouping's "Show the largest 8, the rest Other" is `overflow: "other"` with the palette's
capacity; the tree collapsing the rest to one row is objects-API presentation. Consistent.

## 6. The timeline against the element's temporal model

This is the section with the most divergence from what the element does. The temporal facts,
from source:

- A `TimeWindow` is ONE attribute path, `from`, `to` (half-open) and a `step` that is "carried,
  not applied" (`visibility/filter.ts:91-100`).
- The same path is read on nodes AND edges, and an element with no value at that path is INSIDE
  the window: "No place on the timeline means the window has nothing to say about this element"
  (`filter.ts:936-942`).
- An edge's visibility follows its endpoints: an edge whose source or target is hidden is
  hidden. Not the reverse: a node whose every edge is hidden stays visible
  (`VisibilityApi.ts:27-29`).
- Filters and the window compose with AND, and neither re-layouts (`VisibilityApi.ts:22-35`).
- The degree filter reads the snapshot's whole-graph degree (`filter.ts:717-731`,
  `graph.degree()`), not the degree within what is visible.
- Runs default to scope "visible" (`RunsApi.ts:399`) and staleness is derived from the resolved
  scope's digest, so a run over "visible" goes stale when the window moves. A run over "graph"
  does not.
- `session.catalog.timeAttributes()` is declared and unimplemented (#333); the known-field
  mapping has one `nodeTimePath` and one `edgeTimePath` (`config/DataConfig.ts:44,75`).
- Playback, per-step summaries and a temporal result shape are #300; the seam is stated in
  `VisibilityApi.ts:33-39` ("`steps()` is a batch of runs over a list of windows ... playback is
  a cursor over that list calling `setWindow` per step").
- graph-io's GEXF importer stores dynamics as three role columns per element: `start`, `end`
  and `spells` (a list of intervals), plus dynamic attribute tables with their own start and end
  (`graph-io/src/formats/gexf/schema.ts:120-128, 169-177, 270-271`). Times are f64 epoch
  milliseconds with a `.text` companion when the source text must be kept
  (`graph-io/src/common/temporal.ts`).

Against those facts:

**6.1 Screen 10 draws a state the element cannot produce.** The dataset has an EDGE time column
`sent` and no node time column. Under today's window, every node has no value at `sent`, so every
node is inside the window; only edges are hidden. The canvas would show all 1,204 nodes and 1,910
edges, not "412 of 1,204 showing". Two ways out, and the revision must pick one: (a) the design
requires a node time column too (the "Email network" sample gets a `joined` column and the Time
tab shows "Nodes by [joined v], Edges by [sent v]"); or (b) the element gains a window rule
"hide a node that has no time value and none of its edges is inside the window" (an
"active-in-window" node rule). (b) is what every temporal-graph tool the analyst has used does
(Gephi's timeline hides nodes with no visible edges only when the node itself has no interval);
it is a small change to `compileWindow` and a big change to the "no value means inside" doctrine.
Name it as element work either way.

**6.2 A rule Set's count does not tick.** "Active senders (degree min 20) re-runs each step; its
count ticks: 61, 58, 64" assumes degree is counted inside the window. The degree filter reads
whole-graph degree, so the count is 61 at every step, and the Set's members outside the window
are merely not drawn. For the count to tick, either the filter must be evaluated over the visible
subgraph (the "scope gains filters" work of decision 2 must include "a filter evaluated within a
scope"), or "Active senders" must be a Measure (Rank > Connections, scope visible) with a cut
"Above 20", which IS re-run per step under the cost rule, because runs over "visible" go stale
when the window moves. The second is what the element does today; the revision should use it in
screen 10 and say that a rule over degree is a whole-graph rule.

**6.3 The Time tab's single attribute cannot express a GEXF dynamic graph.** A GEXF node with
`start=2019-01 end=2019-06` is an interval; a `spells` node is several intervals. The window
reads one instant per element. Windowing a GEXF file with today's model reads only whichever
column the reader picks ("start" or "end") and gets the wrong answer for any element whose
interval straddles the window. The revision does not mention GEXF, spells, start, end or
intervals at all. What is needed: `TimeWindow` gains `{attribute}` OR `{start, end}` (an element
is inside when its interval overlaps the window), and the time role (#333) can name a pair of
columns or a spells column. The Time tab then shows "Time attribute [sent v]" for instant data
and "From [start v] To [end v]" for interval data, chosen by what `timeAttributes()` reports.
This is the one place where the graph-io side already carries more than the element reads.

**6.4 Sliding versus cumulative** is expressible today: cumulative is `from` fixed at the
timeline's minimum. The transport bar's readout "up to 2019-03" is right.

**6.5 Unit and step**: `TimeStep` accepts a number, hour, day, week, month, quarter, year, and it
is carried, not applied. "Unit [Month v]" is the objects API's playback (#300) reading `step`.
Fine.

**6.6 Stale under playback**: "Stale: computed at 2019-01 to 2019-12" needs the window in the
stale note. Today `StaleNote` has `ranOn`, `nowVisible`, `scopeSpec`; the window is not in it.
Section 8 of the revision lists "the window an object ran under recorded in its staleness hash"
as small work: correct, and the caveats should carry it too so the message can be written from
the record. Today `Caveats.windowScope` is a boolean, "a time window narrowed what the run
looked at" (`session/runs/types.ts:204-205`); the bounds are not recorded anywhere. Add the
bounds (`from`, `to`, `attribute`) to the caveat.

**6.7 "Re-run layout per step"** is #144 (no layout transport), as stated. "A 200 ms fade" for
elements leaving the window: the element has `visibility.showContext` (hidden nodes drawn
faintly) which is the closer existing capability and is unplaced (section 8).

**6.8 A View saving the window as part of its mask**: fine once presets carry a mask (6.2 of the
revision names it).

**6.9 Per-step tick marks** from change counts: #300's per-step summaries; the window's
half-open rule is what makes per-step change counts honest (`filter.ts:83-90`), so the transport
must advance by whole steps and never overlap windows. Say it, because a draggable band with two
free handles CAN overlap consecutive windows.

**6.10 The Structure > Over time result** needs the `temporal` result shape, declared and
unshipped; as stated.

## 7. Cross-cutting: three things the settled decisions make the element's, that the revision still leaves with the app

1. **Undo.** The element's design (9.2, 9.3) says every session edit returns an inverse-able
   record and the stack is the consumer's. That was written when the tree was the app's. With
   the tree in the element, "Ctrl+Z removes the row and cancels its run" and "Ctrl+Z after a
   re-run restores the previous result" are tree operations, and the previous result is
   something only the element holds (a replaced run is removed today). Either the objects API
   keeps a history (which is #145's journal) or every objects-API verb returns its inverse and
   the app keeps a stack of inverses. Pick one and write it down; today the revision says
   "the element keeps replaced results for the journal's lifetime (#145)" in one place and
   nothing about who pops the stack.
2. **The Views list.** Camera presets are the element's (`saveCameraPreset`). The "Overview"
   row written at the first fit, the drift dot, the mode and mask in a View: the revision places
   the mode-and-mask gap but not who writes "Overview". If the app writes it, the app is
   deciding a camera state; make it an element default preset.
3. **The label budget** ("Labels: Top 6 by Connections"): the revision says it links the Dataset
   to a Measure (6.9) and round-1 A8 says it is a hidden layer with a top-N selector. A top-N
   SELECTOR does not exist (selectors are everything, expression, has, ids). It is decision 2's
   "a layer selector accepts a scope" with a top-N scope kind. List it in 5.7; it is not there.

## 8. Unplaced capabilities from inventory/element-capabilities.md

Every capability in the inventory that neither `revision.md` nor `screens.md` names, by the
inventory's own name, with the home it should get. "Settings" means the file menu's Settings
sheet, which the revision names but never lays out; that sheet is the missing screen.

| Capability (inventory section)                                                                             | Status             | Where it belongs                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mixed direction per edge, #309 (1)                                                                         | proposed           | Dataset > Overview: Direction reads "Mixed" (`directedness` already has the value)                                                                                           |
| Repeated-edge policy (1)                                                                                   | shipped            | "Import options..." in the Dataset overflow is named but its rows are not; list: repeated edges, id coercion, endpoint spelling, position scale                              |
| Id coercion (1)                                                                                            | shipped            | same sheet                                                                                                                                                                   |
| Position scale and seeded positions (1)                                                                    | shipped            | Layout tab: "Positions from file: 34 of 34 [Keep positions]" (the `fixed` layout)                                                                                            |
| Load progress and Cancel a load, #296 (1)                                                                  | partial            | the status bar's computing chip during a load ("Loading 42% [Cancel]"); screen 1 to 2 transition                                                                             |
| Update attributes after load, #297; List edges (`getEdges`) (1)                                            | proposed           | the table dock's Edges tab needs `getEdges`; say #297 in screen 9                                                                                                            |
| Node merging (1)                                                                                           | proposed           | Several elements inspector: "Merge into one node..." (the second data edit) or state it is out                                                                               |
| SIF, CX2, STRING, BioGRID, Neo4j APOC readers (1)                                                          | proposed           | Open... accepts whatever `catalog.formats()` lists; say that the Open dialog is catalogue-driven                                                                             |
| Progressive / viewport-first loading (1)                                                                   | proposed           | out of scope; say so                                                                                                                                                         |
| Selection halo style (2)                                                                                   | shipped            | Settings > Canvas                                                                                                                                                            |
| Selection cap 5,000 and `truncated` (2)                                                                    | shipped            | status bar: "5,000 selected (capped)"; the analyst will hit this on the first marquee over a big graph                                                                       |
| Select by text search, #149 (2)                                                                            | proposed           | Ctrl+F in the tree header is the OBJECT find; a node find by label ("find node 34") has no home. Give Ctrl+F a second section "Nodes"                                        |
| Hover, `node-hover` event (2)                                                                              | partial            | placed as hover-highlight (6.9); the tooltip channel is placed; fine                                                                                                         |
| Run on load (`algorithmsOnLoad`) (3)                                                                       | shipped            | Settings > Analysis: "Run when data loads: [checklist]"; or a Recipe. Name one                                                                                               |
| Queue policy (append, replace, now) (3)                                                                    | shipped            | internal to the objects API; say "replace" is what a Definition edit uses                                                                                                    |
| Plan (`session.plan`) (3)                                                                                  | partial            | placed for export size; also the right source for "Matches 8 nodes" in the Filter popover (a dry run)                                                                        |
| Column to ids, #148 (3)                                                                                    | proposed           | the table dock and a Set's member rows; screen 9                                                                                                                             |
| Recommend a layout (`recommendLayout`) (4)                                                                 | shipped            | Layout tab: "Recommended: Spread out (small, one part)" as the select's first row, with the reason; the novice's first question                                              |
| Pace the simulation (pre-steps, steps per frame, stop delta) (4)                                           | shipped            | the engine gear popover; say it                                                                                                                                              |
| Animated layout transitions (`transitionMs`) (4)                                                           | shipped            | Settings > Canvas: "Animate layout changes"                                                                                                                                  |
| Radial, grid (declared, unserved), Sugiyama (4)                                                            | proposed           | the Layout select lists only served layouts; say the list is `catalog.layouts()` filtered on `served`                                                                        |
| Validate a layer spec (`styles.validate`) (5)                                                              | shipped            | the Style tab's rule field (a Set by rule) shows the validation error inline; the revision cites #335 (query validation) but layer validation exists today                   |
| `style:problem` event (the element refused its own painting) (5)                                           | shipped            | the failed state on the object whose paint was refused; nothing in section 4 covers a style failure                                                                          |
| Channels `node.wireframe`, `node.flat`, `node.glowStrength` (5.1)                                          | shipped            | the Nodes "+" list (5.4) omits them; add or say they are advanced                                                                                                            |
| Label billboarding (6)                                                                                     | shipped            | the label-style popover, Placement                                                                                                                                           |
| Reset camera, starting distance (7)                                                                        | shipped            | the zoom menu: "Reset view (Home)"; Settings > Camera                                                                                                                        |
| Skybox background (7)                                                                                      | shipped            | Canvas > Background: "Colour / Image..."                                                                                                                                     |
| XR: teleportation, hand tracking, controllers, reference space, z-axis amplification (8)                   | shipped            | Settings > Headset; the revision's 6.4 covers entry only                                                                                                                     |
| AI: enable with a provider, API key persistence, WebLLM in-browser (9)                                     | shipped            | Settings > Assistant: provider, model, key, "keep the key [session / local / never]"; the Assistant tab's first-run state ("Choose a provider")                              |
| Multi-turn tool use (9)                                                                                    | partial            | the Assistant transcript; say a follow-up turn is one request                                                                                                                |
| Logging and log sinks (10.2)                                                                               | shipped            | Settings > Advanced                                                                                                                                                          |
| Render settings, WebGPU rendering #36, profiling and stats (10.3)                                          | shipped / proposed | Settings > Performance beside the acceleration policy; "Show frame stats"                                                                                                    |
| Screenshot presets (print, web-share, thumbnail, documentation) and quality (supersample, MSAA, FXAA) (11) | shipped            | Export image...: a Preset row first, Quality in a disclosure                                                                                                                 |
| SVG and PDF capture (11)                                                                                   | proposed           | the Format select lists what `capabilities.capture` writes; the revision says this; fine                                                                                     |
| Export and import camera presets (11)                                                                      | shipped            | the Views header overflow: "Export views...", "Import views..."                                                                                                              |
| `visibility.showContext` (2, "hidden nodes drawn faintly")                                                 | shipped            | Canvas tab or the status bar's mask line: "Show hidden faintly [switch]". The nearest existing thing to the revision's "200 ms fade" and to the timeline's "the rest absent" |
| Style templates as a file (`toDocument`, `applyTemplate`) (5)                                              | shipped            | placed under Recipe and project file; a plain "Export styles..." row is cheaper and exists today                                                                             |

Placed and correct, for the record: temporal window, time playback #300, XR entry and support
checks, AI command and voice, video with waypoints, camera presets, saved views, labels and
wrap #294, overlap #5, palettes and custom palettes, legend #292, minimap #293, notes #145,
journal, recipes, project file #301, acceleration policy and calibration #159, exact versus
approximate, cost gate, caveats, engine versions, batch, cancel, re-run, stale, results as
attributes, selection statistics, scope save and resolve, filters of every shipped kind,
neighbourhood, largest component, expand from server, join #298, formula, node type #299, time
role #333, report #187, evidence bundle, export result, export data, sample datasets, large-graph
limits #302, hover highlight, pattern search, sweep #194, profiling #193, group names #191,
result-field filters #192, weights and direction #313, all simple paths #329, clustering #330,
k-core, link prediction, articulation #311, removal impact #180, distances #310, anomaly #312,
Compare #186, follow #183, wheel zoom #290, theme #291 and #331, marker #295, commands #337,
functions #332, validate #335, optionsFor #336, applicable #334.

## 9. Additions to the revision's element list (section 8 of revision.md)

Smallest first. Items already in the revision's list are not repeated.

| Item                                                                                                            | Size                         | Needed by                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `Scope` gains `{edges: EdgeId[]}` and a run-result set (a path as a scope)                                      | small                        | every edge Set; decision 2                                                       |
| `session.data.neighbours(id, {direction})` returning node ids and edge ids                                      | small                        | the node's Connections tab; the Neighbours tool's secondary bar count            |
| A `{between}` selection target (or a range filter on a result field, #192)                                      | small                        | the histogram band drag                                                          |
| A `backend` field on `RunRecord` and `CostEstimate`                                                             | small                        | "on the GPU" in Record, the GPU glyph in the status bar, the popover's cost line |
| A per-start backend override (`backend: "cpu"`) or a documented policy toggle for Retry on the CPU              | small                        | the failed state's second button                                                 |
| A "defined, not started" object and start-new-and-replace on a parameter edit, keeping the object id            | small                        | the waiting state; stale after an edit; Ctrl+Z after a re-run                    |
| The window rule for nodes with no time value (hide when isolated in the window), or a node time column required | small, but a doctrine change | screen 10                                                                        |
| An interval window (`{start, end}` paths, overlap test) and a time role that names a pair or a spells column    | medium                       | any GEXF dynamic file; #333                                                      |
| Filters evaluated within a scope (degree within what is showing)                                                | medium                       | a rule Set that ticks under a window; decision 2                                 |
| The window bounds in `Caveats` and in `StaleNote`                                                               | small                        | "Stale: computed at 2019-01 to 2019-12"                                          |
| A top-N scope kind usable as a layer selector                                                                   | small                        | the label budget; decision 2                                                     |
| `LegendBlock` carries width and pattern for a highlight block                                                   | small                        | the legend's Path rows                                                           |
| A statistics call over a scope (`scope.statistics(spec)`: induced and cut edges, density)                       | small                        | a Set's Members and Findings without touching the selection                      |
| `reading()` for the Dataset (from statistics) and, optionally, per Group                                        | small                        | the reading row on the Dataset and a Group, or drop those two rows               |
| Undo ownership decided: the objects API returns inverses, or keeps the history                                  | decision, then small or #145 | Ctrl+Z on tree edits                                                             |
| Double-click: expansion when a fetcher exists, else neighbours                                                  | tiny                         | the Select tool's row in 3.2                                                     |

## 10. What to change in screens.md before drawing

- Screen 3: the Group's reading row needs a source or should be omitted; the halo on 11 members
  needs a Group scope (say it is assumed, as the mock says of induced edges).
- Screen 5: "Computing 42%, on the CPU" needs the backend field; draw it, note the gap.
- Screen 8: right as drawn; add to the caption that one Path is two layers (nodes, edges).
- Screen 9: the Edges tab of the table needs `getEdges` (#297); the object columns need #148.
  Note both in the caption.
- Screen 10: give the sample a node time column ("joined") OR make "Active senders" a Measure
  cut; change "412 of 1,204" to a number the window can produce; and add an interval example
  or a footnote that GEXF dynamics need the interval window.
- Screen 11: the flyout's six categories versus four questions: show where `flow` and
  `prediction` rows land.
- A thirteenth screen: Settings. Eleven unplaced capabilities in section 8 live there and it has
  never been drawn.
