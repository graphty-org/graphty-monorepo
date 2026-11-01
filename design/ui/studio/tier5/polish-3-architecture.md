# Tier 5 polish round 3: architecture review of the selection editor

What was reviewed: the selection editor at 7ca4cae647 on `design/studio-tier5` (the app's
`graphty/src/workspace/selection/`, the filter and style hosts, the canvas preview key, the table's
Group column) and graphty-element's selection additions, read as `git diff origin/master...HEAD`,
against `design/ui/selection-groups/spec.md` and the repository's architectural principles: no
graph logic in the app, no workaround of the element, additive `@beta` API, presentation-neutral
element output.

How: the built app (`graphty/dist`, stamped 7ca4cae647) driven with `real.mjs` on `flags.json`
(20 nodes, a yes-or-no column `vip`); graphty-element's session probed with a temporary vitest
file, kept at `tmp/design-studio/tier5/polish-3/architecture/zz-arch3-probe.test.ts` and removed
from the worktree. Screenshots are under the main checkout's
`tmp/design-studio/tier5/polish-3/architecture/s1/`.

## Round 2's fixes that hold

- A yes-or-no value picked into a new filter card writes nothing: the app now writes an empty
  `categories` pick, which graphty-element reads as `inert` with reason `test-unset` (probe Q7). In
  the app, picking `vip` leaves the heading at "Graph, flags: 20 nodes, 20 edges", nothing selected
  and Undo with no label (`s1/03.png`).
- A data column named `rank` or `percentile` is listed again; the suffix test now only applies to
  the Results group (`values.ts:100-101`). Its remaining edge is finding 5 below.
- The canvas key reads `styles.shownBranches`, the view graphty-element draws, not the app's
  store (`PreviewKey.tsx:30`).
- The API report adds only `@beta` selection exports and members (`BranchesView.mark`,
  `StepReading.values`, `styles.shownBranches`, the `style:branches-shown-changed` event) and
  removes nothing. `RuleTree` gains union members (`UnionLeaf`, `HopsLeaf`, ...), each `@beta`.
- No compact-mantine look changed. `LISTBOX_CLASS_NAMES` is a new export with no change to its look.

No new blocker was found. Three majors from earlier rounds still reproduce. Two of them have new
evidence that changes the fix.

## Major

### 1. A new filter card kept on Done is still held in React state and lost on a place switch, though most of it could be written now

Still reproduces: Data, Add filter, pick `vip`, Done: the folded card shows (`s1/04.png`,
"Remove New filter", "vip"). Then Graph, then Data: the card is gone (`s1/05.png`). It is outside
undo, autosave and the saved project. The app holds graph configuration that graphty-element
never sees (`FilterSelection.tsx:99-101` `onDraft`; `Filters.tsx:417` `draftRule`).

New evidence: the element change round 2 asked for is only needed for one of the two ways a card
starts.

- A new card starts with the Select effect (`Filters.tsx:105`, `:415`). A Select condition whose
  only step is inert selects 0 and hides nothing (probe Q8c: `selected 0, visible 30`), so it is
  safe to write as soon as it is made.
- A Keep condition hides nothing when its group starts All and its step is inert (probe Q8:
  30 visible).
- A Keep condition hides everything when its group starts None and its step is inert (probe Q8b:
  0 visible). That is the "Filter to..." entry from an attribute's menu, which writes
  `newSelection` (start None, `model.ts:38`) with Keep.

Fix:

- **The app:** write the card on creation when it starts with Select. Delete `applies()`
  (`FilterSelection.tsx:28-32`) and the `onDraft` and `draftRule` path for that case.
- **graphty-element**, for Keep and Exclude: read a condition whose `union` has no applied step
  as inert (it removes and selects nothing) and give its counts a reason code. This is a change to
  a `@beta` leaf. After it, the app writes every card at once and the draft goes.
- **Test:** add an app real-element test. New card, pick a value with no test, Done, switch
  places and back: the card is still there.

### 2. Reading a selection still starts session runs, from React render

Still true (round 1 finding 3, round 2 finding 4). A `scope.watchSteps` watch on a Betweenness
step, ended at once, leaves `betweenness:"graph":succeeded` (probe Q1). The render-time peeks
are unchanged:

- `useSteps.ts:30-32`, which every folded `SelectionSummary` uses
- `FilterSelection.tsx:28-32`

The spec says "Highlighting never starts a run" (spec line 134).

Fix as before:

- `watchSteps` reports `run-needed` or `computing` and starts nothing.
- Runs start on a write, or through an explicit additive `@beta` `scope.startSteps(rule)`.
- The app drops the render-time peek. Finding 1's fix removes one of them.

### 3. The import filter's picker still lists filtered-graph runs un-greyed, and the app never calls `scope.checkStep`

Still reproduces: after Analyze, Run Betweenness, a new filter card's picker lists "Betweenness,
40.5 to 40.5" under Results. Hovering it prints `tooltip: null` (`s1/08.png`).

New evidence: the app has no call to `scope.checkStep` anywhere (`grep -rn checkStep
graphty/src` finds none). That is the `@beta` API added for exactly this greying (spec lines 58,
120, 134 and 326). The element guard has a gap too:

- A data-column step on the filtered run's path gets `circular-scope` (probe Q3b).
- A `measure` step on the same algorithm gets `null` whether the session's run was on the filtered
  or the full graph (probe Q3c). Written as a filter, it starts a second, full-graph run (probe
  Q3d: `louvain:"visible"` then `louvain:"graph"`). That is what spec 326 asks for, but nothing
  tells the reader beforehand.

The Analyze sections also hide any algorithm with a succeeded run on any scope:
`ran.has(each.key)` (`values.ts:168-174`). So in a filter the algorithm is in neither place
correctly: it is listed as a usable result and not as a run to start.

Fix:

- **graphty-element:** `checkStep` returns a reason for a measure whose matching session run
  cannot be read on this host and base. Add an additive `@beta` readable-value fact for the run's
  scope (or for "reads run X / starts a run on Y").
- **The app:** call `checkStep` for each Results entry in the filter host and grey the entry with
  the element's reason as its tooltip. Decide "already ran" by run scope against the host's base,
  not by algorithm key.

## Minor

### 4. `checkStep` returns untyped codes and drops the failure's details

`checkStep(step, options): CodedFact | null` (`ScopeApi.ts:381`) has no code type. It returns:

- `circular-scope`, which is not in the exported `StepReasonCode` union
- a raw command error code
- or a nested `details.reason` string (`steps.ts:922-934`)

Each comes with `params: {}`. Probe Q3c: a measure test `categories` with `values: [0]` gives
`{ code: "E_BAD_COMMAND", params: {} }`, while `visibility.addCondition` throws the same rule with
details `{ "values": [0] }` (probe Q3d). A consumer cannot write words for every code, and it
cannot say which value was wrong.

Fix (additive, `@beta`): type the result as `CodedFact<StepCheckCode>`. Export the code union,
including `circular-scope`, and carry the failing field in `params`.

### 5. A run's field named `rank` or `percentile` is dropped by name, including an extension's own primary field

Two places drop fields by name:

- `pickerFields` drops a Results field whose path ends in `.rank` or `.percentile`
  (`values.ts:100-101`).
- The Analyze and Added sections drop catalog fields named `rank` or `percentile`
  (`values.ts:181-186`).

Algorithms registered through `@graphty/graphty-element/extend` declare their own
`FieldDescriptor`s (`extend.api.md:262`). An added algorithm whose real result field is called
`rank` therefore can never be picked or styled in a selection. The app is guessing from a name
whether a field is a companion; that is a fact the element knows.

Fix: graphty-element marks companions. Use an optional `@beta` `role: "rank" | "percentile"` on
`FieldDescriptor` (which `metricFields` already builds, `algorithms/metrics/fields.ts:70-90`) and on
run-backed `ReadableValue`s. The app filters on the role.

### 6. Duck-typing of the element's step shapes and the "So far" availability rule remain

These are unchanged from round 1 (findings 8 to 10) and round 2 (finding 6):

- The picker's used check reads `attribute` or `reads` through casts, so a used `measure` step is
  never marked (`SelectionEditor.tsx:938-940`).
- `testLeaf` casts through `unknown` (`values.ts:293`).
- `runFieldOf` scans every readable value and every run field (`values.ts:115-127`).
- "So far" on a measure is decided from `scopeInput === "subgraph"` in the app
  (`StepCard.tsx:426-429`).

Fixes are as in `polish-1-architecture.md`: an element `stepValuePath(step)`, and `checkStep`
saying whether So far is available.
