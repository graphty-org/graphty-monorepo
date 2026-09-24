# The element graph store lands now; the rest of its refactor is respecified

Date: 2026-09-19
Decided by: the owner
Changes: tasks M6-T6 through M6-T10 of
`design/webgpu/plans/2026-09-19-webgpu-m6-graphty-element.md`, which stop being the plan of record
for the element's data layer, and that document's Goal sentence, which promises `toAlgorithmGraph`
and `EdgeMap` retired in the same phase as the store. Those sections are NOT edited; this record
supersedes them.

## The decision

The branch `feat/element-graph-store` merges onto master now, ahead of the version 2 element API
work. Five of its six commits go in unchanged:

| Commit | What it adds |
| --- | --- |
| `beb1cad6` | `@graphty/graph-format` declared in both `dependencies` and `peerDependencies`; four new fields on `DataConfig` |
| `056f11a9` | `@graphty/graph-format` externalised from the `es` and `umd` bundles |
| `bb748a7e` | `ElementPositions`, an element-owned stride-3 `Float32Array` of coordinates |
| `cc591cc0` | `GraphStore`, one `GraphBuilder` for the life of the graph, with `getSnapshot()` on an invalidation key |
| `a0862758` | `Node.index`, `Edge.index` and element-owned `Node.pinned` |

The sixth, `80c0704e`, adds the typed `snapshot-replaced` event. It merges only with the forwarder
fix below. Without that fix it stays off the merge: nothing emits it and no 2.0 surface needs it.

The unfinished half of the same phase is NOT implemented as written. `DataManager` moving onto the
store, the freeze point, the 21 algorithm adapters coming off `toAlgorithmGraph`, the test-helper
migration and the layout engine's `load` / `reload` contract are respecified against
`design/element-api/element-api-design.md` and rewritten as tasks there.

## Why land it now

**The merge is clean today and will never be cleaner.** Master and the branch diverged at
`07fba28b`. The only source file they both touch is `graphty-element/src/Edge.ts`, and they touch
disjoint parts of it: master rewrites the world-matrix refresh inside `getInterceptPoints`, lines
636 to 671, while the branch adds an import, an `index` field at line 45, and comment edits at
lines 830, 839 and 1161. Everything else master has gained since the fork is design documents.
That will not hold. The 2.0 API removes `element.graph` and the eleven exported manager classes
(section 4.1 of `design/element-api/element-api-design.md`, line 486), and the migration names
roughly 4,900 further lines of application code that go with them (section 5.2 of
`design/element-api/element-api-migration.md`, lines 497-518). `DataManager`, `Node`, `Edge` and
the element's config schemas are all inside that radius.

**Four of the six commits are things the 2.0 design asks for by name.**

- Declaring `@graphty/graph-format` in both `dependencies` and `peerDependencies` and externalising
  every `@graphty/*` sibling from the build is rule 1 of the packaging section
  (`design/element-api/element-api-design.md` section 6.2, lines 3348-3355). Its stated failure is
  what the element ships today: siblings inlined into a 2.5 MB bundle, and a duplicated
  graph-format meaning two `.d.ts` identities that do not assign to each other.
- An element-owned stride-3 `Float32Array`, read by reference rather than copied, is the per-frame
  position channel (section 4.7, lines 2263 and 2267-2282).
- Dense indices with `INVALID_INDEX` for absent are the addressing model of the read-only graph
  view (section 12, line 4256), and `INVALID_INDEX` is one of the few graph-format names 2.0
  re-exports at all (section 6.2 rule 2, line 3358).
- Pin state belongs to positions -- `pin`, `unpin`, `pinnedMask()`, `isPinned(id)` -- as session
  state that outlives a layout change, not as state a layout engine owns (section 4.7, lines
  2258-2262 and 2296-2299).

**The blast radius on master is small, because the production code is inert.** Nothing in
`graphty-element/src` constructs `GraphStore`, and the only construction of `ElementPositions` is
`GraphStore`'s own field. What master actually gains in behaviour is a peer dependency and a bundle
externalisation. The one exception is `Node.isPinned()`, which stops hard-returning `false` and
starts answering from the new field -- see the second fix below.

**The tests pin invariants that are expensive to rediscover.** An unplaced row reads back as `NaN`,
never as the origin, so "not yet laid out" is distinguishable from "placed at 0,0,0"
(`graphty-element/test/data/positions.test.ts:12`, `:221`). A coordinate that is finite as a
double but overflows `Float32Array` -- `1e39`, which every finiteness check passes -- is refused,
because stored it becomes `Infinity` and the row then reports itself placed (`:272`, `:293`). A
freeze publishes exactly once even when a consumer callback throws part way through delivery, and
the retry does not remap the positions a second time
(`graphty-element/test/data/graph-store.test.ts:318`, `:358`). And a repo-wide scan asserts that no
file under `src/` calls `transferables()`, `toWire()`, `toBytes()` or `toByteChunks()`
(`graphty-element/test/data/no-transfer.test.ts`), because transferring a snapshot to a worker
detaches the element's own position array.

## Why the rest cannot be finished as written

The 2.0 design reverses decisions that M6-T6 through M6-T10 are built on, so finishing them would
mean writing code with a known replacement already specified.

- **The layout extension point stops being a class.** Task M6-T10 adds four optional members to the
  abstract `LayoutEngine` class and reaches them through feature guards. In 2.0 a layout is a
  factory function registered through one registry --
  `type LayoutFactory = (ctx: AlgorithmContext & { positions: Float32Array }) => { step(n); settled; stop() }`
  (`design/element-api/element-api-design.md` section 12, line 4268, with the plugin union in
  section 4.14 at line 2968). There is no class to add members to.
- **`getNodePositionInto` is superseded.** The same task has `Node.update()` call
  `engine.getNodePositionInto(index, out)` into a shared scratch object to avoid a per-node
  allocation. 2.0 makes the whole per-frame channel `positions.buffer`, read by reference with a
  `version` integer to skip unchanged frames (section 4.7, lines 2267-2282). A per-node accessor is
  the thing that design exists to remove.
- **`snapshot-replaced` has no place in the 2.0 event catalogue.** That catalogue is closed and
  counted -- 23 prefixed DOM events and 13 session events, with a CI test asserting the counts
  (section 4.10, lines 2479-2482, with the tables in 4.10.1 and 4.10.2). Neither list has a member
  for it, and its payload is two `GraphSnapshot` objects and a `Graph`, which the
  serialisable-`detail` rule at the head of 4.10.1 forbids.

Holding the branch until those three are resolved means holding it through the churn described
above, which is the expensive merge this decision exists to avoid.

## Three things that must be fixed before or during the landing

**1. The `snapshot-replaced` event leaks to the DOM.** The element forwards every internal event to
the DOM as a `CustomEvent` whose `detail` is the internal event object itself
(`graphty-element/src/graphty-element.ts:96-104`). A `snapshot-replaced` event therefore reaches
any listener on `document` under an unprefixed name, carrying a `Graph` reference and two
`GraphSnapshot`s of typed arrays -- unprefixed and non-serialisable, both of which the 2.0 event
rules forbid. It is latent today only because nothing emits the event. Either exclude the name from
the blanket forwarder, or hold `80c0704e` out of the merge.

**2. Element-owned pin state makes pin-on-drag sticky with no way out.** With `pinOnDrag` set,
`NodeBehavior` calls `node.pin()` from the drag-end path (`NodeBehavior.ts:192`) and again from the
plain-click path (`:419`), and nothing in `graphty-element/src` ever calls `unpin()`. While the
flag lived inside a layout engine it was discarded at every `setLayout`; owned by `Node` it
persists, so a user who merely clicks around accumulates permanently fixed nodes. Either land the
dense indices without the `pinned` field, or leave `isPinned()` answering from the layout engine
until the visibility and pinning mask lands.

**3. The options schema went from stripping unknown keys to rejecting them.**
`GraphKnownFields` changed from `z.object` to `z.strictObject`
(`graphty-element/src/config/DataConfig.ts`). A stored or hand-written style template whose
`data.knownFields` carries a key the schema does not declare used to load with that key silently
dropped; it now throws from `Styles.fromJson` naming the key
(`graphty-element/src/Styles.ts:75-87`, `src/config/StyleTemplate.ts:63`). Catching a misspelled
`idCoersion` is the point, but this is user-visible and it lands ahead of the major, so it belongs
in the breaking change register (`design/element-api/element-api-migration.md`).

## What we are giving up, and why it is acceptable

**graphty-element gains a peer dependency.** `@graphty/graph-format` is now something a consumer's
package manager must resolve, and a consumer on an incompatible major gets a peer warning where
before there was nothing to warn about. This is the cost the packaging rule accepts deliberately:
the alternative is the element shipping a private copy, and two `GraphSnapshot` identities in one
application is a failure that surfaces as a type error a consumer cannot fix.

**827 lines of production code land that nothing calls.** `src/data/GraphStore.ts` is 499 lines and
`src/data/positions.ts` is 328, and no code path in the element reaches either. Dead code on master
is a real cost -- it is read by everyone who greps, it has to survive every refactor, and it is
covered by tests that pass whether or not it works in situ. It is accepted because the alternative
is not "no dead code", it is the same code on a branch that must be re-merged against a rewritten
`DataManager`, and because these two modules are the parts the 2.0 design keeps rather than
replaces.

**The specification work in M6-T6 through M6-T10 is spent.** Those tasks are detailed down to line
numbers and plan decisions, and respecifying means that detail is written again against a different
API. The facts they establish about today's code survive the rewrite; the interfaces do not.

## What would reverse this

- The 2.0 API design is abandoned or deferred past the WebGPU phases, at which point M6-T6 through
  M6-T10 are the plan again and should be implemented as written rather than re-derived.
- Splitting `Node.pinned` out of `a0862758` turns out to be a rewrite rather than a deletion, in
  which case that commit waits for the pinning mask instead of landing with the other four.

## What still exists

E1 of the same plan -- `Graph.accelerator`, `setAccelerator()`, the `SimulationLayoutEngine` bridge
and the accelerator registry -- is untouched by this and remains the plan of record, as does
`design/decisions/2026-09-19-graphty-element-owns-webgpu.md`, which governs how the element
activates the GPU package. graph-format 1.0.0 and its frozen invariants are unchanged. The
`snapshot-replaced` event survives as a design question for the respecified work: something must
tell a holder that its snapshot has been replaced, and 2.0 answers that with `data:changed`
carrying a `MutationReceipt` rather than with a snapshot pair.
