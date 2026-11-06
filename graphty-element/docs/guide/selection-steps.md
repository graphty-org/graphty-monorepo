# Selections Built From Steps

> Experimental: the `union` rule and everything on this page may change or be removed in a minor
> release.

A **union** rule builds a selection the way a vector editor combines shapes. It is a list of
**branches**; the result is everything in any branch that is on. Each branch starts with all of the
nodes (or edges) or with none, then folds its **steps** in order:

- **add**: the branch so far plus what the step matches (a union);
- **keep**: only what both hold (an intersection);
- **except**: the branch so far minus what the step matches (a subtraction).

The same rule works as a style layer's selector and as a filter condition.

## Quick start

Paint the busy staff red, leaving out the three biggest bridges:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
await element.session.styles.add({
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

graphty-element starts the betweenness run itself (an ordinary run, listed with the others, which
paints nothing of its own), fills in the branch and step ids and the branch color, and keeps the
layer current as the data, the runs, the filter and the selection change.

## The base

`within` is what a branch starting with `all` starts from, and what every rank, share and count in
a step is taken over: `"visible"` (what the filters leave drawn) or `"graph"` (everything loaded). A
filter condition decides what is visible, so its union must read `"graph"`; `"visible"` is refused
there with `details.reason` `"circular-scope"`.

## Steps and their leaves

A step's `rule` is any rule leaf, plus the leaves that only make sense inside a step:

| Leaf                                          | Holds                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `{ kind: "hops", of, max?, direction? }`      | nodes at most `max` hops from the reference, the reference included     |
| `{ kind: "touching", of, ends }`              | edges with `"either"`, `"both"` or exactly `"one"` end in the reference |
| `{ kind: "nonempty", of }`                    | everything while the reference holds a node, else nothing               |
| `{ kind: "same-value", path, as }`            | elements sharing a value of `path` with the reference ("Community of")  |
| `{ kind: "measure", algorithm, field, test }` | elements whose value of an algorithm's field passes `test`              |

A reference is any scope (`"selection"`, `{ nodes: [...] }`, `{ set: id }`), or `"hovered-or-selected"`
(the hovered node, else a lone selected node), or `"so-far"` (the step's input). A reference that
holds no node matches nothing. A filter condition cannot follow the pointer: `"selection"` and
`"hovered-or-selected"` are frozen to the nodes they hold when it is written, and the step records
`frozenFrom`.

A step can also read what the reader is doing, with the rule leaf `{ kind: "state", state }`:
`"selected"`, `"hovered"`, `"pinned"` or `"ghosted"` (outside the time window, so a selection on it
reads `within: "graph"`). It is a calculated value like any other, so it takes Add, Keep and Except
beside other conditions, and a layer on it repaints as the state moves, with no undo step:

```ts
// The selected nodes, except the pinned ones.
await session.styles.add({
    name: "Selected and free",
    target: "node",
    selector: {
        match: "rule",
        where: {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    start: "none",
                    steps: [
                        { op: "add", rule: { kind: "state", state: "selected" } },
                        { op: "except", rule: { kind: "state", state: "pinned" } },
                    ],
                },
            ],
        },
    },
    set: { "node.color": "#ff8800" },
});
```

`{ match: "state", state }` is the same condition on its own, `selectorRule(selector, { states: true })`
reads it as the leaf, and `selectorStates(selector)` lists the states any selector reads. A kept set and a visibility filter do
not follow the reader, so they refuse a `state` leaf.

`computedOn: "so-far"` ranks a step over its input instead of the base: "the top 3 by degree among
the staff". `degree`, `graphty.degree` and the other structure paths read with no run.

## Reading counts and states

`session.scope.watchSteps(rule, onChange)` reads every branch and step, and calls `onChange` itself
when anything the rule reads moves:

```ts
const watch = element.session.scope.watchSteps(layerRule, (reading) => {
    for (const branch of reading.branches) {
        console.log(branch.id, branch.color, branch.state, branch.count);
        for (const step of branch.steps) {
            // "applied", "inert" (not yet a test), "pending" (waiting on a run) or "off"
            console.log(step.id, step.state, step.reason?.code, step.count, step.orderMatters);
        }
    }
});
console.log(watch.current.total); // { count, of }
watch.end();
```

Reasons are codes, never sentences: `test-unset`, `no-reference`, `one-node-only`, `computing`,
`run-needed`, `stale`, `run-paused`, `run-failed`, `waits-for`, `input-empty`, `reference-empty`,
`frozen-from`.

A step is inert (`test-unset`) only while its test asks for nothing: an empty pick, empty text, a
by-size with no count. A range with neither bound is a test, the one a slider with both handles at
the ends shows: every element with a measured value passes. A `measure` with no `test` reads the
same way, so `{ kind: "measure", algorithm: "betweenness", field: "value" }` adds every node once
its run finishes, with no bounds to fill in first.

Every scope in a reading (`input`, `members`, `result`) is one
`selection.apply`, `scope.count` and `sets.create` accept.

`scope.asUnion(rule, { side, within })` turns a flat rule (a leaf, an `all` of leaves and `not`s,
an `any` of leaves) into one union. `scope.checkStep(step, { side, within, host })` says what a
host would refuse, so a picker can grey a value with the element's reason.
`scope.histogram(path, { within })` distributes any value (a column, a run field, degree) over a
step's input.

## Run limits

Unset, every run a step needs starts when it is read. `scope.setOptions({ liveMs, askAboveMs })`
holds back a run estimated above `askAboveMs` until `scope.allowRun(rule, stepId)`, and a run that
follows the pointer above `liveMs` while a node is hovered. `scope.cancelRun` cancels one.

A run a step starts paints nothing: it adds the run's values, never a style layer. It is an
ordinary run, listed in `session.runs.list()`, and a step with the same algorithm, settings and
scope reads the same run, whoever started it.

### Done and Cancel in an editor

An editor that lets a reader try settings starts runs the reader may not keep. Open a visit when
the editor opens and end it when it closes:

```ts
const visit = session.scope.edit();
// ... the reader edits; the steps start whatever runs they need ...
await visit.commit(); // Done: keeps the runs a selection reads now, drops the rest
await visit.discard(); // Cancel: drops every run the visit started
```

Runs that existed before the visit are never removed. Call `commit()` or `discard()` after the
editor's last write (on Cancel, after the rule is restored).

### Removing a run a selection reads

`session.runs.readers(id)` lists the style layers and filter conditions whose steps read a run,
which a confirmation names before it removes the run; `runs.remove(id)` returns the same list as
`selections`. A removed run is never re-run unasked: each step that read it waits with
`run-needed` until `scope.allowRun(rule, stepId)`.

## Showing branches while picking

`session.styles.showBranches({ rule, rest: "faint" })` suspends every layer (kept, listed, and not
an undo step) and draws each branch's members in its color, the first branch winning (with
`edges: true`, a node branch draws the edges between its members in its color too); `end()`
brings the stack's picture back.
