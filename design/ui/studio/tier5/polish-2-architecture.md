# Tier 5 polish round 2: architecture review of the selection editor

What was reviewed: the selection editor at d231869fd5 on `design/studio-tier5` (the app's
`graphty/src/workspace/selection/`, the filter and style hosts, the preview key and the table's
Group column) and graphty-element's selection additions, read as `git diff origin/master...HEAD`,
against `design/ui/selection-groups/spec.md` and the repository's architectural principles: no
graph logic in the app, no workaround of the element, additive `@beta` API, presentation-neutral
element output.

How: the built app (`graphty/dist`, built after HEAD) driven with `real.mjs` on two small JSON
graphs made for the review (`flags.json`: a yes-or-no column `vip`; `ranks.json`: number columns
named `rank` and `percentile`); graphty-element's session probed with a temporary vitest file
(kept at `tmp/design-studio/tier5/polish-2/architecture/zz-arch2-probe.test.ts`, removed from
the worktree). Screenshots are under the main checkout's
`tmp/design-studio/tier5/polish-2/architecture/` (`s1/`, `s2/`).

Round 1's blockers are fixed and hold: a filter card with an algorithm step is written and counted
(probe Q6), and "Or" is off once `StepsReading.branchesLeft` is 0. Three round-1 findings were
carried to the next build round in `decided.md` and still reproduce; they are restated briefly at
the end, with fresh evidence, because two new findings below grow out of them.

Only verified problems are listed, most severe first.

## Blockers

### 1. Picking a yes-or-no column writes an applied "is Yes" test the reader never chose

Every other kind of value enters as an untested, inert step (spec 1: "A step with a value is kept
(inert until tested)"). A yes-or-no value does not: the app's `untested()` writes
`{ kind: "text", reads, mode: "exact", text: "true", caseSensitive: true }`
(`graphty/src/workspace/selection/values.ts:58-59`), which graphty-element reads as applied
(probe Q4: `state: "applied", count: 15` of 30). In the import filter that crosses
`FilterSelection.applies`, so the pick alone writes the condition.

In the app: Data, Filters, "+", pick `vip`: the card is written at once as "vip yes, 10 of 20",
the canvas selects 10 nodes, the inspector says "10 nodes selected" and Undo is armed
(`s1/05.png`). The reader picked a value and got a filter.

Root cause is the app inventing a test for a kind it classifies itself (round 1, finding 4):
graphty-element publishes `valueKind: "flag"` for this column (probe Q4) and the app never reads
it.

Fix: graphty-element gives every value kind an untested form it reads as `test-unset` (for a flag,
`categories` with `values: []` on the flag path, or an additive `@beta` helper such as
`scope.untestedStep(path)` that returns the inert leaf for any readable value), and the app writes
that instead of choosing a test. Add an app real-element test that picks a yes-or-no column in a
new filter card and asserts nothing is written and nothing is selected.

### 2. A data column named `rank` or `percentile` cannot be picked

`pickerFields` drops every field whose path ends in `.rank` or `.percentile`
(`values.ts:96-98`) to hide a run's rank and percentile companions (spec 4). It runs on Data
columns too, so `data.rank` and `data.percentile` vanish. On `ranks.json` (columns `rank` and
`percentile`, both numbers), the filter card's picker lists Node id, Degree, In-degree,
Out-degree and nothing else under Data (`s2/04.png`): neither column can be filtered or styled by.

This is the app sniffing path strings for a fact about a run's fields. Fix: graphty-element marks
a run field's companions (for example an optional `@beta` `role: "rank" | "percentile"` on
`ReadableValue` for `from: "run"` entries, next to the field name of round-1 finding 8), and the
app filters on that; until then, at minimum apply the suffix test only to `group === "Results"`.

## Major

### 3. A new filter card kept on Done lives only in React state and is lost on a place switch

Round 1's fix keeps a new card whose step has no test yet, folded, on Done
(`Filters.tsx`, `onDraft={setDraftRule}`; `FilterSelection.tsx:99-101`). graphty-element never
holds it: the card is written only when a step applies. Verified: new card, pick Results
"Betweenness", Done: the folded card reads "Betweenness: Bridging No test" (`s1/14.png`); click
Graph, then Data: the card is gone (`s1/16.png`). It is also outside undo, autosave and the saved
project.

This is graph configuration held by the app (the principle: the app must not own graph state),
forced by the element having no way to hold a condition that does nothing yet: with base "No
nodes" and effect Keep, an inert union would hide everything.

Fix (graphty-element, additive on the `@beta` union leaf): a condition whose `union` has no
applied step is inert (removes and selects nothing) and its counts say so with a reason code;
then the app writes every new card on its first edit, and `applies()` and the draft go.

### 4. Reading a selection still starts session runs, from React render

Carried from round 1 (finding 3; `decided.md` lists it for the next build round). Still true at
HEAD: a `scope.watchSteps` watch ended at once leaves `betweenness:"graph":succeeded` (probe Q1);
the start is `queueMicrotask(() => sources.runs.start(...))` in `baseState`
(`graphty-element/src/session/scope/stepRuns.ts:360-367`). The app peeks during render in
`useSteps` (`useSteps.ts:28-31`) and in `FilterSelection.applies` (`FilterSelection.tsx:28-32`).
Round 1 added two more render-time readers of this kind: `SelectionSummary` (the folded chips in
both hosts) calls `useSteps`, so every folded style row and filter card can start a run while it
first renders.

Fix as round 1: `watchSteps` reports `run-needed`/`computing` and starts nothing; runs start on
write or through an explicit additive `scope.startSteps(rule)`; the app drops the render peek.

### 5. The import filter lists filtered-graph runs un-greyed, and a pick reads a different run

Carried from round 1 (finding 5). After Analyze, Betweenness (run on the filtered graph), the
filter card's picker lists Results "Betweenness" with no greying and no tooltip (`s1/11.png`,
hover printed `tooltip: null`) and the Analyze categories omit it because it "ran" on some
scope (`values.ts:164-170`). `checkStep` on that measure in a filter still returns `null`
(probe Q3), the readable value still has no run-field name (probe Q3 keys:
`path, plainName, technicalName, on, from, runId, kind, valueKind, valueCount, completeness,
fits, usedBy, tests`), and a measure picked from a full-graph run in a style host starts and
reads a second, filtered-graph run (probe Q2: `louvain:"graph"` then `louvain:"visible"`).

Fix as round 1: graphty-element's `checkStep` (or the readable value) states whether a step on
this host and base can read the run and which run a measure would read; the app greys by it and
lists the algorithm under Analyze for the host's base.

## Minor

### 6. Used algorithm steps never show the picker's used check

The picker's `used` list reads a step's path by duck-typing `attribute`/`reads`
(`SelectionEditor.tsx:835-840`); a `measure` step has neither, so a Results or Analyze value
already used in the group is never marked (spec 4: "A used value shows a dimmed check"). Same
cause as round-1 finding 9 (casts for the element's step shapes). Fix: an element helper
`stepValuePath(step)` (or the run field on the step reading), used here and in `missingOf`
(`StepCard.tsx:309`).

### 7. Round-1 findings 8 to 10 stand unchanged

`runFieldOf` still scans every readable value and run field (`values.ts:111-124`); `testLeaf`
still casts through `unknown` (`values.ts:288-290`); "So far" availability is still decided from
`scopeInput === "subgraph"` in the app (`StepCard.tsx:413-415`). Fixes as in
`polish-1-architecture.md`.

## What holds

- Counts, drawn counts, colors, members and states come from `watchSteps` and `branchOf`; the
  preview key now shows `BranchReading.drawn` (`PreviewKey.tsx:46`), and an off branch reads
  `drawn: 0, state: "off"` in the element too (probe Q5), so hiding its row agrees with it.
- "Or" is disabled from `StepsReading.branchesLeft`, not from counting the palette.
- A waiting step's number is hidden from `StepReading.waiting`; `count` stays a number, so the
  round-1 type change was reverted before it reached the API report.
- The API report adds no `@public` selection export (`DEFAULT_BRANCH_PALETTE` is `@beta`) and
  removes nothing.
- No compact-mantine file is changed by the editor; the number box's short form and the slider's
  `aria-valuetext` are app presentation.
