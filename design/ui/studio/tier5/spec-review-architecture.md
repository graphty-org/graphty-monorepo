# Selection groups spec: architecture and API review

Reviewed: `design/ui/selection-groups/spec.md`, against graphty-element's `src/session/` and
`src/catalog/types.ts` as they are on branch design/studio-tier5. Only verified problems are listed.
Paths below are under `graphty-element/src/`.

## Blockers

### 1. `session.styles.preview` is already a public method with another meaning

- Evidence: `session/styles/StylesApi.ts:889` -- `preview(binding: RuleBinding, options: { channel,
bins?, span?, within? }): BindingPreview`, public since 3.26.0, used by the app's binding editors.
  Spec section 10 item 7 adds `session.styles.preview(input): { end(): void }`.
- Why it blocks: same name, different argument and return types. An overload is confusing to read
  and type-narrow, and changing the existing signature is breaking.
- Fix: a new name, for example `styles.showGroups(input): { end(): void }`, with
  `styles.showingGroups` and `style:groups-shown-changed`. Update section 9, section 10 item 7 and
  decided.md.

### 2. Who starts and gates a run is contradictory, and as written it is the app

- Evidence: section 6 and decided.md: "Picking a not-yet-run field starts the ordinary Analyze run
  on commit ... gated by the element's estimate (live under about 50 ms, automatic with Cancel under
  about 1 s, else Run (about X)). Consent holds while a later estimate stays within twice."
  Section 10 item 3: the `measure` leaf gates and starts runs "only where no existing leaf reads the
  value". Section 10 last paragraph: the app "never ... sequences a run". No API is listed for
  pressing Run, for Cancel, or for holding consent; `session.estimate` (`session/types.ts:4079`) only
  returns a number.
- Why it blocks: the only way to build sections 6 and 12 checks 8, 10, 11 and 15 with the listed API
  is for the app to call `estimate`, compare it with 50 ms / 1 s, store consent and call `runs` --
  detection, sequencing and policy in the app, which CLAUDE.md forbids.
- Fix: one path. A step on a field that has not run is a `measure` leaf; the element starts it,
  gates it, holds consent and reports `run-needed` / `computing`. Add the reader's action as API,
  e.g. `session.scope.allowRun(rule, stepId): Run` and cancel through the returned `Run`. Make the
  thresholds element options with documented neutral defaults (see minor 4). Once the run exists the
  element may report the run id per step so the app's "run chip" can link to it; the app never
  rewrites the leaf into a `results.<run>.<field>` path.

## Major

### 3. The `measure` leaf is under-specified: no scope, no `test` type, no lifecycle

- Evidence: section 10 item 3 `{ kind: "measure", algorithm, params?, field, test }`. Section 2
  says the style host reads runs on `scope: "visible"` and the filter on `scope: "graph"`, but the
  leaf has no scope. `test` has no type anywhere. Section 6 says So far runs are "listed in Analyze
  as <Method> (A, step 2), removed with the step" and that equal definitions "share one run", but not
  whether they are `session.runs` entries, undo steps, or saved in the project.
- Fix: add `scope?: "graph" | "visible"` (refused as `"visible"` inside a filter condition: circular),
  define `test` as the existing leaf shapes minus their path (`range` / `threshold` / `categories` /
  `text` bodies), and state: measure runs are `session.runs` entries owned by the leaf (reference
  counted across layers and filter cards), not undo steps of their own, re-created on load rather
  than saved. The "(A, step 2)" title is English: the element returns `{ code, params }` (or the
  owning step's ids) and the app writes the words.

### 4. Group and step membership is not exposed, so the app would build prefix rules

- Evidence: section 8 (Group column, "first group wins"), 8 "count chips select what they count"
  (`task-flows.md` 4.3), section 10 item 7 `preview({ groups: [{ scope, color }] })`. Item 5
  `countSteps` returns counts, states and colors only.
- Why: to select a step's members, paint the table's Group column or feed the preview, the app must
  construct "group A up to step 2" as a rule (the left fold of Add / Keep / Except) and first-wins
  membership itself -- reimplementing the leaf's semantics.
- Fix: `countSteps` returns, per group and per step, a `Scope` the element defines (a `{ define }`
  the app can hand to `selection.apply`, `scope.count` and `sets`), plus a membership read,
  e.g. `session.scope.groupOf(rule): { nodes: Int16Array; edges: Int16Array }` (first group wins,
  -1 for none). The preview takes the `groups` leaf itself:
  `showGroups({ rule, rest?, hold? })`, colors resolved by the element.

### 5. `countSteps` has no universe, no side and no change signal

- Evidence: section 1 "24 of 77 ... out of the host's whole graph", which section 2 makes the
  visible graph in a style and everything loaded in a filter. `ScopeApi.count` (`session/scope/
ScopeApi.ts:261`) is async and takes no universe. Section 2 lists re-evaluation triggers (data,
  runs, sets, hover, selection) but section 10 names no event.
- Why: without a universe the element cannot give the "of" figure or decide what Start with All
  means for counts; without an event the app must subscribe to five event families and decide when
  to recount, which is sequencing.
- Fix: `countSteps(rule, { within?: "graph" | "visible", side?: "node" | "edge" })` returning node
  and edge counts per row, and either a live handle (`watchSteps(rule, opts): { current, end() }`
  with a `changed` callback) or a `scope:steps-changed` event. State whether it is synchronous.

### 6. Freezing Selected in a filter is assigned to nobody, and the element accepts it live today

- Evidence: `session/visibility/filter.ts:622-629` refuses only `"visible"` and `"search"` in a
  filter's `member` leaf; `{ kind: "member", of: "selection" }` is admitted. Nothing in
  `session/visibility/` reacts to selection changes. Spec section 2: "Selected freezes to node ids on
  commit".
- Why: the app would read the selection and write ids -- deciding what a filter may reference. A
  third-party consumer gets a filter that reads the selection once and silently goes stale.
- Fix: in graphty-element, refuse live view-state scopes (`"selection"`, the new `"focus"`) in
  filter conditions with a coded error, and offer the freeze as an option, e.g.
  `addCondition(input, { freeze: true })` resolving them to `{ nodes }` on write, recorded with
  `{ code: "frozen-from", params: { scope: "selection", count } }` so the chip can show it.

### 7. Tier 4 cards "open as one group": the conversion has no owner

- Evidence: section 10 item 1 "Tier 4 flat cards convert losslessly"; acceptance check 6. Saved
  conditions are plain `RuleTree`s (`catalog/types.ts:1971`, `FilterCondition.rule`).
- Why: if the app rewrites an `all` of leaves into a `groups` leaf, that is "translating between two
  spellings the element never settled" (CLAUDE.md).
- Fix: an element function, `session.scope.asGroups(rule): GroupsLeaf | null` (null when the tree
  is not expressible), and `countSteps` accepting any `RuleTree` by reading it through the same
  function. Writing back stays the consumer's choice of form.

### 8. `node-id` / `node-set` options accepting a Scope changes what readers get back

- Evidence: section 10 item 2 "`node-id` and `node-set` options accept a Scope". Today these are
  ids (`catalog/types.ts:520-521`; `optionsFor` returns them as one choice per node id,
  `catalog/types.ts:2450`). Run params are read back by consumers and passed to registered
  algorithms.
- Why: a reader or a third-party algorithm typed for a `NodeId` would receive `"focus"` or
  `{ set }`: breaking on the read side, and a run whose param is live hover would re-run on pointer
  moves.
- Fix: the Scope stays in the rule (the `measure` leaf's params or the Relative-to leaf); the
  element resolves it before calling the algorithm and records the resolved ids in the run's params.
  Algorithms and run params never see a Scope.

### 9. Steps that read a `"visible"` run go stale without saying so

- Evidence: runs carry `stale: StaleNote | null` (`session/runs/types.ts:709`) and do not recompute
  when the filter changes. Section 2 makes style-host runs `scope: "visible"`; section 10 item 5's
  reasons have no stale code.
- Fix: add a `stale` reason (applied but from a stale run) to `countSteps`, and have the element,
  not the app, re-run measure-leaf runs on change as item 3 already promises; ordinary Results
  reads report the stale note.

### 10. No canonical consumer example; ids are required bookkeeping

- Evidence: section 10 has a type but no example; CLAUDE.md "Easy things easy" requires the
  canonical example before review. The `groups` type requires `id` on every group and step, where
  the filter API's precedent makes ids optional on input (`FilterConditionInput`,
  `catalog/types.ts`).
- Check: a consumer CAN select nodes for a style layer in about 8 lines today with
  `selector: { match: "rule", where: { kind: "threshold", path, top: 10 } }`; that simple path is
  unaffected. The `groups` path needs ids and has no example.
- Fix: a `GroupsLeafInput` with optional ids (made by the element, returned canonical), and this
  example in the spec and the TSDoc:

    ```ts
    session.styles.add({
        name: "Busy staff",
        target: "node",
        selector: {
            match: "rule",
            where: {
                kind: "groups",
                groups: [
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

## Minor

1. `E_BAD_RULE` does not exist (`errors/codes.ts`; filter rules throw `E_BAD_COMMAND`,
   `session/visibility/filter.ts:394`). Use `E_BAD_COMMAND` with `details.reason: "so-far-outside-groups"`,
   or declare the new code as an additive entry.
2. The `"focus"` scope is the same concept as the existing `{ match: "hover", orSelected: true }`
   selector (`catalog/types.ts:1235-1247`) under a second name. Document the hover selector as
   `member of "focus"` (or name the scope `"hovered-or-selected"`) so there is one spelling.
3. "Next color of the element's group palette": a categorical palette never wraps
   (`session/styles/palettes.ts:21`). Say what the 9th+ uncolored group gets, and whether
   reordering groups recolors uncolored ones (it would if color is by position).
4. The cost gate numbers (50 ms live, 1 s automatic, 2x consent) are a consumer's choice by the
   "offers choices" rule: element options with documented defaults, not constants in the spec.
5. Group `name` and `color` live in the rule tree: a rename or recolor produces a new definition
   object, so the spec should say they do not count as a definition change for the `measure` cache
   or for re-evaluation, and that `countSteps` reasons stay `{ code, params }`.
