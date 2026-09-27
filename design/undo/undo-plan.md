# Undo and redo in graphty-element: implementation plan

This plan builds what `design/undo/undo-design.md` describes: undo, redo and a labelled history
owned by graphty-element's session, with every change to project state going through one
dispatcher, and the graphty app's own history store deleted. GitHub issue #427; it also closes
#197 (the app's Undo button reverts nothing) and delivers the undo half of #337 (the command
vocabulary published from `./commands`).

"The design" below means `design/undo/undo-design.md`, and "design section N" points into it.
Paths are relative to the repository root.

---

## How to read this plan

The work is split into phases. Each phase is sized for one engineer session and leaves the
repository green: `pnpm run lint` (ESLint, `tsc --noEmit`, the strict-consumer typecheck, knip),
`pnpm run build`, and the fast tests (`tools/prepush.sh`) all pass at the end of it. Phases that
would not fit in one session are split into lettered parts (4a and 4b, 16a and 16b, 18a to 18c,
19a and 19b, 25a to 25c); each part is its own session and its own commit, and the numbers of the
other phases stay as they are. Every phase is test-driven: the tests listed under "Tests first" are written and
seen failing before the code that makes them pass.

**Phases run strictly in numeric order.** Most of them lean on ops, fixtures or doors that an
earlier one brings (a removal test that changes a setting needs the settings phase, a run test
that imports data needs the imports phase), and a map of which could run side by side would be
wrong the first time a test gained a line. Serial order costs nothing on one branch.

Six rules hold for every phase:

1. **The door ratchet keeps partial work honest.** From phase 6 on, `graphty-element/src/session/
commands/doors.ts` lists every public member that can change the element, each marked with
   one of five statuses: the op it dispatches; `exempt` with a reason; `readOnly`; `knownGap`
   with the phase that will port it (the door does not dispatch yet); or `partial` with the phase
   that will finish it and a reason (the door dispatches, but a single call of it is not yet one
   step, for example a door that reaches several already-ported verbs one after another). It
   starts from the inventories (`design/undo/inventory-*.md`), but the inventories are not what
   makes it complete: a completeness check (phase 6) walks the public types of the element and
   fails on any public name `doors.ts` does not classify, so a member added later, or one the
   inventories missed, cannot ship without a decision on whether it is undoable. The doors tests
   fail if a door dispatches something other than its entry, if the command it dispatches
   differs from the expected command written in its row (the right op with a dropped field
   fails), if a `knownGap` door has started dispatching without its entry being updated, and if
   a `partial` door stops dispatching. `doors.ts` also exports `PLAN_PHASE`, the label of the
   phase the branch has reached (such as `"16a"`, compared in the order of the phase map), which
   each phase's commit raises; the doors test fails when a
   `knownGap` or `partial` row names a phase at or below it, so a phase cannot finish while a
   door it promised to port or finish is still open. A phase that ports doors moves them off
   the gap list. The last element phase empties it.
2. **A phase that breaks an in-repo caller fixes that caller in the same phase.** Narrowing a type
   or making a field private breaks the graphty app, stories or tests that used it; those edits
   are part of the phase, kept to the minimum that compiles and keeps behaviour. The deliberate
   app migration is still its own phases (23 to 25c).
3. **Tests land with the op.** A phase that adds an undoable op to `COMMANDS` adds, in the same
   phase: a round-trip fixture in `graphty-element/test/session/history/fixtures.ts` for every
   value of the op's argument discriminant (each `style.patch` action, each `data.apply` kind,
   each `config.set` key group), because the vocabulary test fails otherwise; the fixture's
   renderer twin when the op changes what is drawn (see "Where the history tests run"); and the
   op, with its asynchronous variants, among the command generators of the random-sequence model
   (from phase 7), so cross-slice interleavings are tested as each slice lands rather than after
   the last one.
4. **Nothing new is exported that nothing uses.** knip runs in pre-push. Internal modules land
   together with their first consumer or are imported by their tests only (knip already treats
   test files as entries). Public names are added in the phase that makes them work.
5. **A phase is green only when the tests it touched ran.** `tools/prepush.sh` runs
   graphty-element's `default`, `mesh`, `contract` and `xr` projects, not `browser` or
   `storybook`. So every phase's "Done when" also means: `vitest run --project=browser` over the
   `test/browser/` files the phase added or changed, and `vitest run --project=storybook` over the
   stories it added or changed. The two browser twins that every phase grows
   (`test/browser/doors.test.ts` and `test/browser/history-round-trip.test.ts`) are added to the
   `contract` project's list, so pre-push runs them on every push; they use layouts that place
   nodes in one pass, which keeps them inside that lane's time budget.
6. **Strict state is on in every test project from phase 4a.** See "Where the history tests run".

Workflow constraints for whoever executes this: work in `.worktrees/element-undo` on branch
`feat/element-undo`; commit each phase separately with a conventional-commit message; never use
`git stash`, `checkout`, `reset`, `switch` or `rebase`; start any server through servherd.

### The owner's decisions, and when they are needed

Design section 15 lists the one-way doors: every published name and shape in design section 10,
the op names, the transaction signature, the behaviour breaks in design section 15.2, and the
release as graphty-element 3.0.0. None of these becomes one-way while it lives on an unmerged
feature branch: no consumer can reach it, and renaming it before merge is an edit. So the work
proceeds on the branch with the design's names, and **the pull request does not merge until the
owner has approved design section 15** or recorded different choices there (phase 26). The owner
is asked for that approval when phase 1 starts, so the answer is usually in hand long before it
is needed; a changed name is then applied in whichever phase is current. If the owner picks a
minor release instead of 3.0.0, only phase 26 changes.

### Where the history tests run

graphty-element's test projects decide what a test can see, and the history tests need three
different things.

- **Session-only tests** run in the Node `default` project under `test/session/history/`: the
  draft, history, dispatcher, derivation and event-order tests, the vocabulary test, the session
  half of the doors test, the round-trip harness over the Node-safe session, and the
  random-sequence model. They see state and the digests, never a mesh. A fixture is tagged
  `session` when everything it changes is visible there.
- **Renderer tests** run in the `browser` project under `test/browser/`, on a real `Graph`: the
  element, `Graph` and manager half of the doors test with its getter-after-undo section
  (`test/browser/doors.test.ts`, reading the same `doors.ts`); the renderer twin of the round-trip
  harness (`test/browser/history-round-trip.test.ts`), which runs every fixture tagged `renderer`
  and adds a scene digest; and every test that names the scene, the engine or the camera. The
  scene digest has two parts. The first is structural: node and edge render objects keyed by id
  and matching the slice ids, the skybox dome count, `scene.metadata.twoD`, the engine's
  dimension. The second is what was painted: for every node and edge id, in id order, the
  values read back from the render side (instance colour and scale from the instance buffers,
  mesh shape, enabled and visible flags, and label text), hashed together. Without the second
  part, a derivation hook that skips a repaint after undo leaves stale paint on the meshes while
  every state and structural digest still matches. The vocabulary test fails when an op that
  changes what is drawn has no `renderer` fixture. CI runs these in the five
  `graphty-element-browser` shards; pre-push reaches the two twins through `contract` (rule 5).
- **Timing** runs only where coverage is off. CI runs `default` and `browser` with v8 coverage,
  which makes milliseconds meaningless, and the repository already keeps timing in the `bench`
  project (`*.bench.test.ts`) for that reason. `bench` runs in Node, so phase 21 adds a
  `bench-browser` project for the one timing file that needs a real scene. Byte counts, retained
  sizes and "one rebuild ran" counters are not timing and stay in ordinary tests.

Strict state (design section 12.1) is switched on by one call in each setup file, which together
cover every project: `test/setup.ts` (`default`, `bench`, `contract`, `xr`, `browser`,
`interactions`), `.storybook/vitest.setup.ts` (`storybook`) and
`test/mesh-testing/test-setup.ts` (`mesh`). `llm-regression` has no setup file and gains one
that makes the same call. Outside the element's own tests the switch is a global,
`globalThis.__GRAPHTY_STRICT_STATE__ === true`, which the element reads when a session is
created. It is a global rather than an environment variable because the graphty app's tests,
and graphty-element's `browser` projects, run in Chromium where there is no `process`, and the
published `./bundle` must not touch `process` at all. In Node the element also accepts
`GRAPHTY_STRICT_STATE=1`, read only behind `typeof process !== "undefined"`. The graphty app's
browser setup file assigns the global before any element is created (phase 25c), so no internal
module has to be reachable through the package's exports map.

### Phase map

| #   | Phase                                                                    | Area                   |
| --- | ------------------------------------------------------------------------ | ---------------------- |
| 1   | Sealable snapshots in graph-format                                       | graph-format           |
| 2   | Project state, drafts and patches                                        | state core             |
| 3   | History: steps, cursor, coalescing, budget                               | state core             |
| 4a  | Dispatcher: dispatch, groups, rollback, transactions                     | state core             |
| 4b  | Dispatcher: queued lane, holds, pending work, undo rules, cancel         | state core             |
| 5   | Derivation lane and event order                                          | state core             |
| 6   | Public history API, `./commands`, vocabulary and door tests              | API and gap guarantees |
| 7   | Styles                                                                   | slice port             |
| 8   | Visibility                                                               | slice port             |
| 9   | Scopes and saved views                                                   | slice port             |
| 10  | Project settings and the frozen merged configuration                     | slice port             |
| 11  | Ingest moves to the Node-safe session                                    | graph slice            |
| 12  | Graph additions and attribute edits                                      | graph slice            |
| 13  | Graph removals, clear, and lazy structural inverses                      | graph slice            |
| 14  | Imports, expansion and batches                                           | graph slice            |
| 15  | Runs as steps                                                            | runs slice             |
| 16a | Pins, positions, captures and restore mode                               | arrangement            |
| 16b | Group captures, seal targets, epochs and the eviction fold               | arrangement            |
| 17  | Layout choice and dimension                                              | layout slice           |
| 18a | Plugin algorithms and the `Graph` facade                                 | closure                |
| 18b | Frozen records, sealed snapshots, strict state complete                  | closure                |
| 18c | Narrowing the public escapes and moving their callers                    | closure                |
| 19a | Gestures: drag, keys, assistant, XR, `batchOperations`                   | gestures               |
| 19b | Camera and view-preset doors                                             | element API            |
| 20  | Selection after history, and columnar run results                        | behaviour and memory   |
| 21  | Random sequences complete, and scale                                     | gap guarantees         |
| 22  | Stories and picture equality                                             | gap guarantees         |
| 23  | App: history surfaces call the session; `undoStore.ts` deleted           | app                    |
| 24  | The app lint rule, at warning level                                      | gap guarantees         |
| 25a | App: load, close and the load failure as transactions                    | app                    |
| 25b | App: the component, its handle, graph commands, runs and metrics         | app                    |
| 25c | App: mirrors, removed runs, strict state; the lint rule becomes an error | app                    |
| 26  | Documentation and release                                                | docs                   |

---

## Phase 1. Sealable snapshots in graph-format

**Goal.** A resident snapshot's attribute tables can be made read-only, so the element can stop
handing out writable tables (design section 4.9, "Writable attribute tables").

**Files.**

- `graph-format/src/types/columns.ts` and the snapshot implementation under `graph-format/src/`:
  add `snapshot.seal()`; after it, `set`, `remove` and `rename` on the attribute tables throw.
- `graph-format/src/errors` (the module that defines the existing `E_*` codes): add `E_FROZEN`.
- `graph-format/README.md` (graph-format has no separate docs page; its README is the guide) and
  `design/graph-format/graph-format-design.md`: document `seal()` and `E_FROZEN`.

**Tests first.** In `graph-format/test/columns/`: sealing makes each of `set`, `remove`, `rename`
throw `E_FROZEN`; reads are unchanged; sealing twice is harmless; an unsealed snapshot behaves as
today. A compile-only case in `graph-format/test/types/` for the new method.

**Done when.** graph-format tests, `typecheck:strict-consumer`, lint and build pass; the change is
additive (a `feat` commit, a minor release of graph-format). The element does not call `seal()`
yet; phase 18b does.

---

## Phase 2. Project state, drafts and patches

**Goal.** The in-memory model of project state and the only writer of it, with no element code
using it yet (design sections 3.1, 3.4, 3.5, 4.1).

**Files (all new, Node-safe).**

- `graphty-element/src/session/project/state.ts`: the ten slice types (`graph`, `pins`, `config`,
  `layout`, `arrangement`, `runs`, `styles`, `visibility`, `scopes`, `views`), `RunEntry`, the
  baseline, and the never-reissued counters for the graph token and the graph epoch.
- `graphty-element/src/session/project/draft.ts`: `Draft` with a typed setter per value slice
  (`draft.styles = next`, `draft.runs.set`, `draft.scopes.delete`, ...); each write records the
  key's prior value at the moment of the write; `Patch`; `applyForward(patch)` and
  `applyBackward(patch)`; key hand-over between two open patches (design section 4.3, "Value
  slices hand the key over"); `deepFreezeArgs` (`structuredClone` then freeze).
- `graphty-element/src/session/project/digest.ts`: the canonical state digest (design section
  12.4). The graph part is a stub that hashes whatever the `graph` slice holds; phase 12 fills it.
  The arrangement part is a switch (`stateDigest(state, { arrangement: true })`) that stays off
  until phase 16a turns it on, because nothing restores coordinates before then (the round-trip
  harness in phase 6 says so in its skip reason). The picture digest is not written here: it
  reads `session.paint` and the masks, which no state-only module can reach, so it lands with
  its first consumer, the phase 6 harness, with its lane part switched off the same way.
  Types that only a later phase will import (`Patch`, `Draft`, `ProjectStore`, ...) are declared
  without `export` so knip stays green; the phase that first imports one adds the `export`.

**Tests first** (`graphty-element/test/session/history/draft.test.ts`, `digest.test.ts`).

- Writing a key records the prior value; `applyBackward` restores the identical object;
  `applyForward` after it restores the written object.
- Two open patches: B writes a key A wrote; A's patch loses the key, B's prior is A's prior;
  rolling A back leaves B's value; undoing A leaves B's value; undoing B restores the value
  before both.
- A stored argument is copied and deep-frozen; mutating the caller's object afterwards changes
  nothing in state.
- Token and epoch counters never issue the same value twice across a million draws.
- Digest equality is stable across map insertion order for value slices.

**Done when.** The new tests pass; `node-safe-entries.test.ts` still passes (the modules are not
reachable from an entry yet); lint, knip and build are green.

---

## Phase 3. History: steps, cursor, coalescing, budget

**Goal.** `History` records patches as steps and moves a cursor over them, independent of how
patches are made (design sections 5, 5.2, 7).

**Files.**

- `graphty-element/src/session/project/History.ts` (new): the step list, `position`, record
  (discards the redo tail), merge into the top step by coalesce key within `coalesceMs` (a merge
  keeps the first prior, the last written value, and concatenates op-logs), undo, redo,
  `restoreTo` as a sequence of undos or redos, `clear` (current state becomes the baseline),
  per-step byte sizes on each side of the cursor plus the fixed 512 bytes, `limitBytes`
  (256 MiB) and `limitSteps` (1000), batched eviction down to 90% (caches first, then the oldest
  done steps, then the farthest redo steps; never the latest done or the next redo step), the
  lazily built frozen `steps` array, `version`. The coalescing window reads time through an
  injected `now()` (default `performance.now`), never the wall clock directly, so tests and the
  random-sequence model decide when a window expires.
- Arrangement captures are not handled yet: steps have slots for a before-capture, an
  after-capture and a row patch that stay empty until phase 16a.

**Tests first** (`test/session/history/history.test.ts`).

- Record, undo, redo, record after undo empties the redo tail.
- Coalescing: equal keys within the window merge; an undo in between, a different step in
  between, or an expired window prevents it.
- Eviction: over either limit evicts to 90% of both; the latest done step and the next redo
  step survive even when each alone exceeds the budget; evicted steps disappear whole.
- `steps` returns the identical frozen array between changes and a new one after; a merge
  replaces only the top element.
- A small fast-check model over fake patches: undo-all returns to the start, redo-all to the end,
  at every position the state equals what the model sealed for it.

**Done when.** Tests pass; lint, knip, build green.

---

## Phase 4a. Dispatcher: dispatch, groups, rollback, transactions

**Goal.** The one mutation path on the immediate lane, working on fake command definitions
(design sections 4.1, 4.2, 4.4, 5.1).

**Files.**

- `graphty-element/src/session/project/Dispatcher.ts` (new): `CommandDefinition` as in design
  section 4.1 (`undo` undoable-with-label-and-coalesce or exempt-with-reason, `moves`, `keys`,
  `lane`, `execute`); `dispatch` steps 1 to 7 of design section 4.4 on the immediate lane only;
  groups and group sealing; late-resolving doors (a function from state to a concrete command);
  rollback through `applyBackward`, publishing only if something live was reverted;
  `transaction(label, fn, options)` with a `tx` facade, origin membership, nested flattening,
  abort state until `fn` settles, `E_TRANSACTION_CLOSED`.
- `graphty-element/src/session/project/strict.ts` (new): the strict-state switch (a call; the
  `globalThis.__GRAPHTY_STRICT_STATE__` global; in Node only, `GRAPHTY_STRICT_STATE=1` read
  through `globalThis.process`, so nothing throws where there is none) and the first assertion
  that needs no renderer: a hand-over leaves a key in exactly one open patch. The check that no
  graph token or epoch is issued twice moves to phase 12: until a primitive writes the token into
  the `graph` slice, the counter in `state.ts` is its only issuer and cannot repeat a value, so
  the check would have nothing to see.
- Each setup file assigns the global directly rather than importing `strict.ts`, because the
  `mesh` setup file must not reach anything under `src/`.
- A definition is written against `UndoableDefinition<C>` or `ExemptDefinition<C>`, not the
  `CommandDefinition<C>` union: TypeScript cannot pick the context type of `execute` from the
  nested `undo.kind`, so a literal typed as the union leaves `ctx` untyped.
- The setup files listed in "Where the history tests run" switch strict state on, and
  `llm-regression` gains a setup file that does the same.
- `E_TRANSACTION_CLOSED` joins the element's error model (the module where the session's
  existing `E_*` codes live).

**Tests first** (`test/session/history/dispatcher.test.ts`, `transaction.test.ts`), all over fake
definitions.

- A plain dispatch is one step labelled by its definition; an exempt command gets no draft (a
  type test in `test/types/` asserts writing state from an exempt `ctx` does not compile).
- A throwing command leaves no step and state unchanged; a throw before any write publishes
  nothing.
- A transaction's `tx` dispatches are one step; a dispatch outside `tx` during `fn` is its own
  step; a `tx` dispatch after `fn` settles rejects with `E_TRANSACTION_CLOSED`; `fn` throwing or
  aborting rolls back everything in reverse order and later `tx` dispatches reject with
  `AbortError`; a transaction with no patches records nothing; nested transactions flatten into
  the outer one.
- `test/session/history/strict-switch.test.ts`: reading the switch with `process` deleted from
  `globalThis` does not throw; the global turns it on; the Node variable turns it on.

**Done when.** Tests pass under strict state; the existing tests of every project listed in
"Where the history tests run" still pass with strict state on (nothing uses the dispatcher yet,
so this checks only that switching it on is harmless); lint, knip, build green.

---

## Phase 4b. Dispatcher: queued lane, holds, pending work, undo rules, cancel

**Goal.** The rest of the mutation path: queued work, holds between concurrent writers, and what
undo does while work is pending (design sections 4.3, 4.5, 4.8, 6.1).

**Files.**

- `Dispatcher.ts`: the queued lane on the session's existing `OperationQueueManager` with
  coalesce-while-queued; queue obsolescence treated as cancellation with reason `"obsolete"`;
  op-log id holds (per id up to 1024, whole slice above), `E_HELD_BY_TRANSACTION` for a
  transaction's holds, a per-key wait list for a chunked writer's holds; deferred members;
  `history.pending`, `nextUndo`, and the undo rules 0, 1 and 2 of design section 6.1, with the
  dependency cascade by dispatch order; `history.cancel`. The dispatcher reads time through the
  same injected `now()` as `History`, and reaches the queue through a small scheduler interface
  (`enqueue(category, onTurn)`, returning a slot with an abort signal the queue fires on
  obsolescence, and `cancel`). The session builds its scheduler over its `OperationQueueManager`
  with `queueScheduler(queue)`, which lives beside the dispatcher; the dispatcher itself does not
  construct a queue, so the Node-safe session never reaches the renderer's manager graph. The queue manager itself
  uses p-queue, `setTimeout` polling and `Date.now()`, so step boundaries and settle order would
  depend on machine speed (and shift again under coverage) if tests ran on it; the fake queue of
  these tests, and the random-sequence model from phase 7, implement the scheduler interface
  instead.
- `strict.ts`: no two open groups hold one op-log id.
- `E_HELD_BY_TRANSACTION` joins the error model.

**Tests first** (`test/session/history/queued.test.ts`, `pending.test.ts`), over fake definitions
and a fake queue.

- Two queued dispatches with one coalesce key before the first runs are one execution and one
  step; obsolescence cancels, never seals a partial draft.
- Holds: a dispatch needing an id a transaction holds fails at once with the error naming the
  transaction; one needing an id a chunked writer holds waits and lands on commit, or is dropped
  on rollback; `fn` awaiting an outside door on a key `tx` wrote settles instead of hanging.
- Undo rules: newest pending work is cancelled first, with its dependents; work dispatched
  before the top step survives an undo and a redo; rule 0 aborts an open group whose holds the
  top step touches; `nextUndo` names what the next press will do; `history.cancel` cancels one
  pending item and its dependents.
- Deferred members join their group's step when they finish, and are cancelled with it.

**Done when.** Tests pass under strict state; lint, knip, build green.

---

## Phase 5. Derivation lane and event order

**Goal.** Every state change reaches the screen through per-slice hooks run on their own lane
(design sections 9.1, 9.3, 6.2).

**Files.**

- `graphty-element/src/session/project/derive.ts` (new): `rendered` state, per-slice dirty sets,
  one scheduled pass per burst of changes, hook order (`graph`, `layout`, `pins`, `arrangement`,
  then the rest), the `restoring` flag held from a history call until the `arrangement` hook has
  run, hook registration so the Node-safe session holds the slices and `Graph.ts` registers the
  renderer-side hooks later.
- `History.ts` and `Dispatcher.ts`: history calls act synchronously (set `restoring`, choose the
  step, apply rules 0 and 1, move the cursor, apply the patch, schedule the pass, publish
  `project:changed` and `history:changed` synchronously), return a promise that resolves after
  the pass, and serialise a history call made from inside a listener as a microtask.

**Tests first** (`test/session/history/derive.test.ts`, `event-order.test.ts`).

- Thirty undos without awaiting run one pass; a hook sees the net change from `rendered` to the
  target.
- Hooks run in the fixed order; changes arriving during a pass wait for the next one.
- Event order per design section 9.3: `project:changed` and `history:changed` before the pass,
  per-domain events after it, the promise last; an undo called from a `history:changed` listener
  runs after the current call returns.

**Done when.** Tests pass; lint, knip, build green.

---

## Phase 6. Public history API, `./commands`, vocabulary and door tests

**Goal.** The session publishes `undo`, `redo`, `canUndo`, `canRedo`, `history`, `transaction`
and `execute`, and the two gap-guarantee tests that every later phase grows exist. Nothing is
ported yet, so every mutating door is on the gap list. The names are the design's; they become
final when the owner approves design section 15, before the pull request merges.

**Files.**

- `graphty-element/src/session/types.ts`: the types of design section 10.1 that this phase makes
  real: `SessionHistory`, `HistoryStep`, `PendingStep`, `HistoryOutcome`, `HistoryCause`,
  `ProjectSlice`, `TransactionScope`, `TransactionOptions`, `CommandOutcome`,
  `CommandOutcomeMap`, the `history:changed` and `project:changed` events. `SessionCommand`
  (`session/planning.ts`) becomes the union of the ops implemented so far (`algo.run` only).
- Widening `SessionCommand` would break the three readers of `command.algorithm`, so this phase
  settles them before any later phase adds an op: `Session.run` and `GraphSession.run`
  (`GraphSession.ts:421`) are narrowed to `AlgorithmRunCommand`, as design section 10.1 says;
  `estimateCommand` and `planCommand` (`planning.ts:288`, `:313`) switch on `op` and answer the
  unavailable estimate or plan (`available: false`) for every op except `algo.run`, as the
  design's non-goals say.
- `graphty-element/src/session/GraphSession.ts`: build the dispatcher, history and derivation
  lane; wire the members above. The session is created through an internal
  `createElementSession` for the element; the published `createGraphSession` is unchanged until
  phase 18c.
- `graphty-element/src/session/commands/` (new): `index.ts` with the definition registry,
  `doors.ts` with the door list (every door from the four inventories plus every public name the
  completeness check finds, all `knownGap` except the exempt doors of design sections 10.5 and
  11.4, which are `exempt` with their reasons now, and the members that change nothing, which are
  `readOnly`), grouped by root, with `PLAN_PHASE = "6"`. Each dispatching row carries the
  arguments to call it with and the command it must dispatch. The roots are listed in
  `doors.ts` itself: the session type and each of its sub-API types, `GraphtyElement`, `Graph`,
  `Node`, `Edge`, the `Run` facade, the style layer handle, and every manager class
  (`DataManager`, `LayoutManager`, `StyleManager`, `RenderManager` and the rest under
  `src/managers/`).
- `graphty-element/commands.ts`: export `COMMANDS` (declared with `satisfies { readonly [Op in
SessionCommand["op"]]: CommandMeta }`), `CommandMeta`, `isSessionCommand`, and re-export
  `SessionCommand`; rewrite the header to name the union `SessionCommand` and say the builders,
  `parsePattern`, `formatCommand` and the JSON Schema remain for #337.
- `graphty-element/test/packaging/node-safe-entries.test.ts` and `exports-map.test.ts`: the new
  modules reached from `./session` and `./commands` stay Node-safe.
- `graphty-element/src/managers/InputManager.ts`: no change yet (phase 19a).
- As built: `doors.ts` classifies 725 members of 62 roots (the four inventories plus the
  completeness walk, which also found `SessionHistory` and the `Manager` interface as handle
  types). A root whose members all share one answer (a render object, the camera, a machine
  preference) carries a `whole` row instead of one row per member. A `knownGap` row with an `op`
  carries a `call` and is called by the doors tests; one without an `op` is an escape (a writable
  field or live object) that its phase narrows rather than ports, and is checked only by the
  phase ratchet. The session spies on its dispatcher through `DispatcherEvents.dispatched`, and
  the tests reach a session's dispatcher through `dispatcherOf` (exported from
  `GraphSession.ts` for them only). Until phase 15 `execute({ op: "algo.run" })` starts the run
  through `runs.start` rather than dispatching, and the `algo.run` definition refuses if it is
  ever dispatched. No queue is handed to the dispatcher yet: the first queued op (phase 12) wires
  `queueScheduler` over the session's queue, which needs `getOperationController` on `RunQueue`.
  The type test checks the `run` rejection against a stand-in op until phase 7.
- Escapes the walk found that the inventories did not assign, and the phases `doors.ts` now
  gives them: `getStyles`, `getConfig` and `DefaultGraphContext.updateConfig` (the live
  configuration) in phase 10; `LayoutManager.layoutEngine` and `LayoutEngine.config` in phase
  17; `DataManager.graphResults` in phase 18a; `session.snapshot()`, `data.snapshot` /
  `node` / `edge`, `DataManager.getSnapshot` and `SessionGraphStore.getSnapshot` in phase 18b;
  `Node.id`, `Node.index`, `Edge.srcId`, `Edge.dstId`, `Edge.index` and the `EdgeMap` mutators in
  phase 18c; `AlgorithmManager.execute` in phase 15.

**Tests first.**

- `test/session/history/vocabulary.test.ts`: every op has a definition and a `COMMANDS` entry;
  `undo.kind` agrees; exempt reasons are non-empty; every undoable op has a fixture in
  `fixtures.ts` for every value of its argument discriminant (the list of values is read from
  the op's argument type's runtime table, such as the `style.patch` action list or the
  enumerated `config.set` key groups, never written a second time in the test); every op that
  changes what is drawn has a fixture tagged `renderer`. The checks of design section 12.2 that
  need a slice (exempt ops leave the digest unchanged, `config.set` keys, `DataConfig` leaves,
  the dimension fields) are written now and skip, with a reason naming the phase, until the
  slice lands; each porting phase removes its skip.
- `test/session/history/doors.test.ts` (Node, `default` project): the session half. Calls each
  session-verb row of `doors.ts` with a spy on the dispatcher, compares the captured command
  with the row's expected command, and enforces the ratchet described at the top of this plan.
- `test/session/history/door-surface.test.ts` (Node, `default` project): the completeness check.
  It does not walk objects at run time: a prototype walk returns TypeScript `private` methods
  (which cannot be told apart from public ones at run time) and misses public instance fields
  (`Graph.styles` and `Graph.runAlgorithmsOnLoad` are writable fields, not prototype members).
  Instead it builds a TypeScript program over `graphty-element/src` with the compiler API
  (`typescript` is already a dev dependency) and, for each root in `doors.ts`, takes
  `checker.getPropertiesOfType` of the declared type. That yields methods, accessors and fields,
  inherited ones included. It drops members with a `private` or `protected` modifier or a `#`
  name, and members whose every declaration lies outside `src/` (the `HTMLElement` and
  `LitElement` surface). It fails on any remaining name `doors.ts` does not classify. It also
  follows handles: for every public method or getter of a root whose return type (unwrapped
  from `Promise`) is a class or interface declared under `src/` that has methods, that type must
  itself be a root or be listed in `doors.ts` as a read-only type. A handle type added later
  therefore cannot escape the walk.
- `test/browser/doors.test.ts` (`browser` and `contract` projects): the calling half for the
  element, `Graph`, `Node`, `Edge`, `Run`, layer-handle and manager rows, on a real `Graph`,
  with the same dispatch comparison and ratchet. Its property section (getter-after-undo for
  every element property row) is built from `doors.ts` and runs only for rows that are neither
  `knownGap` nor `partial`.
- `test/session/history/round-trip.test.ts`: the harness (state digest and picture digest
  before, run, undo, compare, redo, compare) with no fixtures yet, and
  `test/browser/history-round-trip.test.ts`, its renderer twin with the scene digest (both parts,
  as "Where the history tests run" describes), also empty.
  Both leave the lane and the arrangement out of their digests, with a skip reason naming phase
  16a: nothing restores coordinates before then, so the round trips of removals, `clear` and
  replacing imports (phases 13 and 14) are checked on everything else until phase 16a turns
  coordinates on.
- `test/session/history/api.test.ts`: on a fresh session `canUndo` and `canRedo` are false,
  `undo()` resolves `{ kind: "nothing" }`, `history.steps` is empty, `transaction` with no
  writes records nothing.
- `test/types/execute.test-d.ts`: `execute({ op: "algo.run", ... })` has `.cancel` and `.id`; no
  entry of `CommandOutcomeMap` is a promise of a thenable. Written now against a stand-in second
  op, and moved to `style.patch` in phase 7: `estimate` and `plan` accept a non-`algo.run`
  command and `run` rejects it.

**Done when.** The new tests pass; `algo.run` is in `COMMANDS` but still `knownGap` in the door
list until phase 15, so the vocabulary test's fixture check for it is marked pending with that
phase named; the completeness check lists no unclassified public name; the `./commands` entry passes
the exports-map and Node-safe tests; `test/browser/doors.test.ts` and
`test/browser/history-round-trip.test.ts` are in the `contract` list; lint, knip,
strict-consumer typecheck and build green.

---

## Phase 7. Styles

**Goal.** Every style edit is one undoable step and repaints through the `styles` hook (design
sections 3.4 "The styles slice", 5.2, 9.2, 11.3, 10.1 "What the style and visibility verbs' Run
handles mean now").

**Files.**

- `graphty-element/src/session/commands/style.ts` (new): `style.patch`, `style.encode`,
  `style.template`, immediate lane, coalesce key `style:<layerId>:<sorted patched keys>` for a
  single-layer update.
- `graphty-element/src/session/styles/StylesApi.ts`: `add`, `update`, `remove`, `move`,
  `removeBySource`, `highlight`, `resolveToStatic`, `encode`, `applyTemplate` dispatch; the
  late-resolving doors compute from state, not paint columns; `startEdit` becomes the command's
  draft write and `commit` is deleted; `seed` writes the baseline. The verbs keep returning a
  `Run` whose meaning changes as the design says (settles after the covering pass; an already
  aborted signal writes nothing; a later cancel does not revert).
- `graphty-element/src/session/styles/Layer.ts` and `buildLayer`: deep-freeze every layer except
  `userData`; copy nested encodings on dispatch.
- `graphty-element/src/session/styles/repaint.ts`: becomes the `styles` hook; dirty set is the
  difference in layer identities; compiled layers cached in a `WeakMap<Layer, CompiledLayer>`.
- `StyleChange` gains `cause`; `style:changed` fires after the pass, one per edit, each carrying
  the pass's merged `RepaintReport`.
- `doors.ts`: the style doors move off the gap list. Several doors that stay unported reach the
  style verbs internally, so from this phase they dispatch `style.*` commands, one step per verb
  they call rather than one per gesture. They become `partial` rows, not `knownGap`: the AI
  style commands (`ai/commands/StyleCommands.ts`, which call `styles.add`, `removeBySource` and
  `remove`), finished in phase 19a; `Graph.applySuggestedStyles`, the `runAlgorithm(...,
{ applySuggestedStyles })` path (`Graph.ts` reaches `session.styles.highlight` and `encode`
  from `runAlgorithm`) and the run auto-apply, all finished in phase 15. Until then an undo
  after one of these gestures reverts only its last style verb; the rows' reasons say so.
- As built: `style.patch` is discriminated by `action`, one value per styles verb (`add`,
  `update`, `remove`, `move`, `removeBySource`, `highlight`, `resolveToStatic`), which is the
  runtime table the vocabulary test reads; `highlight` and `style.encode` name their run by id,
  and `removeBySource` carries the ids its predicate matched when it was dispatched. The design's
  vocabulary row says so now. The definitions are static (in `DEFINITIONS`) and reach the
  session's style compiler through `Dispatcher.services.styles`, which `createStylesApi`
  registers; the session builds its dispatcher before its styles API and hands it in, and a
  styles API built on its own makes a dispatcher of its own. The element's base layers are
  written as the baseline through `Dispatcher.seed`, which records no step and marks the lane
  as already showing them (`DerivationLane.adoptBaseline`). A definition can name argument keys
  kept by reference (`byReference`, used for a layer's `userData`); everything else is copied
  and frozen at dispatch.
- As built: no `WeakMap<Layer, CompiledLayer>` cache was needed: the `styles` slice holds the
  compiled layers themselves, so an undone or redone stack is already compiled (the undo test
  spies on the selector compiler to prove it). The `styles` hook hands the repaint the
  difference between the two stacks (`stackChange` in `styles/repaint.ts`). A forward edit's
  `style:changed` is published by that hook once the repaint has run; an undo, redo, restore or
  rollback's is published from the dispatcher's `derived` event, one per step, carrying the last
  pass's report. The pass does not report progress to an edit's `Run`: the run reports only its
  own start and end. A repaint that fails rejects the edit's `Run`; the edit stays recorded.
- As built: the AI style commands have no row of their own (the assistant is reached through
  `aiCommand`, an escape ported in phase 19a), so they are not `partial` rows; they dispatch
  `style.*` commands from this phase all the same. The rows that became `partial` are
  `Graphty.run`, `Graphty.applySuggestedStyles`, `Graph.runAlgorithm` and
  `Graph.applySuggestedStyles`. Which run door paints depends on the order the doors test calls
  a root's rows in, because a run paints its suggestion only on its first completion:
  `Graphty.runAlgorithm` and `Graph.run` re-run `degree` on a graph an earlier row already ran
  it on, paint nothing, and stay `knownGap` rows of `algo.run`.
- As built: a headless session paints only what an edit touches, so the session fixture
  (`test/session/history/fixture-session.ts`) paints its baseline once the way a renderer's
  first draw does; without that, the picture before the first edit is an empty one no undo
  returns to. The random-sequence model runs on `fc.scheduledModelRun`, which releases a
  scheduled promise only between commands: a command's `run` must never await a promise the
  fake scheduler controls, or a queued dispatch it made itself, or the sequence waits for ever.
  The phases that add queued ops (12 and on) dispatch in one command and observe the result in a
  later one. `fakes.ts` holds the fake clock and scheduler; the fake accelerator lands with runs
  in phase 15, when there is a run for it to finish.

**Tests first.**

- Fixtures in `fixtures.ts` for `style.patch` (add, update, remove, move, removeBySource,
  highlight, resolveToStatic), `style.encode`, `style.template`, each tagged `renderer` as well,
  so the twin checks the repaint on a real `Graph`.
- `test/types/execute.test-d.ts`: `estimate` and `plan` accept a `style.patch` command; `run`
  rejects it.
- `test/session/history/random-sequences.test.ts` (new) and `test/session/history/fakes.ts`
  (new), the random-sequence model of design section 12.5 over the ops ported so far, grown by
  every later port (rule 3):
    - Built on `fc.scheduledModelRun` with `fc.scheduler`. `fc.scheduler` controls only promises
      wrapped with `s.schedule`, so the model never runs on the real queue or the wall clock: the
      session under test is built with the scheduler interface of phase 4b implemented over
      `s.schedule` (every queue turn is a scheduled promise) and with a fake `now()` that only a
      model command advances. "Advance time within `coalesceMs`" and "advance time past
      `coalesceMs`" are generated commands, so coalescing is a generated choice too. Every
      promise resolution (a queued command reaching its turn, a fake run finishing, a listener's
      reentrant undo) then replays and shrinks with the seed, on any machine and under coverage.
      `fakes.ts` holds the fake scheduler, the fake clock, and the fake accelerator whose
      completion the scheduler controls.
    - Before every action, the live state digest must equal the digest recorded for the current
      history position, so a change that records no step (an exempt op, a background write) fails
      at the next action, not only when a later undo happens to cross it. After every history move
      the digest must equal the one sealed for the position reached.
    - A fixed `numRuns` and `maxCommands`, and a fixed list of seeds run in CI, one `it` per
      seed, each with an explicit `90_000` ms timeout (the `default` project's `testTimeout` is
      30 seconds, which a coverage run of the full model would exceed); `FC_SEED` and
      `FC_NUM_RUNS` override them for a local soak. A failure prints the seed and the
      counterexample path.
- `test/session/styles/undo.test.ts`: an update drag of 60 frames within the window is one step;
  undo restores the identical previous stack object; a restored stack is not recompiled (spy on
  the compiler).
- The `Run` handle cases: an aborted signal writes nothing; `cancel()` after the call leaves the
  edit applied and the step recorded.
- Existing `test/session/styles/*` and `styles-on-session.test.ts` keep passing, updated only
  where they asserted the old queue order or one repaint per edit.

**Done when.** Style round trips pass under strict state; the doors test shows the style doors
dispatching and the `partial` rows above dispatching; the app's colour picker still works (its tests pass); lint, knip, build green.

---

## Phase 8. Visibility

**Goal.** Filter, time window and show-context are undoable; masks stay derived (design section
3.4 "The visibility masks are derived", 9.2 `visibility` row, 11.3).

**Files.**

- `graphty-element/src/session/commands/visibility.ts` (new): `visibility.set` (coalesce key
  `filter`), `visibility.window` (`window`), `visibility.context` (new op), all immediate.
- `graphty-element/src/session/visibility/VisibilityApi.ts`: the three closures at
  `VisibilityApi.ts:422-424` become the slice; `set`, `setWindow`, `showContext =` dispatch; the
  caller's filter object is copied and frozen; the one live `ElementMask` pair stays and is
  rewritten by the `visibility` hook; mask copies with tags taken when a filter step stops
  coalescing or is undone, counted in `history.bytes`, dropped first under pressure. The graph
  token (phase 12) and `RunEntry` objects (phase 15) do not exist yet, so the tag uses counters
  that exist today and change on every write they stand for: `GraphStore.revision` (bumped by
  `touch()` on every mutating data path, attribute writes included), a `revision` counter this
  phase adds to `RunsApi` and bumps on every write to its run and result maps, and the scopes
  revision. Phase 12 replaces the store revision in the tag with the graph token, and phase 15
  replaces the runs revision with the identities of the `RunEntry` objects the filter reads.
- `VisibilityChange` gains `cause`.

**Tests first.**

- Fixtures for the three ops.
- `test/session/visibility/undo.test.ts`: a slider drag copies the masks once, not per frame;
  undoing a filter with a matching copy does not evaluate (spy); a copy whose tag no longer
  matches is not used and the filter is evaluated; mask copies are the first thing eviction
  drops; `visibility.masks` returns copies. Two tag cases with today's doors: filter, change a
  node attribute through `Graph.updateNodes`, undo the filter: the copy is not used; filter on an
  algorithm result, rerun the algorithm, undo the filter: the copy is not used.
- The "filter across a data step" fixture of design section 12.4 is written now and skipped with
  a pointer to phase 13, which enables it.

- As built: the tag is not `GraphStore.revision`, which is private: it is the snapshot object,
  which is the same thing, because every `touch()` makes the next `getSnapshot()` a new object.
  `Graph.updateNodes` did not touch the store (it wrote `node.data` in place), so a filter kept
  its stale masks after an attribute edit even without undo; it now calls the new
  `DataManager.noteAttributesChanged()` (an escape row narrowed in phase 12). The tag carries no
  scopes revision: no filter kind can name a saved scope. The runs revision
  (`SessionRunsApi.revision`) moves when a run publishes a result or is removed, and the tag
  reads it only while a filter or a window is in force.
- As built: a copy is taken at the one moment it is known correct and about to be useful: just
  before the live pair is rewritten for a different step than the one whose after-masks it holds
  (the nearest done step that changed the `visibility` slice). That is the moment the step stops
  being the coalesce target and the next one evaluates, or the moment it is undone. A drag merging
  into one step copies nothing; each copy's tag includes the filter and window objects, so a copy
  attached to the wrong step can never be put back. Copies live on the step as a `History` cache
  (`setCache` / `cacheOf`), counted in `bytes` on both sides of the cursor, dropped when the step
  merges, and dropped oldest first before any step is evicted; dropping them publishes
  `history:changed` with reason `"size"`.
- As built: readers (`summary`, `nodes`, the masks, `isVisible`) bring the masks up to date at
  once only when the graph or the run results moved under them; a change of the slice waits for
  its pass, so a filter superseded before the pass is never evaluated even when something reads
  in between. The pass evaluates synchronously; the sliced pass (`runPassInSlices`) is no longer
  used by the model. `visibility.masks.nodes()` and `edges()` return read-only `ElementMask`
  copies carrying the live version, one per membership (`ElementMask.readOnlyCopy`; `load` puts
  kept bytes back). A filter the session cannot evaluate (no value source, no query engine, a
  component out of range) is refused when it is dispatched (`assertEvaluable`, reached through
  `Dispatcher.services.visibility`), so it is never recorded. A verb's `Run` has no queue slot: a
  superseded edit's run settles with the counts the masks show after the covering pass, a cancel
  after the call keeps the edit, and an already-aborted signal writes nothing.
  `visibility:changed` fires once per edit and once per step an undo passes, with `cause`.
- As built: the random-sequence model grew the three ops and now also compares the visible ids
  after every history move. A larger soak showed the model closed the coalescing window on a
  history call that did nothing (a redo at the end); the history leaves the top step mergeable
  then, and the model now agrees. The "filter across a data step" case is an `it.skip` in
  `test/session/history/round-trip.test.ts`, since it needs `data.apply` remove-nodes.

**Done when.** Round trips pass; mask revisions keep incrementing across undo (the scope resolver
cache test in `test/session/scope/` still passes); lint, knip, build green.

---

## Phase 9. Scopes and saved views

**Goal.** Saved scopes and saved camera views are slices (design sections 3.1, 11.3, 11.4,
10.2).

**Files.**

- `graphty-element/src/session/commands/scope.ts` (new): `scope.save` (redo reuses the minted
  id), `scope.remove`. `ScopeApi.ts` `save` / `remove` and `SelectionApi.ts` `promote` dispatch;
  the stored spec is copied and frozen; the `scopes` hook bumps `savedRevision`.
- `graphty-element/src/session/commands/view.ts` (new): `view.save`, `view.remove`, `view.camera`
  (exempt). `Graph.userCameraPresets` (`Graph.ts:185`) becomes the `views` slice;
  `saveCameraPreset`, `importCameraPresets` dispatch; new `removeCameraPreset` on `Graph` and the
  element; `session.views` (`SessionViews`) added.

**Tests first.**

- Fixtures for `scope.save`, `scope.remove`, `view.save`, `view.remove`.
- `test/session/scope/undo.test.ts`: redo of a save returns the same `ScopeId`; mutating the spec
  object passed in changes nothing.
- A unit test that `loadCameraPreset` / `applyCameraView` leave the digest unchanged.

- As built: the `scopes` slice holds `SavedScopeRecord` (`id`, `name`, `spec`, `order`), not the
  published `SavedScope`, whose `bound` is derived from the graph and cannot be stored. `order`
  is one past the highest when the scope is saved, and `list()` sorts by it, so undoing a removal
  puts the scope back where it was listed instead of at the end of the map.
- As built: there is no `scopes` hook. The resolver's caches are keyed on
  `DerivationLane.writes("scopes")`, a count every write to the slice moves at once, so a resolve
  made between an undo and the pass that follows it never answers from a saved set the undo took
  away. `ScopeApi.save` and `remove` stay synchronous: they check against the slice first (so
  their refusals are thrown as before), then dispatch on the immediate lane, which writes before
  they return. The check and the id minting are the scope resolver's, reached by the op through
  `Dispatcher.services.scopes`, so `session.execute({ op: "scope.save" })` refuses exactly what
  `scope.save` refuses and resolves with the minted id. `selection.promote` needed no change: it
  reaches `scope.save`.
- As built: `view.camera` is `{ preset?, position?, target?, animate? }`. It is carried out by
  the renderer through `Dispatcher.services.camera`, which `Graph` sets; a session with no
  renderer refuses it with `E_UNSUPPORTED`. No door dispatches it yet: the camera doors stay
  exempt rows until phase 19b. The vocabulary test's check that exempt ops leave the digest
  unchanged is on. `saveCameraPreset` gained an optional `camera` argument (the state to save
  instead of where the camera is), which is what lets the doors test name the command it
  expects; `removeCameraPreset` returns a promise that rejects with `E_BAD_COMMAND` for a name
  nothing is saved under. Undoing the removal of a saved view puts it back at the end of
  `getCameraPresets()`'s order, not where it was.

**Done when.** Round trips and the existing scope and camera tests pass; lint, knip, build green.

---

## Phase 10. Project settings and the frozen merged configuration

**Goal.** Every project setting is a key of the `config` slice; view settings move to a small
mutable store; `Styles.config` becomes a frozen view built on change (design sections 3.2, 10.1
`ProjectConfig`, 11.4, 9.2 `config` row).

**Files.**

- `graphty-element/src/session/commands/config.ts` (new): `config.set` with `ProjectConfigPatch`
  (plain objects recurse; arrays, `background` and `selectionStyle` replaced whole; `undefined`
  restores the default), coalesce key `config:<sorted key paths>`. The key list is enumerated at
  module load from the zod `DataConfig` schema (`config/DataConfig.ts`) plus the other four keys,
  and grouped (data-config leaves, on-load runs, background, selection style, layout behaviour);
  the vocabulary test reads the groups from this list.
- `graphty-element/src/session/types.ts`: `ProjectConfig`, `ProjectConfigPatch`; `SessionConfig`
  gains a live getter per key and `set`; its TSDoc changes to "as they are now".
- `graphty-element/src/Graph.ts`: a view-settings store for the exempt keys (camera distance, the
  immersive mode, `pinOnDrag`, `labels.declutter`, `layout.maxInFlight`,
  `layout.iterationsPerStep`, `layout.zoomStepInterval`); `Styles.config` becomes a frozen view
  merged from the `config` slice, the view-settings store and (from phase 17) the `layout` slice,
  rebuilt only when a source changes. `setBackground`, `setSelectionStyle`, `setLayoutBehavior`
  dispatch; the `layoutBehavior` setter splits its argument (three project keys to `config.set`,
  the rest to the view-settings store; a `layout.type` in it waits for phase 17 and stays a
  `knownGap` door until then).
- The frozen view breaks every in-place write to `Styles.config`, because modules run in strict
  mode and a write to a frozen object throws. The view-mode code writes `config.graph.viewMode`
  and `config.graph.twoD` in place (`Graph.ts:2688`, `:2690`, `:2746`, `:2751`, and the XR exits
  at `:2822` and `:2833`), and those fields do not get their home until phase 17. So
  `graph.viewMode` and `graph.twoD` join the view-settings store here as temporary keys, and
  those writes go through the store; phase 17 removes both keys when they become computed from
  the `layout` slice. Every other in-place write found by searching for assignments into
  `styles.config` is routed the same way or moved to `config.set` in this phase.
- `Graph.runAlgorithmsOnLoad` (`Graph.ts:195`), a writable public field that the element's
  setter writes, becomes a getter over the `config` slice and a setter that dispatches
  `config.set`.
- `graphty-element/src/managers/RenderManager.ts`: `setBackgroundColor` becomes private; the
  `config` hook is its only caller and owns at most one skybox dome.
- `graphty-element/src/graphty-element.ts`: the import-setting setters, `algorithmsOnLoad`,
  `runAlgorithmsOnLoad`, `background`, `selectionStyle`, `layoutBehavior`, `directed` dispatch,
  and their private mirrors (`#directed`, `#layoutBehavior`, `#background`, the six id and label
  paths, `#repeatedEdges`, `#edgeWeightPath`, `#positionScale`, `#selectionStyle`,
  `#algorithmsOnLoad`, `#runAlgorithmsOnLoad`) are deleted; getters read the slice.
- `DataManager.updateStyles` and `LayoutManager.updateStyles` stop writing configuration in
  place.

**Tests first.**

- Fixtures for `config.set` over a data-config leaf, `runAlgorithmsOnLoad`, `background` (colour
  and skybox), `selectionStyle`, each project layout-behaviour key.
- Vocabulary checks un-skipped: a `config.set` naming a key outside `ProjectConfig` is rejected;
  every `DataConfig` leaf is a slice key or exempt with a reason; each exempt layout-behaviour key
  leaves the digest unchanged.
- Strict state asserts two reads of `Styles.config` with no change return the identical object.
- Background: colour, skybox, colour, undo twice, redo twice: at most one dome in the scene, none
  while the background is a colour (`test/browser/history-background.test.ts`, run per rule 5).
- Doors test getter-after-undo runs for each property ported here.

**Done when.** Round trips pass; the existing readers of `styles.config` compile and pass
unchanged, and its former in-place writers pass through the view-settings store or `config.set`;
the view-mode, dimension-toggle and XR-entry tests pass in the `browser` and `xr` projects
(rule 5); the app's settings controls still work; lint, knip, build green.

**As built.**

- The `config` slice holds each setting as it was set (a background's colour name, a partial
  selection style), keyed by dotted path; a key that is absent reads as its default, and the
  readers parse. So the element's getters return what was set and `undefined` when nothing was,
  as they did, and `session.config` returns the parsed, defaulted values. `config.set` is
  discriminated by key group (`data`, `runAlgorithmsOnLoad`, `background`, `selectionStyle`,
  `layoutBehavior`): each group is a value of `variants` and has its fixtures. No `DataConfig`
  leaf is exempt.
- A headless session built with `config.data` reads that as the base under the slice; undoing a
  `config.set` returns to it. The function form still works until phase 18c removes it.
- `Graph.setSelectionStyle` merges over the selection style as set and stores the merged input
  whole; `setBackground`, `setSelectionStyle` and `setLayoutBehavior` still throw a Zod error
  synchronously on a bad value, before anything is dispatched.
- The view-settings store is private to `Graph` (`writeViewSettings`); the tests that exercised
  the deprecated `twoD` flag, or an opening view mode written before `init()`, reach it through
  a cast, since no public route ever wrote those fields except in-place mutation. `layout.type`
  in `layoutBehavior` still goes to the store until phase 17. `Graph.getLayoutBehavior()` (new,
  read-only) is what the element's `layoutBehavior` getter reads: only the fields set.
- `RenderManager.applyBackground` is the config hook's door onto the scene and owns the one dome;
  `setBackgroundColor` is private. A `PhotoDome` reports `TransformNode` as its class name, so the
  renderer twin's dome count had always read zero; it now finds domes by type.
- The element's `directed = undefined` keeps the setting in place, because its attribute
  converter returns `undefined` for a refused value; every other import setting set to
  `undefined`, `null` or `""` returns to its default.
- `DataManager.updateStyles` and `LayoutManager.updateStyles` never wrote configuration and have
  no callers; they are unchanged.
- Until the baseline window (phase 14), a setting assigned at construction records a step.

---

## Phase 11. Ingest moves to the Node-safe session

**Goal.** A pure move with no behaviour change: id and endpoint extraction, the repeated-edge
policy, weight resolution, declared direction, the import report and chunking leave
`DataManager` (which reaches Babylon.js) for a Node-safe module, so later phases can give the
headless session data write verbs (design section 3.5).

**Files.**

- `graphty-element/src/session/project/ingest.ts` (new), moved from `DataManager.ts` and
  `data/ingest.ts`; it writes through a thin interface that today calls the existing store
  methods and from phase 12 calls the `graphOps.ts` primitives. A load that does not yet come
  through the dispatcher (data sources, files and URLs, until phase 14) reaches those primitives
  with no draft; phase 12 defines what they do then.
- `graphty-element/src/managers/DataManager.ts`: calls the moved module; keeps the render half.
- `graphty-element/test/packaging/node-safe-entries.test.ts`: add the module to the checked
  list.

**Tests first.** None new beyond the Node-safe check: this phase is a refactor, and the existing
data tests (`test/session/data.test.ts`, the ingest and data-source tests, the browser loading
tests) are the regression suite. Run them before and after and compare counts.

**Done when.** Every existing test passes unchanged; the Node-safe entries test covers the
module; lint, knip, build green.

---

## Phase 12. Graph additions and attribute edits

**Goal.** The `graph` slice exists as an op-log with the primitives that only grow or patch the
graph, and the data doors that use them dispatch (design sections 3.4 "The graph slice is an
op-log", 4.7, 9.2 `graph` row, 11.1).

**Files.**

- `graphty-element/src/session/project/graphOps.ts` (new): `addNodes`, `addEdges`,
  `setAttributes`, `setGraphValues` (graph-level results and the import report),
  `setDirected`; each records its inverse on resolved values, never through ingest; the records
  map (frozen in phase 18b) with its running byte estimate. A redone add writes back the file
  coordinate its record carried (the seed column value it resolved), so it lands where the file
  put it; seeding a node with no file coordinate from a hash of its id is phase 16a's, because it
  changes where every layout starts and coordinates are that phase's subject. The loads that do not come
  through the dispatcher yet (data sources, files, URLs) run asynchronously through the ingest
  pipeline, where no call stack names the door, so they declare themselves:
  `withUnrecordedWrites(doorName, fn)` sets an active scope for the duration of `fn` (including
  its awaited ingest), and each legacy load door wraps its body in it. A primitive called with
  no draft reads the active scope. With none, it is a write outside the dispatcher: strict state
  throws, and production logs it once. With one, strict state checks that `doorName` is still
  `knownGap` in `doors.ts` and throws otherwise; the primitive then writes, records nothing,
  bumps the graph token, and calls `history.clear()`, so the state after the load becomes the
  baseline. Clearing is the honest outcome: the steps below were recorded against a graph that
  no longer exists and no inverse for the load was recorded, so undoing them would not return
  to any state that ever existed. This is today's behaviour (a load is not undoable and
  nothing before it is either) and lasts only until phase 14, which ports the last such door
  and deletes `withUnrecordedWrites` and the no-record mode. The door names are passed rather
  than read from an ambient scope: each legacy door hands the writer `withUnrecordedWrites`
  gives it down through ingest, so two loads in flight cannot lend each other a scope. The doors
  allowed to do this are the list `UNRECORDED_DOORS` in `graphOps.ts`, and a test fails when a
  name on it is no longer a `knownGap` row. The removal doors of phase 13
  (`DataManager.removeNodeAndIncidentEdges`, `removeEdge`) are on it too, but only to drop the
  removed rows' records and take a fresh token: they keep the history, and the inverses of
  earlier adds skip rows that are already gone. `DataManager.clear` drops every record and
  clears the history.
- `graphty-element/src/session/project/strict.ts`: a graph token or epoch written into the
  `graph` slice is never one issued before (moved here from phase 4a, which had no writer of the
  token to check).
- `graphty-element/src/session/commands/data.ts` (new): `data.apply` kinds `add-nodes`,
  `add-edges`, `set-attributes`, `update-rows`, on the immediate lane: the element's doors take
  their turn on the operation queue under `data-add` / `data-update` first and dispatch when it
  comes, so an add stays ordered against loads and layouts exactly as before, and the
  synchronous `DataManager` doors still throw synchronously (`Dispatcher.dispatchNow`). The
  queued lane, which would list a waiting add as pending work that undo cancels, needs a
  scheduler wired to the element's queue and to a headless session's; it arrives with
  `data.import` in phase 14, which cannot run without it.
- `graphty-element/src/session/data.ts`: `SessionDataApi` gains `addNodes`, `addEdges`,
  `updateNodes`, `updateEdges` (and the input types `NodeRecordInput`, `EdgeRecordInput`,
  `RowUpdate`).
- `graphty-element/src/data/GraphStore.ts`: the builder, `touch`, `nextEdgeId`,
  `recordDirectionFromFile` are reached only from `graphOps.ts`.
- `graphty-element/src/managers/DataManager.ts`: becomes the render half of the `graph` hook
  (net difference of dirty op-lists, create render objects, refreeze once, feed the layout
  without stepping in restore mode, repaint touched ids). `graphResults` stays where it is until
  phase 18a: the plugin algorithms write it through the `DataManager.graphResults` escape that
  phase closes, and `setGraphValues` holds the import report meanwhile.
- `graphty-element/src/Graph.ts`: `addNode(s)`, `addEdge(s)`, `updateNodes` and new
  `updateEdges` dispatch; the manual `repaintFromSession()` in `updateNodes` goes. For adds that
  come through the dispatcher, the `graph` hook starts the layout and frames the camera, in
  forward mode only. The `data-added` listener (`Graph.ts:625-645`) stays, but acts only on an
  event with no `cause`, which is an add that did not come through the dispatcher: data-source,
  file and URL loads keep starting the layout, framing the camera and running the on-load
  algorithms exactly as today until phase 14 moves them onto the dispatcher and deletes the
  listener. For dispatched adds, the on-load runs are started once per adding command by the
  command itself; they become deferred members in phase 15 (until then that row stays
  `knownGap` in the door list).
- `graphty-element/src/graphty-element.ts`: `addNode(s)`, `addEdge(s)`, `updateNodes`,
  `updateEdges` dispatch.
- `Node.data` / `Edge.data` become getters over the slice record, with no setter. The writes that
  assigned `data` go through the primitives instead: the `Node` and `Edge` constructors
  (`Node.ts:248`, `Edge.ts:273`, `this.data = data`) read the record the primitive stored, and the
  repeated-edge path in `DataManager.ts:1192` (`known.edge.data = record`) becomes a
  `setAttributes` in the adding command's draft (or an `addEdges` under the repeated-edge policy).
  Records are not frozen yet (phase 18b freezes them together with the plugin path), so strict
  state checks writes only for the doors ported here.
- The element's `data-added`, `elements-removed` and `data-loaded` events gain `cause`.
- `digest.ts`: the graph part (node ids in row order, edge ids in row order, every registered
  builder column, records, graph values).

**Tests first.**

- Fixtures for each `data.apply` kind above.
- `test/session/history/graph-add.test.ts`: undoing an add removes exactly the ids added, by id,
  even when rows were appended after them; redo reuses the assigned edge ids; redo writes the
  values the add resolved and never reaches ingest (a `config.set` cannot fall between an add
  and its redo in one linear history, because recording it drops the redo tail, so the test
  checks the mechanism: ingest is not called by undo or redo, and the rows, weights and records
  come back equal); a redone add lands at the coordinates its record carried.
- `test/browser/history-graph-add.test.ts`: undoing an add fires `elements-removed` with cause
  `"undo"` and starts no layout, no run and no camera move, and redo fires `data-added` with
  cause `"redo"` the same way; a forward add starts the layout, frames and runs the on-load
  algorithms once; `Node.data` follows an edit, its undo and its redo.
- `test/session/data.test.ts`: the headless write verbs work with no renderer.
- A data-source load (not yet dispatched) still starts the layout, frames the camera and runs the
  on-load algorithms; it records no step, and strict state accepts its no-record writes.
- Unrecorded writes: `addNodes` (one step), then a data-source load: `canUndo` is false and
  `history.steps` is empty. A primitive called with no draft outside any
  `withUnrecordedWrites` scope throws under strict state; one inside a scope whose door is not
  `knownGap` also throws, naming the door.
- The phase 8 mask tag switches from the snapshot object to the graph token; the phase 8
  attribute-change tag cases (`test/session/visibility/undo.test.ts` and
  `test/browser/visibility-undo.test.ts`) still pass. `DataManager.noteAttributesChanged`, which
  phase 8 added so `Graph.updateNodes` moves the snapshot, is narrowed here: attribute edits
  become `data.apply` and the primitive takes a fresh token.

**Done when.** Round trips for the four kinds pass; existing data, layout and browser loading
tests pass, and the loading stories pass in the `storybook` project (rule 5); lint, knip, build
green.

`nodeData =` and `Graph.setData` dispatch `add-nodes` from this phase on, so their rows move
from `knownGap` to `partial` (phase 14 makes each one `batch`).

---

## Phase 13. Graph removals, clear, and lazy structural inverses

**Goal.** Removing nodes and edges, and clearing, are undoable with row order restored exactly,
and a burst of undos pays one rebuild (design section 3.4 "Removals keep every column", "Undo
restores row order exactly", "Structural inverses are applied lazily", the pins paragraph).

**Files.**

- `graphty-element/src/session/project/graphOps.ts`: `removeNodes` and `removeEdges` recording
  records, incident edges with resolved endpoints, weights and element-assigned ids, row
  indices, and every registered builder column's value per removed row; `replace(next)` holding
  the previous snapshot stripped of the position and pin columns, the records map and the pin
  set; the pending structural list on `GraphStore` folded to its net effect and materialised once
  on the next snapshot or builder read or in the derivation pass; the rebuild in recorded order
  in the style of `GraphBuilder.from`, or a plain append when the removed rows were at the end.
  `removeNodes` and `replace` drop removed ids from the `pins` slice in the same draft (the
  `pins` slice itself arrives in phase 16a; until then the primitive records the lane's pin
  bytes for the removed rows). Coordinates of removed rows are not recorded here; the round trips
  of this phase compare everything but the lane and the arrangement, as the harness's skip
  reason says, and phase 16a turns those on.
- `graphty-element/src/data/GraphStore.ts`: `builder`, `seedColumn`, `edgeIdColumn` stop being
  `readonly` for the store's life; re-registration after a rebuild.
- `data.apply` kinds `remove-nodes`, `remove-edges`, `clear`. Doors: `Graph.removeNodes`, new
  `Graph.removeEdges`, the element's `removeNodes`, new `removeEdges`, `clearData`,
  `DataManager.removeNodeAndIncidentEdges`, `removeEdge`, `clear`; `session.data.removeNodes`,
  `removeEdges`, `clear`.
- The derivation lane's `graph` hook creates or disposes only the net set of render objects.
- `DataManager.removeNodeAndIncidentEdges`, `removeEdge` and `clear` leave `UNRECORDED_DOORS` in
  `graphOps.ts`, and `GraphOps.dropRecords` and `discardAll` are deleted with them. The two
  removal doors keep their contract of acting only on rows that are drawn (they answer null or
  false otherwise and dispatch nothing); `Graph.removeNodes`, `removeEdges` and the session verbs
  dispatch for any ids.
- A clear keeps the one `GraphStore` (history entries hold it), so the store reads
  `data.directed` through a thunk when the graph is emptied, as a fresh store did; the edge-id
  counter is not reset; and the forward clear still emits `snapshot-dropped` and has the store
  forget its cached snapshot, because the empty graph is frozen lazily and an accelerator must
  release the snapshot on screen at once.
- Pins: a removal records which removed rows were pinned; the rows put back are pinned again
  only once they are placed (a restored row with no file coordinate is unplaced until phase 16a
  restores coordinates, and a pin on it would hold a node at nowhere).

**Tests first.**

- Fixtures for `remove-nodes`, `remove-edges`, `clear`.
- Removal order: remove from the middle, undo: node and edge id order and the snapshot
  fingerprint equal the originals.
- Removal under changed settings: change `repeatedEdges` and `edgeWeightPath`, remove edges
  (a parallel pair among them), undo only the removal: edges and weights equal the originals.
  The settings change comes first because history is linear: a change recorded after the
  removal would have to be undone before it.
- Removed rows keep their seeds: import a file with coordinates, remove from the middle, undo:
  the seed column is restored (the lane half of this fixture is completed in phase 16a).
- Thirty mid-row removals undone without awaiting, snapshot read once: one rebuild ran.
- The phase 8 "filter across a data step" fixture is un-skipped.

**Done when.** Round trips pass including row order; the existing removal tests and the browser
tests that remove nodes pass; lint, knip, build green.

---

## Phase 14. Imports, expansion and batches

**Goal.** Loading data is a step (or the baseline), on the queue, chunked writers derive as they
go, and multi-part data doors are one step (design sections 3.3, 4.4, 4.7, 9.1 "Chunked writers
derive as they go", 11.1).

**Files.**

- `data.import` with `mode: "replace" | "merge"` and `layout: "recommended" | "keep"` (the
  `recommended` half lands in phase 17; until then it is rejected with a clear error and the
  vocabulary test marks it pending), the source descriptor in the import record (never the
  inline payload or the `File`), the import report through `setGraphValues`, the whole-slice hold
  of a chunked writer, a pass per chunk, rollback of a failed import leaving no step.
- The baseline window (design section 3.3): the element marks `setup` on imports dispatched for
  attributes or properties present at construction or first connection; the window closes at
  the first graph commit or first settled import; setup writes and `history.clear()` write the
  baseline.
- `data.expand` for the double-click expansion (`NodeBehavior.ts:653`), capturing the fetched
  records so redo does not fetch.
- `batch` op; `Graph.setData`, the element's `setData`, `Graph.setEdges` and the `edgeData`
  setter become one `batch` each.
- `graphty-element/src/graphty-element.ts`: `dataSource` / `dataSourceConfig` dispatch one
  `data.import` under the `element-source` coalesce key; `#dataSource`, `#dataSourceConfig`,
  `#nodeData`, `#edgeData` and the `#dataSourceInitialized` latch are deleted; `nodeData` and
  `edgeData` getters return the graph's frozen records in row order, cached per graph token;
  `dataSource` / `dataSourceConfig` getters report the descriptor.
- `Graph.addDataFromSource`, `loadFromFile`, `loadFromUrl`, `DataManager.addDataFromSource`, the
  element's load methods, `session.data.import` (`DataSourceInput`, `ImportOptions`).
- `data.import` takes the queued lane: the element's session is handed a scheduler over the
  element's operation queue (`queueScheduler`), and a headless session one over its local run
  queue (`runQueueScheduler`), so a waiting import is pending work that undo cancels.
  `data.apply` stays on the immediate lane, and the element's data doors keep taking their own
  turn on the queue before they dispatch: moving it to the queued lane would make every
  synchronous `DataManager` door (`addNodes`, `removeEdge`, `clear`, ...) unable to act before it
  returns, so it moves with those doors in phase 18c.
- Loads move from `Graph.ts:620-622` onto the queue. With every add now dispatched, the
  `data-added` listener kept in phase 12 is deleted (the `graph` hook starts the layout and
  frames the camera, and the adding command starts the on-load runs), and the primitives'
  no-record mode and `withUnrecordedWrites` are deleted with it; strict state now reports any
  write with no draft.

What was built, where it differs from the list above:

- The baseline window is opened by the renderer's session (`Graph` passes it when it builds
  the session); a headless session starts with it closed, because nothing is declared at its
  construction and its creator can call `history.clear()`. A command or batch marked `setup`
  commits into the baseline as long as nothing has been recorded, so `node-data` and `edge-data`
  in the markup are both baseline even though the first of them closes the window.
- `nodeData = records` is one `batch`: remove the nodes the graph holds that the records do not
  name (with their edges), then add the records. A node named again keeps its row and its edges,
  so a host re-assigning its node array does not lose the edges it did not re-assign.
- The source descriptor the graph keeps (the `source` graph value) drops the inline `data` and
  the `file`; the `dataSourceConfig` getter reports it that way. A pair missing its type or its
  configuration records the descriptor and loads nothing, so each property reads back after
  undo on its own.
- `data.expand` has no public member: its door is the double-click, listed in `GESTURE_DOORS` in
  `doors.ts` and checked by `test/browser/expansion-through-behaviour.test.ts`.
- A command that needs a key a `batch` holds waits for it rather than failing with
  `E_HELD_BY_TRANSACTION`: a batch settles by itself, unlike a transaction whose caller is still
  dispatching into it.
- In the random-sequence model an import's turn comes at once; interleaving imports with other
  queued work is phase 21's.
- `session.data.import` registers the element's built-in readers, so it reads every format with
  no renderer loaded.

**Tests first.**

- Fixtures for `data.import` (replace and merge), `data.expand`, `batch`.
- A page with `<graphty-element data-source=...>` shows `canUndo` false after load; a load after
  mount is one step; a failed first import leaves no step and later style edits are steps.
- Assigning `dataSource` then `dataSourceConfig` in one tick is one load and one step.
- Import report: undo a merge import and an `add-edges`: `data.lastImport()` returns the earlier
  report.
- Replace undo: the store's column set equals the original's.
- Pins and ids: pin `"1"` (through today's pin door), clear, import a graph reusing `"1"`:
  nothing pinned.
- `setData` is one step; `edgeData =` is one step.
- The doors test getter-after-undo for `nodeData`, `edgeData`, `dataSource`,
  `dataSourceConfig`.

**Done when.** Round trips pass; no door is left on the gap list for data loading; every
existing loading test in `default`, `browser` and `storybook` projects passes (rule 5); lint,
knip, build green.

---

## Phase 15. Runs as steps

**Goal.** A finished run, its result, its auto-applied layers and its legend are one step;
undo keeps the result instead of recomputing; undo during a run cancels it (design sections
4.7, 4.8, 6.1, 6.3, 11.2).

**Files.**

- `graphty-element/src/session/commands/algo.ts` (new): `algo.run` (queued `algorithm-run`,
  `applySuggestedStyles?` argument), `algo.remove` (run and bound layers in one draft).
- `graphty-element/src/session/runs/RunsApi.ts`: the maps at `RunsApi.ts:377-386` and `:677-682`
  become the `runs` slice of `RunEntry { command, record, result, painted, derived, stale }`;
  the dedupe identity is computed from `command`; `runs.batch` opens one group whose members
  write into its draft and whose held auto-apply plan is planned into it at release;
  `runs.remove` dispatches `algo.remove`.
- `graphty-element/src/session/runs/Run.ts`: a stable facade per `RunId` reading the current
  entry; `resetForRerun` deleted; `rerun()` keeps the last result until the new execution
  commits; `status: "removed"` for an undone entry; the commit tail's liveness and generation
  check drops late values; `stale` set when the graph token changed; a run cancelled with reason
  `"undo"` never writes an entry.
- `graphty-element/src/session/styles/autoApply.ts`: plans layers into the run's group through
  `planInto(draft, ...)`; the hidden `painted` set moves into `RunEntry.painted`.
- `RunChange` gains `cause` and `generation`; `RunPhase` gains `"removed"` and `"restored"`;
  `RunStatus` gains `"removed"`.
- `Graph.runAlgorithm` for catalogue algorithms, `Graph.run`, the element's `run`,
  `runs.start`, `session.run` dispatch `algo.run`; `Graph.runAlgorithmsFromTemplate` and
  `runOnLoad` are one group; the on-load runs of adding commands (phases 12 and 14) become
  deferred members of the adding command's group.
- `graphty-element/src/managers/AlgorithmManager.ts`, `Graph.ts` `applySuggestedStyles`: one
  group of `style.*`. The `partial` rows of phase 7 for `applySuggestedStyles`, the
  `runAlgorithm(..., { applySuggestedStyles })` path and the run auto-apply become plain op or
  transaction rows.
- `VisibilityApi.ts`: the mask-copy tag replaces the `RunsApi` revision of phase 8 with the
  identities of the `RunEntry` objects the filter reads, and that revision counter is deleted if
  nothing else reads it.

**Tests first.**

- Fixtures for `algo.run` (with and without `applySuggestedStyles`) and `algo.remove`.
- A redone run returns the identical `RunResult` and the executor spy's count does not change;
  the handle held before the undo is what `runs.get(id)` returns after redo.
- Undo during a fake accelerator run cancels it and records nothing; a style edit made during
  the run survives; redo while an older run is pending leaves it running; a run started before
  a colour change survives undoing the colour change and records on top when it finishes.
- Late run value: a fake accelerator resolving after `cancel()` writes no entry and no layer.
- `runAlgorithm(ns, type, { applySuggestedStyles: true })` for a catalogue algorithm is one step
  and one undo removes run and layers.
- With `algorithmsOnLoad` set, `addNodes` is one step with the on-load runs as deferred members;
  a replacing import starts them once; undoing a removal starts none.
- `runAlgorithmsFromTemplate` is one step.
- Rerun then undo restores the previous result without computing.
- `test/session/runs/*` and `runs-on-session.test.ts` updated only where they asserted the
  deleted `resetForRerun` behaviour.

**Done when.** Round trips pass; the `algo.run` door rows leave the gap list; the algorithm stories
still pass in the `storybook` project; lint, knip, build green.

What was built, where it differs from the list above:

- A runs API built without a dispatcher (its own unit tests) keeps a private one over its queue,
  so there is one code path; a session hands in its own.
- A run is dispatched when its handle starts an execution; the command's `execute` runs that
  execution's work in the slot it holds, and a command dispatched as data (a `batch` member) makes
  its own handle there. The "now" queue policy is a dispatch option that starts a queued command
  beside the queue.
- The auto-apply policy only decides (what to paint, and whether the run has had its
  first-completion moment); the runs API plans the decision into the run's draft. A batch holds
  its members' decisions and dispatches them through its transaction at release. The policy's
  `forget` and the global hold are gone: `RunEntry.painted` and a hold per batch replace them.
- The session's `runs` derivation hook repaints every kept layer when a run entry changes, since
  a reader's own layer can select on a run's values. The element's repaint after every finished
  run is deleted: it painted over the pass and left the picture briefly stale.
- `runAlgorithm(..., { applySuggestedStyles: true })` on a run that needs no computing still
  dispatches its command, which applies the layers from the result it has, as one step.
- The lane gained `passCause`: the restoring cause lasts the whole pass, since the `runs` hook,
  which announces "removed" and "restored", runs after the `arrangement` hook clears `restoring`.
- In the random-sequence model a run's turn comes at once, as an import's does; runs dispatched
  without being awaited are phase 21's.
- The deferred members of an adding command start when its group seals (`ctx.after`), so the
  first undo of an add whose on-load run is still going cancels that run and the second undoes the
  add, as design section 6.1 says. `test/browser/history-graph-add.test.ts` now waits for those
  runs before its undo.

---

## Phase 16a. Pins, positions, captures and restore mode

**Goal.** Pinned nodes are a slice; node coordinates are recorded at rest; undo and redo restore
the coordinates of plain steps without reheating the layout (design sections 6.2, 6.4).

**Files.**

- `graphty-element/src/session/project/arrangement.ts` (new): immutable captures (node-id list,
  graph token, epoch, `Float32Array` lane copy); mapping by id across tokens in one epoch; row
  patches as typed arrays.
- `graphty-element/src/session/project/graphOps.ts`: a node added with no file coordinate is
  seeded from a hash of its id (`fillUnplaced`), so a redone add with no rest point lands where
  it did the first time. Every layout's starting coordinates change with it, so the visual
  baselines are re-approved by the owner in this phase.
- `graphty-element/src/data/positions.ts`: a `generation` bumped once per batch at the engine's
  publish or step, a readback landing, a drag update, `positions.set`, and a restore.
- `pins` slice (op-log over one private `Set<NodeId>`), `positions.pin`; `positions.set`
  (coalesce key `positions`; a row patch, or a full after-capture when one call writes more than
  a third of the rows); `session.positions` gains `pinned`, `set`, `pin`, `unpin`. The element's
  and `Node`'s `pin` / `unpin` dispatch.
- `graphty-element/src/session/project/graphOps.ts`: `removeNodes` and `replace` drop removed
  ids from the `pins` slice in their own draft, and the stopgap of phase 13 that recorded the
  lane's pin bytes for removed rows is deleted, so pins have one source of truth.
- `History.ts`: per-step before-capture, after-capture and row patch; the arrangement recursion
  `A(k)`; seal before the cursor moves; rest points (settle, pause, a non-iterating layout's
  placement pass, a history call's stop) sealing into the top applied step.
- `graphty-element/src/layout/LayoutEngine.ts` and `SimulationLayoutEngine.ts`: new
  `loadArrangement(lane)` (refill the engine's own copy, `running = false`); an arrangement
  generation bumped by every restore; a readback submitted under an older generation is
  discarded; the snapshot-replaced reload and the acceleration-change reload do not set
  `running` while `restoring` is set.
- Derivation hooks `pins` (lane pin bytes, `engine.pin` / `unpin`) and `arrangement` (write the
  lane, `loadArrangement`).
- `digest.ts` and both round-trip harnesses: the lane and the arrangement join the digests; the
  phase 6 skip is removed, so every earlier fixture (removals, `clear`, replacing imports) is now
  checked on coordinates too.
- `test/session/history/fakes.ts`: a deterministic fake layout engine registered as the
  arrangement hook's engine for the Node session. It steps only when told, emits a rest point on
  demand, and delivers readbacks with a latency the random-sequence scheduler controls. The
  random-sequence model gains layout play, rest points, a layout that is not running, and a
  settle forced between an undo and its derivation, and checks the arrangement against the two
  restore rules of design section 6.2.
- Strict state: the lane's pin bytes agree with the `pins` slice at each commit, except rows a
  drag holds.

**Tests first.**

- A node added with no coordinate and no rest point, undone and redone, lands at the same
  coordinates (seeded from its id).
- Fixtures for `positions.set` and `positions.pin` (`renderer` as well).
- Pin, remove the pinned node, undo: the node is pinned again, restored through the `pins`
  slice, and the lane's pin bytes agree with it.
- No reheat on refreeze (`test/browser/history-arrangement.test.ts`, real simulation layout):
  add, settle, undo, advance N frames: the lane equals the restored capture and the step below
  keeps its capture bytes.
- Snapshot read during undo: a `project:changed` listener reads `session.data.snapshot`; the same
  assertion.
- Direct lane write: write the lane as a GPU readback does, reach a rest point: sealed.
- Stale readback: a fake layout readback that lands after an undo is dropped (Node, on the fake
  engine).
- Removed rows keep their seeds (lane half, from phase 13).
- A script calling `positions.set` for one node at a time costs at most one capture per layout
  frame.

**Done when.** Round trips pass with the lane and the arrangement in the digest; the existing
layout tests (`default` and `browser`) pass (rule 5); lint, knip, build green.

What was built, where it differs from the list above:

- New nodes are not seeded from a hash of their id. A history call seals the lane before the
  cursor moves, so a redone add restores the coordinates the layout gave the node the first time
  (a capture holds them); with no layout, the row is unplaced both times. Seeding every unplaced
  row would change every layout's starting coordinates, and the visual baselines with them, for
  no case the seal does not already cover.
- The arrangement lives in `session/project/arrangement.ts` as one `Arrangement` per dispatcher:
  the current capture, the lane generation it matches, the `arrangement` and `pins` hooks, rest
  points, and the writes of `positions.set` and `positions.pin`. `History` keeps each step's
  captures and turns every undo and redo into ops that the `arrangement` hook writes. The
  `arrangement` slice names the last capture and is not hashed; the digest's `arrangement` option
  hashes the lane itself (the position and pin columns).
- A(k) has one more term: rows a coalesced `positions.set` writes after its step took an
  after-capture are kept as a row patch over that capture, instead of a fresh capture per call.
  Undoing a step that holds only a row patch writes each of its rows' value in A(k-1), not the
  prior it was written over, because A(k-1) may have been sealed again since.
- Every history move and rollback hands the lane to the engine, even when nothing was restored:
  the graph under the engine may have changed, and a static layout marked stale would otherwise
  lay the graph out afresh over the restored arrangement.
- The lane half of removed rows is kept by `GraphStore`: a removal and a replace record where
  their rows were in the lane, read again at every redo, and the next freeze puts rows back there
  before anything seeds them. So undoing a removal needs no capture, and a burst of undos still
  costs one rebuild.
- `session.positions` is the lane with `pinned`, `set`, `pin` and `unpin` beside its own members;
  narrowing away the lane's writers is phase 18c. `positions.pin` skips an id the graph does not
  hold, as the element's `pin` always has. The forward pin writes the lane byte and tells the
  engine at once, so a getter and a gesture see it; the `pins` hook writes every dirty pin again
  from the slice. The strict pin check runs at a commit that wrote the `pins` slice.
- The renderer: `LayoutManager.onRest` is called whenever `running` goes from true to false;
  `LayoutManager.restoring` keeps a new snapshot or accelerator from starting the layout during a
  restore; `UpdateManager.redrawArrangement` moves nodes and edges after a restore; a batch a
  simulation submitted before `loadArrangement` is dropped when it lands. Emptying the graph now
  tells the layout engine to let go of its nodes (the `DataManager` TODO), which also stops a
  static layout writing the old rows and growing the lane under the snapshot it is lent to.
- The random-sequence model checks the lane against A(position) after every history move, with
  layout play, frames, rest points, placements, pins, and an undo whose derivation a settle
  races. It does not check the arrangement while its history holds a replacing import or a
  clear: restoring one dataset's coordinates onto another's is phase 16b's (epochs).
- The renderer round trip reads every digest with the layout at rest and a frame drawn, and the
  scene digest leaves out the scale of a disabled mesh, which draws nothing and keeps whatever
  length it was last drawn at.

---

## Phase 16b. Group captures, seal targets, epochs and the eviction fold

**Goal.** Coordinates are right for multi-part steps, across datasets, for cancelled work and
after eviction (design sections 6.2, 6.4, 7 "eviction fold").

**Files.**

- `History.ts`: groups that take a before-arrangement (`moves` commands, slot-holding writers, a
  transaction at its first graph write or `moves` command); the seal target (the newest open
  group's provisional after-capture, else the top applied step); a rollback writes the
  before-arrangement back in restore mode and is not a rest point; a replacing import and
  `clear` take a fresh epoch and seal their own after-capture; the baseline capture as a private
  buffer that eviction folds steps into in place.
- The random-sequence model checks the arrangement across replacing imports and clears (phase
  16a skips it while one is in the history), and gains open groups across rest points,
  replacing imports with reused ids, and eviction with captures.
- `Dispatcher.ts` takes the before-arrangement when a member starts and hands it to `History`;
  a command definition declares it with `moves`, or with `movesWhen(command)` when only some of
  its commands do (`data.apply` for `clear`). `data.import` and `data.expand` declare `moves`.
- `arrangement.ts`: `before()` shares the current capture only while the lane holds it row for
  row, and otherwise captures the lane and seals it into the seal target first.
- `graphOps.ts`: `clear` (and so a replacing import) takes a fresh graph epoch, and undo and redo
  put the recorded one back.
- `test/session/history/arrangement.test.ts` holds the dataset, cancelled-load and open-group
  fixtures; the eviction fold is in `random-sequences.test.ts`.

**Tests first.**

- Datasets do not share coordinates: import A, import B with the same ids, edit a style before
  B settles, undo the style: no row takes A's coordinates.
- Cancelled work restores the arrangement: undo cancels a chunked import mid-load: lane equals
  the capture before it and the step below keeps its bytes.
- Rest points under an open group: a layout that settles between the chunks of a replacing
  import, and one that settles while a load transaction is open; undo restores the capture from
  before the group.
- Eviction fold: 2000 `positions.set` steps with coalescing off and `limitSteps` 1000, undo all:
  the lane equals the baseline with every evicted patch applied.

**Done when.** Round trips and the random-sequence model pass with the arrangement in the
digest; lint, knip, build green.

---

## Phase 17. Layout choice and dimension

**Goal.** The layout choice (catalogue id, engine, options) and 2D versus 3D are one slice with
one home, and switching either is undoable (design sections 3.2 "The dimension has one home",
4.7 slot-holding writers, 6.4 "Entering VR or AR from 2D", 11.4).

**Files.**

- `graphty-element/src/session/commands/layout.ts` (new): `layout.set` and `view.dimension`
  (queued `layout-set`, slot-holding: take the before-arrangement, write the slice, run the
  `layout` hook inline, spend pre-steps checking the arrangement generation and liveness after
  every await and stopping without publishing, seal after the pre-steps); `layout.transport`
  (exempt); `view.immersive` (exempt).
- `graphty-element/src/session/layout.ts` and `types.ts`: `SessionLayout` (`id`, `engine`,
  `options`, `dimension`, `set`, `setDimension`).
- `graphty-element/src/managers/LayoutManager.ts`: `layoutEngine`, `setLayout`,
  `applyTemplateLayout`, `updateLayoutDimension` become private and form the `layout` hook;
  `spendPreSteps` takes the generation and liveness.
- `graphty-element/src/Graph.ts`: `config.graph.viewMode` and `config.graph.twoD` are computed
  from `layout.dimension` in the merged `Styles.config` view, and the two temporary
  view-settings keys that held them since phase 10 are deleted; `scene.metadata.twoD` is written
  only by the `layout` hook; `savedZPositions` is deleted; `_setViewModeInternal` is split into
  `view.dimension` and `view.immersive`; entering XR from 2D is one element transaction that rolls
  back if entry fails; an undo that would make the scene 2D during an immersive session ends it
  first.
- `graphty-element/src/graphty-element.ts`: `layout`, `layoutConfig` (one slot under the
  `element-layout` coalesce key), `viewMode`, `layout2d`, `setLayout`, `setViewMode` dispatch;
  `#layout`, `#layoutConfig`, `#viewMode` deleted; `layout` returns the engine it was given.
- `layoutBehavior`'s `layout.type` becomes a `layout.set` in the same step (from phase 10's gap).
- `data.import` with `layout: "recommended"` applies `recommendLayout` inside the import's group.

**Tests first.**

- Fixtures for `layout.set` and `view.dimension`.
- Alternate engine: `layout.set("force", { engine: "d3", options })`, change layout, undo: engine
  is d3 and the options are identical.
- Dimension (`test/browser/history-layout.test.ts`, with the other scene assertions of this
  phase): 3D to 2D and back, 2D to 3D and back: `GraphContext.is2D`, the engine's dimension,
  `scene.metadata.twoD` and `Styles.config.graph.twoD` agree with the slice after each.
- Vocabulary check un-skipped: nothing but the `layout` hook writes a dimension field.
- Pre-steps in flight: undo, and separately a second `layout.set`, while fake GPU pre-steps are
  in flight: nothing the first command computed is published.
- Cancelled `layout.set` mid-pre-steps: the lane equals the before-capture.
- Rest points under an open group: a transaction runs `tx.layout.set`, the layout settles before
  `fn` returns, commit, undo: the lane equals the pre-transaction capture.
- XR entry fails from 2D: no step and still 2D. `view.immersive` leaves the digest unchanged from
  2D and from 3D (vocabulary check).
- `layout` then `layoutConfig` in one tick is one step.
- `data.import(..., { layout: "recommended" })` then one undo leaves the previous layout.

**Done when.** Round trips pass; the layout and view-mode stories (rule 5) and the `xr` project
pass; lint, knip, build green.

What was built, where it differs from the list above:

- `view.dimension` is queued under the `view-mode` category, not `layout-set`. The queue's
  obsolescence rules make a newer `layout-set` cancel an older one; sharing the category would let
  `element.viewMode = "2d"` followed by `element.layout = "circular"` cancel the switch to 2D, the
  defect the `view-mode` category was created to close.
- An empty `layout` slice means the default layout (`force` drawn by `ngraph`, in 3D), and nothing
  writes it at construction. The graph builds the default engine on the queue's first turn and
  again at `init()` when nothing has, without a command. A default written as a command would share
  the `layout` key with a switch to 2D asked for before the graph connects, and the rollback of the
  default when a consumer's layout replaced it would take the switch back with it. So the element's
  `layout` and `layoutConfig` read `undefined` and `{}` until a layout is chosen, as they did.
- `LayoutManager.layoutEngine`, `LayoutManager.setLayout`, the new `LayoutManager.apply` (the
  `layout` hook) and `LayoutEngine.config` stay public, as escapes that phase 18c narrows: the
  standalone manager tests assign `layoutEngine` and build through `setLayout`, and moving those
  callers belongs with the other manager escapes. `updateLayoutDimension` and
  `applyTemplateLayout` are deleted; nothing called the second.
- Graph-level `setLayout` and `setViewMode` resolve, rather than reject, when a newer request of
  the same kind made them redundant before they ran (a cancellation with reason `"obsolete"`), and
  resolve at once inside `batchOperations`, as their queued forms did. `setViewMode("vr")` that
  cannot enter XR logs and resolves, as before; the transaction behind it records nothing.
- The pre-steps stop on the command's signal (undo, a second `layout.set`, cancel), on a restore of
  the arrangement, and when the build is overtaken; the frame loop does not step an engine that is
  still being built, so nothing a cancelled build computed is published.
- A forward switch from 2D to 3D lays the graph out in three dimensions; the Z a node had before
  it was flattened comes back only by undoing the switch to 2D. The mode-switching tests that
  pinned the old saved-Z behaviour were replaced by tests that pin undo restoring it.

---

## Phase 18a. Plugin algorithms and the `Graph` facade

**Goal.** A plugin algorithm that has no descriptor, and writes to nodes, edges and the graph as
it runs, is one undoable step (design sections 4.5, 3.6).

**Files.**

- `algo.legacy` (new op) runs a descriptor-less plugin with a group-tagged `Graph` facade whose
  dispatches run inline in the command's group, and, for its duration only, swaps the `data`
  getters on the `Node` and `Edge` prototypes for copy-on-write proxies (one per record, cached
  in a `WeakMap`); at the end, the written paths become one `setAttributes` and one
  `setGraphValues`. `Graph.runAlgorithm` for plugins, `AlgorithmManager.runAlgorithm` /
  `runAlgorithmsFromTemplate` dispatch it. A plugin constructed and run directly
  (`Algorithm.get(g, ...).run(g)`, `new Plugin(g).run(g)`) cannot be intercepted, because `run`
  is the plugin's own method; phase 18b closes it by freezing the records, so its writes throw.
- `Dispatcher.ts`: `UndoableContext.inline` runs a command in the running command's group, now,
  whatever its lane; `routed(via, fn)` sends every untagged dispatch made in the synchronous part
  of `fn` there, which is how the facade tags a door's dispatches without reimplementing the door.
  `Graph`'s queued data doors dispatch at once while routed, since the running command holds the
  queue's slot.
- `DataManager.graphResults` becomes a getter over the `graph` slice's `graphResults` value;
  its setter works only while `algo.legacy` runs a plugin.
- `algo.legacy` needs a renderer, so a definition can declare `renderer: true`: the vocabulary
  test then asks for a renderer fixture only, and checks that a headless session refuses it.
- `strict.ts`: the facade key check for inline plugin dispatches.

**Tests first.**

- Fixture for `algo.legacy`: a plugin writing nested `algorithmResults` on nodes and edges and a
  `graphResults` value is one step, and undo removes all three.
- A plugin whose `run(g)` calls `g.addNodes` and `g.getSession().styles.add` yields exactly one
  step (`Graph.styles` is the configuration object, which has no `add`).
- `runAlgorithm` with `applySuggestedStyles: true` for a descriptor-less plugin is one step.

**Done when.** Round trips pass; the plugin algorithm tests and stories pass (rule 5); the
plugin doors leave the gap list; lint, knip, build green.

---

## Phase 18b. Frozen records, sealed snapshots, strict state complete

**Goal.** Records and resident tables cannot be written outside a command, and strict state
checks everything design section 12.1 lists (design sections 4.9, 12.1).

**Files.**

- `Node.data` / `Edge.data` return deep-frozen records, in production as well; `session.data
.node()` / `edge()` return frozen values. The records map built in phase 12 is frozen as it
  is written.
- `GraphStore`: attaches the position and pin columns and calls `seal()` (phase 1). The
  accessor-only `position` and `graphty.pinned` columns of the snapshot handed to a consumer
  moved to phase 18c: they change the published type of `session.snapshot()`, and graph-io's
  exporters read `byRole("position").data` from the snapshot they are given, so the view needs
  the exporters' callers moved with it, which is 18c's work.
- `strict.ts` completes design section 12.1: checksums of retained typed arrays (on first
  retention, then only new ones per dispatch, full sweep in `afterEach`), and
  `builder.mutationCount` at each commit.

**Tests first.**

- `test/session/history/strict-state.test.ts`: one case per row of the bypass table in design
  section 4.9 that this phase closes (record writes, resident tables, retained typed arrays),
  asserting the write throws or the next dispatch fails naming the slice.
- A plugin that keeps a record reference and writes to it after its command throws, naming the
  command to use.
- graph-format: the resident snapshot's tables throw `E_FROZEN` after the store seals.

**Done when.** Strict state is complete and passes in every project listed in "Where the history
tests run" (rule 5 for `browser` and `storybook`); lint, knip, build green.

---

## Phase 18c. Narrowing the public escapes and moving their callers

**Goal.** The published members that let a caller change state without a command are gone or
read-only (design sections 4.9, 15.2).

**Files.**

- `session.positions` loses `write`, `setPinned`, `fillUnplaced`, `grow`, `remap`, `view`,
  `pinnedView`, and becomes `SessionPositions extends ReadonlyElementPositions`;
  `SessionGraphStore.positions` narrows to `ReadonlyElementPositions`; `session.data.store`
  becomes a read-only facade.
- `DataManager.nodes`, `edges`, `edgesByIndex`, `edgeCache` become `ReadonlyMap` over private
  fields; `Graph.operationQueue` private; `LayoutEngine.setNodePosition` / `pin` / `unpin`
  private to the hooks. `Graph.styles` (`Graph.ts:176`), a writable public field through which a
  caller can replace the whole style stack and configuration, becomes a `readonly` field whose
  `config` is the frozen view of phase 10 and whose mutating methods dispatch or are private.
- `createGraphSession` loses `store`, `records` and the function form of `config.data`; the
  element keeps building through the internal `createElementSession`.
- The snapshot handed to a consumer (`session.snapshot()`, `session.data.snapshot()`,
  `session.data.store.getSnapshot()`) shares the store's structure, ids and columns but carries
  COPIES of the `position` and `graphty.pinned` columns, sealed (design section 4.9). This
  replaces the accessor-only columns first planned here: a copy keeps the published type
  `GraphSnapshot`, so graph-io's exporters and every consumer that reads
  `byRole("position").data` work unchanged, and a write into the copy moves nothing. It costs
  one O(nodes) copy per call. `session.data.undirected()` derives from the consumer's snapshot,
  because a derived graph shares the node table of the one it came from. The element's own
  readers (the data surface's lookups, statistics, selection, scope, visibility, the selector
  source, the engines and the `arrangement` hook) read the store's snapshot.
- The renderer's own lane stays writable where only the renderer reaches it:
  `DataManager.getSnapshot`, `DataManager.positions`, `LayoutEngine.nodePositions` and the
  writers of `ElementPositions` are the layout lane (in-flight coordinates, recorded at the next
  rest point), and the pin bytes follow the `pins` slice under strict state.
- In-repo callers of the removed escapes (app, stories, tests) move to the session verbs in this
  phase.
- `Node.id` and `Node.index`, `Edge.srcId`, `Edge.dstId` and `Edge.index` (writable public
  fields) become read-only, and `EdgeMap`'s `map`, `set`, `delete` and `clear` stop being
  reachable from a public member; their rows in `doors.ts` leave the gap list.
- Moved to phase 19a: `data.apply` taking the queued lane. It is a change of behaviour, not a
  narrowing, and it turns on the same question 19a answers for `batchOperations` -- whether a
  data door holds the queue -- so the two land together.

**Tests first.**

- `strict-state.test.ts`: the remaining rows of the bypass table (the removed members) as
  compile-time cases.
- A type test that `session.positions.write`, an assignment to `graph.styles` and the removed
  `createGraphSession` options do not compile.

**Done when.** The doors test's gap list holds only the gesture doors of phase 19a; the
completeness check passes with the narrowed surface; lint, knip, strict-consumer typecheck and
build green.

---

## Phase 19a. Gestures: drag, keys, assistant, XR, `batchOperations`

**Goal.** The gestures the element owns are one step each, and the element handles Ctrl+Z
itself (design sections 5.1 `batchOperations`, 5.3, 10.2).

**Files.**

- `graphty-element/src/NodeBehavior.ts`: the drag opens an element transaction at the top of
  `onDragStart`; pointer moves stay in-flight writes; the drop dispatches `positions.set` and,
  with `pinOnDrag`, `positions.pin` through the drag's `tx`; a settle while held is the drag's
  provisional after-capture; an undo mid-drag aborts it, restores the drag-start capture, and
  ignores the rest of the gesture.
- `graphty-element/src/managers/InputManager.ts` and `graphty-element/src/input/babylon-input-system.ts`: the
  `historyKeys` property (attribute `history-keys`, default on) makes Mod+Z call
  `session.undo()` and Shift+Mod+Z / Mod+Y call `session.redo()`, with `preventDefault()`
  carried from the DOM event through `convertKeyboardInfo`.
- `graphty-element/src/graphty-element.ts`: the `graphty-history-change` DOM event; `historyKeys`.
- `graphty-element/src/ai/AiManager.ts`, `ai/commands/types.ts`, `StyleCommands.ts`,
  `LayoutCommands.ts`, `AlgorithmCommands.ts`: each message is a transaction with provenance
  `via: "assistant"`; `CommandContext` gains `tx`; built-in commands use it; the transaction's
  abort signal is linked to the assistant's abort controller. The AI style commands' `partial`
  rows of phase 7 become transaction rows.
- Steps recorded during an immersive session carry `provenance.xr`.
- `Graph.batchOperations` and the element's `batchOperations` become transactions whose callback
  receives `tx`; a door called on the same object during the callback logs a warning naming the
  `tx` verb; the published examples are rewritten to use `tx`.
- `Dispatcher.ts`: a transaction can take its before-arrangement when it opens (the drag's, before
  any pointer move writes the lane), and a group that took one and wrote nothing restores it when it
  rolls back (an aborted drag). `GraphSession`'s `tx` routes every verb of every part of the session
  (`tx.data.*`, `tx.styles.*`, `tx.run`, ...) into the transaction, not only `tx.execute` and
  `tx.layout`.
- Moved to phase 21: `data.apply` taking the queued lane. Every synchronous `DataManager` door
  and the tests built on them change with it, which is a change of behaviour of its own, and the
  interleavings phase 21 generates are what check that a waiting add is pending work undo
  cancels.

**Tests first.**

- Drag: with the layout running at drag start, drag and drop, undo: every unpinned node is back
  where it was at drag start. Undo mid-drag: lane equals the drag-start capture, no step, the drop
  does nothing. A drag held until the layout settles, then undo. Undo then reheat.
- `test/browser/history-keys.test.ts`: one Mod+Z on a focused canvas moves `history.position` by
  one with a window-level listener that honours `defaultPrevented` attached; `history-keys="false"`
  leaves the key alone.
- An assistant message that sets a layout, runs an algorithm and adds a style is one step; one
  that throws after all three rolls all three back; undo mid-message stops further tools and
  fires `CommandContext.abortSignal`.
- `batchOperations`: calls through `tx` are one step; a throw rolls back; an element call during
  the callback logs the warning.

**Done when.** The doors test's gap list is empty and no row is `partial`; the `interactions`, `xr` and `llm-regression` projects pass; lint, knip, build green.

---

## Phase 19b. Camera and view-preset doors

**Goal.** Every camera move the graphty app makes today is an element door, so the app
migration (phases 25a to 25c) adds no element API. Computing a camera move is graph behaviour
and belongs to the element; these doors are exempt from history (camera state is not saved in
the project file).

**Files.**

- Read `graphty/src/components/shell/graphCommands.ts` (`graphZoomToFit`, `graphZoomStep`,
  `graphZoomToSelection`, `graphResetView`, `graphViewPreset`, `graphDisableBuiltInXrButtons`)
  and list each camera or XR-button operation it performs on the raw graph. For each one the
  element does not already offer as a public member of `GraphtyElement` and `Graph`, add the
  door there: at least a zoom step, zoom to the selection, a reset view and a named view preset.
  The app's zoom factor and its view-preset table move into the element with them (as element
  constants, with the preset names part of the door's argument type).
- `doors.ts`: a row per new door, `exempt` with the camera or view-setting reason.
- Outcome: two members were missing and are added on `Graph` and `GraphtyElement`:
  `zoomStep("in" | "out")`, with the 1.25 step as a constant in `Graph.ts`, and
  `zoomToSelection()`, which centres on the box around `session.selection.nodes`. The rest
  already exist and phase 25b moves the app onto them: Zoom to fit is `zoomToFit`, Reset view
  is `resetCamera`, the XR buttons are `setXRConfig`, and Top, Front and Side are
  `loadCameraPreset("topView" | "frontView" | "sideView")`. The app's `top`/`front`/`side` table
  is a second spelling of the element's view names, so it is deleted in phase 25b rather than
  moved: the Views menu rows name the element's views directly.

**Tests first.**

- `test/browser/camera-doors.test.ts`: each new door moves the camera as the app's helper does
  today (compare camera position and target with the helper's result on the same graph), and
  leaves the state digest and `history.steps` unchanged.
- The doors test calls each new row and sees no dispatch.

**Done when.** The new doors' tests pass; the completeness check passes; lint, knip, build
green. The app still uses its own helpers until phase 25b.

---

## Phase 20. Selection after history, and columnar run results

**Goal.** Undo and redo select what changed (design section 8), and run results are small
enough for the byte budget at a million nodes (design section 7 "Run results become
columnar").

**Files.**

- Primitives report touched node and edge ids; after an undo, redo or restore the session calls
  `selection.applyNow({ nodes, edges }, "replace", "history")`, dropping ids that no longer
  exist and leaving the selection alone for style, filter, run, layout, config and view steps,
  for `replace` and `clear`, and above the selection cap. `SelectionCause` gains `"history"`.
  The selection is applied once the derivation pass has run, and when the graph still has rows
  to rebuild it is held (`SelectionOwner.applyAtNextRead`) until something next reads the
  selection: resolving ids reads the snapshot, and an undo must not rebuild rows nobody asked for
  (the "thirty undos cost one rebuild" guarantee of design section 7).
- `graphty-element/src/session/results/RunResult.ts`: numeric fields as `Float64Array` columns,
  rank and percentile columns, non-numeric fields as arrays, one id index per half shared with
  the resident snapshot when the order matches, records built on demand, rankings cached as
  `Uint32Array` permutations, `byteSize`. `History` charges an id index that no longer belongs
  to the resident snapshot once per index object and re-estimates affected steps when the
  resident snapshot changes.

**Tests first.**

- `test/session/selection/history.test.ts`: undoing a removal selects the restored nodes; undoing
  a style edit leaves the selection unchanged; a step touching more ids than the cap leaves it
  unchanged; selection never changes the digest.
- `test/session/results/columnar.test.ts`: `byteSize` of a degree result at 100,000 nodes is
  within 10% of the column bytes; `node(id)` returns equal records; rankings are identical to
  today's for the existing fixtures; every existing `test/session/results/*` test passes.

**Done when.** Tests pass; the app's result panels still render (their tests pass); lint, knip,
build green.

---

## Phase 21. Random sequences complete, and scale

**Goal.** The two broad gap guarantees at full strength: undo-all returns to the start and
redo-all to the end for random interleavings of every op, and history stays inside its budget at
scale, including a million nodes (design sections 12.5, 12.6).

**Files.**

- `test/session/history/random-sequences.test.ts`: already covers every op, grown by each port
  since phase 7. This phase adds the remaining starting states of design section 12.5 (so it
  starts from each of the five), low `limitBytes` and `limitSteps` to exercise eviction with
  captures, and any interleaving item of design section 12.5 not yet generated -- among them an
  import whose turn is left to the fake scheduler, which phase 14 lets through at once. Its fixed seed
  list and `numRuns` are tuned so the whole file stays under 60 seconds in the `default` project
  with coverage on, as CI runs it, and each per-seed `it` stays under its 90-second timeout.
- `test/browser/history-random.test.ts`: a smaller run of the same model (same generators, fewer
  runs) on a real `Graph` with a real `SimulationLayoutEngine`, so the arrangement rules are
  checked against the engine the fake stands in for.
- `test/session/history/scale.test.ts` (`default`, with coverage): only what does not depend on
  the clock. The retained-size table of design section 7, asserted per element at the largest
  graph a session holds, `history.bytes <= limitBytes` after eviction, and "thirty undos of
  mid-row removals ran one rebuild" as a counter. The largest graph is the element's enforced
  node and edge ceilings (`DEFAULT_LIMITS`, 50,000 nodes and 100,000 edges, issue #405), not
  100,000 nodes: a session refuses a load past them with `E_TOO_LARGE`, headless or not. A
  capture is counted at 20 bytes a row, 12 of coordinates and 8 of id. The million-node byte
  budget is checked here too, in CI, without a scene: retained sizes follow from the column
  layout, so a million-row snapshot and a million-row run result built in Node are cheap enough,
  and the test asserts their `byteSize` estimates and the eviction outcome against the budget.
- `test/session/history/scale.bench.test.ts` (`bench` project, no coverage): the time budgets:
  dispatch overhead of a million-id command, undoing an attribute edit, a replacing import at
  the state layer, `restoreTo(null)`, and the cost of deep-freezing records at import, with
  strict state off.
- `test/browser/history-scale.bench.test.ts`: a real `Graph` at 50,000 nodes timing undo of a
  replacing import, of removing 1000 nodes, of a drag at rest, and `restoreTo(null)`, including
  the derivation pass. The graph is loaded as the baseline, so `restoreTo(null)` returns to it:
  tearing the whole graph down costs about 20 s at this size in the renderer (each node's mesh
  dispose searches and splices the scene's mesh list), which a forward clear pays as well, and
  the file reports that figure rather than budgeting it. It needs a project of its own: the Node `bench` project's include
  (`test/**/*.bench.test.ts`) would otherwise pick it up and run it with no DOM, and CI already
  runs `vitest run --project=bench` in the `graphty-element-default` job.
- `graphty-element/vitest.config.ts`: a new `bench-browser` project (browser mode on Chromium,
  like `browser`, including only `test/browser/**/*.bench.test.ts`); `test/browser/**` is
  excluded from `bench`, and `test/browser/**/*.bench.test.ts` from `browser`.
- `.github/workflows/ci.yml`: the `graphty-element-browser-1` job, which already has Chromium
  installed, gains a step `pnpm exec vitest run --project=bench-browser` with no `--coverage`.
  There is no million-node browser run, behind `GRAPHTY_SCALE` or otherwise: the element refuses
  to load past its 50,000-node ceiling, so the byte budget at that size is enforced by
  `scale.test.ts` alone.
- `test/session/history/no-skips.test.ts`: fails if any file under `test/session/history/`,
  any `test/browser/history-*` file or `test/browser/doors.test.ts` contains `.skip`, `.todo`,
  `skipIf` or the harness's pending marker, or if the vocabulary test's pending list is not
  empty. Every temporary skip earlier phases added names the phase that removes it; this test
  catches one that was forgotten, and stays in the suite so none can be added later.

- `data.apply` takes the queued lane (left immediate in phase 14, moved here from phases 18c and
  19a): the synchronous `DataManager` doors either become asynchronous or dispatch through
  `Graph`'s queued doors, the element's data doors stop queueing their own turn, and a waiting add
  is pending work that undo cancels. The random model generates an add left waiting on the queue
  and an undo before its turn.

**Tests first.** These tests are the phase. Any failure they find is fixed in the element in
this phase, with a focused regression case added to `round-trip.test.ts` for each one, so the
random test is not the only thing that knows about it. If the deep-freeze cost is over budget,
switch to lazy freezing on first hand-out as design section 14 describes.

**Done when.** All pass at the default sizes within CI time limits; `--project=bench` no
longer lists the browser timing file and `--project=bench-browser` runs it; the no-skips test
passes; the million-node byte assertions pass in `default`; the local browser timings at
50,000 nodes are recorded in that file's header comment; lint, knip, build green.

---

## Phase 22. Stories and picture equality

**Goal.** Act-then-undo stories exist for Chromatic, and pixel equality with the untouched
picture is asserted in a test (design section 12.7).

**Files.**

- `graphty-element/stories/Undo.stories.ts` (new): an untouched baseline story and act-then-undo
  stories for an import, a run with auto-applied styling, a style edit, a filter, a pin and a
  drag, a layout switch, 2D to 3D, 3D to 2D, colour to skybox background, and a saved view. Each
  play function acts and then awaits `session.undo()`. Data URLs are fully qualified.
- `graphty-element/stories/story-roster.json`: add every new story id.
- `test/browser/history-picture.test.ts`: for each case, compare canvas pixels before the action
  and after the undo. The camera and the selection are the reader's, not the project's: an import
  or a layout switch frames the camera and an undo leaves it there (section 9.1), and an undo
  selects what it changed (section 8). The test puts both back before the second picture, so what
  it compares is everything derived from project state.
- `src/managers/UpdateManager.ts` and `src/Graph.ts`: a dimension switch that rebuilds every mesh,
  and a new skybox dome, clear the finished-frame flags. An undo of a dimension switch moves
  nothing (the layout stays at rest, the camera is not framed), so without this
  `waitForStableFrame` resolved on the last finished frame while the rebuilt meshes still waited
  for their shaders, and the picture it vouched for was an empty canvas.

**Tests first.** `history-picture.test.ts` first; then the stories, which run in the `storybook`
project.

**Done when.** The picture test passes; the storybook project and the story-roster and
story-subject contract tests pass. The new Chromatic snapshots are reported to the owner for
approval; nobody else accepts them.

---

## Phase 23. App: history surfaces call the session; `undoStore.ts` deleted

**Goal.** The graphty app's Undo, Redo and History read and call the session, and its own store
is gone (design section 13, items 1 to 4 and 9).

**Files (under `graphty/src`).**

- Delete `components/shell/topbar/undoStore.ts` and `topbar/__tests__/undoStore.test.ts`;
  delete `UNDO_DEPTH` from `components/shell/constants.ts` and its assertion.
- New `components/shell/topbar/useSessionHistory.ts`: `useSyncExternalStore` over
  `history:changed` and `session.history.version`.
- New `components/shell/topbar/historyRows.ts`: presentation over `HistoryStep` (row text, XR
  grouping from `provenance.xr`, the Data panel's cleaning steps are steps whose `slices`
  include `"graph"`).
- `components/shell/AppShell.tsx`: `TopBar`, `UndoSplitButton` and `HistoryPopover` fed from the
  hook; `onUndo` / `onRedo` call `session.undo()` / `redo()`; `onRestore` calls
  `history.restoreTo`; the Undo tooltip reads `history.nextUndo`; the manual pushes at
  `AppShell.tsx:2896` and `:3215` removed; the key bindings call the session.
- `test/fakeSession.ts`: `history`, `canUndo`, `canRedo`, `undo`, `redo`, `execute`,
  `transaction`.
- `components/Graphty.tsx` and `components/shell/canvas/CanvasRegion.tsx`: an `onSession`
  callback, fired once from the wrapper's existing wait for the element to come up, so the
  shell holds the session in state and the history hook can subscribe to it.
- The Cleaning steps filter (steps whose `slices` include `"graph"`) is not added to
  `historyRows.ts` in this phase: nothing draws a Cleaning steps view yet, and an unused export
  fails knip. It lands with the view.
- `execute` is not added to the fake session in this phase: no app code calls it yet. The
  phase that first dispatches through `execute` adds it.

**Tests first.** The AppShell tests that exercised the store (around `:1463-1490`,
`:2412-2431`, `:3607-3619`) are rewritten to assert against `session.history` before the code
changes; a test that one key press with the canvas focused undoes once.

**Done when.** `undoStore.ts` is deleted, `rg undoStore graphty/src` finds nothing, the app's
tests and Storybook pass, and lint, knip and build are green.

---

## Phase 24. The app lint rule, at warning level

**Goal.** Lint reports every place app code changes the element except through session
commands (design section 12.8). It lands before the app migration, as a warning, so the rule
itself is the migration's work list and its precise, type-aware check (not a text search) is
what decides when the migration is done. Phase 25c makes it an error.

**Files.**

- `graphty-element` build writes `graphty-element/build/doors.json` from
  `src/session/commands/doors.ts` (a small script run by the build; `build/` is git-ignored and
  not in `files`).
- `graphty/eslint-rules/no-element-mutation.js` (new): a type-aware rule over typescript-eslint's
  type checker that reads `doors.json`. It asks the checker where an accessed member is declared,
  and when that is a renderer-side root of the door list (`Graphty`, `Graph`, `Node`, the
  managers) or an app-local copy of one (below), it reports a call of, or an assignment to, a
  door that dispatches, is partial or is a known gap, and any access of a manager getter or field.
  The session's parts are session-side roots, so `session.*` and `tx.*` are never reported. It
  also reports a JSX attribute for the `<Graphty>` props that phase 25b removes, and a re-declared
  element type: a local type or interface whose name, without an `Element` prefix or a `Like` or
  `Type` suffix, names an element type (types inside an ambient `declare module` of another
  package are skipped). Treating a local copy's members as the element's is what lets the rule
  see calls made through the app's duck types. Stories are not checked: the root lint config
  parses them without type information.
- `graphty/eslint.config.js`: enable the rule for `src/**` at `warn`. The app's `lint` script
  passes no `--max-warnings`, so warnings do not fail it. The rule is JavaScript checked with
  `checkJs` by `graphty/eslint-rules/tsconfig.json`, and the `lint` script and target gain
  `tsc --noEmit -p eslint-rules`.
- `nx.json` or `graphty/project.json`: the app's `lint` target depends on graphty-element's
  build (it already does), and hashes `doors.json` through
  `{ "dependentTasksOutputFiles": "**/doors.json", "transitive": true }`, with
  `{projectRoot}/build/doors.json` added to the element build's `outputs`, so a cached lint
  result does not survive a change to `doors.ts` (a plain file input would not work: Nx does not
  hash git-ignored files).
- `graphty/vitest.config.ts`: the app's single project runs every test in Chromium, where
  `RuleTester` with type information cannot build a TypeScript program. The config becomes two
  projects: the existing browser project, now excluding `eslint-rules/**`, and a Node project
  that includes only `eslint-rules/**/*.test.ts`. CI's `graphty` shard runs
  `nx run graphty:coverage`, which runs every project, so the new one runs there with no CI
  change; the phase checks that it appears in that job's output.

**Tests first.** `graphty/eslint-rules/__tests__/no-element-mutation.test.ts` with ESLint's
`RuleTester` and the typescript-eslint parser over a fixture tsconfig that resolves the element's
real types (typescript-eslint's own `RuleTester` is not installed, and ESLint's does the same job).
The test builds the rule from `doors.ts` directly, because CI's `graphty` shard downloads the
element's `dist/` and not `build/`. It: flags `element.addNodes(...)`, `element.layout = "d3"`,
`graphty.getDataManager()`, `<Graphty layout="d3" />`, a door through a renamed variable of type
`GraphtyElement`, a local `interface ElementGraph`; does not flag `session.data.addNodes(...)`,
`tx.styles.add(...)`, `element.zoomToFit()`, or an unrelated object's `pin()`.

**Done when.** The rule's tests pass in the new Node project; `pnpm run lint` passes, and its
warning list for the app is recorded in the commit message as the work of phases 25a to 25c;
lint, knip, build green.

---

## Phase 25a. App: load, close and the load failure as transactions

**Goal.** Loading and closing a dataset in the app are one step each (design section 13,
item 5).

**Files (under `graphty/src`).**

- `handleLoad` and `loadSample` in `AppShell.tsx`: one `session.transaction(fileName, ...)`
  containing the style sweep, `tx.data.import(source, { mode: "replace", layout: "recommended" })`,
  the degree run through `tx.run({ ..., as: degreeRunId })` and the label layer through
  `tx.styles.add(...)`, with the degree pass and Find groups left as deferred members; the
  effect at `AppShell.tsx:3274-3355` and the app's own `recommendLayout` call are deleted; the
  label-shortfall sentence reads the degree run's `run:changed` `"end"`.
- "Close dataset" is one transaction of the clear and the style sweep.
- The failure branch at `AppShell.tsx:1980-1985` stops calling `clearData()`.

**Tests first.**

- A load followed by one Undo, after the degree pass finished, leaves no trace of the load,
  including its labels and chosen layout.
- A failed load leaves `history.steps` unchanged and the previous dataset on screen.
- Close dataset then one Undo restores the dataset and its styles.

**Done when.** The tests pass; the lint rule reports no warning in the load, close and failure
code; the app's tests pass; lint, knip, build green.

**As built.**

- The typed verb `session.data.import` did not accept `layout: "recommended"` (only the
  `data.import` command did); `ImportOptions.layout` was added to the element and passed through.
- The degree run takes the id the element derives (`runs.start` returns it at once) rather than a
  caller-chosen `as`; the label layer names that id.
- The three tests run against the real element in `graphty/src/components/shell/__tests__/
AppShellLoadHistory.test.tsx`; the shell's other tests never register the element. A failed load
  there is a document the element refuses (a GEXF file with no graph element): malformed JSON is
  not a failure in the element, whose JSON source recovers it as an empty graph with a parse-error
  summary, so a malformed paste is recorded as a load of an empty graph.
- The wrapper's `loadFromUrl`, `loadFromFile`, `loadData` and `clearData` went: the shell hands
  `session.data.import` a file or a URL with no format, and the element detects it. The unused
  `dataSource` / `dataSourceConfig` / `replaceExisting` props went too.
- The shell's dataset name follows undo, redo and restore by reading `session.data.source()`,
  which the element keeps in the `graph` slice beside the rows.
- The app's vitest prebundle of graphty-element is cached in `graphty/node_modules/.vite/vitest`
  and is not invalidated when the element is rebuilt locally; delete it after an element change
  or the app's tests run the old element.

---

## Phase 25b. App: the component, its handle, graph commands, runs and metrics

**Goal.** The app reaches the element only through the session and the element's public doors
(design section 13, item 6).

**Files (under `graphty/src`).**

- `components/Graphty.tsx`: the dead `graph.dataManager` path deleted; `layout`, `layoutConfig`,
  `viewMode` props removed; `GraphtyHandle` drops `graph`; camera and XR calls use the element
  doors (including those of phase 19b).
- `handleApplyLayout`, the 2D/3D control and the layout Re-run call `session.layout.set` /
  `setDimension`; pins call `session.positions.pin` / `unpin` and read `pinned`;
  `RunAlgorithmModal.tsx` dispatches `algo.run` with `applySuggestedStyles` and stops reading
  `graph.dataManager.nodes`; "Remove result" dispatches `algo.remove`.
- `components/shell/graphCommands.ts`: every helper that takes the raw graph moves off it.
  `graphSelectNode` / `graphDeselectNode` use `session.selection`; the camera helpers
  (`graphZoomToFit`, `graphZoomStep`, `graphZoomToSelection`, `graphResetView`,
  `graphViewPreset`) and `graphDisableBuiltInXrButtons` call the element doors, and the app's
  zoom factor and view-preset table are deleted (phase 19b moved them into the element).
  `graphOnDataChanged` listens to the element's events. `ShellGraph` is deleted. Their
  `__tests__` are updated.
- `components/shell/analysis/elementBridge.ts` is deleted: the re-declared `ElementGraph`,
  `ElementNodeLike` and `ElementDataManagerLike` types and the duck-typing in `asElementGraph` /
  `elementSession` go; callers use the element's exported `GraphSession` type and
  `handle.session`. `analysis/runs.ts` and `analysis/nodeMetrics.ts` move onto
  `session.execute` and `session.runs`, and every AppShell use of `asElementGraph` /
  `elementSession` moves with them. Their `__tests__` are updated.

**Tests first.**

- Remove result removes the run as well as its layers.
- Each camera button calls the element door (a spy on the element), and the app has no zoom
  arithmetic left.

**Done when.** The lint rule reports no warning in the files above; the app's tests pass; lint,
knip, build green. If this phase finds an operation the element cannot do through a public
door, the door is added to the element in this phase with its `doors.ts` row and tests, and the
omission is noted in the commit message.

**Outcome.**

- One door was missing: the data table and the algorithm modal's node pickers need every record,
  and the session read records only one at a time by id. `session.data.nodes()` and
  `session.data.edges()` were added (read-only rows in `doors.ts`, tests in
  `test/session/data.test.ts`).
- `graphSelectNode` / `graphDeselectNode` stay on the element's `selectNode` / `deselectNode`,
  not `session.selection`. Both are exempt selection doors, and `session.selection.apply` does
  not fire the single-node `selection-changed` event the node inspector is filled from, so the
  move would have emptied the inspector. Moving the inspector onto `selection:changed` is a
  separate change.
- `GraphtyHandle.graph` became `GraphtyHandle.element`: the camera, XR and selection doors are
  members of the element. The assistant still hands the element's `graph` to `AiManager.init`,
  which takes a `Graph`.
- The label declutter the app turns on is written on the tag (`layoutBehavior`), a view setting
  that records no step, instead of assigned in an effect.
- The Views menu names the element's camera views (`topView`, `frontView`, `sideView`) and the
  app's `top` / `front` / `side` table is gone.
- The data-count listener follows `project:changed` naming `graph`, so an undo of a load or an
  edit refreshes the counts too.

---

## Phase 25c. App: mirrors, removed runs, strict state; the lint rule becomes an error

**Goal.** The app's copies of element state follow undo and redo, the app's tests run with
strict state, and the lint rule guards the result (design section 13, items 7, 8
and 10).

**Files (under `graphty/src`, and `graphty/eslint.config.js`).**

- Mirrors (`layers`, `legendChannels`, `layoutType`, `layoutConfig`, `viewMode`, `pinnedNodes`)
  are re-read on `style:changed` and on `project:changed` naming `layout` or `pins`;
  `activeResult` and `degreePass` handle the `"removed"` phase; the metric spinner ends on
  cancellation or removal.
- The app's browser test setup (`graphty/src/test/setup.ts`) sets
  `globalThis.__GRAPHTY_STRICT_STATE__ = true` before any element is created.
- `graphty/eslint.config.js`: `no-element-mutation` moves from `warn` to `error`.

**Tests first.**

- Undo of a layout change updates the layout control; undo of a pin updates the pinned list.
- `graphty/src/test/strict-state.test.ts`: on an element created by the app's test setup, a
  write to a frozen node record throws. A switch that silently failed to turn on fails this
  test rather than letting the suite pass without strict state.

**Done when.** The app's tests pass with strict state on; `pnpm run lint` passes with the rule
at `error`, so no app file reaches `graph`, `dataManager`, `layoutManager` or
`operationQueue`, mutates the element outside a session command, or re-declares an element type;
lint, knip, build green. #197 is closed by this branch's pull request.

---

## Phase 26. Documentation and release

**Goal.** A third party can use undo from the documentation alone, and the release is cut as a
major version (design sections 10.3, 15.3).

**Files.**

- `graphty-element/docs/guide/undo.md` (new) and its sidebar entry in
  `graphty-element/docs/.vitepress/config.ts`: every topic listed in design section 10.3, with a
  runnable example and the React `useSyncExternalStore` pattern.
- A "Migrating to 3.0" section in the same guide (or `docs/guide/migrating-to-3.md`): every row
  of design section 15.2 with one line of replacement code.
- `graphty-element/docs/guide/events.md`, `javascript-api.md`, `web-component.md`,
  `extending/custom-algorithms.md`: `cause`, the new events, `history-keys`, `execute`, `tx` on
  registered assistant commands, and the plugin facade.
- TSDoc on every new public name; the TypeDoc run (`scripts/build-api-docs.mjs`) passes.
- `design/element-api/element-api-design.md` sections 4.3.3, 4.11.1 and 4.11.2 point to the undo
  design where it supersedes them.
- `graphty-element/CLAUDE.md`: a short section on the dispatcher rule (a new mutating door
  dispatches a command; a new op declares undoable or exempt with a reason).
- File an element issue for the app's own file-format sniffing (`graphty/src/components/
Graphty.tsx:108-186`), labelled per the repository's issue labels. Filed as #539: the gap was
  that `session.data.import` required a format name, which master's fix for #47 (the app calling
  the element's `loadFromUrl` / `loadFromFile`) does not cover, because those are not the undoable
  path. `session.data.import` now detects the format when none is named, and the app's detectors
  are deleted.
- The owner's approval of design section 15 (asked for when phase 1 started). A name or a break
  the owner changed is applied here if it has not been already; the pull request is not merged
  without that approval.
- The pull request: title and body in plain language; the commit that publishes the breaks
  carries a `BREAKING CHANGE:` footer so the release tooling cuts graphty-element 3.0.0; the body
  says it closes #427 and #197.

**Tests first.** `pnpm run docs:build` (VitePress and TypeDoc) and `tools/check-links.sh
--offline` are the checks; the guide's runnable example is also a test in
`test/session/history/guide-example.test.ts`, so the documented code keeps working.

**Done when.** Docs build with no dead links; the full pre-push gate (`tools/prepush.sh`) passes;
the branch's CI is green apart from Chromatic snapshots waiting for the owner.

---

## What this plan does not do

The design's own non-goals stand: the project file format, history across reloads, the journal
and recipes, notes, groups and bookmarks, node merge and column operations, cost estimates for
the new ops, and the rest of #337 (typed builders, `parsePattern`, `formatCommand`, the JSON
Schema). Each future op joins `COMMANDS` and the door list when it lands, and the vocabulary test
makes it declare whether it is undoable.
