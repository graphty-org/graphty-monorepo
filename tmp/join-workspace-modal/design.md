# Join workspace: a near-full-screen modal for joins

Issue #9796. Behind the `source-steps` experiment (`?features=source-steps`); with it off the app
is unchanged. It replaces the inline Join card (`source-steps/JoinCard.tsx` on the Data place's
Sources tab, with its Fields and Preview tabs in the table dock) while the experiment is on.

## 1. What the reader gets

One modal, built like the selection workspace (the Style layer "Which nodes" editor): a header,
a column of join cards on the left, the graph preview top right, the data table under it. Every
card is one join. Nothing changes the graph until Done; Cancel throws it all away.

```
+--------------------------------------------------------------------------------------------+
| Join  o merged 283  o new 25  o unmatched 40  Drawing [Card colors|Styled] [Before|After B] Undo Mod+Z  Cancel Esc  Done |
+------------------------------+-------------------------------------------------------------+
| [1] hr -> Merge   283 m  25 n v ... x |                                                     |
|  Matches                      |                graph preview (graphty-element canvas)       |
|   [people v].[badge v] =      |   merged: ring in color 1, new: dashed in color 2,          |
|   [hr v].[badge_id v]         |   unmatched (no row reached): color 3; rest faint when a   |
|   283 / 308  Aa +4  __ +1  [suggested] |   card or a row is marked                          |
|   + Match                     |                                                             |
|  Result  (o) Merge  ( ) Connect                                                             |
|  Values differ  rating 12 [Keep 1 v]                                                        |
|  Many rows  [First|List|Count]+------------------------------------------------------------+
|  No match   [Add|Skip]   25   | [Matched|New|Unmatched|Values]  283     [Changed|All] Frame|
|  283 merged 25 new 40 untouched| key   from  effect  badge(held) badge(incoming) ...      |
| [2] door_entries -> ?   v ... x| (virtualized DataTable, view-only, rows tinted by effect) |
| + Join  Shift+J               |                                                             |
+------------------------------+-------------------------------------------------------------+
```

## 2. Layout

The modal is the selection workspace's frame: `.sel-ws-scrim`, `.sel-ws.sel-modal` (fixed, inset
28 px, 40 px header row), `.sel-ws-body` grid of cards column `minmax(360px, 34%)` and center,
`.sel-ws-center[data-strip]` with the preview over a 40% table. graphty-element's canvas is moved
over the preview cell exactly as SelectionEditor does (`.ws-canvas[data-sel-preview]` and the
`--sel-preview-*` variables, camera saved on open and put back on close), so the canvas is still
the one frame (owner rule 2026-10-24) and no second element is mounted.

- Desktop and Mac Safari (width 1024 px and up): as drawn above.
- iPad landscape (1024 to 1366 px): the same grid; the cards column keeps 360 px.
- iPad portrait (744 to 1023 px): modal inset 12 px, cards column 320 px, table 35% of the
  height.
- Under 720 px: one column, preview on top (45%), then a `SegmentedControl` Cards | Table that
  swaps the bottom pane. No horizontal page scroll at any width.
- Nothing needs drag-and-drop (the canvas mock's drag did not stick on iPad Safari). Cards reorder
  through each card's "..." menu Move up / Move down (and CardList's own keyboard reorder);
  fields are picked with Selects; every control has a tap target of the compact size.

## 3. What opens it

- **Join (J)**: the Sources header button, a staged source's Join button (`StagedSection`), and
  the inspector's Join on a node (`NodeJoinButton`). Each opens the modal with one new card,
  prefilled from where it was pressed: the staged source as the incoming side, or the node's type
  as the existing side. Shown once two or more sources exist, as today.
- **Edit** on a Steps row (`StepsList`): opens the modal with every committed join as a card and
  that card open.
- While the modal is open the staged sections show only their names (as they do for the inline
  card today) and the inline `JoinCard` is never drawn.

`openJoin` and `openEditStep` (`source-steps/join.ts`, `steps.ts`) set a new store member
`joinWorkspace` instead of `sourceCard: { kind: "join" }`; the dock is no longer opened.

## 4. The card (the owner's join model)

A card is one join: one or more matches between fields, then one result. compact-mantine
`CardList`, one item per card, `autoFold` so the card being worked on is the open one.

**Header**: number, title `<incoming source> -> Merge | Connect | ?`, result chips (`283 m`,
`25 n`, `+123 e`; red code word when the step cannot run, from the preview issues), a "..." menu
(Move up, Move down, Remove Del) and x. A card made from a committed step carries no extra mark;
its counts show the change against the committed ones (`SourceDraftPreviewStep.change`).

**Folded summary** (so the reader can always see what a card did, the recipe-card complaint):
the matches and the result in one line, `people.badge = hr.badge_id -> Merge; 283 merged, 25 new`.

**1. Matches.** Each match row is `[source v].[field v] = [source v].[field v]`, then its live
count `283 / 308` (`data.matchCounts`), then Ignore case and Ignore spaces switches with their
`+n` (the counts' `moreWith*`). A side the element guessed carries a `Badge` "suggested" until the
reader changes that row. `+ Match` adds a row. The right side's source list also offers:
- the same source and field as the left (a field matched with itself: links nodes sharing a
  value);
- **New nodes**: the left column's values become nodes (GO terms, tags).
Focusing a match row puts its value-overlap list in the table (section 6).

**2. Result.** A two-option `Radio.Group`, Merge and Connect, nothing selected until the reader
picks (as the current card's Act). The guess carries "suggested" but is never pre-selected.
Picking a result is what makes the card's step in the draft; until then the card is only picks.

**3. Options**, only the picked result's, one compact row each (label, then control):
- Merge: Values differ (one row per column, count and rule Select; today's `ValuesDiffer`), Many
  rows First | List | Count (today's Repeats), No match Add | Skip (today's Only 2 Keep | Drop).
- Connect: Rows become Edges | Nodes (the middle table's rows stay as nodes), Edges Per row | Per
  pair, Existing edge Add | Merge, No match Add | Skip, Edge type (`ComboInput`), Direction 1->2 |
  2->1.
- Field matched with itself: Draw Links | Value nodes, Hub cap and At least (`NumberInput`).
- New nodes: Type (`ComboInput`).

**4. Result counts**: today's `Count` terms (`dl.ss-counts`), from the step's buckets in
`draft.preview()`: merged, new, untouched, unmatched, fan-out, keys repeat, new by type. Each
count is a button that shows its rows in the table. Exclude selected (n) and the excluded list
stay as today's `Selection` block.

`+ Join` (Shift+J, shown on the button) under the list adds an empty card. Every key is drawn on
its button (Cancel Esc, Before/After B, Undo Mod+Z, Remove Del, + Join Shift+J). Done has no key, as
in the selection workspace: Enter belongs to the Selects, ComboInputs and NumberInputs inside the
cards, and must never commit every card from inside a field.

## 5. Preview and highlighting

One element draft for the whole modal (`session.data.draft()`), displayed After on open
(`draft.display(true)`) and drawn with `session.styles.showDraft(...)`. As in the selection workspace, each card has its own
color from the branch palette (shown on its header chip), passed as `steps: [{ step, color }]`; within
a card's color, merged is a ring, new is dashed and unmatched is dotted, so the graph shows which
join did what. The header's `Card colors | Styled` switch turns the card colors off. The header key
shows the three marks with their counts (`preview.marks`).

- **Selecting a card** (unfolding it, or focus in it) marks its step: its elements stay at full
  strength, everything else faint. With no card open, nothing is marked.
- **Selecting a table row** marks that row's element (`SourceDraftRow.element`); Frame (button in
  the table bar) frames the marked elements.
- **Before / After (B)**: the header's `SegmentedControl`, `draft.show(side)`.

## 6. The table

compact-mantine `DataTable`, view-only (select to mark or to Exclude, never to configure), in the
center's lower pane, its content following focus:
- a match row focused: that pair's value-overlap list (`data.matchValues`, paged, All | Matched |
  Only 1 | Only 2): today's `FieldsTab` list;
- a card with a result: its step's rows (`preview.rows({ step, bucket })`), a bucket
  `SegmentedControl` (the card's counts), Changed only | All, held and incoming side by side, rows
  tinted by effect: today's `PreviewTab` RowsView; a Values differ column opens CellsView.

## 7. Done, Cancel, Esc, undo

- **Done** (no key): `draft.commit()`, which writes every card as ONE undo step; then today's
  undo notice (`commitCard`'s `showUndoNotice`). A refusal keeps the modal open and says why.
- **Cancel (Esc)**: `draft.dispose()`, modal closes, nothing changed. Esc closes the innermost
  open thing first (a Select's list, a menu), as the selection workspace's `wsKeys` does.
- **Undo (Mod+Z)**: a header button showing its key, `draft.undo()`. Cards are read back from `draft.steps()` after every change (`SourceStepRow.act`),
  so undo never leaves a card out of step with the draft; only cards with no result yet are app
  state.
- Removing a card removes its steps (`draft.removeStep`). A committed card removed is taken back
  on Done; the card shows the preview's `W_STEP_REMOVED` effects (today's `DraftEffects`).
- Changing a match or the result of a card that has a step removes the step and makes the new act
  at the same place inside `draft.batch(...)`, so the change is ONE draft undo entry and Undo never
  leaves half an edit.
- A data write or a project opened while open: today's `DraftOpenDialog`.

## 8. Reused, by file

- Frame, canvas placement, Esc and Tab handling: `graphty/src/workspace/selection/SelectionEditor.tsx`
  (lines 1522-1810) and `selection.css` (`.sel-ws*`). Extract the canvas placement and the modal
  shell (scrim, header, body grid, Esc/Tab trap, "Drawing" until `waitForPainted`) into
  `selection/WorkspaceModal.tsx` used by both editors, instead of copying them (jscpd).
- Cards: `compact-mantine` `CardList`; `source-steps/JoinPreview.tsx` (`Count`, `ValuesDiffer`,
  `MergeChoices`, `Selection`, `GraphAfter`), `source-steps/JoinCard.tsx` (`Samples`, `Pick`,
  `Counts`, `Act`), `source-steps/join.ts` (`joinPair`, `joinCounts`, profiles, `spaceChoices`),
  `source-steps/preview.ts` (`makeAct`, `setChoice`, `setRule`, exclude/pick helpers, `undoInCard`),
  `source-steps/actions.ts` (`commitCard`, `cancelCard`), `source-steps/DraftEffects.tsx`.
- Table: `source-steps/FieldsTab.tsx` and `PreviewTab.tsx` (their bodies take a height already;
  they move from the dock into the modal's lower pane), `compact-mantine` `DataTable`.
- Words: `source-steps/words.ts` (`JOIN_WORDS`, `BUCKET_WORDS`, `COUNT_WORDS`, `RULE_WORDS`, ...).
- Keys and commands: `source-steps/keys.ts`, `source-steps/commands.ts`.
- Card state moves from `JoinCardState` (one card) to `joinWorkspace: { cards, open, table }` in
  `state/store.ts`; a card's picks keep today's shape (`JoinField1`, `JoinField2`, choices).

## 9. Element APIs used

`data.draft()`, `currentDraft()`, `staged()`, `sources()`, `spaces()`, `types()`, `steps()`,
`sourceTable(key).summary()/profile()`, `profile({ space })`, `matchCounts`, `matchValues`,
`nodeRef`; on the draft: `merge`, `connect`, `extract`, `setMapping`, `add`, `editStep`,
`removeStep`, `moveStep`, `exclude`, `include`, `pickAll`, `clearPicks`, `undo`, `steps`,
`preview()` (`steps`, `rows`, `elements`, `cells`, `issues`, `before/after`), `display`, `show`,
`commit`, `dispose`; `styles.showDraft`; `history.nextUndo`; element `waitForPainted`,
`getCameraState`, `setCameraState`, `zoomToFit`, `applyCameraView`.

## 10. Element API gaps (each additive; built in graphty-element first, then `npm run api:report`)

1. **Unmatched color and marking in the draft view.** `DraftView` gains
   `untouched?: string` (nodes of a space a step joins into that no row reached; DraftMark gains
   `"untouched"`), `rest?: "faint" | "plain"` (default plain, today's look), and
   `mark?: { step: number } | { refs: readonly SourceElementRef[] }` (marked elements full
   strength, the rest faint). Without it the app cannot color unmatched nodes or highlight a card
   or a row.
2. **Element refs to a scope.** `preview.scope(query: SourceDraftElementsQuery | { refs })`
   returns a `Scope` of the draft's drawn elements, for `applyCameraView("fitToGraph", { scope })`
   (Frame) and `selection.apply`. The app holds only `SourceElementRef`s and must not map them.
3. **Totals for the header key.** `SourceDraftPreview.marks: { merged, new, untouched }`: element
   counts per mark, so the app does not sum step buckets.
4. **Suggested matches.** `data.suggestMatches(source: SourceKey)` (also on the draft) returning
   `readonly { result: "merge" | "connect"; matches: readonly SourceMatchPair[]; confident: boolean }[]`,
   best first. The old `LoadDraft.suggestJoin()` serves only the pre-experiment load path.
5. **More than one match per join.** `SourceMergeOptions.and?: readonly SourceMatchPair[]` (a
   composite key), and `matchCounts`/`matchValues` accepting `readonly SourceMatchPair[]`.
6. **Rows become edges between two matched ends** in one act:
   `draft.connectRows({ source, from: SourceJoinInto & { field }, to: ..., perPair?: boolean,
   existing?: "add" | "merge", unmatched?: "add" | "skip", edgeType?, direction? })`. Today this
   needs `setMapping` plus `add`, which matches ends only on a space's key, not on a field.
7. **Connect options.** `SourceConnectOptions` gains `perPair?: boolean` (one edge per pair with
   a count), `existing?: "add" | "merge"` and `unmatched?: "skip" | "add"` (defaults keep today's
   behavior: per row, add, skip).
8. **Shared value links as a step.** `draft.link({ source, columns, as?: "edges" | "nodes",
   maxShared?, minShared?, edgeType? })`, the source-steps form of today's `JoinLink`, with its
   buckets (links, over cap, below minimum) in `preview()`.
9. **New nodes from a column of node rows.** `draft.extract` accepts a source with node rows
   (edges run from each row's node to its value node); today it takes edge sources only.
10. **Read every act back.** `SourceStepAct.act` gains `"connect-rows" | "link" | "extract"` with
    their options, and acts take `group?: string`, read back on `SourceStepRow.group`, so one card
    that made several steps is rebuilt from `draft.steps()` after undo and on reopen.

Every gap above is required scope for this feature, built in graphty-element first; there is no
fallback that ships the workspace without them. Also added: `draft.batch(fn)` (several acts, one undo
entry) and `styles.shownDraft` (the view drawn now, read back as `shownBranches` is), which the
tests read.

Every count, value list, column and profile in the modal comes from the open draft
(`draft.matchCounts`, `draft.matchValues`, `draft.sourceTable`, `draft.profile`), never
`session.data`, which reads only the committed sources.

## 11. Tests (real input, `.claude/rules/tests.md`)

`source-steps/__tests__/JoinWorkspace.real-element.test.tsx` with the real element: press J,
pick fields by clicking Selects, read the live count, pick Merge, see the step's counts, open a
second card with + Join, Connect, click a count and see the table rows, click a row and read
`styles` marks through the public API, press Esc and assert the graph unchanged, redo and press
Done and assert one undo step (`session.history`). Stories at 1280, 1024 and 820 px wide.
