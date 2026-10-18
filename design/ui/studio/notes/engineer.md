# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier3` (branch `design/studio-tier3`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier3/criteria.md`.

Summarized 2026-10-17 from 44 KB. Every dated entry of today's dry-run fixes (table, Analyze run,
filter steps, style panel polish, page and selection, undo, inspector targets, condition lists,
yes and no, find box, names and words, focus, number card, spoken messages, color box, drawing and
camera) is in full in git: `git show 54c009f84:design/ui/studio/notes/engineer.md`. Older entries
(2026-10-06 to 10-17): `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

0. (2026-10-18, labels) The label item (text size beside 'Size in', Escape in a settings field
   keeps focus, Escape on Reset closes, the source list opens on the value in force, Fixed text
   box wide enough, Tab from the list's search closes it, adding a label narrows no field) was
   handed out again after the restart. All of it is in 611619ee7, which the frozen study build
   ed4351b258 holds; the pilot screenshots came from 58556989e, before it. No code change. Proof:
   `style/__tests__/Labels.real-element.test.tsx` (15 pass, one per acceptance item) and a walk
   on a fresh build, `design/ui/studio/tmp/r1-dry1-labels/walk3` (+ `walk4`). Before building a
   handed-out fix, check `git merge-base --is-ancestor <fix> <pilot commit>` first.
1. (2026-10-18, undo) Undo is the app's on every key target: `ElementHost` sets the element's
   documented `historyKeys={false}`, so Control+Z on the focused drawing runs the app's
   `history.undo` command and its notice ("Undid adding Layer 1."), not the element's silent
   undo. A new-graph open still clears history (`Workspace.tsx`, `project/actions.ts`,
   `DataPage.tsx`, from 789677a58). App step labels are lowercase acts that read after
   "Undo"/"Undid" (`adding`, `duplicating`, `ungrouping`, `changing`; `StylePanel.tsx`'s
   "Style"/"Stop styling" still capitalized). Test: `frame/__tests__/UndoHistory.real-element`
   (4, incl. Control+Z on the canvas). Walks `design/ui/studio/tmp/r1-dry1-undo/w2`, `w3`.
2. (2026-10-18, inspector and table) Table: key columns are row headers (compact-mantine
   `DataTableColumn.rowHeader`, set in `RecordTable`/`GroupTable`); `DOCK_DEFAULT` in
   `state/store.ts` (65 + 32 x 12 = ten whole rows); `CHROME_HEIGHT` 65 in `TableDock` counts the
   dock's 1 px rule. Info bubble: `Popout.Panel contained` keeps 8 px inside the anchor and narrows
   (`fitWidth`). Degree row: `DataRow.description` + Tooltip; the `selection.neighborhood` command
   speaks "X and N connections". Stat values wrap at @ / _ and non-decimal dots (`<wbr>`, DataRow).
   Selection Summary: element `SelectionAttributeStatistics.count` -> "6 of 15 have a value".
   Tree: `Tree revealSelected` (opens folders once per selection change); `selectedIds` marks a
   group-row's own layer (`groupRowOf` in `graph-place/rows.ts`). Caret hit 24 x 32. Tests:
   `inspector/__tests__/InspectorAndTable.real-element`, compact-mantine Tree/DataRow/DataTable/
   `popout/InfoCircleContained`, element `selection-on-session`. Walks
   `design/ui/studio/tmp/r1-dry2-inspector-and-table/w2`-`w7`.
3. (2026-10-18, key) The key never covers the drawing: `canvas/viewInsets.ts` `useOverlayInset`
   reports each overlay's own sides (key card: left or top, `cardInsets` in LegendCard; canvas
   toolbar: bottom, from Frame.tsx's `.ws-toolbar-dock`, `toolbarInsets`) into `store.viewInsets`,
   and when the overlay's box now covers a node (`nodesInRect`) and the reader has not placed the
   camera (`cameraPlaced`, `autoFrame`), sets `element.viewInsets` and calls `zoomToFit()`. A
   canvas with no box (a page over it) reports nothing. Key wording from element facts (additive):
   `LegendBlock.scope { count, of }` -> "Picked: 3 of 24 nodes" (`scopeLine`, layer name left out
   when the title or a run names it), `LegendSwatch.paintedOverBy` -> "covered by Agencies"
   (`coveredWords`); the app's run-group merge sums the groups' scopes. Chips are `role="img"` with
   `colorName`. Legend reads pressed only while `legendShown && keyHasEntries` (store field set by
   CanvasOverlays); pressing it with no key turns the switch on. Element: `valueReach` in
   `styles/explain.ts`, sources `selects`/`reach` in `StylesApi.ts`. Tests: element
   `test/session/styles/legend-reach.test.ts`, app `CanvasOverlays.test.tsx` (frames / leaves
   alone / scope / covered and chip colors), `legendWords.test.ts` (`scopeLine`),
   `WorkspaceToolbar.test.tsx`. Walks `design/ui/studio/tmp/r1-dry2-key/w1`, `w2`.
   0000a. (2026-10-18, find box) Plain form everywhere: `elementRule` reads a typed rule with bare
   numbers through the element's own backtick rewrite (`checkRule` throws it), `plainRule` strips
   backticks around numbers for display only; hints and corrections show no backticks and no "=".
   Example rule: a node number column, else `graphty.degree > <mid>` (whole numbers for whole
   ranges, 2 significant figures). The rule offer says "Select the 15 nodes (email: has a value)"
   (`selection.count` + `selectorName`). Shift+click on a hit or value row adds and keeps the list.
   Escape in the empty box clears a selection only while it is the one the box made (`selectionKey`
   ref), then focuses the element. A hit pick on the Style tab: a one-frame fallback
   `takeValuesFocus() -> focusInspectorTitle()`. Miss and refusal lines say "Still selected: N
   nodes" before the example. Element (additive): `graphty.degree`/`inDegree`/`outDegree` rule
   paths (`STRUCTURE_PATHS`, `styles/sources.ts`), `checkRule` falls back to them,
   `FindOptions.booleanWords`. Tests: `graph-place/__tests__/FindBoxPlain.real-element`, element
   `test/session/rule-structure.test.ts`. Walks `design/ui/studio/tmp/r1-dry2-find-box/w1`, `w2`.
4. (2026-10-18, names and words) A control is named for what it chooses beside its column
   ("name: how to match", "name: text to match"); a section is a level-3 heading named once
   (`ControlSection headingLevel`, no wrapper group); the Layer token is spoken as
   `LAYER_SPOKEN` ("each layer's own value", `style/words.ts`); the folded Which row's name holds
   each chip's count (chips report it up, `onCount`); a list option's fact or disabled reason is
   part of its name, and only the value in force is `aria-selected` (compact-mantine
   `QuickActions`); a badge ("Start here") and "recent" go in the description / name of the
   Analyze entry; a free-text column reads "Text" from the element's readable kind (new refusal
   param `valueKind`, `data.readableValues().kind`); a field showing what is in force reads
   "default X" (`LabelsProvider` in Label settings, `ValueField` choice); "More values than
   colors" shows only when groups > the palette's capacity; a groups grid row is read once
   (`DataTable rowLabel`). Tests: `style/__tests__/NamesAndWords.real-element.test.tsx`, the
   words unit tests, compact-mantine `quick-actions.test.tsx`. Walks:
   `design/ui/studio/tmp/r1-dry2-names-and-words/w1`-`w3`.
5. (2026-10-18, focus and keys) The focus guard (`installFocusGuard`) is installed by
   `Workspace`, so Tab rounds the start screen too; a focused tab that loses `aria-selected`, or
   a tab focus is handed back to, gives way to its list's selected tab (`selectedTabFor`).
   `focusCurrentPlace` focuses the left list's Tab row, the rail only until that row is drawn.
   compact-mantine `Toolbar` `startAt` ("pressed" default, "first"); the canvas toolbar passes
   "first". `CommandButton` `skipWhileDisabled` (Undo, Redo). Inspector: an emptied selection
   keeps the open row; `canvas:empty-click` `secondary` (element, additive) keeps it on a
   right-click. Values rows that select a node call `focusValuesNext()`. Select... mode takes
   Escape on `document`. Cards: Escape on a non-text target closes them in the capture phase;
   `close` falls back to the drawn `.ws-which[data-side] button`. Bulk binding popover: Escape
   (heard on `document` capture) returns to the pill, else the receipt. Tests:
   `frame/__tests__/FocusAndTabOrder` (5 new), `style/__tests__/CardFocus`,
   `start/__tests__/FocusAfterClose` (real-element), compact-mantine `toolbar.test.tsx`, element
   `real-input.test.ts`. Walks `tmp/r1-dry2-focus-and-keys/w1`-`w5`.
6. (2026-10-18, lists) Vary by (`ValuePicker`) passes compact-mantine `QuickActions`
   `activeOnOpen="none"` (new, additive): nothing active until typing or an arrow; typing takes
   the first enabled match. `prefixFirst(items, nameOf, query)` in `style/words.ts` (stable: names
   that start with the text first) is used by Vary by, Add a condition (rows and groups), the
   filter step's Is box (`ValueBox` in `rules/RuleRows.tsx`) and `groupAlgorithms` (name starts,
   then name/alias, then line). Analyze: active is the first entry that can run; the filter also
   matches the heading; Degree's line says "the most connected rank highest"; the list keeps its
   opening height as `min-height` (the popover opens upward, so a shorter list moved the box).
   `VALUE_GLYPHS` (glyphs.ts) by readable kind for Vary by and Add a condition rows. A
   `holdsNodeIds` column is one "Node id" row under Structure, last, in Vary by too. Add a
   condition answers a value the other kind carries: "<name> is an edge attribute; it is on the
   Edge tab". The Is box lists every value (`ConditionRow` `valuesOf`, Filters passes
   `data.valueCounts`). Test `style/__tests__/Lists.real-element.test.tsx`. Walks
   `design/ui/studio/tmp/r1-dry2-lists/w1`-`w3`.
7. (2026-10-18, number card) graphty `NumberCard`/`NumberBox` in `style/WhichPicker.tsx`, plus
   compact-mantine `ComboInput`. A box writes only on commit (Enter, leaving it): typing raises
   no message and moves no count; the refusal (`refused` state) changes only on a commit, says
   what the box takes ("Type a number, like 27": the column range's midpoint to 2 significant
   digits; a Highest count's example is min(10, total)) and "The count and drawing still use 20
   to 52". Focus in (any route) selects the value; Escape with typing reverts and keeps focus,
   without typing it goes on to close the cards. Enter commits inside `flushSync`, so
   `isDoneKey` sees `aria-invalid` and a refused Enter keeps the card. A refusal on a blur made
   by a press is drawn after the pointerup (window capture listeners), else Done slid down
   under the pointer and the click missed. Closing with refused text sets a notice ("hours: ...
   went back to 2 to 52"). Thumbs "<name> range start/end". `ComboInput` numeric with no options
   is a spin button (value, min, max), no combobox ARIA. Tests: `NumberCard.real-element.test.tsx`
   (8), compact-mantine `ComboInput.test.tsx`; queries for number fields moved to `spinbutton`.
   Walks `design/ui/studio/tmp/r1-dry2-number-card/w1`-`w3` (w3 --sr: "spinbutton Node size").
8. (2026-10-18, spoken messages) graphty only. A one-layer write in `Field` (`PropertyRow.tsx`)
   is said after it lands, with what the written layer paints: `reachWords` -> "Node color now
   orange, on 24 nodes", "Node size varies by role, on 24 nodes" (`styles.counts(id).painted`,
   else `matched`); a list's value (enum, boolean) is not said, the list reads it; several layers
   keep their receipt. `useAnnounceChange(words, quietFirst = true)`: null never resets what was
   said, so a recount through null to the same number is said once (the folder's "15 of 24 nodes"
   twice: `useLeafCount` keys on `history.version`, so each layer's write recounted); pass
   `quietFirst=false` where null at the start means the thing was not there yet (LabelSection, a
   label added while open: "24 labels, 4 hidden"). AddCondition says "Nothing found" once per
   empty list. `Workspace.tsx` empties the status line on the next keydown or pointerdown
   (capture), so browse mode never reads an old message. Tests: `state/__tests__/
   useAnnounceChange.test.tsx`, `style/__tests__/SpokenCommits.real-element.test.tsx`. Walks:
   `design/ui/studio/tmp/r1-dry2-spoken-messages/w2`, `w3`, `w5` (--sr).

9. (2026-10-18, layer panel) App only (`graphty/src/workspace/style/`). A selection's first edit
   says "Made layer <name> for N nodes" (`SelectionRow` effect, a notice). Made by a section's
   "+" with a starting value (`startingAdds` in `row.ts`, set in `Section.add`), Escape in the
   layer's panel before any change undoes that step and puts `inspected` back (`cancelMade`,
   `made` WeakMap in `StylePanel.tsx`); a value the reader picked is never taken back. A layer
   keeps its default name in `userData.graphtyDefaultName` (`DEFAULT_NAME_KEY`, `cards.ts`);
   `patchesOf` renames while the name equals it or the old cards' words. Removing the last
   condition: notice with Undo (re-adds the card), Done always drawn. Cards unmounting with an
   unfinished card say "Dropped the <field> condition". A "+" with one option adds it at once
   (`AddButton`). Base row is one plain line. Empty Which row opens the Add list on click. Chip
   tooltip. A bare column expression reads as a "Has a value" card (yes-no: Yes) via
   `selectorRule("<x> != null", {comparisons})`. No count on unfinished cards. Kind switch reason
   in a tooltip and `aria-description`. Label column falls back to 40 px, not 80. Other-kind line
   last on a tab; a part writing nothing beside one that writes reads "not styled"
   (`paintedTarget`). "New layer for <group>" copies only the varied channels. New layer opens on
   Node. Test `style/__tests__/LayerPanel.real-element.test.tsx`.
10. (2026-10-18, shared controls) compact-mantine only, plus one app line. `cm-pointer-still` no
    longer sets `pointer-events: none` (that swallowed a press with no move, every touch tap, and
    failed Playwright's hit check): it only holds back the hover fill (`inputs.css.ts`, and the
    `:has(:hover)` unfill rules skip a still list). A `layout="grid"` StyleSelect opens with
    `belowComboboxProps()` (below its field, flips above), lists still open over the trigger.
    Tooltips: theme `middlewares.flip` is `tooltipFlip` (`overlays/tooltipPlacement.ts`), a derived
    flip whose `boundary` makes a side that covers a control or an error line overflow by a penalty
    of 1-2 px (less than running off the window), fallbacks opposite then across. A press keeps a
    tooltip closed when its trigger is in the press's `composedPath()` (a caret inside a treeitem),
    except a trigger the press turned off (its reason shows: "Nothing to undo"). Paint field is a
    grid (`minmax(0, max-content) auto`), so Reset never wraps under it. Disabled select: no caret,
    disabled edge. Popouts keep 6 px off the window bottom. App: the read-the-file page's fixed
    column roles get "Column roles / Set by the file". Tests: StyleSelect, overlays (figma),
    CompactColorInput, PopoutFitAndFocus browser tests; `touchTap` browser command. Walks:
    `design/ui/studio/tmp/r1-dry2-shared-controls/w1`-`w4`.
11. (2026-10-17) Color box, drawing (rendering groups, wheel zoom), the key's titles and truthful
    counts: in full in `git show 7ce810382:design/ui/studio/notes/engineer.md`, items 1-4; the
    other fixes of that day one line each in `git show 85d4a4059:...`, item 5.
12. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
    reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
    default label size; Kelly's palette for 10 to 19 groups.
13. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
    the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
    `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
    `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
    (`workspace` for studio notes, not `design`).
14. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
    it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
15. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
    graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
    unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
    refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
    is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
16. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
17. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
    `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
    round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
    built: number card histogram for a run field, "lowest N", dashed chips at rest. One
    BoundValue for one layer and for several (owner 2026-10-16).
18. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
19. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

- (2026-10-18) **The app turns off the element's own undo keys.** The element handles Control+Z
  on its focused canvas by default and prevents the key's default, so the app's key hook skipped
  it: Undo ran with no notice (walk w2, 15-18). The element documents `history-keys="false"` for a
  host that names its steps, so the app sets it; no element change. Undo stays one command in the
  app, with one set of words, wherever focus is.
- (2026-10-18) **A step label is an act, lowercase** ("adding Layer 1"), because it is read after
  "Undo " in the tooltip and "Undid " in the notice; "Undid Add Layer 1." read as a title.
- (2026-10-18) **The first dry run's condition-list fixes stay as built in ed738e684, minus
  two items the second dry run reversed.** First match active, combobox search, Tab and Escape
  closing the list, the list as wide as the cards' column, one Node id row and Enter finishing a
  text or number card all hold on the current build (walk
  `design/ui/studio/tmp/r1-dry1-condition-lists/walk2`, 09-13). Kept as the second dry run decided
  (`tier3/dry-run-r1-2.md`, T41B row 26 and the Layer panel group): an unfinished card shows NO
  count (12 then 9 misled), and Done is drawn on a layer with no card (removing the last card must
  not strand the reader; an empty Which row now opens straight onto the list). The first dry run's
  "count while unfinished" and "no Done before a card" are superseded, not open.
- (2026-10-18) **A contained bubble narrows to its panel, inset 8 px.** Clamping alone left a
  240 bubble in a 240 panel touching the window edge (T37A detours/07). Narrowing is inside the
  `contained` contract, so no new option. Evidence: `w1/02.png` (1208..1432).
- (2026-10-18) **A tree reveals a selection once per change, never again.** Reveal on every render
  would reopen a folder the reader just closed; keyed on the selection's ids instead. Group rows
  mark their own layer in the tree rather than changing what a membership opens.
- (2026-10-18) **Selection counts come from the element.** "N of M have a value" needed a count
  the app could only get by walking records; added `count` to the element's statistics.
- (2026-10-18) **The default dock shows ten whole rows (449 px), not 416.** Rows are 32 px plus a
  1 px rule, so 64 + 32 x 11 showed nine and a part (`w1/04.png`); `w2/02.png` shows ten.
- (2026-10-18) **An overlay that covers a node frames the graph again; nothing else moves it.**
  This reverses the 10-17 "the drawing never moves for the card": five pilots (T46B, T47B, T48A,
  T51A, T51B) lost nodes under the key, and the 10-17 note itself said to fix it if they did. The
  camera moves only when the new box covers a node and the reader has not placed the camera, so a
  card that grows over empty canvas, a hidden key, or a zoom the reader made stay put. The
  toolbar's own margin is reserved too, so the table opening (a shorter canvas) cannot leave
  nodes under the toolbar.
- (2026-10-18) **A key's reach is the element's fact, not the app's count.** Whether a layer reaches
  some nodes and whether a value's every element is painted over need a walk of the graph; the
  element publishes them (`scope`, `paintedOverBy`) and the app only words them.
- (2026-10-18) **Legend is pressed only while a key is drawn**, so a press while none is drawn turns
  the switch on, as the unpressed button promises.
- (2026-10-18) **The find box reads the plain form, so it never teaches backticks.** It already
  offered `donations >= 10000` typed without "="; the same input with "=" was refused with a
  correction. Both now run through the element's rewrite and every rule shown is plain. Display
  stripping touches numbers only: a backticked text or `true` means a column name when bare.
- (2026-10-18) **Structure is the fallback candidate, not a second one.** A column or run field
  named degree wins; two candidates leave `checkRule` with no suggestion (its contract).
- (2026-10-18) **Yes/No words come from the consumer** (`FindOptions.booleanWords`): the element
  ships no English. The app passes `yesNoWord`, its table's words.
- (2026-10-18) **Escape takes back only the box's own selection.** One made on the canvas or in the
  inspector is not the box's to clear; membership is compared, since an add resets `origin`.
- (2026-10-18) **An option's fact and its disabled reason are part of its name.** A screen reader
  often skips a description, so "degree" and "community" read alike with neither range nor reason
  (T43B, T48B). Only a description drawn below a row that can run stays a description.
- (2026-10-18) **"Selected" is the value in force, never the row the arrows are on.** The active
  row is `aria-activedescendant`; reading every highlighted, disabled or folded row "selected"
  said a choice had been made (T43B).
- (2026-10-18) **A column of free text is text, read from the element.** The app had only
  `measurement` ("categorical"), so a name column "held groups". The refusal now carries the
  readable kind (`valueKind`), additively; the Data place and inspector read
  `data.readableValues()`.
- (2026-10-18) **A choice that changes nothing is not offered.** "More layers than colors" beside
  19 colors for 10 groups was a false message even with a run's "Extend the palette" set; shown
  only when groups exceed the palette in force (or the count or capacity is unknown).
- (2026-10-18) **A grid row is named once; its controls keep standalone names.** Dropping the
  source from each control's name broke "Hide Layer X" and helped nothing when the row is read;
  a row label (`DataTable rowLabel`) reads "Group 1, yellow, 16 nodes" and each control still
  says its group when focused alone.
- (2026-10-18) **"Not styled" is the kind's tab's to say.** The other-kind line drops its words
  then and keeps only its button ("Style edges", or "Edit edges" spelled out).
- (2026-10-18) **Nothing active before a choice is an option, not a new default.** `QuickActions`
  is a published component whose palette caller wants Figma's first-row highlight; changing the
  default would change what Enter does there. The app's lists that bind on Enter opt in.
- (2026-10-18) **A filter matches the words on screen, and Degree's line now carries them.** The
  analysis filter already read each entry's line; "connected" and "most" missed Degree only
  because its line did not say them. Readers' words for it go in its visible line, not in hidden
  aliases, so what matches is what the reader can see. The heading joined the matched words.
- (2026-10-18) **Edge-tab hint says "edge", not the task's "tie".** The app's words are node and
  edge; a domain's word would be a special case.
- (2026-10-18) **A number box writes on commit, not per keystroke.** Per-keystroke writes made
  "2" then "20" a stream of counts and notices (T42A, T42B: six notices for "$10,000") and made
  Escape meaningless (it had already written). The style fields (`useNumberField`) already commit
  on Enter or blur; the card now matches them and the color box.
- (2026-10-18) **A list-less numeric ComboInput is a spin button.** It offers nothing to pick, so
  "combobox" told a screen reader user there was a list (T43A keyboard/55). Fixed in compact-
  mantine so every number field the app draws through it gets it.
- (2026-10-18) **After a graph opens, focus is in the layer list.** The rail's "Graph" was one Tab
  stop from nothing (pilots T38A, T43A, T44B). The cost is the tree's type-to-find on printable
  keys; the list is where the next step is. The list is drawn after the element comes up, so the
  rail holds focus until its first row appears (a MutationObserver, dropped when the rail blurs).
- (2026-10-18) **One Escape, one act.** Clearing the selection used to close the open row too
  (the inspector followed `selection:changed`), so Escape in a layer or an attribute both cleared
  and left (T43A, T43B). An emptied selection now leaves the open row; a new selection still
  replaces it. A right-click on empty canvas is a menu request (element `secondary`), never a
  "let go". A mode (Select...) takes Escape before the window's command keys.
- (2026-10-18) **Escape on a button in the cards closes them**, caught in the capture phase: a
  focused button's Mantine tooltip (floating-ui `useDismiss`) stops the bubbling Escape. Text
  boxes and open lists keep their own Escape.
- (2026-10-18) **Escape from a popover returns to its opener; its Done/close goes where the next
  step is** (the receipt). The bulk binding popover hears the Escape on `document` capture before
  the pop-out manager closes it.
- (2026-10-18) **A handed-back tab is the list's selected tab** (`selectedTabFor` in the guard's
  rescue): the same-named tab of a new view may not be the selected one.
- (2026-10-18) **Disabled Undo and Redo leave the Tab order** (`skipWhileDisabled`), unlike other
  disabled commands, which stay reachable to say why: nobody tabs to Undo to learn it is off.

- (2026-10-18) **A committed style change on one layer is said, with its reach.** The 10-17 call
  "the field's own new value is what a screen reader reads" did not hold: a hex box rewritten by
  Enter is read as the same box, and nothing told the reader the drawing changed or on how many
  (T39A, T41A, T46B, T49A, while undo and redo were spoken). A list's own value is still left to
  the list, or the change is said twice.
- (2026-10-18) **The status line empties on the reader's next key or press, not on a timer.** A
  screen reader takes a polite message when it is written; the text left behind was what browse
  mode found later (T40B). Event-based, so nothing depends on how fast anyone reads.

- (2026-10-18) **Escape takes back only a layer made by a starting value.** A "+" on a node's tab
  writes a value the reader never chose, so Escape there means "not this" (T43A left a v12
  layer). A layer made by picking a label source or typing a color is the reader's choice;
  Escape after it must not undo it (an existing test closes a picker with Escape after a pick).
- (2026-10-18) **A default name is recorded, not guessed.** `userData.graphtyDefaultName` marks a
  selection's name as the app's; a reader's rename differs from it, so the name stops following.
  Matching the old cards' words alone missed a layer named after a node.
- (2026-10-18) **"Not styled" follows the header's `paintedTarget`.** The truthful-counts rule
  keeps a blank new layer reading as what it is on; once one part writes, an empty part reads
  "not styled", the same as a layer that has no such part.
- (2026-10-18) **A dropped card is said on unmount, in one place.** Done, Enter, Escape and a click
  that changes the inspector all unmount the cards; one cleanup covers them all.
- (2026-10-18) **A still pointer only holds back the fill, never the press.** The guard was
  `pointer-events: none` until a document pointermove; a press arriving before React re-rendered,
  a press with no move and every touch tap landed on the list body (T47A, T47B). CSS cannot tell
  hover from press, so the fill is cancelled instead.
- (2026-10-18) **A grid opens below its field, a list over it.** A grid's chosen cell cannot sit
  on the field, so it covered the field and the window's header (T47A pointer/12). Lists keep
  Figma's over-trigger list (spec 6.5); the selected row is on the field, so nothing is hidden.
- (2026-10-18) **A tooltip goes to the side that covers no control.** Every crowded-panel case
  (T41A, T43B, T44B, T47B) was the bubble's default side landing on the next control. Decided in
  the theme so every Tooltip gets it; covering beats running off-screen (first try put Undo's
  bubble above the window). When every side covers something (top bar Undo), least area wins.
- (2026-10-18) **A press on a trigger inside a row keeps its tooltip closed.** `pressed` was the
  nearest `[role]` (the whole tree row), so the caret's re-labelled tooltip opened (T48A). A trigger
  the press disabled is exempt: after Undo, hovering it should say why it is off (T49B).
- (2026-10-18) **A select that cannot change has no caret and says why on the page.** Its look was
  the enabled "not set" look; the title tooltip never shows in screenshots or to a quick glance.

- (2026-10-17) That day's decisions (labels over rings, wheel zoom by a factor, key titles by
  column, truthful counts, label size beside its unit, lists open on the value in force, a tooltip
  never uses up an Escape, column sizing, a preview is the change, a right-click keeps the
  selection, one focus guard, a refusal under the row, one color word, no camera moves for
  overlays, and more) are in full in `git show 7ce810382:design/ui/studio/notes/engineer.md`.
- (2026-10-14, round 6) Element additions, all additive: empty rows for starting rows, run
  `restoreLayer`, binding `otherwise`, value labels, preview palette and defaulted parts,
  proposeEncoding range fits, project palettes, `ties` on top N, descriptor `modifies`/`step`,
  in/out degree histograms.
- (2026-10-12) **One list of readable values** (`data.readableValues()`); one `columnFits` for
  picker and encoder. Two checks of one question produce this project's worst defects.
- (2026-10-12) **A layer id a document carries is remapped on apply** (`documentRowKeys`).
- (2026-10-12) **The style tree rides on the stack array**, so undo carries it; a hidden row reads
  as disabled only where painting is decided; the reader's lock refuses content edits only.
- (2026-10-12) **Changing a row's kind keeps the row** (`writeRow(id, { target })`).
- (2026-10-12) **Starting rows on in the app** (`startingRows: true, runPlacement: "top"`).
- (2026-10-11) **Study rules live where every caller passes** (`real.mjs --start`); answer-key
  facts live in `answers.md`. **Fix in the owning package; one change per problem; words at rest
  never rise.**
- (2026-10-10) Owner decision: a chosen segment keeps Figma's face, never an inverse fill.

## Thinking

- (2026-10-17) Tooltips on focus keep costing keys: they cover the next control and (until today)
  ate Escape. If another tooltip defect comes up, ask whether an icon button with a visible
  pop-out title needs a focus tooltip at all.
- (2026-10-17) The no-reframe rule trades one surprise for another: a key card can now cover
  nodes. If readers lose nodes under the card, fix the card's place or size, not the camera.
- (2026-10-17) "Keys polled per frame" hid taps; any per-frame input needs a "pressed since the
  last frame" record.
- (2026-10-10) The dry run must walk what participants do; pilot each task on the candidate build
  and keyboard-press every control before freeze. A finding that traces to the prompt's own words
  is fixed in the prompt.

## Tried: worked / did not work

- (2026-10-18) Label item handed out again after the restart: already in 611619ee7 (in the
  frozen build), pilot T44A/T44B ran on 58556989e, before it. Fresh-build walk3: adding Label
  leaves Shape's box (Icosphere) its full width (03 vs 07); Tab from the source list's search
  closes it and focus returns to Text's '+' (08). walk4 (Les Miserables): the list reopened on a
  'name' label highlights name (04); Fixed text box shows "Character" whole (05); Size 48 beside
  'Size in' (06), 120 typed draws larger labels (07); Escape in Line height takes the typing back
  and keeps focus (08); Escape on Size's Reset, tooltip open, closes Label settings (09-10).
  Labels.real-element: 15 of 15 pass. WORKED, no change made.
- (2026-10-18) After the restart, the undo item (new graph starts history, notices name the act,
  text boxes keep their undo, Clear selection disabled when empty) was handed out again. All four
  were already in 789677a58 and the pilot build predates it; fresh-build walk w2 confirmed them
  (Undo "Nothing to undo" and Control+Z keeps 77 nodes, 04-05; Clear selection "Nothing is
  selected", 06; find box Control+Z "Valjean" to "Val", 09-10). Found and fixed: Control+Z with
  the drawing focused undid silently (element's own keys). WORKED after `historyKeys={false}`:
  w3/08 "Undid Add Layer 1.", w3/09 "Redid Add Layer 1." (labels lowercased after that walk).
- (2026-10-18) Found: `real.mjs` reports a notice that "showed and went" only for `role=alert`;
  since non-error toasts are spoken by the status line, a missing toast is silent in its output.
  Look at the screenshot. Also: undoWords' "Selection cleared" test found the text twice (toast
  and status line); it now queries `.cm-toast-message`.
- (2026-10-18) Found, not mine: BulkPilot (2), VaryByLayer (5), StyleTab T10 label, DataPlace
  "25% filled", FocusAndTabOrder Vary by Tab fail with and without this change (other agents'
  uncommitted style and table work).
- (2026-10-18) After the restart, the Analyze fix (Enter in Resolution runs Louvain, no "Analyze
  Shift+A" tooltip after Run, the run says how many groups and names the folder) was handed out
  again. Already in: fa3c6be16 (Enter, groups message) and 098534fc7 (`focusReturned` tooltip
  rule), both in the frozen build ed4351b258; the pilot screenshots came from 58556989e, before
  both. WORKED, checked on the frozen build: pointer Run leaves no tooltip; screen reader + keys,
  1.2 then Enter in Resolution runs it and says "Louvain (resolution 1.2) finished: 7 groups, each
  a layer in the Louvain folder of Style layers". Test `GroupsAsLayers.real-element` passes on
  HEAD. No code change. Walks `design/ui/studio/tmp/r1-dry1-analyze/frozen-pointer`, `frozen-keys`.
  Second handout of an already-landed fix after the restart: check ancestry first, every time.

- (2026-10-18) After the machine restarted, the filter-step fix (named Is box, Enter takes a
  listed value, no step that hides everything, Escape closes the list) was handed out again. It
  is already in, since 02d3dc081 (2026-10-17); the pilot screenshots that asked for it came from
  58556989e, a build before it. WORKED, checked on a fresh vite build of 745290fae: yeast "GAL"
  lists GAL10..GAL3 with the first active, Escape closes the list, Enter then adds nothing,
  "331 to 0 nodes" and Add step disabled; Les Mis "Mme" + Enter takes "Mme Magloire" (77 to 1),
  the second Enter adds it. Test: `data-place/__tests__/Filters.real-element` "the Is box is
  named...". No code change. Walks `design/ui/studio/tmp/r1-dry1-filters/yeast3`, `lesmis2`.
  Lesson: before building a handed-out fix, check whether the screenshots' build predates a
  commit that already made it (`git merge-base --is-ancestor <fix> <build commit>`).
- (2026-10-18) Found: all 8 ConditionLists.real-element tests failed only because the helper
  clicked Add a condition after an empty Which row had opened the list itself (the click closed
  it). WORKED: open it only when the search is not already there; the last test now checks the
  current rule (Done before a card, no count on an unfinished card). 8 of 8 pass.
- (2026-10-18) After the machine restarted, the page-and-selection fix was handed out again. It is
  already in `b4dc42dd2` (chrome `user-select: none`, Mod+A refused outside text boxes, right-click
  keeps a selection in the element, `LoadDraft.graphtyDocument` opens a project from the Data page,
  full drop area, Replace filled on an all-repeat add), still in HEAD and walked in
  `tmp/r1-dry1-page-and-selection/walk1..3`. Before re-doing a handed-out fix, `git log` its title
  and check the notes for a dated entry.
- (2026-10-18) Found: focusing the last table row scrolled the whole window up 1 px: the table's
  height left out the dock's 1 px top rule, so the table overflowed the dock. `CHROME_HEIGHT` 65
  fixed it (`w3/03.png`). Pre-existing at 240 too.
- (2026-10-18) WORKED: `<wbr>` after @ and dots in a stat's reading; `overflow-wrap: anywhere` uses
  it before breaking mid-word (`w6/06.png`: "press@harlandev." / "example"). Test: one client rect
  per text node.
- (2026-10-18) Found: `real.mjs` sr mode prints a cell's role and name only, so "reads with its
  row" shows as `rowheader "Napoleon"` then `gridcell "Myriel"`; the row header itself is the
  mechanism screen readers use.
- (2026-10-18) Found, not mine (other agents' work in the shared tree): undoWords and toolbar
  tasks fail on a notice drawn twice (toast and a second span), inspector tasks T7/T8 on the
  reworked "Why this look", FocusAndTabOrder's Vary by Tab; element `legend-copies.test.ts` type
  errors.
- (2026-10-18) Found: with a bottom inset always set, `getCameraState().position` no longer equals
  the `resolveCameraPreset` position that placed it (it includes the lens shift that centers the
  free area; `target` and `cameraDistance` agree). The Frame selection test compared positions;
  it now compares target and distance. Noted for the owner in owner-decisions.md.
- (2026-10-18) Found: the long key was keyboard-reachable on the fresh build (Tab from the canvas
  lands on the card, arrows scroll to Groups 9 and 10; walk w1 steps 18-19).
- (2026-10-18) Found: "Enter leaves focus in the box when it was clicked" was the Style tab, not
  the click: `focusValuesNext` is taken only by the Values views. WORKED: a one-frame fallback that
  takes the pending request and focuses the inspector title.
- (2026-10-18) WORKED: a "structure" path kind in `styles/sources.ts` plus the paths in
  `answerablePaths` was all a rule, a count and the unknown-path check needed for `graphty.degree`.
- (2026-10-18) Found: renaming a list option or a control breaks every test that finds it by its
  old exact name; convert those lookups to `/^<name>(,|$)/` before the run, and grep for dynamic
  `{ name: field }` helpers too (ConditionCards `addCard`, StylePanel `varyBy`, NumberCard).
- (2026-10-18) Found: a test run of 30 real-element files queued 7 minutes for a slot and took
  about 25; run the changed files' tests early in the background while walking.
- (2026-10-18) Found: ConditionLists.real-element (8 tests) fails in the shared tree with or
  without my edits: an empty Which row now opens Add a condition by itself, so the test's click on
  Add a condition closes it. My new test opens the list only when it is not already open.
- (2026-10-18) WORKED: keeping an upward-opening popover's field still as its list shrinks: measure
  the list once in a layout effect and hold it as `min-height` (reapplied when the list remounts).
- (2026-10-18) Worked: deferring a blur's refusal to after the pointerup. Did not work: drawing it
  at once on blur; the message pushed Done down between mousedown and mouseup and the click was
  lost (walk w1, step 21).
- (2026-10-18) Found: a Mantine Tooltip on a focused button takes a bubbling Escape (floating-ui
  `useDismiss` stops it), so a container's `onKeyDown` never hears it. WORKED: the container's
  `onKeyDownCapture` for non-text targets.
- (2026-10-18) DID NOT WORK: `pgrep -f "<session dir> --key"` in a background wait loop: the loop's
  own command line matches, so it waits forever. Run steps in the foreground, a few per call
  (each `--step` takes 10-20 s in --sr mode).
- (2026-10-18) Found: a focus target drawn after the element comes up (the style tree's rows) is
  not there when `onElementReady` runs; a MutationObserver that moves focus once the row is drawn,
  dropped on the placeholder's blur, WORKED.
- (2026-10-18) DID NOT WORK: `x != null` to ask the element whether `x` is a bare column:
  JMESPath reads a bare `null` as a field name. WORKED: `` x != `null` `` through `selectorRule`
  with `comparisons`, which answers the presence leaf only for a bare name.
- (2026-10-18) WORKED: staging only my edits while another agent edits the same file:
  `tmp/r1-dry2-layer-panel/stage.py` diffs my baseline copy against the working file and replays
  each change onto HEAD by exact text (insertions anchored on the lines before), as a blob.
- (2026-10-18) Found: a count said twice traced to the count's key, not to two writers: a hook
  that resets on null speaks the same words again after every recount; dedupe against the last
  words said, not the last words seen.
- (2026-10-18) Shared files moved under me again (Workspace, LabelSection, PropertyRow,
  WhichPicker all gained other agents' hunks mid-task), so only the hook (mine alone) was proved
  by swapping HEAD; the rest stage as HEAD plus my exact replacements.

- (2026-10-18) WORKED: Mantine Tooltip passes a non-boolean `middlewares.flip` to floating-ui's
  `flip()`, whose options may be a function of the state (the placement being tried); a Rect
  `boundary` makes that side overflow by exactly what you choose. Best-fit then sums overflows.
- (2026-10-18) WORKED: proving new tests fail on HEAD without touching shared files: `git archive
HEAD compact-mantine | tar -x --strip-components=1 -C compact-mantine-headproof`, `cp -a` its
  node_modules (relative pnpm links resolve at the same depth), copy the new tests in, run there.
- (2026-10-18) Found: a Bash command holding the text `setTimeout` inside a heredoc is refused by
  the foreground-sleep hook; write the edit script to `tmp/` and run it.

- (2026-10-17) That day's tried entries (proving a test fails while others edit the same files,
  finding who swallows a key with a capture listener, `autoFocus` racing a pop-out's focus return,
  Enter submitting a form a frame later, Mantine combobox quirks, test slots, typing tests that
  share a page) are in full in `git show 7ce810382:design/ui/studio/notes/engineer.md`.
- (2026-10-12) WORKED: audit walks as one Playwright script per size through `with-browser.sh`
  with a `measure()` after every screenshot; owner-review pictures from stories reached by clicks.
- (2026-10-12) Never `open(p, "w").write(f(open(p).read()))`: the write truncates first.

- (2026-10-18) WORKED: before building a re-handed fix, check `git log` on its files and its walk
  folder: the table fix (content-sized columns, spoken sort, "No value", no text selection) was
  already in aac8f123e with walks r1-dry1-table/w1-w4; re-ran its tests (compact-mantine DataTable
  113 pass, graphty TableReading pass) instead of rebuilding it.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.
