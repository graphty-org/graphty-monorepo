# Tier 5 polish round 1: architecture review of the selection editor

What was reviewed: the selection editor built on `design/studio-tier5` at 7225138fd3 (the app's
`graphty/src/workspace/selection/`, the filter and style hosts, the table and canvas key that read
the open selection) and graphty-element's additions for it (`union` leaf, `scope.watchSteps`,
`styles.showBranches`, the step runs), against `design/ui/selection-groups/spec.md`,
`element-api.md` and the repository's architectural principles: no graph logic in the app, no
workaround of the element, additive `@beta` API, presentation-neutral element output.

How: `git diff origin/master...HEAD` read for both packages; the built app (a frozen copy of
`graphty/dist` at 7225138fd3) driven with `real.mjs` on Les Miserables; graphty-element's session
probed directly with a temporary vitest file (kept at
`tmp/design-studio/tier5/polish-1/architecture/zz-arch-probe.test.ts`, removed from the worktree).
Screenshots are under the main checkout's `tmp/design-studio/tier5/polish-1/architecture/s1/`.

Only verified problems are listed, most severe first.

## Blockers

### 1. A filter card that reads an algorithm cannot be written, and the Data panel crashes

graphty-element refuses a `measure` step inside a filter condition: `visibility.addCondition` with
a `union` holding `{ kind: "measure", algorithm: "louvain", field: "group", test: ... }` throws
`E_UNSUPPORTED` "This session cannot evaluate a "measure" filter, because a runs registry for union
steps is not attached to it" (probe P6). The step runs are handed to the scope API
(`GraphSession.ts:2878`, `ScopeApi.ts:740`) but never to the visibility compiler, so
`compileMeasure` (`graphty-element/src/session/visibility/filter.ts:2158-2161`) always throws for a
filter.

In the app: Data, Filters, "+", pick Results "Louvain", tick "Group 3, 11 nodes": the toast reads
"The filter could not be changed" and the Data panel is replaced by "This panel could not be shown"
(`s1/26.png`; console: the same `E_UNSUPPORTED`). Every algorithm entry in the import filter's
picker (Results, the Analyze categories, Added) leads here, so spec acceptance 10 and 11 in the
filter host are impossible. No element or app test writes a measure into a filter condition, which
is why it passed.

Fix (graphty-element): pass the session's step runs into the visibility compiler's sources (the
same `lateStepRuns(stepRunsRef)` the scope API gets) and give a condition's union a step frame, so
`compileMeasure` reads the full-graph run; add an element test that writes a measure union with
`visibility.addCondition` and counts it, and an app real-element test that ticks a Louvain group
in a filter card.

### 2. The seventh group crashes the style panel

graphty-element's branch palette has six colors and refuses a seventh branch with
`E_CAP_EXCEEDED`, in the write and also in the read: `scope.watchSteps` throws on a seven-branch
rule (probe P3), as do `styles.add` and `styles.showBranches`. The editor never disables "Or"
(`SelectionEditor.tsx:665-679` has no `disabled`, though spec section 4 asks for it, reason in the
tooltip) and reads every edit through `watchSteps` during render (`useSteps.ts:25-30`, the
render-time peek). Pressing "Or" six times (each followed by Escape) on Layer 1: the sixth press
throws "A selection holds at most 6 branches" during render and the inspector shows "This panel
could not be shown", toast "That rule could not be used for this layer" (`s1/19.png` six groups
and "Or" still enabled, `s1/20.png` the crash).

Fix: graphty-element reports the room left (for example `StepsReading.branchesLeft`, or a
`CodedFact` from `checkStep`/a new `scope.checkBranch`) and `watchSteps` reads an over-cap rule
without throwing (an extra branch reads `state: "off"` with a reason code) -- a read API must not
throw on a rule a consumer is holding; the editor disables "Or" from that fact with its tooltip
reason, never counting palette entries itself.

## Major

### 3. Reading a selection starts session runs (`watchSteps` is not a pure read)

Creating a `scope.watchSteps` watch and ending it at once leaves a new session run behind:
on a fresh session, a watch of `{ op: "add", rule: { kind: "measure", algorithm: "betweenness",
field: "value" } }` ended immediately leaves `betweenness:"graph":succeeded` in `session.runs`
(probe P1). The start happens inside evaluation (`stepRuns.ts`, `baseState`, the
`queueMicrotask(() => sources.runs.start(...))`). The guide's own `readCounts` example
(`test/types/consumer/selection-steps-guide.ts`) is exactly such a read.

The app reads this way on every edit: `useSteps` peeks synchronously during React's render
(`useSteps.ts:25-30`), and `FilterSelection.applies` peeks to decide whether to write a new card
(`FilterSelection.tsx:19-23`). So runs are started from React render and from rules that are never
written; in the app the filter pick above left a second Louvain run (the canvas key's title
changed to "Louvain (visible)" because a sibling now differs by scope, `s1/26.png`). Spec section
4 says starting a run is the commit, and section 6 that the step's run starts "on commit".

Fix (graphty-element): keep reading pure -- `watchSteps` and its `current` evaluate and report
`run-needed`/`computing` but start nothing; runs start when the rule is written (`styles.add`,
`setSelector`, `addCondition`, `updateCondition`) or through an explicit additive call (for
example `scope.startSteps(rule)`), under the same limits. The app then drops the render-time peek
(`useSteps` takes the first reading in an effect or `useSyncExternalStore`) and stops gating a
new filter card's write on a peek.

### 4. The app derives a value's kind instead of reading the element's `valueKind`

graphty-element now publishes `valueKind` (`number | time | ordered | category | tags | flag |
text`) on every readable value and structure value (`readable.ts:95`, `valueKindOf`), and spec
section 5 says "the app never derives a kind". The app never reads it: `grep valueKind
graphty/src` finds only a refusal's params in `style/words.ts`. `cardFields` builds its own kind
from the older `kind` plus `measurement` (`graphty/src/workspace/style/cards.ts:184`,
`kind: time && value.kind !== "number" ? "date" : value.kind`), and the picker, the step card and
`untested()` (`selection/values.ts:48-63`) switch on that. So an ordered, tags or flag value gets a
category, text or yes-no card, never the control spec section 5 gives it, and the two
classifications can drift. `untested()` also invents a test for a yes-or-no value
(`{ kind: "text", reads, mode: "exact", text: "true" }`), so picking a flag column writes an
applied "is true" step instead of an inert one (spec 1: "A step with a value is kept (inert until
tested)").

Fix: key `CardField` and the picker glyph off `ReadableValue.valueKind`; for a flag, write the
untouched form the element reads as `test-unset` (if none exists for flags, add it to the element:
for example `categories` with `values: []` on the flag path, which is already inert).

### 5. The import filter's picker cannot grey filtered-graph runs; a pick silently binds another run

Spec section 4 and acceptance 10: in the import filter, filtered-graph runs are greyed with the
element's reason, and picking the algorithm starts a full-graph run. Verified otherwise:

- The app never calls `scope.checkStep` (`grep checkStep graphty/src` finds nothing). In the
  filter card the Results entry "Louvain" (an Analyze run on the filtered graph, the Analyze
  default) is listed normally with no tooltip (`s1/23.png`; hover printed `tooltip: null`).
- Even called, `checkStep` could not grey it: the app writes a Results pick as
  `{ kind: "measure", algorithm, params, field }` without the run's scope (`values.ts:111-147`;
  `runFieldOf` computes `scope` and drops it), and `checkStep` returns `null` for that measure in a
  filter, while it returns `circular-scope` only for the run's path form (probe P5).
- The pick therefore reads a different run: with a full-graph Louvain run present, a style step
  on Louvain (`within: "visible"`) starts and reads a second, filtered-graph run (probe P2:
  `louvain:"graph"` then `louvain:"visible"` added). The reader picked one run's groups by name
  ("Group 3, 11 nodes" from the run whose colors are on the canvas) and the step tests another
  run's numbering, which a non-deterministic community method need not share.
- Separately, the Analyze categories hide any algorithm with a succeeded run on any scope
  (`values.ts:164-176`), so in the filter host, once Louvain ran on the filtered graph, the only
  Louvain entry is the un-greyed Results one.

Fix (graphty-element first): give `checkStep` (or the readable value) the fact the picker needs --
for a run field, whether a step on this host and base can read that run, and which run a measure
of it would read -- and let `measure` name the run it was picked from when its scope matches the
base. The app then greys by that fact and lists the algorithm under its Analyze heading for the
host's base, instead of filtering by "has any run".

### 6. `DEFAULT_BRANCH_PALETTE` is published `@public`, not `@beta`

`graphty-element/api/session.api.md` adds `// @public export const DEFAULT_BRANCH_PALETTE`
(source `graphty-element/src/session/scope/steps.ts:225-236`, no release tag). Everything else in
this work is `@beta`, and element-api.md section 8 makes the palette an option of the experimental
picking view. As `@public` its six values and its existence become a stable contract: changing a
color or removing it later is a breaking change. It also caps the feature at six groups (finding 2).

Fix: tag it `@beta` with the "Experimental: may change or be removed in a minor release" line, and
regenerate the API report.

## Minor

### 7. `StylesApi` lost its documentation

`BranchesView` was inserted between `StylesApi`'s TSDoc block and the interface
(`graphty-element/src/session/styles/StylesApi.ts:434-458`), so the block now attaches to nothing
useful and the API report changes `// @public` to `// @public (undocumented)` on `StylesApi`
(`git diff origin/master...HEAD -- graphty-element/api/session.api.md`). Fix: move `BranchesView`
above the `StylesApi` comment.

### 8. The app reverse-engineers a run field from its readable path

`runFieldOf` (`selection/values.ts:111-124`) finds a Results field's algorithm, params and field
name by scanning `session.data.readableValues()` for the path, then every field of the run for the
one whose `session.results.path(run.id, name)` equals it, because `ReadableValue` carries `runId`
but not the field name (probe P5 lists its keys). That is the app papering over the element's
shape. Fix: add an optional `field` (the run field's name) to `ReadableValue` for `from: "run"`
entries, and delete the scan.

### 9. Type casts stand in for the element's step types

`testLeaf` builds a leaf with `{ ...test, attribute: path, path, reads: path } as unknown as
RuleTree` (`values.ts:288-290`); the picker's `used` list duck-types a step's path with
`(step.rule as { attribute?: string; reads?: string })` (`SelectionEditor.tsx:735-740`);
`missingOf` casts to `{ missing?: string }` (`StepCard.tsx:296-302`). Each hides a shape the
element should state (a measure test as the leaf it is the body of; which value a step reads).
Fix: an element helper such as `measureAsLeaf(measure, path)` / `stepValuePath(step)`, or exported
narrow types the app can switch on without casts.

### 10. "Computed on: So far" availability is decided by the app

`StepCard.tsx:400-404` offers So far when the catalog descriptor's `scopeInput === "subgraph"`;
spec section 4 also wants it disabled, with its reason, when So far equals the base. That decision
(and its reason) is the element's: `checkStep` (or the step reading) should report whether So far
is available and why not, as a `CodedFact`, and the menu item render that.

## What holds

- Counts, states, reasons, colors, members, order icons and the Group column all come from
  `watchSteps` / `branchOf`; the app does no counting or set algebra (`model.ts` only edits the
  rule's list structure).
- References freeze in the element: a filter condition written with `of: "selection"` is stored
  as `{ nodes: ["n1"] }` with `frozenFrom: "selection"` (probe P4).
- The element returns codes only (`StepReasonCode`, `CodedFact`); every sentence is in the app's
  `selection/words.ts`.
- The run limits are app choices set through `scope.setOptions({ liveMs: 50, askAboveMs: 1000 })`
  (`Workspace.tsx:102`); the element's default is unset, as the "choices" principle asks.
- The picking view is drawn by `styles.showBranches`, not by hiding layers or touching meshes.
- No compact-mantine file is changed by the editor.
