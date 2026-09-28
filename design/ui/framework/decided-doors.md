# Decided doors

**Job.** Keep the record of decisions that were once one-way doors and are no longer open: doors a
release has walked through, proposals moved to `element-needs.md` as additive, and decisions the
test in `one-way-doors.md` found cheap to undo, each with its choice and why undoing it is cheap.
**Not here:** any decision the owner must still make (`one-way-doors.md`). **Owner:** design
director. **Ceiling:** the README's table. **Validated by:** the test in `one-way-doors.md`,
re-run on every row when a document proposes to reopen it.

A row cited from another document is cited by its title in the Decision column ("The default
scale of node size"), never by a number, because a decided row has no open number.

## Walked through

Shipped in graphty-element 2.6.0; the current release is in the status line of
`implementation-mapping.md`. Shipped with the recommended spelling unless stated:

| Door | What shipped | Difference from the recommendation |
|---|---|---|
| 7, result ids and run ids | the id derived from the algorithm, exact or sampled, and the frozen scope; parameters and seed on the run; `ResultId` an alias of `RunId` (`src/session/runs/runId.ts`) | `accumulates` is not published: an additive need. `ResultId` is a plain alias of `RunId`, so the type checker cannot catch one passed for the other; distinct types is a breaking change, for the major version that ships the file (door 15) |
| 8, the item address | `ResultItem { result, run?, key }`, `ItemKey { field, value }` | none |
| 11, one set definition | `SetDefinition` (fixed, rule, path), `EdgeReading`, `Scope` with `{ define }`, `RuleTree` with the `member`, `item` and `threshold` leaves, the `{ match: "member" }` selector, `SetCombine`, `session.sets` and `set:changed`; the old names deprecated | a rule stores no scope field (it reads the full graph wherever stored); the filter pipeline half moved to door 25 |
| 18, deleted sets and Restore | references resolve through the kept record; `sets.restore` published | none |

## Decided by the owner, 2026-09-28

The doors of build slices 1 and 2. Each is still expensive to undo once a release publishes it;
the owner has chosen, so the documents are written on the choice and no slice waits on it. Two
halves stay open in `one-way-doors.md`: the overview option's published name (slice 7) and the
selection of one object as a whole (slice 5).

| Decision | Choice | Difference from the recommendation |
|---|---|---|
| The overview recipe's three levels | graphty-element ships General overview and runs it at load; a consumer configures the element's default, which the graphty app sets from a reader preference; a project names its own and embeds it (`files-and-recipes.md` 2) (formerly door 33, its load half) | none |
| How the element learns theme and motion | `colorScheme: "light" \| "dark" \| "auto"` (default auto) and `reducedMotion: "auto" \| "reduce" \| "no-preference"`, CSS's own spellings; on auto the element reads the host's computed `color-scheme` and re-reads it as `element-contract.md` 15 states; an explicit `GraphStyle.background` wins; the element roles stay internal (formerly door 48) | none |
| Host names for reader text | translation keys: each reader-text event and each `GraphtyError` publishes a message key, `graphty.<area>.<message>`, with its named parameters (the template's slots), so a host supplies its own wording per key; the recovery class, the chosen verb and the cause (its own key and parameters) are published values beside it; the English `text` ships as an unpublished default. The scheme is `message-catalog.md`, "Published keys" (formerly door 87) | the recommendation published kinds and slots per event with no key, and held keys back until a translation existed; the owner chose keys now, so a host rewords one message without switching on event kinds |
| The canvas marks | one mark schema for nodes and edges, bands named dark and light by tone, each with a dash and never a width, ordered by the element against the canvas's luminance; the old `GraphStyle.selection` fields read by the tolerant reader and mapped; highlights feed the neutral highlight mark (`canvas-drawing.md` 6) (formerly door 47) | none |
| The default keymap and tools | the canvas tools, the canvas walk and its Esc rungs in graphty-element, with a default keymap, Mod for Cmd or Ctrl, and a setting that turns single-key shortcuts off; published first only as the read-only list of default chords, rebinding added when a consumer asks (`interaction-pattern-entries.md` 9.3) (formerly door 65) | none |
| Selection over the cap | the selection holds every id; above a configurable cap (`config.selectionCap`) the element draws one selection-banded hull with a count badge instead of a mark per element (`canvas-drawing.md` 6) (formerly door 39, its element half) | none |
| The focused node and its event | a focused node on the canvas, distinct from the selection, with a change event, in graphty-element, neighbor order stable and not spatial; the plain arrow keys stay on the camera, and the walk moves on the neighbor-walk keys, Shift with an arrow in the default keymap (`interaction-pattern-entries.md` 9.2) (formerly door 40) | the recommendation moved the plain arrows from the camera to the walk; the owner kept orbiting with the arrows, so the walk takes other keys and nothing an existing reader knows changes |
| The graph getter and Graph export | first the session's public shape is trimmed, so its internal plumbing (`store`, `ownedStore`, `readData`, `controller`, `planning`, `watchers`) is hidden and what is public is the nouns (data, runs, results, sets, selection, scope, visibility, styles) plus `status`, `config` and `capabilities`, beside the session's methods; then the `graph` getter and the `Graph` export are deprecated when the typed handle ships (slice 2), and removed in the next major (`element-needs.md`, "The session's public shape trimmed to its nouns") (formerly door 90) | the trim is added first, so the deprecation points callers at a session that no longer exposes the same internals under other names |

## Moved out of the list

The proposals moved to `element-needs.md` as additive, by number, are listed in
`research/archive/one-way-doors-long-form.md`, "Moved out of the list".

## Decided, and not doors

| Decision | Choice | Why undoing it is cheap |
|---|---|---|
| Freshness | five values, derived on read, never stored | nothing stored |
| Default scope of a run | the filtered graph, frozen at start | every run records its scope |
| What set operations make on screen | a rule set naming its operands; Create set freezes it | `combine` keeps its fixed result |
| Weight reductions | a declared reduction per weight attribute | additive |
| Note targets | primary objects, items, the graph and definitions (rule sets, results, filter steps, style layers) | narrowing later only stops new notes; widening was additive |
| Comparison | transient; only a saved comparison is in the file | nothing transient is saved |
| Where the autosave keeps the project | a storage adapter, browser storage by default | the file's shape does not depend on it |
| Undo history list | kept until graphty-element restores a canceled run on Redo; then removed, and Edit > Undo names the next step (`figma-crosswalk.md` 4.3) | an app surface |
| The opening view mode on a flat screen | 2D, with 3D one click away, for a graph with no saved dimension; a headset draws in 3D without writing the saved dimension (formerly door 16; `canvas-drawing.md` 14) | a look-only default; a release note changes it back |
| Named text styles | inline label records only; a named text style is added when a workflow or the print-labels test shows one look reused across text channels (`options-and-encodings.md` 3) (formerly door 67) | adding a named style later is additive: inline records stay accepted |
| The default palettes on a dark canvas | the group palette's black replaced by `#6929C4` and the ramp trimmed to five steps, shipped under new ids made the defaults, so a file naming an old id keeps its colors (formerly door 45; measurements `research/color-checks.md` 8.2; `canvas-drawing.md` 4) | a look-only default; the old ids remain |
| The default scale of node size | square root for node size, written explicitly into newly saved encodings so old files keep linear (formerly door 46; `options-and-encodings.md` 5) | a look-only default that old files do not see |
| The default grays | `#808080` for unstyled nodes and edges on both canvases, 16.9 (OKLab x100) from the Other gray `#505050` (`canvas-drawing.md` 1) | a look-only default |
| Data-bound fills in 3D | drawn flat by default, constant fills and the grays stay lit; an explicit `node.flat: false` opts into lit shading, which the legend names (was door 60; `canvas-drawing.md` 14) | a look-only default that stores nothing |

## Sources

- `one-way-doors.md`, which held these sections until it split its open doors from its record
- `research/archive/one-way-doors-long-form.md`
