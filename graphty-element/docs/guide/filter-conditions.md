# Filter Conditions

A filter condition is a rule you can switch on and off without losing it, with what it does when
it is on: **keep** what it matches (hide the rest), **exclude** what it matches, or **select** what
it matches. `session.visibility.conditions` holds a flat list of them. Order never matters.

Which filter API to use:

- **Conditions** (this page) for filters a reader switches on and off, each with its own count.
- `visibility.set(rule)` for one filter your code sets. It combines with the conditions by AND.
- `visibility.steps` and `setSteps` are the older, ordered form: a view of the keep and exclude
  conditions. Prefer conditions in new code.

## Quick start

Keep the nodes scoring 0.7 or more, switch the condition with a checkbox, and show its count:

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
    const c = v.conditionCounts().find((x) => x.id === id);
    label.textContent = `${c?.nodes?.matched ?? 0} of ${c?.nodes?.total ?? 0}`;
};
element.session.on("history:changed", show);
show();
```

## How conditions combine

What is visible is the filter set with `visibility.set`, AND the time window, AND every **keep**
condition that is on, AND no **exclude** condition that is on. So two keep conditions mean "a and
b", and two exclude conditions hide "a or b"; to hide only what matches both, put both rules in one
exclude condition: `{ kind: "all", of: [a, b] }`. An edge whose source or target is hidden is
hidden.

A condition that is off keeps its rule and does nothing.

## Select conditions

A **select** condition hides nothing. Whenever the select conditions change (one is added,
edited, switched on or off, removed, or a condition's effect becomes or stops being `select`), or a
keep or exclude condition changes while a select condition is on, the selection becomes what every
select condition that is on matches among the visible elements. A hidden element is never selected
by a condition, so what is drawn as selected and what is reported as selected never differ. The
result depends only on which conditions there are, never on their order. That replaces a selection
the reader made; with none on, nothing is selected. Data loads and time-window moves never touch
the selection.

When the reader changes the selection by hand (a click on the canvas), every select condition that
is on is switched off in one undoable step, and the reader's selection stays. Undo switches them
back on and selects their matches again. A selection set through `session.selection.apply` leaves
the conditions as they are.

The change fires `selection:changed` and no `visibility:changed`. Undo puts back the selection the
change replaced. Opening a project never applies select conditions: the selection saved with it
comes back instead.

## Edge values

A `range`, `categories` or `text` rule on an edge value (such as `data.weight`) that names no
`nodes` reading reads by the condition's effect:

| Effect  | It means                                       |
| ------- | ---------------------------------------------- |
| keep    | the matching edges and the nodes at their ends |
| exclude | the matching edges only; no node is hidden     |
| select  | the matching edges only                        |

A `nodes` reading written in the rule (`"all"`, `"ends"` or `"none"`) wins. Changing a condition's
effect never needs a rule rewrite.

## Counts

`conditionCounts()` gives, per condition and in condition order, what its rule matches as written
over the whole graph: `{ id, nodes, edges, unresolved }`. `nodes` and `edges` are each
`{ matched, total }`, or `null` when the rule says nothing about that kind (a node value rule has
`edges: null`). A count does not depend on the condition's effect, on whether it is on, or on the
other conditions, so a condition that is off still says what switching it on would match.
`unresolved` lists the paths the rule reads that nothing answers, such as a column that was removed,
so you can say so instead of showing "0 of 900".

Counts are synchronous and kept per condition: editing one condition counts that one again and no
other. Read them again on `visibility:changed` or `history:changed`.

## Editing

| Call                                    | Does                                                |
| --------------------------------------- | --------------------------------------------------- |
| `addCondition({ effect, rule })`        | Adds one; resolves with its `id` (made when absent) |
| `updateCondition(id, { on })`           | Switches one on or off                              |
| `updateCondition(id, { effect, rule })` | Changes what it does or matches                     |
| `removeCondition(id)`                   | Removes one                                         |
| `setConditions(list)`                   | Replaces every condition; `[]` clears them          |

Each call is one undoable step, and each refuses a malformed condition or a repeated id with
`E_BAD_COMMAND`. History facts name the condition: `visibility.condition-add`, `-edit`, `-on`,
`-off` and `-remove`, each with `{ id, effect }`; an edit also carries `previousEffect`.

To switch every keep and exclude condition off in one undo step, use a transaction:

```ts
await element.session.transaction("Clear filters", async (tx) => {
    for (const c of tx.visibility.conditions) {
        if (c.on && c.effect !== "select") {
            await tx.visibility.updateCondition(c.id, { on: false });
        }
    }
});
```

## Saving

A project file's `graphty-session` member writes the conditions as
`visibility.conditions: { version: 1, list: [...] }`, beside `visibility.steps` (the keep and
exclude conditions as steps), so an older element opens the file with the same elements hidden.
Reading:

- A file with only steps opens with one keep condition per step, meaning exactly what it did.
- A condition this element cannot read (a later effect, a malformed one) is skipped and reported
  as `W_FILTER_CONDITION_SKIPPED`; what is hidden is then read from the steps.
- An unknown `version` is reported as `W_FILTER_CONDITIONS_UNREADABLE` and the steps are read.
- Steps that disagree with the conditions (a tool edited only one) are reported as
  `W_FILTER_STEPS_DIFFER`; the conditions are read.
