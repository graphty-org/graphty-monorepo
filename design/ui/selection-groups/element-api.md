# Selection groups: what graphty-element adds

The graphty-element side of `spec.md`. Every item is additive and `@beta`, documented as
experimental beside the filter-conditions API. The saved `union` form becomes a file format once
released, so it stays `@beta` until the tier 5 user study has run on it. Paths are under
`graphty-element/src/`.

## Why each part is additive

- `RuleTree` is documented as an open union of leaf kinds (`catalog/types.ts`, "leaf kinds may be
  added in a minor release"), so new leaf kinds are additive. Each new leaf is also exported as its
  own `@beta` type.
- `Scope` does not change. It is `@public`, closed and returned (`ResolvedScope.spec`,
  `StaleNote.scopeSpec`, a run's frozen scope, `parseScope`), so widening it would break a
  consumer's exhaustive switch. The new references are a separate type, `StepReference`, accepted
  only inside the new leaves and resolved to node ids before any run starts, so no run, run param or
  registered algorithm ever sees one.
- Existing leaves only gain optional members whose absence keeps today's behavior, and two
  refusals are relaxed (degree paths, the reserved `threshold.percentile`).
- `session.styles.preview` (public since 3.26.0, a binding preview) is untouched; the picking view
  has its own name, `styles.showBranches`.
- The leaf is named `union` with `branches`, because the glossary keeps "group" for one part of a
  partition (`design/ui/framework/glossary.md`).

## Canonical example

The simple path, from the published types only: paint the busy staff red, leaving out the three
biggest bridges.

```ts
session.styles.add({
    name: "Busy staff",
    target: "node",
    selector: {
        match: "rule",
        where: {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: { kind: "degree", min: 6 } },
                        { op: "keep", rule: { kind: "categories", attribute: "data.role", values: ["staff"] } },
                        {
                            op: "except",
                            rule: {
                                kind: "measure",
                                algorithm: "betweenness",
                                field: "value",
                                test: { kind: "threshold", top: 3 },
                            },
                        },
                    ],
                },
            ],
        },
    },
    set: { "node.color": "#d33" },
});
```

graphty-element starts the betweenness run (no suggested styles), fills the ids and the color, and
keeps the layer current. The advanced path reads the same rule live: `session.scope.watchSteps(rule,
(reading) => ...)` gives every count, state and member scope (section 5).

## 1. The `union` leaf

```ts
/** @beta */
export interface UnionLeaf {
    readonly kind: "union";
    readonly side: "nodes" | "edges";
    /** The base: "visible" (the filtered graph) or "graph" (the full graph). */
    readonly within: "graph" | "visible";
    readonly branches: readonly UnionBranch[];
}
/** @beta */
export interface UnionBranch {
    readonly id?: string; // filled by the element on write; always present on read
    readonly name?: string;
    readonly color?: string; // filled from the branch palette on write (section 8)
    readonly on?: boolean; // default true
    readonly start: "all" | "none";
    readonly steps: readonly UnionStep[];
}
/** @beta */
export interface UnionStep {
    readonly id?: string; // filled by the element on write
    readonly op: "add" | "keep" | "except";
    readonly on?: boolean; // default true
    readonly rule: RuleTree;
    readonly computedOn?: "base" | "so-far"; // default "base"
    /** Only the edges passing this edge-side rule are read by the step's computation (spec 3.5). */
    readonly links?: RuleTree;
    /** An edge-side step reading a node value: both ends pass (default), or either. */
    readonly ends?: "both" | "either";
    /** Written by the element when it froze a live reference (section 7). */
    readonly frozenFrom?: "selection" | "hovered-or-selected";
}
```

- The result is the union of the branches that are on. A branch folds its steps in order from
  `start` (all or none of `side`, within the base). `start`, `side` and `within` are required while
  the leaf is `@beta`, so nothing is derived from the steps.
- A node-side step reads an edge value as the nodes touching a passing edge (`nodes: "ends"`); an
  edge-side step reads a node value by `ends`. A step still silent on `side` is the identity for
  Keep and Except and adds nothing for Add.
- Every population and denominator inside the leaf (threshold ranks, percentiles, `by-size` counts,
  the "of" of a count) is the base, or the step's input when computed on So far. Outside a `union`,
  leaves keep today's whole-snapshot populations.
- A rename or recolor is not a definition change: no run, cache or re-evaluation follows it.
- Refused with `E_BAD_COMMAND` and a `details.reason`: `within: "visible"` in a filter condition
  (`circular-scope`), a `union` inside a step (`nested-union`). Step semantics (states, readiness,
  order) are `spec.md` section 1; the element implements them and reports them (section 5).

## 2. References

```ts
/** @beta  A step's reference: a scope, or one of the two forms that exist only inside a step. */
export type StepReference = Scope | "hovered-or-selected" | "so-far";
```

`"hovered-or-selected"` is the hovered node, else a lone selected node: the set the existing
`{ match: "hover", orSelected: true }` selector reads, documented as one concept under two
spellings. `"so-far"` is the step's input. Both are view or step state and are valid only inside a
`union` step (else `E_BAD_COMMAND`, `reference-outside-union`). A reference that resolves to no node
matches nothing; bound to an algorithm option it never reads as unset (the step matches nothing,
never "the first node").

## 3. New leaves

All `@beta`. Those taking a `StepReference`, and `measure`, are valid only inside a `union` step in
this build.

| Leaf                                                          | Holds                                                                                                                       | Speaks      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `{ kind: "measure", algorithm, params?, bind?, field, test }` | the elements whose value of an algorithm's field passes `test` (below)                                                      | the field's |
| `{ kind: "hops", of: StepReference, max?, direction? }`       | nodes at most `max` hops from the reference, the reference included; no `max`: its components; `direction` as `degree` has  | nodes       |
| `{ kind: "touching", of: StepReference, ends }`               | edges with `"either"`, `"both"` or exactly `"one"` end in the reference                                                     | edges       |
| `{ kind: "nonempty", of: StepReference }`                     | everything while the reference holds a node, else nothing                                                                   | both halves |
| `{ kind: "same-value", path, as: StepReference }`             | elements whose value of `path` equals (or, for a list, shares) a value a reference node holds; follows the node across runs | the path's  |
| `{ kind: "by-size", path, min?, max?, top?, from?, ties? }`   | elements whose category of `path` has a member count in `min..max`, or is among the `top` categories by size                | the path's  |

**`measure`.** `bind` maps an algorithm's node options to references, resolved to ids before the
algorithm is called and recorded as ids in the run's params. `test` is one of the bodies of `range`,
`threshold`, `categories`, `text`, `by-size` or `same-value` without its path. On the base, the
element reads the session run with the same algorithm, params and scope, or starts one on commit
(listed in Analyze, `applySuggestedStyles` unset). That run is shared by every reader of the same
definition; removing it in Analyze makes the step pending (`run-needed`); a stale one is rerun under
the run limits (section 6). Computed on So far, or with a live reference bound, the computation
belongs to the step: cached by definition, shared by identical steps, recomputed when its input
changes, not a `session.runs` entry, no undo step, rebuilt on load rather than saved.

"Community of Valjean" is `measure` (or a `results` path) with `test: { kind: "same-value", as:
{ nodes: ["Valjean"] } }`; the checklist's member for each unstable value comes from `histogram`
(section 9). "On a path between" is `measure` of shortest path with both endpoints bound.

## 4. Additions to existing leaves

- `threshold`: `from?: "high" | "low"` (default high, today's), `percentile?: number` (the reserved
  member, built: a cut by share of the population, whole tie groups kept as `top` keeps them), `as?:
"time" | "order"` (instants as `range` reads them; a declared level order), `missing?`.
- `range`: `missing?: "include" | "exclude"` (default exclude, today's).
- `categories`: `missing?`; `match?: "any" | "all"`, which reads list values (contains any, contains
  all); absent, today's behavior.
- `graphty.degree`, `graphty.inDegree` and `graphty.outDegree` are accepted as paths by `threshold`,
  `range` and `histogram`, so degree needs no run.
- `UnionStep.links` (added 2026-11-01): an edge-side rule. The step's computation -- a `measure`, a
  degree path, `hops`, `touching`, `same-value` over a run -- reads only the edges that pass it, within
  the step's input. Like So far, such a computation belongs to the step (cached by definition,
  shared by identical steps, not a `session.runs` entry, rebuilt on load). `watchSteps` reports the
  step's `links` count, and `histogram(path, { within, links })` draws the scoped values. A `links`
  rule holding a `union` or a node-side leaf is refused (`E_BAD_COMMAND`, `links-not-edges`).

## 5. Reading a selection: `session.scope.watchSteps`

```ts
watchSteps(rule: RuleTree, onChange: (reading: StepsReading) => void,
    options?: { side?: "nodes" | "edges"; within?: "graph" | "visible" }): { readonly current: StepsReading; end(): void };
asUnion(rule: RuleTree, options: { side: "nodes" | "edges"; within: "graph" | "visible" }): UnionLeaf | null;
checkStep(step: UnionStep, options: { side; within; host: "selector" | "filter" }): CodedFact | null;
```

- `watchSteps` reads a `union` leaf, or any other tree through `asUnion` (then `options` is required).
  `current` is synchronous; the element calls `onChange` itself when data, runs, sets, hover or
  selection change what the rule holds, at most once a frame. The app never decides when to recount.
- `StepsReading`: the canonical rule (ids, colors); the total `{ count, of }` over the ready
  branches and the ids of the pending ones; the result as a `Scope`; per branch its id, color, state,
  reason, count and members (a `Scope`); per step its state (`"applied" | "inert" | "pending"`, open),
  reason, count so far, `input` and `members` (each a `Scope` that `selection.apply`, `scope.count`,
  `histogram` and `sets` accept), `orderMatters` (the order icon), the run id behind its chip, and
  `frozen`; and `branchOf(id)`, the first on branch holding an element (the table's Group column).
- Reasons are `CodedFact`s. Inert: `test-unset`, `no-reference`, `one-node-only`. Pending:
  `computing`, `run-needed` and `stale` (with `estimateMs`), `run-paused`, `run-failed` (with the
  error code), `waits-for` (with the step id). Applied notes: `input-empty`, `reference-empty`,
  `nothing-measured`, `reference-outside`, `frozen-from` (with `reference` and `count`).
- `asUnion` converts tier 4 flat cards: a leaf, or an `all` of leaves and `not`s, is one branch
  starting all with Keep and Except steps; an `any` of leaves is one branch per leaf starting none;
  anything else is `null`. Writing a converted form back is the consumer's choice.
- `checkStep` returns the refusal the element would give writing that step on that host, such as
  `circular-scope` for a filter-graph run read in a filter, so the picker greys it with the element's
  reason.

## 6. Runs: limits and consent

- `session.scope.setOptions({ liveMs?, askAboveMs?, branchPalette? })` and `session.scope.options`.
  Unset (the default), every run starts when its step is written or its input changes. With
  `liveMs`, a run that follows hover or the reader's edits starts only under it (else `run-paused`);
  with `askAboveMs`, a run estimated above it waits (`run-needed`). The graphty app sets 50 and 1000.
- `session.scope.allowRun(rule, stepId)` is the reader's Run: consent for that step's definition,
  held until the definition changes. `session.scope.cancelRun(rule, stepId)` cancels a computing
  step's run, leaving it `run-needed`.

## 7. Freezing live references

When a `union` leaf is written into a filter condition (`visibility.addCondition`, `setConditions`,
`updateCondition`) or a set definition, graphty-element replaces `"selection"` and
`"hovered-or-selected"` with `{ nodes }`, records `frozenFrom` on the step, and reports `frozen-from`.
In a style selector they stay live. The app never reads the selection to write ids.

## 8. The picking view: `session.styles.showBranches`

```ts
showBranches(input: { rule: UnionLeaf; rest?: "faint" | "plain"; hold?: FilterConditionId }): { end(): void };
readonly showingBranches: boolean; // event "style:branches-shown-changed"
```

Members draw in their branch's color (the first branch wins), pending branches' last ready results
outlined; `rest` defaults to `"plain"`; `hold` draws what that filter condition would remove, faint.
Every layer is suspended, the selection ring and hover mark stay. One at a time; a replaced handle's
`end()` does nothing. Not a layer, no undo step, never saved. Branch colors: the first color of
`branchPalette` (default: the element's categorical palette, clear of the ring and hover hues) that no
other branch of the leaf holds, written on write; the palette never wraps, so a branch past its size
is refused with `E_CAP_EXCEEDED`.

## 9. Facts

- `valueKind` (open: `"number" | "time" | "ordered" | "category" | "tags" | "flag" | "text"`) on
  attribute and field descriptors, derived by the element from the published type, `measurement`,
  a declared `order` and list values. The app never derives a kind.
- Optional field facts `domain`, `polarity`, `order`, `missing`, `unstable`; `keywords` on algorithms.
  Declaration fixes that change no output: 0..1 domains, `polarity: "lower"` on distances and ranks,
  `missing: "unreached"` on bfs and shortest path. Retagging bfs `level`, k-core and dfs `value` as
  ordered waits for the owner; this build keeps today's kinds.
- `session.scope.histogram(path, { within?: Scope })` for any readable value, run fields and degree
  included, over a sorted index per path, set and data version; for an unstable category, each value
  carries the member "the group of X" names (its best-connected member).
- An additive `selection.focused` only if the keyboard-walked node is not already published.

## Used as is

`session.estimate`, `visibility.conditions`, `conditionCounts`, `selection.hovered`, `sets.list()`,
`Run.siblingsDifferBy` for the scope word in run titles, `CodedFact`.
