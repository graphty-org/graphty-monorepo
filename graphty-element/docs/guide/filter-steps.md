# Filter Steps

Filter steps are filters applied in order, each one narrowing what the step before it left. Every
step reports how many nodes and edges it left out, so a reader can see which step hid what. A
step can be switched off without losing its rule, and moved to another place in the order.

## Quick start

Two steps, a list that shows what each leaves out, and a button that moves the second step first:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const v = element.session.visibility;
await v.addCondition({ id: "popular", effect: "keep", rule: { kind: "degree", min: 4 } });
await v.addCondition({ id: "near-ava", effect: "keep", rule: { kind: "neighborhood", seeds: ["Ava"], depth: 1 } });

const list = document.querySelector("#steps")!;
const show = () => {
    list.textContent = v
        .stepCounts()
        .map((s) => `${s.id}: ${s.before.nodes} -> ${s.after.nodes} (left out ${s.leftOut.nodes})`)
        .join("\n");
};
element.session.on("history:changed", show);
show();
document.querySelector("#move")!.addEventListener("click", () => void v.moveStep("near-ava", 0));
```

## What a step is

`visibility.steps` lists the steps in order. Each step is a keep or exclude
[filter condition](./filter-conditions): add one with `addCondition`, switch it with
`updateCondition(id, { on })`, and remove it with `removeCondition(id)`. An exclude condition reads
as a step that keeps what its rule does not match. Select conditions are not steps: they hide
nothing.

What is visible never depends on the order: the steps that are on combine by AND. The order only
decides which step is said to have left an element out.

## Counts

`stepCounts()` gives one entry per step, in step order:

| Field     | Meaning                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| `id`      | the step's id                                                                  |
| `on`      | whether the step is on                                                         |
| `before`  | `{ nodes, edges }` visible before the step                                     |
| `after`   | `{ nodes, edges }` visible after it                                            |
| `leftOut` | `{ nodes, edges }` it hid: `before` minus `after`; zero for a step that is off |

The first step's `before` is what the filter set with `visibility.set(rule)` and the time window
leave, so `set` keeps working as before and comes ahead of every step. The last step that is on
ends with what is visible.

Counts are synchronous and worked out from the steps, the filter, the time window and the data as
they stand: they are right after a move, a switch, an undo, a data change and opening a project.
Reading them again with nothing changed counts nothing. Read them again on `visibility:changed` or
`history:changed`.

## Moving a step

`moveStep(id, index)` moves one step to `index` among `visibility.steps` (from 0). It is one
undoable step; undo puts the order back. The step keeps its effect, its load and its rule, and
select conditions keep their places. An id that is not a step's, or an index outside the list, is
refused with `E_BAD_COMMAND`.

To replace every step at once, `setSteps(list)` takes `{ id, on, rule }` entries in order.

## Saving

The order is saved with the project as the order of its filter conditions. Counts are not saved:
they are worked out again when the project opens.
