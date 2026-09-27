# Undo meets sets: what the second merge must keep

Two branches change the same corner of graphty-element. This branch (`feat/element-undo`) makes
every change to project state one command through the session's dispatcher, and holds saved
scopes in a slice called `scopes`. The sets branch (`feat/element-sets`, pull request #540) turns
saved scopes into first-class sets under `session.sets`, written through its own `SetsStore`.

The detailed, line-by-line checklist lives on the sets branch, in `design/sets/undo-integration.md`:
the slice rename, the five `set.*` commands, derivation, events and the five decisions for the
owner. Whichever branch merges second follows it. This file lists what the undo side guarantees
and what its tests will refuse, so a merge that follows the sets checklist is known to be complete
when these are green.

## What the undo tests will refuse after the merge

- **A public member with no row.** `test/session/history/door-surface.test.ts` reads every public
  member of every root in `src/session/commands/doors.ts` with the TypeScript compiler. Every
  member `SetsApi` publishes (`create`, `createFrom`, `createPath`, `combine`, `rename`,
  `redefine`, `addMembers`, `removeMembers`, `remove`, and the readers) needs a row: `dispatches`
  with the `set.*` command it sends, or `exempt` with a reason. `SetsApi` and `ElementSet` become
  roots.
- **A door that writes without the dispatcher.** `test/session/history/doors.test.ts` calls every
  row that dispatches with a spy on the dispatcher. Strict state (on in every test) throws when
  project state changes outside a command, so a `SetsStore.put` left outside a command body fails
  the next dispatch, naming the `sets` slice.
- **An op with no undo story.** `test/session/history/vocabulary.test.ts` checks `COMMANDS` in
  `commands.ts` against the dispatcher's definitions, and fails until each undoable `set.*` op has
  a round-trip fixture in `test/session/history/fixtures.ts`.
- **A step undo does not take back exactly.** `test/session/history/round-trip.test.ts` runs every
  fixture forward, back and forward again and compares `stateDigest`; the random-sequence tests
  mix set commands with every other op from every start. The digest must cover the `sets` slice
  by each record's `revision`, as the sets checklist says, or these tests cannot see a set change.
- **A known gap without a tracking issue.** No `knownGap` or `partial` row may remain in
  `doors.ts`; a row of either kind names the GitHub issue that tracks it.

## What stays out of the slice

The issued-id register, the order high-water mark, tombstones, edge seeds and the resolution
cache are session state beside the slice and are never rewound by undo, redo, rollback or
eviction. The sets checklist, section 1, gives the reason for each.
