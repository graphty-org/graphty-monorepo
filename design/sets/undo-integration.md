# Sets meet undo: the merge checklist

Two branches change the same corner of graphty-element. The sets branch (`feat/element-sets`,
design in `sets-design.md`) turns saved scopes into first-class sets under `session.sets`. The
undo branch (`feat/element-undo`, design in `design/undo/undo-design.md`, plan in
`design/undo/undo-plan.md`) turns project state into slices written only through a command
dispatcher, and today holds saved scopes in a slice called `scopes`. Neither branch imports the
other's code.

This file is what whoever merges second has to do. Every item is mechanical except the five
decisions at the end, which are one-way doors and must be answered before the second merge lands.
Paths are under `graphty-element/src/` unless they say otherwise. "Undo branch" line references
are to its tip as of 2026-09-27 (plan phase `25b` reached, `PLAN_PHASE` in
`session/commands/doors.ts`).

The sets branch was built to make this a rename rather than a redesign:

- set state is one keyed value, `Map<SetId, ElementSet>` of deep-frozen records;
- it is written only by `SetsStore.put(record)` and `SetsStore.delete(id)`
  (`session/sets/store.ts`), called only from `session/sets/SetsApi.ts`;
- every write door goes through one of five pure functions in `session/sets/prepare.ts`, which
  are the bodies of five future commands;
- every write runs inside `SetsStore.transact(write, cause)`, a group that nests as savepoints
  and commits or rolls back whole, which is the shape of the dispatcher's group.

---

## 1. The slice

| Where (undo branch)                                        | Today                                            | After the merge                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `session/project/state.ts`, `ProjectState`                 | `scopes: ReadonlyMap<ScopeId, SavedScopeRecord>` | `sets: ReadonlyMap<SetId, ElementSet>`                                                     |
| `session/project/state.ts`, `createProjectState`           | `scopes: new Map(init.scopes)`                   | `sets: new Map(init.sets)`                                                                 |
| `session/project/draft.ts`                                 | `draft.scopes`                                   | `draft.sets`, same keyed-value draft                                                       |
| `session/project/derive.ts`, `HOOK_ORDER` and `snapshot()` | `"scopes"`, copied map                           | `"sets"`, copied map; position in section 3 below                                          |
| `session/project/digest.ts`                                | `scopes=${canonical(state.scopes)}`              | `sets=` over each record's `id`, `name`, `order`, `createdFrom` and `revision` (see below) |
| `session/types.ts`, `ProjectSlice`                         | `"scopes"`                                       | `"sets"` (decision 3)                                                                      |
| `session/scope/ScopeApi.ts`, `SavedScopeRecord`            | the slice's value type                           | deleted; `ElementSet` (`session/sets/types.ts`) replaces it                                |

- **The record.** `ElementSet` widens `SavedScopeRecord { id, name, spec, order }`: `spec` is
  `definition` (a `SetDefinition`, not a `Scope`), and `createdFrom` is added. `revision` is a
  memoised accessor, not stored.
- **The digest.** Digest each record by `revision` rather than walking `definition`: a fixed set's
  edge members are held in typed columns and materialise 72 bytes per member when
  `definition.edges` is read, so a generic walk would allocate at scale. `revision` is the
  canonical content hash of the definition (sets design section 12.2), so it is exact.
- **What stays outside the slice**, as session state beside it, never rewound by undo, rollback
  or eviction (sets design sections 3.1 and 12.4):
    - the issued-id register, `SetsStore.issued`, appended at commit only;
    - the order high-water mark, `SetsStore.nextOrder()`; a restored record keeps its order, so
      "one past the highest live order" would give two live sets one order after remove, create,
      undo;
    - tombstones (`SetsStore.tombstone(id)`), authoritative only while the id is absent from the
      slice;
    - edge seeds (`SetsStore.seed`, `seedsOf`), not serialised; stale seeds for members a restored
      record no longer holds are never read;
    - the resolution cache (`session/sets/cache.ts`), keyed by per-set signatures, so an undo that
      restores the identical frozen record hits it again.
- **Where the records live.** `SetsStore` keeps its register, tombstones, seeds and cache but
  stops owning `records`: `get`, `values` and `list` read `dispatcher.state.sets`, and `put` and
  `delete` become `ctx.draft.sets.set` and `ctx.draft.sets.delete` inside command bodies. `list()`
  still sorts by `order`, ties by id, and still returns the same frozen objects until a record
  changes.
- **One serialiser.** `SetsStore.toLogicalRecords()` and `loadLogicalRecords(stored)` are the only
  code that reads or writes set state as a whole (`{ records, register, tombstones }`). The
  baseline a session loads and any future project file use them; nothing else serialises sets.

## 2. The commands

`session/commands/scope.ts` is replaced by `session/commands/sets.ts`, and `SCOPE_DEFINITIONS` by
`SET_DEFINITIONS` in `session/commands/index.ts`. Every op is on the immediate lane, `moves:
false`, undoable, keyed `sets/<id>`.

| Op             | Recorded command                               | Body (`session/sets/prepare.ts`) | Label                                 | Doors that dispatch it                                                                  |
| -------------- | ---------------------------------------------- | -------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `set.create`   | `{ id, name, order, definition, createdFrom }` | `prepareCreate`                  | `Created the set "<name>"`            | `sets.create`, `createFrom`, `createPath`, `combine`, `scope.save`, `selection.promote` |
| `set.rename`   | `{ id, name }`                                 | `prepareRename`                  | `Renamed the set "<old>" to "<name>"` | `sets.rename`                                                                           |
| `set.redefine` | `{ id, definition }`                           | `prepareRedefine`                | `Changed the set "<name>"`            | `sets.redefine`                                                                         |
| `set.members`  | `{ id, add?, remove? }`                        | `prepareMembers`                 | `Changed the members of "<name>"`     | `sets.addMembers`, `sets.removeMembers`                                                 |
| `set.remove`   | `{ id }`                                       | `prepareRemove`                  | `Removed the set "<name>"`            | `sets.remove`, `scope.remove`                                                           |

- **Each body is**: read a `RecordView` over `ctx.state.sets`, call the prepare function, then
  `ctx.draft.sets.set(record.id, record)` or `ctx.draft.sets.delete(id)`. A prepare function that
  returns `null` is a no-op (same name, same canonical definition, members already present or
  already absent): dispatch records no step. Refusals are thrown by the prepare function with the
  codes the sets design lists (section 15.2), before any draft write.
- **Minting happens at the door, before dispatch.** The door calls `SetsStore.mint(name)` and
  `nextOrder()` and puts `id` and `order` into the command, as the undo branch's doors test
  already expects for `scope.save` (`id: "set_door-scope"`). A redo replays the recorded patch
  and never mints. `Group.minted` (the pending list in `store.ts`) becomes a list on the
  dispatcher's group: appended to the register when the outermost group commits, discarded on
  rollback, including a savepoint's rollback.
- **The consumer's command form carries no `id`, `order` or `createdFrom`.** The undo branch's
  `scope.save` accepts `id?` from `session.execute`. The sets design forbids that for `set.create`:
  an id supplied by a caller could collide with the register or re-point stored references. The
  public `SessionCommand` member for `set.create` is therefore
  `{ op: "set.create", definition, name? }`, and the dispatcher's recorded form adds the minted
  fields. See decision 2.
- **Services.** `Dispatcher.services.scopes: ScopeService` becomes `services.sets`, exposing the
  store's `mint`, `nextOrder` and `seed` and the resolver (`resolveSet`) that section 5 uses.
  `unknownScopeError` is replaced by the refusal `prepareRemove` already throws.
- **Asynchronous doors stay outside the dispatcher.** `createFrom`, `createPath` and `combine`
  resolve their source on their own time, then in one synchronous tick re-check what they
  assumed, mint, and dispatch one `set.create` whose `definition` is already concrete. They are
  not queued-lane commands: a replay never re-resolves.
- **Execute results** (`session/types.ts`, the map beside `"scope.save": Promise<ScopeId>`):
  `"set.create": Promise<SetId>`; the other four `Promise<void>`. Drop the `scope.*` entries
  unless decision 1 keeps them.
- **Groups.** `SetsStore.transact` is deleted; each door runs inside the dispatcher's group
  instead. The rule it kept still holds: a door called inside an open group is a savepoint, so a
  refused `create` inside a transaction undoes only its own writes and mints.
- **Edge seeds** are written after the draft write by `SetsApi`'s `seed` helper, as today. They
  are not part of the step.

## 3. Derivation and events

- **No `scopes` hook exists on the undo branch**; its `ScopeApi` keys its caches on
  `dispatcher.lane.writes("scopes")` (`session/scope/ScopeApi.ts`, about line 599). Delete that
  key. The sets branch's `ScopeApi` caches through per-set signatures
  (`session/sets/signature.ts`), which move only when a set a scope reads changes, and move back
  when undo restores the identical record.
- **Add a `sets` hook.** On master the sets branch repaints from `SetsStore.onCommit` through
  `SetsNotifier` (`session/sets/notify.ts`): it re-checks the signature of every style layer and
  visibility filter naming a changed id and repaints only the rows whose membership moved. Move
  that call into a `sets` derivation hook, driven by the dirty keys, so undo and redo repaint the
  same way a forward write does. Delete the `onCommit` subscription.
- **Hook order.** Put `"sets"` directly after `"runs"` and before `"styles"` and `"visibility"`: a
  set may read a run's result, and layers and filters read sets.
- **Extend the `runs` hook** the same way for layers and filters whose scope reads a changed run
  (a rule with an `item` or `threshold` leaf).
- **The visibility mask copy.** Add the signatures of every set the filter names
  (`scopeSignature` in `session/sets/signature.ts`) to `MaskTag.inputs`
  (`session/visibility/VisibilityApi.ts`, about line 363). Without it, a mask copied before a
  redefine would be pasted back after one. This replaces the undo design's "the scopes slice's
  revision" (section 3.4).
- **`set:changed`.** Publish it from the committed diff of the `sets` slice when a step seals,
  one event per changed key, after the style and visibility passes. `SetChange.cause` gains
  `"undo"` and `"redo"` (decision 4); a rollback emits nothing, as today. It is additional to
  `project:changed`, which keeps listing `"sets"` among its slices.

## 4. The other slices sets touch

- **Runs (undo plan phase 15).** A run's result now carries an execution token and, after a
  re-run, captures of the members that holding references read from the earlier run.
    - Token: minted by `createExecutionMinter` (`session/runs/RunsApi.ts`), a session nonce plus a
      counter the dispatcher must never rewind; held while running in `Run.executionValue` and
      written with the result in `Run.resultExecutionValue` (`session/runs/Run.ts`). Add
      `execution: string` to `RunEntry` (`session/project/state.ts`), written with the result.
    - Captures: in `Run.heldValue`, read through `Run.held` and `RunsApi.heldOf(id)`, written only
      when a re-run replaces a result, through `captureHeld` supplied by `GraphSession`. Add
      `held: HeldCaptures` to `RunEntry`, written by the re-run's command in the same step as the new
      result. History eviction must never drop them: a layer restored by undo paints from them.
    - Both then become `MaskTag.inputs` material automatically, since the entry object is the input.
- **Layout (undo plan phase 17).** The layout scope lives in `LayoutManager.carriedScope`
  (`managers/LayoutManager.ts`), written by `setLayout(type, opts, scope)` and
  `Graph.setLayoutScope`, read by `Graph.getLayoutScope`. Add `scope?: Scope` to `LayoutChoice`
  and to the `layout.set` command; `Graph.setLayoutScope`, the element's `layoutScope` setter and
  `setLayout(..., { scope })` dispatch `layout.set`. The `layout` hook's restore mode takes the
  hold mask again when the restored layout starts (the hold is frozen per start, sets design
  section 11).
- **Visibility and styles** need no new command: a filter or layer that names `{ set: id }` is a
  value in their slices, and section 3 covers the repaint.
- **Selection after history (undo plan phase 20).** A set step selects what it touched: the
  members of the set after the step, or before it for a removal, through `resolveSet(record,
context)` (`session/sets/cache.ts`), the synchronous internal resolver kept for this.

## 5. Door-list rows

In `session/commands/doors.ts`. `door-surface.test.ts` will fail on every unclassified member the
sets branch adds until these rows exist.

| Root                                                            | Member                                                                | Row                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GraphSession` (`SESSION`)                                      | `sets`                                                                | `READ`                                                                                                  |
| `SetsApi` (new root, `session/sets/SetsApi.ts`, half `session`) | `list`, `get`, `status`, `pathKind`, `containing`, `usedBy`, `offers` | `READ`                                                                                                  |
|                                                                 | `create`                                                              | `calls([{ kind: "fixed", nodes: ["d1"], reading: "induced" }, { name: "door set" }], [set.create ...])` |
|                                                                 | `createFrom`                                                          | `calls(["graph", { name: "door from" }], [set.create ...])`                                             |
|                                                                 | `createPath`                                                          | `calls(["selection"], [set.create ...])`, `around` selects two joined edges                             |
|                                                                 | `combine`                                                             | `calls(["union", [...two fixed sets...]], [set.create ...])`                                            |
|                                                                 | `rename`, `redefine`                                                  | `set.rename`, `set.redefine`; `around` creates `door seed` first                                        |
|                                                                 | `addMembers`, `removeMembers`                                         | `set.members`                                                                                           |
|                                                                 | `remove`                                                              | `set.remove`                                                                                            |
| `ScopeApi`                                                      | `save`                                                                | dispatches `set.create` (not `scope.save`, unless decision 1 keeps the alias)                           |
|                                                                 | `remove`                                                              | dispatches `set.remove`                                                                                 |
|                                                                 | `resolve`, `count`, `list`                                            | `READ` (unchanged)                                                                                      |
| `SelectionApi` (`SELECTION_API`)                                | `promote`                                                             | dispatches `set.create` with the selection's nodes and edges                                            |
| `Graph` and the element (`graph` rows)                          | `getLayoutScope`                                                      | `READ`                                                                                                  |
|                                                                 | `setLayoutScope`                                                      | dispatches `layout.set` with `scope`                                                                    |
| element                                                         | `layoutScope`                                                         | `assigns(...)` dispatching `layout.set` with `scope`                                                    |
| `LayoutManager`                                                 | `setLayout` (new third parameter)                                     | unchanged row; its expectation gains `scope` when given                                                 |
|                                                                 | `scope`, `scopeUser`                                                  | `READ`                                                                                                  |
|                                                                 | `carryScope`                                                          | dispatches `layout.set`                                                                                 |
|                                                                 | `rescope`, `releaseDetachedScope`                                     | `DERIVED`: they react to a set change and write no project state                                        |
|                                                                 | `setScopeSource`                                                      | `LIFECYCLE`                                                                                             |
| `RunsApi`                                                       | `heldOf`                                                              | `READ`                                                                                                  |
| `Run` (only if the walker sees class members)                   | `resultExecution`, `held`                                             | `READ`                                                                                                  |
| `LayoutEngine` (only if it is a root)                           | `setHoldMask`, `holdMask`                                             | `TRANSPORT`                                                                                             |

Every recorded expectation carries the minted `id` and `order` (the doors test runs on a fresh
session, so the first is `order: 1`) and the `createdFrom` the door records (sets design
section 5.1).

## 6. Tests to move

- `test/session/history/fixtures.ts`: replace the `scope.save` and `scope.remove` fixtures with
  one per `set.*` op.
- `test/session/scope/undo.test.ts` becomes `test/session/sets/undo.test.ts`, and gains:
    - redo of a create returns the same `SetId`, and undo of a removal lists the set where it was;
    - remove, undo, create: the new set gets a new id, never the restored one (the register does
      not rewind);
    - create inside a transaction that then fails: nothing is registered;
    - redefine, undo: `get(id)` is the identical frozen object and the resolution cache hits;
    - undo of a redefine repaints a layer naming the set, and redo repaints it back;
    - a filter over `{ set }`, redefine, undo, redo: the mask copy is used only when the set's
      signature matches.
- `test/session/history/random-model.ts`: the save and remove edits (about line 1821) become set
  edits, plus rename, redefine, member edits and `createFrom`.
- `test/session/history/derive.test.ts`: the hook-order lists.
- `test/session/history/scale.test.ts`: the "style, scope or settings edit" row names a set edit,
  and a new row covers `set.members` on a 500,000-member set.
- The sets branch's own tests that read `SetsStore.transact` or `onCommit` switch to the
  dispatcher.

## 7. The undo design and plan

Design (`design/undo/undo-design.md`):

- section 3.1 slice table, row `scopes`: `sets`, `SetId -> ElementSet`, keyed value;
- section 3.4: the mask copy's tag names set signatures, not the scopes revision;
- section 5 hook table, row `scopes`: replaced by the `sets` hook of section 3 above;
- section 7 memory table: add "Set member edit: both whole records, about 8 bytes per node
  member and 24 per edge member (a 1M-edge set about 24 MB per step); refused above 1M edge
  members until a members op-log exists. A redefine that changes only the reading shares the
  member arrays";
- section 11.3, the scope row, and the command table's `scope.save` and `scope.remove` rows: the
  five `set.*` ops;
- the `ProjectSlice` listing: `"sets"`.

Plan phases (`design/undo/undo-plan.md`), all but the last two already done on that branch, so
each is a revisit, not new work:

| Phase                                           | What changes                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| 2. Project state, drafts and patches            | the slice rename and value type (section 1)                                             |
| 5. Derivation lane and event order              | the `sets` hook, its order, `set:changed` at seal (section 3)                           |
| 6. Public history API, `./commands`, door tests | the five ops in `SessionCommand`, the execute results, the door rows (sections 2 and 5) |
| 8. Visibility                                   | set signatures in `MaskTag.inputs`                                                      |
| 9. Scopes and saved views                       | superseded for scopes by sections 1 and 2; views unchanged                              |
| 15. Runs as steps                               | `RunEntry.execution` and `RunEntry.held`                                                |
| 17. Layout choice and dimension                 | `LayoutChoice.scope` and the layout-scope doors                                         |
| 18b. Frozen records, strict state               | set records are already deep-frozen; include the slice in the strict-state check        |
| 20. Selection after history                     | a set step selects its members through `resolveSet`                                     |
| 21. Random sequences and scale                  | the random-model edits and the scale row (section 6)                                    |
| 26. Documentation and release                   | the history guide lists set edits as undoable; release notes carry the decisions below  |

The app phases (23, 25a to 25c) are unaffected: the app calls none of the scope or set doors.

## 8. Decisions due before the second merge (one-way doors)

1. **Does `scope.save` / `scope.remove` survive as an op name?** Recommendation: no. The
   deprecated `scope.save` and `scope.remove` doors dispatch `set.create` and `set.remove`, so
   history shows one vocabulary. Neither op has been released, so dropping them costs nothing now
   and is breaking later.
2. **The public `set.create` command form.** Recommendation: no `id`, `order` or `createdFrom` from
   a caller; the recorded form carries them. This differs from the undo branch's `scope.save`,
   which accepts `id?`.
3. **`ProjectSlice` spells the slice `"sets"`.** It is a published union on the undo branch.
4. **`SetChange.cause` gains `"undo"` and `"redo"`.** The union is declared open, so this is
   additive, but the values are published.
5. **The op names `set.create`, `set.rename`, `set.redefine`, `set.members`, `set.remove`**, which
   also appear in the sets design's public contract (section 15.3, item 12).

## 9. Conflicts to expect

Textual conflicts are confined to: `session/scope/ScopeApi.ts` (`save`, `list`, `remove` and the
cache key), `session/selection/SelectionApi.ts` (`promote`), `session/types.ts` (the session,
`ProjectSlice`, the execute results), `session/project/state.ts`, `session/commands/index.ts`,
`managers/LayoutManager.ts` and `Graph.ts` (the layout doors), and `session/runs/Run.ts` and
`RunsApi.ts` (the token and captures). In each, keep the sets branch's behaviour and route its
writes through the undo branch's dispatcher.
