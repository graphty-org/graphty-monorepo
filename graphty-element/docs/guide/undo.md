# Undo and History

Every change to a graph that a project would save can be undone, and the element keeps the
history itself. A host adds an Undo button by calling `session.undo()`; it never records inverses,
keeps its own stack, or decides what a step is.

## Overview

```typescript
const session = document.querySelector("graphty-element").session;

await session.undo(); // take the last step back
await session.redo(); // put it back again
session.canUndo; // whether undo() would do anything
session.history.steps; // the steps, oldest first, each with a label
```

With the canvas focused, Ctrl+Z (Cmd+Z on macOS) undoes, and Ctrl+Shift+Z or Ctrl+Y redoes, with
no code at all. See [Keyboard shortcuts](#keyboard-shortcuts) to turn that off or share the keys
with a host page.

The same API exists on a session with no renderer, in Node or a worker, from
`@graphty/graphty-element/session`.

## What is undoable

A change is undoable when it changes something a project saves, and only then:

| Undoable                         | Examples                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The graph                        | Loading or importing data, adding, editing and removing nodes and edges, expanding a neighbourhood, clearing          |
| Algorithm runs and their results | A finished run, and removing one; the style layers a run applies come and go with it                                  |
| Style layers                     | Adding, editing, moving and removing a layer; applying a template                                                     |
| What is showing                  | A filter, the time window, whether context is shown                                                                   |
| Notes                            | Adding, editing and removing a note; merging a saved notes document; the author setting                               |
| Sets and saved camera views      | Creating, renaming, redefining, adding and removing members, removing and restoring a set; saving and removing a view |
| The layout                       | Choosing a layout and what it runs over, switching between 2D and 3D, placing nodes, pinning and unpinning them       |
| Where nodes came to rest         | The coordinates a layout settles on, recorded with the step that set it moving                                        |
| Project settings                 | `session.config.set(...)`: the data settings, background, selection style, the three saved layout-behaviour settings  |

Not undoable, because a project does not save them:

- the selection (but undo and redo select what they changed; see [Selection](#selection));
- the camera, hover, and moving the camera to a saved view;
- entering or leaving VR or AR;
- a layout while it is moving, and playing or pausing it;
- a run or a load that has not finished yet (see [Work still going](#work-still-going));
- the acceleration policy, render settings and other preferences about this machine or view,
  such as `pinOnDrag` and label declutter.

Every op a session understands declares which side it is on. The table is published as data:

```typescript
import { COMMANDS } from "@graphty/graphty-element/commands";

COMMANDS["style.patch"]; // { undo: "undoable" }
COMMANDS["view.camera"]; // { undo: "exempt", reason: "Where the camera is looking is view state, ..." }
```

## Where history starts

History starts after the **baseline**, the state the graph was set up with. Undoing everything
returns to the baseline, not to an empty element.

- Data declared on the element when it is created -- `data-source` and `data-source-config`,
  `node-data` and `edge-data` in the markup, or properties a framework sets before the first
  render -- is baseline. A fresh page shows Undo disabled, and Ctrl+Z does not empty the graph the
  page declared.
- Settings, layouts and style layers set before the first data arrives are baseline too.
- The first load after that, and everything after it, is a step.

`session.history.clear()` makes the current state the new baseline.

## Steps

One call is one step, labelled for a history list: "Added 3 nodes", "Ran Degree", "Changed
colour of Hubs". A node drag is one step, and so is one message to the AI assistant.

```typescript
for (const step of session.history.steps) {
    console.log(step.label, step.ops, step.slices, step.provenance);
}
session.history.position; // how many steps are applied; steps[position..] can be redone
await session.history.restoreTo(session.history.steps[1].id); // jump; null jumps to the baseline
```

**Coalescing.** Edits of the same thing within a second of each other merge into the step on top:
dragging a colour picker, typing into a filter, moving the time window, placing nodes one at a
time in a loop. The whole drag is one step. Work queued in between -- a run, an import -- ends the
merge: the next edit starts a step of its own, so undo takes back that edit before it cancels the
queued work.

## Transactions

To make several changes one step, make them inside `session.transaction` through the `tx` it
hands you:

```typescript
await session.transaction("Load and colour", async (tx) => {
    await tx.data.import({ type: "csv", config: { url: "/flights.csv" } });
    await tx.layout.set("circular");
    await tx.styles.add({
        name: "Hubs",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#e4572e" },
    });
});
```

- **Only what goes through `tx` joins.** A call made on `session` or the element while the
  callback runs is a step of its own. `tx` has every verb the session has: `tx.data.*`,
  `tx.styles.*`, `tx.layout.*`, `tx.run`, `tx.execute` and the rest.
- **A throw, or aborting the signal, rolls everything back** and records nothing. The callback's
  second argument is an `AbortSignal` that fires when the transaction is aborted -- by an undo, for
  one. After that, every `tx` call rejects, so the rest of the callback cannot write onto the
  rolled-back state.
- **`tx` closes when the callback settles.** A `tx` call made later rejects with
  `E_TRANSACTION_CLOSED`.
- **A run started through `tx`** that is still going when the callback returns joins the step when
  it finishes.
- **Returning a `Run` from the callback** makes `transaction` wait for the whole run, because a
  `Run` can be awaited. Return `{ run }` to hand the handle out instead.
- A transaction that changed nothing records nothing, and a transaction inside a transaction
  becomes part of the outer one.

`element.batchOperations(async (tx) => { ... })` is the same thing on the element.

**Two writers at once.** While a transaction is open, a change made outside it that touches a node
or edge the transaction added, removed or edited fails at once with `E_HELD_BY_TRANSACTION`, rather
than wait for a transaction that may be waiting on it. Make that change through the transaction's
`tx`, or after it finishes.

A setting or the style stack is handed over instead of held: a change made outside the transaction
takes it over, and a later rollback leaves that change in place. For the style stack this means
one visible case: if the reader edits a style while a transaction that also edited styles is
still open, the reader's step includes the transaction's earlier style edits, and a failure of
the transaction afterwards does not remove them. Undo still returns everything to where it was.

**As data.** A `batch` command is a transaction that can be stored or sent:

```typescript
await session.execute({
    op: "batch",
    label: "Tidy up",
    steps: [
        { op: "layout.set", id: "circular" },
        { op: "visibility.context", show: false },
    ],
});
```

`session.execute(command)` runs any command in the vocabulary. It returns the command's outcome
directly -- the `Run` handle for `algo.run`, a promise for everything else -- so
`await session.execute(...)` waits for it either way.

## Work still going

A run or a load becomes a step when it finishes. Until then it is **pending**, listed in
`session.history.pending`, and undo treats it as the newest thing to take back:

- Undo while a run or load that started after the last step is still going **cancels it**, and
  does not also undo the step. `undo()` resolves with `{ kind: "cancelled", pending }`.
- Undo while an older run is still going undoes the step on top and leaves the run alone. When
  the run finishes it becomes the new top step, and the redo list is dropped.
- Undo while a transaction is open aborts it and rolls it back.

`session.history.nextUndo` says which of these the next press will do, so a button can read
"Cancel Betweenness" or "Undo Changed colour of Hubs":

```typescript
function undoLabel(session) {
    const next = session.history.nextUndo;
    if (next === null) return "Undo";
    return next.kind === "cancel" ? `Cancel ${next.pending[0].label}` : `Undo ${next.step.label}`;
}
```

`session.history.cancel(id)` cancels one pending item, and everything dispatched after it that
depends on it.

Undo never waits for work to finish: it takes effect when it is called, and resolves once the
picture has caught up.

## Coordinates

A layout moving on screen is not a step. Where it comes to rest is recorded into the step that
set it moving -- the load, the layout change, the drag -- so undo and redo put the nodes back where
they were without running the layout again. `session.positions.set(...)`, `pin(...)` and
`unpin(...)` place and pin nodes as steps of their own.

## Style and visibility edits return a Run

`session.styles.add`, `update`, `remove`, `move`, `encode`, `applyTemplate` and the visibility
verbs return a `Run`. The edit itself happens at once; the handle settles when the repaint that
draws it has finished. A signal that is already aborted when the verb is called stops the edit.
Cancelling the handle afterwards does **not** take the edit back -- it has been recorded, and may
have merged into a larger step. Call `session.undo()` to take it back.

## Selection

Selection is not a step: selecting does not add to the history, and undo does not restore an old
selection. Undo and redo do select what they changed -- the nodes put back, the nodes that moved --
with the selection cause `"history"`. A step that changed a style, a filter or a setting touches no
particular element and leaves the selection as it is.

## Following changes

`history:changed` fires whenever the steps, the position or the pending list change. A button
bar reads `canUndo`, `canRedo` and `nextUndo` on it:

```typescript
session.on("history:changed", () => {
    undoButton.disabled = !session.canUndo;
    redoButton.disabled = !session.canRedo;
    undoButton.title = undoLabel(session);
});
```

On the element, the same change arrives as the DOM event `graphty-history-change`, whose detail
carries `reason`, `version`, `position`, `steps`, `canUndo` and `canRedo`.

A host that mirrors graph state in its own UI listens for the change itself, whatever caused it:

- `project:changed` fires with `{ slices, cause }` as soon as project state changes, for every
  command, undo, redo, restore and rollback. `slices` names what changed (`"graph"`, `"layout"`,
  `"pins"`, `"arrangement"`, `"config"`, `"views"`, `"scopes"`, `"runs"`, `"styles"`,
  `"visibility"`), so a mirror of the layout choice or a setting re-reads what it names.
- `style:changed`, `visibility:changed` and `run:changed` follow once the picture has caught up,
  each with a `cause`: `"command"`, `"undo"`, `"redo"`, `"restore"` or `"rollback"`. A run that an
  undo takes away arrives with the phase `"removed"`, and one a redo brings back with
  `"restored"`.
- The element's `data-added`, `elements-removed` and `data-loaded` events fire for undo and redo
  too, with the same `cause`. A listener that starts work when data arrives should check that
  `cause` is absent or `"command"`, or it will start that work again on every undo.

See [Events](./events) for every event.

### React

`session.history.version` moves on every change, and the lists it guards are the identical frozen
objects between changes, so `useSyncExternalStore` reads the history without extra renders:

```tsx
import { useSyncExternalStore } from "react";

function useHistory(session) {
    useSyncExternalStore(
        (onChange) => session.on("history:changed", onChange),
        () => session.history.version,
    );
    return session.history;
}

function UndoButton({ session }) {
    const history = useHistory(session);
    return (
        <button disabled={history.nextUndo === null} onClick={() => void session.undo()}>
            {undoLabel(session)}
        </button>
    );
}
```

## Keyboard shortcuts

The element handles Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y (Cmd on macOS) while its canvas has keyboard
focus, and marks each key it handles with `preventDefault()`. A host page that binds the same keys
at the window has two choices:

- skip a keydown whose `defaultPrevented` is set, so one press is not two undos;
- or turn the element's own keys off and call `session.undo()` itself:

```html
<graphty-element history-keys="false"></graphty-element>
```

## Memory

History keeps what undo needs, not copies of everything. An attribute edit keeps the old values; a
finished run keeps its result, so undo and redo never compute it again; a load keeps the previous
graph. The budget is 256 MiB and 1000 steps by default:

```typescript
session.history.bytes; // what every step retains now
session.history.limitBytes = 64 * 1024 * 1024;
session.history.limitSteps = 200;
```

Past either limit the oldest steps are dropped, whole, then the farthest redo steps, until the
history is back within 90% of both limits: with `limitSteps = 200`, the 201st step leaves 180. The
margin spreads the work of dropping steps over many records instead of paying it on every one. The latest
step is always kept, even when it alone is over the budget, so the last action can always be
undone. At a million nodes a step that recorded coordinates holds about 12 MB, so a long session
on a large graph keeps fewer steps than a small one.

## Commands you register with the AI assistant

One message to the assistant is one step, so one undo takes back everything the message did. A
command registered with `registerCommand` joins that step only through `ctx.tx`:

```typescript
// After enableAiControl(...)
element.getAiManager()?.registerCommand({
    name: "colourHubs",
    // ...description and parameters...
    async execute(graph, params, ctx) {
        await ctx.tx.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#e4572e" },
        });
        return { success: true, message: "Coloured the hubs" };
    },
});
```

A change made through `graph` instead is a step of its own and is not rolled back when the message
fails. Stop when `ctx.abortSignal` fires: that is the message being cancelled, or undone while it
is still going.

## Plugin algorithms without a descriptor

An algorithm registered the 1.x way, by `namespace` and `type` with no catalogue descriptor, is
still one step. While it runs, the `Graph` it is handed records everything it writes -- node and
edge values, graph-level results, doors it calls such as `addNodes` or `styles` -- into that one
step, and undo takes all of it back. Such a plugin needs no change. An algorithm with a descriptor
is a run, and is covered by [Custom algorithms](./extending/custom-algorithms).

## Outside the contract

Undo restores what the element owns. Two things it does not:

- a style layer's `userData`, which is the host's own object, kept by reference as it was handed
  in;
- anything written straight into Babylon.js meshes, materials or the scene. The next repaint
  overwrites it, undo or not. Change appearance through style layers.

## A complete example

This runs as written in Node, with no renderer:

```typescript
import { createGraphSession } from "@graphty/graphty-element/session";

const session = createGraphSession();

await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
await session.data.addEdges([
    { source: "a", target: "b" },
    { source: "b", target: "c" },
]);
await session.data.updateNodes([{ id: "a", values: { team: "red" } }]);

session.history.steps.map((step) => step.label);
// ["Added 3 nodes", "Added 2 edges", "Edited 1 node"]

await session.undo(); // node a has no team again
await session.redo(); // and now it does

// Several changes, one step
await session.transaction("Grow the chain", async (tx) => {
    await tx.data.addNodes([{ id: "d" }]);
    await tx.data.addEdges([{ source: "c", target: "d" }]);
});
await session.undo(); // d and its edge are gone together

// A throw rolls the whole transaction back, and records nothing
await session
    .transaction("Half done", async (tx) => {
        await tx.data.addNodes([{ id: "e" }]);
        throw new Error("changed my mind");
    })
    .catch(() => {});

// Back to where the session started
await session.history.restoreTo(null);

session.dispose();
```

## Related

- [Migrating to 3.0](./migrating-to-3): what changed for code written against 2.x
- [JavaScript API](./javascript-api)
- [Events](./events)
- [Notes](./notes)
