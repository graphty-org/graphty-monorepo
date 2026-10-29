# Filter cards

Filters in the graphty app's Data place become a flat list of condition cards. Each card states
conditions, has a Select / Hide toggle, can be switched on and off, and shows its own "X of Y"
count. Order never matters. The card is the one the Style panel's Which picker already draws for a
style layer's target; later the same card serves a saved set and a run's or an export's scope.

In graphty-element the concept is a **filter condition**: the element holds conditions, matches
them, counts them and saves them. "Card" is the app's word for how it draws one.

The owner chose this model (option B) on 2026-10-29 over the ordered filter steps on master. Sources:

- `design/data/data-management-requirements.md`, requirement 12 and "The one condition card"
- `design/ui/data-prototype/spec.md`, section 3.4 ("a Select / Hide toggle" on each card)
- `design/ui/data-prototype/review-findings.md`, finding A5 (undo, hidden fields, the yes/no default)
- `design/ui/studio/owner-decisions.md`, 2026-10-16 ("OR across fields and Exclude stay out of the
  cards' simple path; a rule that needs them opens as 'A rule set elsewhere' and is never dropped")
- The owner: "are the data cards like a pipeline? does order matter?" (Oct 15; no, they AND
  together); "should we be using the same mechanism in both places?" and "what happened to using
  our data cards that we already created?" (Oct 19); a Data source card "iff two or more sources
  have been loaded" (Oct 19); the filter uses "the same card-based approach as the style data
  selection feature" (Oct 23).

## What is on master today

graphty-element holds an ordered list of filter steps, `session.visibility.steps`, each
`{ id, on, rule }`, replaced as a whole by `visibility.setSteps(steps)`. The masks AND the single
filter (`visibility.filter`), the time window and every step that is on. Every rule is evaluated
over the whole graph (`graphty-element/src/session/visibility/filter.ts`, header), so what is
visible already does not depend on step order; only the plan's cumulative "77 to 26 nodes" counts do.

The app (`graphty/src/workspace/data-place/Filters.tsx`, `filterSteps.ts`, `filterWords.ts`) draws a
sentence row per step with an "Apply this step" checkbox and edits a step in the inspector's step
editor. A Hide step is `{ kind: "not", of: <kept rule> }`. The app itself adds `nodes: "ends"` to
an edge field's leaf (`withEnds`). The inspector's "Filter to neighbors" writes
`{ kind: "neighborhood", seeds: [center], depth: reach }` with a reach of 1 to 3
(`graphty/src/workspace/inspector/NodeValues.tsx`), read back by `toolbar/commands.ts`.

Two defects on master this design fixes: `compileOne`'s `not` negates both halves of a leaf, so a
Hide step on an edge field reading `ends` hides the nodes at the matched edges' ends and all their
other edges ("Hide edges with weight > 5" can blank most of the graph); and the app, not the
element, decides that edge reading.

## 1. The model

```ts
/** What an on condition does. Holds only visibility and selection effects; see below. */
type FilterEffect = "keep" | "exclude" | "select";

interface FilterCondition {
    readonly id: string; // unique among the conditions
    readonly on: boolean; // off keeps the condition and does nothing
    readonly effect: FilterEffect;
    readonly rule: RuleTree; // what the condition matches
}
```

- **keep**: only what the rule matches stays visible (everything else is hidden).
- **exclude**: what the rule matches is hidden.
- **select**: what the rule matches is selected. Nothing is hidden.

`FilterEffect` only ever holds effects on visibility and selection. Styling, saving a set or running
an algorithm on the matches belong to `styles`, `sets` and `runs`, never to this union. The union is
documented as open (a later element may add a visibility or selection effect), so a consumer's
switch over it needs a default branch.

A condition's `rule` is the plain rule, the same leaf a style target holds. A condition the app
makes holds one field's conditions, or several fields' in an `all` (the card's "+ field").

### Edge conditions: the element picks the reading

An edge leaf that names no `nodes` reading gets one from the effect:

| Effect  | An edge leaf with no `nodes` means                                 |
| ------- | ------------------------------------------------------------------ |
| keep    | the matching edges and the nodes at their ends (today's Keep step) |
| exclude | the matching edges only; no node is hidden                         |
| select  | the matching edges only                                            |

A `nodes` reading written in the rule wins, so a migrated step keeps exactly the meaning it was
saved with. Changing a condition's effect never needs a rule rewrite. The app stops adding `ends`.

### How conditions combine

```
visible(e)  = filter(e) AND window(e)
              AND every on keep condition matches e        // keep conditions intersect what stays
              AND no on exclude condition matches e        // exclude conditions add up what goes
selected    = the elements every on select condition matches   // select conditions intersect
```

An edge whose source or target is hidden is hidden (the element's existing endpoint rule). So two
exclude conditions a and b hide "a OR b", while one exclude condition on `all[a, b]` hides "a AND
b"; two keep or two select conditions mean "a AND b". The docs say this in one sentence, and the app
lets a reader build the multi-field card ("+ field" inside any card), so "hide hosts with score >
0.7" is buildable, not only received from a migration.

### Selection

Select ignores visibility: it selects every match in the whole graph, visible or not. This keeps
order out of it (adding keep then select, or select then keep, gives the same selection) and makes
requirement 12 hold exactly: "with Select, 140 are selected" and the card counts 140. A selected
element that is hidden stays selected, as it does today when a filter hides a selected node.

- **When it is applied.** Only when the select subset changes: a select condition is added, edited
  (rule), switched on or off, removed, or a condition's effect enters or leaves `select`. Then the
  selection becomes the AND of every on select condition's matches; with none on, the empty
  selection (it replaces a selection the reader clicked; the docs say so). Keep and exclude edits,
  `setSteps`, time-window moves and data loads never touch the selection.
- **History.** The condition op's history step records the selection before and after (the
  selection has no history slice of its own today); undo and redo put that selection back.
- **Never re-applied on restore.** Opening a project, replaying an autosave journal, applying a
  recipe and loading data never apply select conditions. Selection is view state
  (`graphty-view-state`), so a project saved with an on select condition and a hand-made selection
  reopens with the hand-made selection.
- **Events.** A select-only change fires `selection:changed` with cause `command` and does not fire
  `visibility:changed` (nothing became visible or hidden).

### Counts

```ts
interface FilterConditionCount {
    readonly id: string;
    /** null: the rule says nothing about nodes. */
    readonly nodes: { readonly matched: number; readonly total: number } | null;
    /** null: the rule says nothing about edges. */
    readonly edges: { readonly matched: number; readonly total: number } | null;
    /** Paths the rule reads that resolve to nothing (a deleted or hidden column); empty when none. */
    readonly unresolved: readonly string[];
}
```

`matched` is what the rule, as written, matches over the whole graph, out of all elements of that
kind. It does not depend on the effect, on `on`, on the other conditions or their order, so an off
card still shows what switching it on would match. A node leaf has `edges: null`; an edge leaf with
no `nodes` reading has `nodes: null`; an edge leaf reading `ends` (a migrated step) reports the end
nodes too; a Data source leaf reports both. The app shows the half that is not null (the node or
edge chip), with no rule parsing. A rule on a column that does not resolve reports it in
`unresolved` instead of a silent "0 of 900". The combined result stays the header chip's
`140 of 900` (`visibility.summary`).

## 2. What today's steps become

Every step becomes one **keep** condition with the same id, the same `on` and the same rule,
unchanged. A keep condition on `r` hides exactly what a step `r` hides, so the masks are master's
for every saved list, including `not` steps and their explicit `ends` (master's endpoint behavior on
an old edge Hide step survives; only new conditions get the fixed reading).

| Today                                 | Becomes                                                                     | Drawn as                                   |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| Keep, Matching, one or more fields    | keep, same rule                                                             | an editable card, one field per row        |
| Keep "has no value" (app's own `not`) | keep, same rule                                                             | the editable "has no value" card, as today |
| Hide, Matching (`not` of a rule)      | keep, same rule                                                             | "A rule set elsewhere": on box, remove     |
| Largest component                     | keep, `{ kind: "member", of: "largest-component" }` (or its `not`)          | the Largest component card                 |
| Neighbors of selection, depth 1 to 3  | keep, `{ kind: "neighborhood", seeds, depth }` with the saved depth exactly | the Neighbors card, depth editable         |
| Time window                           | unchanged, `visibility.window`, its fixed row at the end                    | unchanged                                  |
| Data source (two or more loads)       | a condition on the `source` leaf                                            | the Data source card                       |

Old Hide steps open read-only because the owner kept Exclude out of the cards' simple path
(2026-10-16); they are never dropped. See "Owner decisions" for the alternative.

Data source: the "iff two or more sources" rule gates only the "+" menu entry. A Data source card
that exists stays and is drawn when sources drop back to one (never dropped).

The time window stays its own element state: playback moves it many times a second, and a
condition would put every frame in history.

## 3. graphty-element API

All additive (non-breaking, so no owner approval). On `session.visibility` (`./session`):

```ts
interface VisibilityApi {
    // ... everything existing ...
    /** The conditions, in the order they were added (for a stable list; order has no meaning). */
    readonly conditions: readonly FilterCondition[];
    /** Replace every condition; one history step. Refuses a malformed list with E_BAD_COMMAND. */
    setConditions(conditions: readonly FilterConditionInput[], options?: RunOptions): Run<FilterResult>;
    /** Add one condition; `id` is made when omitted, `on` defaults to true. Resolves with its id. */
    addCondition(c: FilterConditionInput, options?: RunOptions): Run<FilterResult & { readonly id: string }>;
    /** Change one condition's effect, rule or on; one history step. */
    updateCondition(id: string, change: Partial<Omit<FilterCondition, "id">>, options?: RunOptions): Run<FilterResult>;
    /** Remove one condition; one history step. */
    removeCondition(id: string, options?: RunOptions): Run<FilterResult>;
    /** Every condition's count (section 1), in condition order. Synchronous, cached. */
    conditionCounts(): readonly FilterConditionCount[];
}
type FilterConditionInput = Omit<FilterCondition, "id" | "on"> & { readonly id?: string; readonly on?: boolean };
```

New exported types: `FilterCondition`, `FilterConditionInput`, `FilterConditionCount`,
`FilterEffect`. The app calls them cards; the element never does.

- **Op.** A new op `visibility.conditions` (`{ op, conditions }`), journaled and undoable.
  `journal.ts` maps it to "filter".
- **History codes.** Reused: `visibility.step-add`, `-edit`, `-on`, `-off`, `-remove`, and
  `visibility.steps` for anything else. The `HistoryCode` table in `session/types.ts` is updated to
  say "the step's or condition's id". No new code.
- **Events.** `visibility:changed` with `filterKind: "conditions"` when a keep or exclude condition
  changes; a select-only change fires only `selection:changed` (section 1).
- **Counts.** Synchronous like `summary` and `previewSteps`. Cached per condition, keyed by the
  canonical rule and the data revision: a count depends on neither effect, `on` nor the other
  conditions, so one edited condition recomputes one count. Re-read on `visibility:changed` or
  `history:changed` (a data load, a rename and every condition op are history steps).
- **Select.** Applied inside the condition op's history step as
  `selection.apply({ scope: { define: { kind: "rule", where: all[on select rules] } } })` over the
  whole graph, with the edge reading from section 1.
- **Ids.** A duplicate id in any list, or a step id that equals a select condition's id, is refused
  with `E_BAD_COMMAND` naming the id.
- **No plan effect.** No `plan({ op: "visibility.conditions" })` until an editor needs a preview: a
  card is written on its first value and `conditionCounts` already counts it.
- **Clearing.** The app's "clear filters" is one `session.transaction` (existing) that switches every
  on keep and exclude condition off and the window off: one history step, nothing new.

### The steps API keeps working, as a view

There is one store, the conditions. `visibility.steps` returns the keep and exclude conditions as
`{ id, on, rule }` (exclude as `{ kind: "not", of: rule }`, with its derived edge reading written
out). `setSteps(steps)` and the `visibility.steps` op replace the keep and exclude conditions with
one keep condition per step (section 2) and leave the select conditions alone. Steps ->
conditions -> steps is the identity. `steps`, `setSteps` and the `steps` plan effect get
`@deprecated`; removal waits for a planned major.

Every internal reader and writer moves to conditions, so nothing round-trips through steps:

| Where                               | Today                          | Becomes                                                   |
| ----------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `projectFile.ts`, write             | `steps`                        | `steps` (view) and `conditions` (section 4)               |
| `projectFile.ts`, read              | `setSteps`                     | conditions, one by one (section 4)                        |
| `projectFile.ts`, clear before open | `setSteps([])`                 | `setConditions([])`: no select condition survives an open |
| `data.ts`, `reads(...)` walk        | steps                          | conditions                                                |
| `data.ts`, column rename            | a `visibility.steps` op        | a `visibility.conditions` op: every effect kept           |
| `recipe.ts`                         | `steps` through `scrubRule`    | `conditions` beside `steps`, same scrub (below)           |
| `journal.ts`                        | `visibility.steps` -> "filter" | adds `visibility.conditions` -> "filter"                  |
| `planning.ts`                       | `steps` effect                 | unchanged (deprecated)                                    |

Recipe scrub: `scrubRule` drops id-bound parts (neighborhood seeds). For keep and select a dropped
part narrows nothing it should not; for exclude, dropping a part of `all[a, ids]` would widen what
is hidden, so an exclude condition that loses any part is dropped whole and reported.

### The simple example (the guide's first example)

```ts
import "@graphty/graphty-element";

// After the data has loaded (before it, `data.score` is unresolved and counts 0 of 0).
const element = document.querySelector("graphty-element")!;
const v = element.session.visibility;
const { id } = await v.addCondition({ effect: "keep", rule: { kind: "range", attribute: "data.score", min: 0.7 } });

const box = document.querySelector<HTMLInputElement>("#on")!;
box.onchange = () => void v.updateCondition(id, { on: box.checked });
const label = document.querySelector("#count")!;
const show = () => {
    const c = v.conditionCounts().find((x) => x.id === id)!;
    label.textContent = `${c.nodes!.matched} of ${c.nodes!.total}`;
};
element.session.on("history:changed", show);
show();
```

Twelve lines, no internal concept. The guide (`graphty-element/docs/guide/filter-conditions.md`)
opens by saying which filter API to use: the condition list for switchable conditions,
`visibility.set` for one programmatic rule (they AND together), never the deprecated steps.

## 4. Persistence

### What is written

The project file's `visibility` member keeps writing `steps` exactly as today (the keep and exclude
conditions as steps), so an older element opens a new project with the same visibility. It adds one
optional, versioned field, following the `issues` field's `ISSUES_VERSION`:

```jsonc
"visibility": {
  "filter": null, "window": null, "showContext": false,
  "steps": [ { "id": "step-1", "on": true, "rule": { "kind": "range", "attribute": "data.score", "min": 0.7 } } ],
  "conditions": { "version": 1, "list": [
    { "id": "step-1", "on": true, "effect": "keep",   "rule": { "kind": "range", "attribute": "data.score", "min": 0.7 } },
    { "id": "c-2",    "on": true, "effect": "select", "rule": { "kind": "categories", "attribute": "data.type", "values": ["host"] } }
  ] }
}
```

An older reader ignores `conditions` (the member is read key by key) and loses only the select
conditions, which hide nothing. The recipe document's `filter` gains the same optional
`conditions`. Autosave journals the `visibility.conditions` op.

### What is read

`conditions` is read condition by condition, never as one all-or-nothing `setConditions`:

- An unknown `version`, or a `conditions` that is not an object with a list: ignored; the
  conditions are read from `steps` (section 2), reported as an open issue.
- An unknown effect (a later element's) or a malformed condition: skipped and reported as
  `{ code: "visibility.condition-skipped", params: { id } }`; the rest are kept. When any condition
  is skipped, keep and exclude are taken from `steps` instead (every writer writes them), plus the
  readable select conditions, so a file never loses what it hides. Playback and `showContext` are
  read separately and are never lost with a bad condition.
- `conditions` absent: read from `steps`, one keep condition per step (section 2).
- Both present and their keep/exclude halves disagree (a tool edited only `steps`): `conditions`
  wins and the reader reports `visibility.steps-mismatch`. The file-format docs say so.
- Rules go through the same `remap` the steps get. Select conditions are restored without being
  applied; the saved selection wins (section 1).

## 5. The app

### The Filters section (Data place)

One card per condition, in condition order, then the time window row; "+" in the section header.
No step editor in the inspector: a card is edited in place.

```
[(o) 140 of 900]  [ Select | Hide ]  [x]  [Remove]
  score    0.7 ---o-------- 1.0
  + field
```

- **Body.** The Which picker's card for that field (`style/WhichPicker.tsx`, `held` mode): range,
  category checklist, text match, yes/no, Data source, "has a value". "+ field" adds another field's
  row to the same card (an `all`).
- **Count chip.** `EntityChip` with the element's non-null half (finding A5). An off card keeps its
  count. An `unresolved` count shows the hidden-column mark instead of a number.
- **Toggle.** A compact-mantine `SegmentedControl`, `Select | Hide`, named "<condition> action".
  Hide writes `effect: "keep"` (requirement 12's test: "score > 0.7 with Hide shows 140 of 900",
  the header chip's words for what is visible). Changing it is one `updateCondition`.
- **On box.** A compact-mantine `Checkbox` with no visible word, named "Apply <condition>"
  (tooltip the same).
- **Remove.** The `ActionIcon` the Which picker cards already have, named "Remove <condition>". No
  row menu.
- **Largest component card.** A header (chip, toggle, box, remove) with no condition row.
- **Neighbors card.** Its seeds as compact-mantine `Pill`s, each with its remove button named
  "Remove <node>" (removing the last seed removes the card), and a depth `SegmentedControl`
  `1 | 2 | 3` named "Neighbors depth".
- **Rules the cards cannot draw** (an old Hide step, a typed expression, OR across fields): one
  read-only row in the element's rule words, as today's "A rule set elsewhere", with its box and
  remove (owner, 2026-10-16: never dropped).
- **Hidden columns.** A card on a hidden column stays readable and editable, with the mark.
- Checked at the sidebar's minimum width: the header row fits once the "on" word and the row menu
  are gone; the chip truncates first.

`<condition>` is the field plus its condition ("score at least 0.7"), so two cards on one field
have different names.

### Adding a card: the draft

"+" opens the field list (from `cardFields`, hidden columns left out, grouped Nodes and Edges), then
Data source (two or more sources loaded), Largest component, Neighbors of selection (while nodes are
selected) and Time window (a time field designated and the window off).

Picking a field opens a **draft card**: app UI state only, drawn at the end of the list, with no
count and its first control focused. Its first value writes it with
`addCondition({ effect: "keep", ... })` (finding A5: a new yes/no card never shows "100 of 298"
before a value). Escape, or leaving it with no value, discards it. "Filter to..." on an attribute
opens the same draft on that field. "Filter to neighbors" in the inspector writes a Neighbors card
at the inspector's reach at once (it has its value). Largest component writes at once. After a
remove, focus moves to the next card, the one above, or "+".

No "Hide where..." or "Select where..." items are added to the attribute or column-header menus:
"Filter to..." plus the toggle covers both.

### Header chip

Unchanged: `(o) 140 of 900` while anything is hidden. Its `x` switches every keep and exclude
condition off and the window off, in one transaction (one undo step). Cards are kept, so the reader
switches them back on; select conditions are untouched.

### Undo and words

Every add, edit, toggle, on/off and remove is one element history step. `historyWords.ts` reads the
condition by id instead of the step ("turning off the filter card score at least 0.7"). Number and
text boxes write on commit (blur or Enter), and the range slider on `onChangeEnd`, so one drag is
one step: the same points the style target's Which picker writes at.

### Keyboard and screen readers

No new hotkeys, so no new buttons are owed. Every control is a default compact-mantine or Mantine
control reachable by Tab. The list is a `role=list` named "Filters"; each card is a `listitem`
named "<condition>, <Select or Hide>"; the chip reads "140 of 900 nodes"; the Neighbors pills and
depth control as above.

### Changed in approved UI

The owner reviews these as changed screenshots on the nightly candidate:

- Removed: the inspector's step editor (Keep or hide, Filter by, the two Which pickers, Add step /
  Save, the "not added" notice), the step sentence rows with their "77 to 26 nodes" line, and the
  "Apply this step" checkbox.
- New on the Which picker cards when used as filters: the count chip, the Select / Hide toggle, the
  on box, "+ field", and an off card's dimmed body.
- New card bodies: Largest component, Neighbors.
- Kept: the Filters section's place and header, "+" and its tooltip, the time window row, the header
  chip, and the Which picker cards in the Style panel, which do not change.

Code removed: `countStep` and `newId` in `filterSteps.ts`, `Outcomes` / `usePreview` and `withEnds`
in `Filters.tsx`, and the step sentences in `filterWords.ts` nothing else reads.

## 6. Element defect: the condition model lives in the app

`graphty/src/workspace/style/cards.ts` (about 1000 lines: `cardFields`, `newCard`, `leafOf`,
`cardOf`, `selectorOf`, the presence `not`) turns rules into editable per-field conditions and back.
That is graph logic, and a third party building any filter or target UI would have to reimplement
it. Tracked as #4407: a field list and a condition <-> rule conversion in `./session`. Until it
lands, this change keeps the app's model as is; nothing app-only (the presence `not`, `ends`) is
added to the new API or the saved shape.

## 7. Out of scope (follow-ups)

- OR across fields (an "In any of" card or an Any group).
- Neighbors of what a rule matches, not only of the selection.
- Edge conditions on both ends; `clipped` / `incident` node readings in a filter card.
- Top N within a subset.
- The hover condition's "and its neighbors" and "everything except".
- Style these, Save as set, Run on these: on `styles`, `sets`, `runs`, not new effects.
- The time window as a card.
- Requirement 11: a condition typed in the find box ("score > 0.7") offered as a condition card.
  `FindBox.tsx` has "Select where"; it becomes "add as a card" in its own change.
- A third "Exclude" segment, if the owner wants it (Owner decisions).

## 8. Test plan

### graphty-element (Node)

`test/session/visibility/conditions.test.ts`, on a small fixed graph:

- keep, exclude and select combine as section 1 says, for every on/off combination of three.
- Two exclude conditions a, b against one exclude on `all[a, b]`, on a graph where they differ.
- Each effect on an edge condition: keep shows the matched edges and their ends; exclude hides
  exactly the matched edges and no node; select selects the matched edges only. Switching the effect
  with `updateCondition` alone changes the reading. An explicit `ends` wins.
- Counts: node leaf `edges: null`, edge leaf `nodes: null`, Data source both, unresolved column
  reported; independent of effect, `on` and the others; one edited condition makes one compile
  (counted calls, not time).
- Select: selects matches whether visible or not; applied only on a select-subset change (keep
  edits, `setSteps` and a data load leave a hand-made selection alone); turning the last one off
  empties the selection; undo of a select change restores the reader's earlier selection;
  `selection:changed` with cause `command` and no `visibility:changed`.
- `setSteps(s)` then `steps` equals `s`; select conditions survive `setSteps`; a step id equal to a
  select condition's id is refused; duplicates refused with `E_BAD_COMMAND`.
- A column rename keeps every condition and its effect (a select condition, and a keep on "has no
  value").
- `test/session/history/random-model.ts` and the round-trip harness gain every condition op:
  random add/update/remove/set sequences give masks and selection that depend only on the final
  conditions (plus the selection the last select change set), and undo round-trips by `stateDigest`.

### Migration and files

Fixtures are produced by a committed script run against today's master build, recording the element
version. `test/session/project/filter-conditions-migration.test.ts`:

- A project holding Keep steps, a multi-field Hide step, an edge Hide step reading `ends`, a Keep
  "has no value" step, Largest component, a Neighbors step at depth 3, an off step, a malformed step
  and a step on a missing column opens with one keep condition per step (ids, rules, `on` exact) and
  master's visible node and edge ids.
- A recipe with `filter.steps` and a scrubbed neighborhood, and an autosave journal of
  `visibility.steps` ops, replay to the same conditions and masks; an exclude condition that loses a
  part in the scrub is dropped and reported.
- A new file writes `steps` and `conditions`; read with `conditions` deleted (imitating an older
  reader) it shows the same elements.
- A file with a `"effect": "style"` condition opens with the rest, the skip reported, keep and
  exclude from `steps`, playback intact. An unknown `conditions.version` falls back to `steps`.
- Opening a project clears the previous project's conditions, select ones included.
- A project saved with an on select condition and a hand-made selection reopens with that selection.

The public API report (`graphty-element/api/session.api.md`) gains the types, methods and
`@deprecated` marks; the guide example compiles in the docs' type check.

### graphty app (real input, `*.real-element.test.tsx`)

All through `userEvent` from `vitest/browser`, asserting the session's public state:

- "+", pick a number field, drag the slider: one condition on `onChangeEnd`, one history step; the
  chip equals `conditionCounts`.
- "Filter to..." on a number column opens a draft with no count; Escape leaves no condition.
- Toggle to Select: nothing hidden, selection equals the matches; back to Hide: the selection set by
  the select condition is restored by undo, not by the toggle.
- On box, Remove, focus after remove; undo and redo after each, with the history words.
- Largest component and Neighbors cards: remove a seed pill, change depth to 3.
- Header chip `x`: every keep card off in one step; undo turns them back on.
- A master project with steps opens with the cards drawn; its Hide step reads as "A rule set
  elsewhere" and still hides the same elements.
- Data source appears in "+" only with two loads and stays after one is removed.
- Keyboard only: Tab reaches every control; names as in section 5, queried by role and name.

The existing filter tests (`Filters`, `FilterFocus`, `FilterStepCard`, `SourceCondition`, `YesNo`,
`Timeline`, the toolbar tasks) are rewritten for the cards. The Data place stories show a Hide card,
a Select card, a Neighbors card and an old Hide step, reached by clicks in their play functions.

## Owner decisions

1. **The Hide segment and Exclude.** Requirement 12 and spec 3.4 name a two-way "Select / Hide"
   toggle, and requirement 12's test ("score > 0.7 with Hide shows 140 of 900") reads as Hide
   keeping the matches; a reviewer read the same sentence as the card's count, with Hide hiding the
   matches. The element is neutral either way (`keep` / `exclude`), so only the label is open.
   **Default built:** `Select | Hide`, Hide writes `keep`; no Exclude segment (2026-10-16), so old
   Hide steps open read-only. **Alternative:** Hide writes `exclude`, or a third "Exclude" segment
   that also makes old Hide steps editable. Either is an app edit; saved files do not change.

## Review answers

- **Three verbs written to files.** The saved values are the neutral effects `keep`, `exclude`,
  `select`; the labels are the app's and can change without touching a file. The claim that
  requirement 12 forces "Keep" is gone; the label question is the owner decision above.
- **Migrating Hide steps to `exclude`.** Not done: a step becomes a keep condition with its rule
  unchanged, which is exact for every saved list (edge `ends` included) and makes steps ->
  conditions -> steps the identity. That also answers "Keep: has no value reads as Hide: has a
  value": it now reads back as itself.
- **Select over visible elements.** Replaced by "Select ignores visibility" (order-free, matches
  requirement 12's count), rather than recomputing on every keep change.
- **Apply select conditions on open** (a note) versus never (a blocking item): never; the saved
  selection is the reader's.
- **Async counts and stale answers.** Counts are synchronous and cached, so there is no newest
  request to track.
- **`plan` effect for conditions.** Dropped until an editor needs a preview.
- **"Select where..." hotkey.** No menu item is added, so nothing to check.
