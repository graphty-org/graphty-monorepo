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

0000. (2026-10-18, number card) graphty `NumberCard`/`NumberBox` in `style/WhichPicker.tsx`, plus
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
00. (2026-10-18, spoken messages) graphty only. A one-layer write in `Field` (`PropertyRow.tsx`)
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

1. (2026-10-17, color box) compact-mantine `CompactColorInput`: a mousedown on a hex box whose
   text is its committed value is prevented and selects all (focused or not); a box holding typing
   keeps the caret. Enter selects the settled value (`selectOnRedraw` ref + layout effect, as the
   controlled caller's value arrives later). The box carries `data-committed` while text equals the
   value; the app's `hasPendingEdit` (`keys/keys.ts`) ignores the typing mark then, so Control+Z
   reaches the app's undo. A refusal clears on a new value and on the focus move AFTER the one that
   made it (listener added in a `setTimeout(0)`). The app's row (`style.css`) sets `.ws-field-control`
   and `.cm-paint` to `display: contents` so the message takes grid row 2 across the whole row.
   `colorWord` moved from the app (`colorName` now calls it); swatches are named "blue 6366F1",
   the opened-on color gets ", the starting color" and a dot; the picker keeps the swatches it has
   shown (new ones append). `valueText` reaches the field form. Tests: compact-mantine
   `CompactColorInput.browser.test.tsx` "replacing its value", app
   `style/__tests__/ColorBox.real-element.test.tsx`. Walk `design/ui/studio/tmp/r1-dry2-color-box/w2`.
2. (2026-10-17, drawing) Rendering groups: group 0 is the graph; the selection ring and glow
   (`NodeEffects`, `renderingGroupId: 0`) draw at its end; every label draws in group 1 with group
   0's depth kept (`setRenderingAutoClearDepthStencil(1, false)` in `RichTextLabel`), so it still
   sorts by depth but no ring crosses a name; `onTop` labels and tooltips in group 2, depth
   cleared. A label behind a nearer EDGE is still crossed: the owner chose depth-sorted labels
   (095195f81, 2026-09-23); a "nodes hide, edges never" default is in `owner-decisions.md` "For the
   owner". 3D wheel zoom is a factor per notch (`notchDistance`: d * 1.1^n - d), so out undoes in.
   Edge pick tolerance was already 6 screen px (`EDGE_PICK_TOLERANCE_PX` in `Graph.ts`); the T45B
   miss was 13 px off two ties, so no change. Tests: `real-input.test.ts` (wheel symmetry, right
   click 3 px off a tie), `label-drawn-over-edges.test.ts` (ring under a label, on top or not).
3. (2026-10-17, the key) Titles a bound value by its column ("Size: donations", `rowName` in
   `canvas/legendWords.ts`); a stale key was the element's `foldGroup` (`session/styles/legend.ts`).
   Tests `legend-copies.test.ts`, `legendWords.test.ts`, `LegendCard.real-element.test.tsx`.
4. (2026-10-17, truthful counts; 97d8bff7c) A layer counts only halves that write a property
   (`paintingParts` / `paintedTarget` in `graph-place/rows.ts`); group marks key on
   `summary.groups`. Test `graph-place/__tests__/TruthfulCounts.real-element.test.tsx`.
5. (2026-10-17) Today's other fixes, one line each (details in git, see above):
    - labels (611619ee7): label "Size" (`sizePx`) with its vary glyph; "Fixed text" gets a "Text"
      line; `ValuePicker` opens on the value in force; `useEscapeKey` closes past a tooltip.
    - table: compact-mantine `DataTable` `columnSizing: "content"`, cut values in one tooltip,
      sorted header's name says its sort, empty cell "No value"; app speaks sort changes.
    - Analyze: Enter in a run setting runs it (`useNumberField` commits, then
      `form.requestSubmit(button)` a frame later); a grouping run says how many groups it made.
    - filter steps: the "Is" box takes the first listed value on Enter; a step that would leave
      no node is refused, counted by the element (`plan({ op: "visibility.steps" })`).
    - style panel polish: the base layer is never narrowed; "Picked by hand: 3 nodes" cards;
      several-layer color writes each change at once in one undo step; `cm-pointer-still` on
      `StyleSelect`; Tree caret 24 px; the style tree scrolls in its room.
    - page and selection: `.ws-app` `user-select: none`, Mod+A outside a text box prevented; a
      right-click keeps the selection (element); `LoadDraft.graphtyDocument`.
    - undo: a newly opened graph clears history; notices name the act; a text box keeps its own
      Undo while it holds typing (`trackPendingEdits`).
    - inspector: "Why this look" opens the tree row of the winning layer (`findTreeRow`);
      `canvas:element-click` (element, additive); a gone target falls back, never "Gone".
    - condition lists: Add a condition's search is a combobox whose first match is active; Tab
      closes it to the button; Enter in a card box is Done; `holdsNodeIds` (element).
    - yes and no: the element's `type === "boolean"` decides Yes/No (`valueWord` in
      `inspector/words.ts`); filter step on a boolean is a Yes/No select.
    - find box: `selection.checkRule` and `selectorRule(..., { comparisons: true })` (element,
      additive); "No column named ..." with "Did you mean"; Mod+F focuses the find box.
6. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
7. Find matches a boolean by its raw text ("yes" finds nothing while rows say Yes): needs an
   element answer (match on words the consumer supplies?) before the app can do anything.
8. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
9. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
10. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
    graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
    unset) before a real.mjs walk; end the session and start again after a rebuild.
11. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
12. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
    `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
    round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
    built: number card histogram for a run field, "lowest N", dashed chips at rest. One
    BoundValue for one layer and for several (owner 2026-10-16).
13. Anything keyed by a layer id that a document carries is remapped on apply
    (`documentRowKeys`): opened projects lost their rows before.
14. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
15. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

- (2026-10-18) **A number box writes on commit, not per keystroke.** Per-keystroke writes made
  "2" then "20" a stream of counts and notices (T42A, T42B: six notices for "$10,000") and made
  Escape meaningless (it had already written). The style fields (`useNumberField`) already commit
  on Enter or blur; the card now matches them and the color box.
- (2026-10-18) **A list-less numeric ComboInput is a spin button.** It offers nothing to pick, so
  "combobox" told a screen reader user there was a list (T43A keyboard/55). Fixed in compact-
  mantine so every number field the app draws through it gets it.
- (2026-10-18) **A committed style change on one layer is said, with its reach.** The 10-17 call
  "the field's own new value is what a screen reader reads" did not hold: a hex box rewritten by
  Enter is read as the same box, and nothing told the reader the drawing changed or on how many
  (T39A, T41A, T46B, T49A, while undo and redo were spoken). A list's own value is still left to
  the list, or the change is said twice.
- (2026-10-18) **The status line empties on the reader's next key or press, not on a timer.** A
  screen reader takes a polite message when it is written; the text left behind was what browse
  mode found later (T40B). Event-based, so nothing depends on how fast anyone reads.
- (2026-10-17) **A label is drawn after the graph's rings and glows, still depth sorted.** The
  ring (Babylon's highlight layer, drawn after every group by default) cut across the selected
  node's name (T44B keyboard/49), even an `onTop` label's, which breaks `onTop`'s "nothing in the
  graph covers it". Moving the layers to group 0 and labels to group 1 with depth kept fixes it
  without changing what hides a label. Not made: labels over nearer edges, a changed default.
- (2026-10-17) **A wheel notch zooms by a factor.** Adding 10% of the distance out and taking 10%
  in made three turns out leave the view 3% short of where three turns in began.

- (2026-10-17) **A key section is named by what it reads, not by the layer.** "Size: Everything"
  and "Size: s01" named a layer the reader never thought of as the meaning (pilots T43A, T43B);
  the column is what the size says. A fixed value reads no column, so its layer still names it.
- (2026-10-17) **A stale key is fixed where the legend is built.** The key lost its end numbers
  after a second layer took the same binding: the element folded the two copies and filtered the
  ramp's samples as if they were categories. Fixed in `foldGroup` so every consumer of
  `styles.legend()` gets it; `layerId` of a folded block now names the copy shown on the most
  elements (it named the first, which could paint nothing). Treated as a bug fix, not a change of
  contract: the field is documented as "the layer that paints it".
- (2026-10-17) **No chevron over the key's last line.** The fade and chevron covered half a row
  (T47B "Group 9" cut). The card's height now ends on a line's edge and the scrollbar says there
  is more. Ceiling: a platform with overlay scrollbars shows no "more" sign until scrolled.

- (2026-10-17) **A half that writes nothing is not counted as painting.** A row on nodes and
  edges with "Edges: 0 styles" was named "8 nodes, 63 edges" and selected 63 edges it never
  touched (pilots T38A, T41A, T50A). What a layer paints is what it writes, read from the layer
  (`set`/`encode` keys, the same as `counts.painted`); a row that writes nothing yet still reads as
  what it is on, so a new layer is not called "paints nothing" before its first edit.
- (2026-10-17) **A group row is a layer of a grouping run, not a selector shape.** Keying the
  swatch on a one-value categories rule lost it the moment a condition was added or removed
  (T48A, T48B); the run's `summary.groups` says what the layer is whatever its conditions.
- (2026-10-17) **A size is shown beside the unit it is measured in.** "Size in: Screen" with no
  number named a unit for nothing, and screen pixels at the default 48 drew names huge with no way
  back (pilots T44A, T44B). The size is the label style's own `sizePx`; the size channel (a bound
  or per-layer size) still wins and replaces the field while written, as the colors do. Not on the
  entry while unset: the panel draws no row for a property the layer does not set.
- (2026-10-17) **Typed words get a line of their own.** Beside the entry's four buttons the box
  was about 30 px and cut every word; the source button says "Fixed text", so the list it opens
  is also the way to a value.
- (2026-10-17) **A text entry's kind never widens the shared label column.** Its glyph made the
  column grow and cut "Icosphere" in another section; the kind takes its own width instead.
- (2026-10-17) **A list opens on the value in force, and Tab leaves it closed.** Reopened on a
  label read from `name`, the list highlighted "Fixed text", so Enter changed the label; Tab from
  its search left it open and focused the panel's scroller.
- (2026-10-17) **A tooltip never uses up an Escape.** Escape on a field's Reset closed only the
  tooltip (often not even shown yet), the pop-out stayed, and the next Enter reset the field.
  Fixed in compact-mantine's pop-out, so every pop-out gets it.
- (2026-10-17) **A column is as wide as what it holds, behind an option** (`columnSizing`), and a
  focused sorted header names its sort.
- (2026-10-17) **The base layer is never narrowed; a hint is not a warning.**
- (2026-10-17) **A preview is the change**: the several-layer binding popover writes as it goes,
  in one undo step.
- (2026-10-17) **A right-click never changes the selection it asks about** (element, every host).
- (2026-10-17) **The element says what a file is; the app never sniffs** (`graphtyDocument`).
- (2026-10-17) **Opening is not a change**: history starts after a new graph is read.
- (2026-10-17) **Typing is the text box's to undo, Enter included**; Escape and focus hand Undo
  back to the app.
- (2026-10-17) **A list's search is a combobox naming its first match active; Tab never enters
  the list.** Enter in a card box is Done unless the box refuses what it holds.
- (2026-10-17) **A link to "what paints this" opens the row the reader would click in the tree.**
- (2026-10-17) **The app learns of a repeated pick from the element** (`canvas:element-click`).
- (2026-10-17) **A yes-or-no column is known by the element's `type`, never by its values.**
- (2026-10-17) **A rule over a column nothing answers is refused with words**; making a bare name
  read a run's field is the owner's call. A wider reading of an existing function goes behind an
  option whose default keeps today's return.
- (2026-10-17) **One name per control, from one function** (`bindLabel`, `FIND_ATTRIBUTE`,
  `valueFact`). **"Not set" only where the field shows nothing of its own.**
- (2026-10-17) **One focus guard for the whole workspace**, waiting a frame so a caller that
  places focus goes first. **Escape never drops focus to the page.**
- (2026-10-17) **A tooltip shows for focus a key moved, never for focus a script put back.**
- (2026-10-17) **A typed number is the reader's until the card can take it.**
- (2026-10-17) **One status line; a control's opening count is not news; a zero or loading state
  is never said.**
- (2026-10-17) **After an add, focus goes where the next keystroke belongs.**
- (2026-10-17) **A refusal says what the box takes, on screen and to a screen reader.**
- (2026-10-17) **A box showing its value takes a click or Enter as "replace this"**; Control+Z with
  nothing typed since the commit is the app's (`data-committed`), since a rewritten box has no
  native undo. **A refusal is a line under the whole row** and lasts until the move after it.
  **The link button's tooltip was not suppressed**: it opens above the row ("Above the row"), and
  with the message under the row the walk (w2/14) shows it covers neither the message nor the box.
- (2026-10-17) **One color word for the library and the app** (`colorWord` in compact-mantine), so a
  swatch tooltip and a field's spoken name agree. **A picker keeps the swatches it opened with**:
  picking replaces a color in the document's set, which used to pull the picked swatch away.
- (2026-10-17) **The element never moves the camera for the app's overlays; the app never frames
  on its own.** **Canvas keys are a catalog fact** (`CANVAS_KEY_DESCRIPTORS`).
- (2026-10-17) **A palette the element ships is offered, not chosen, when choosing it would change
  an existing binding's drawing** (`groupPalettes`).
- (2026-10-14, round 6) Element additions, all additive: empty rows for starting rows, run
  `restoreLayer`, binding `otherwise`, value labels, preview palette and defaulted parts,
  proposeEncoding range fits, project palettes, `ties` on top N, descriptor `modifies`/`step`,
  in/out degree histograms.
- (2026-10-12) **One list of readable values** (`data.readableValues()`); one `columnFits` for
  picker and encoder. Two checks of one question produce this project's worst defects.
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

- (2026-10-18) Worked: deferring a blur's refusal to after the pointerup. Did not work: drawing it
  at once on blur; the message pushed Done down between mousedown and mouseup and the click was
  lost (walk w1, step 21).
- (2026-10-18) Found: a count said twice traced to the count's key, not to two writers: a hook
  that resets on null speaks the same words again after every recount; dedupe against the last
  words said, not the last words seen.
- (2026-10-18) Shared files moved under me again (Workspace, LabelSection, PropertyRow,
  WhichPicker all gained other agents' hunks mid-task), so only the hook (mine alone) was proved
  by swapping HEAD; the rest stage as HEAD plus my exact replacements.
- (2026-10-17) Found: an element default that a past commit set on purpose (labels sort by depth,
  with a test asserting a nearer edge crosses the label) is a contract; read `git log -S` on the
  test's words before changing drawing order. Ceiling of the group move: a translucent node in
  front of a label now hides it instead of tinting it (labels draw after group 0's alpha pass).
- (2026-10-17) Found, not fixed: a label (pickable by Babylon's default, `labelStyle.pickable`
  unset) over a node takes the click, `pickNodeId` answers nothing, and the click falls through to
  `pickEdgeId` and selects a TIE under the name (walk `tmp/r1-dry2-drawing/w1` 30-32: a click on
  Lucy Grant's dot under "Diego Ruiz" selected v13 -- v16). The documented contract says a click on
  a name "selects nothing"; either honor it or make plain labels unpickable (owner's default).
- (2026-10-17) Test slots: a vitest run waited behind 20 others; start runs in the background
  early, and stop a probe with TaskStop (pkill is denied).

- (2026-10-17) Worked: rereading the key's numbers from the walk, not the code -- the end
  numbers were missing only after a second identical binding, which led to `foldGroup`.
  Did not work at first: changing only which copy is kept; the ramp still lost its swatches to
  the category filter (`reached` answers a set for every binding, numbers included).
- (2026-10-17) A real-element test that finds a section by its old title waits out the 90 s
  guard and reads as a 15 s timeout: after a title change, search the tests for the old name.

- (2026-10-17) WORKED: proving a test fails without the change while other agents hold
  uncommitted edits in the same files: copy my versions aside, `git show HEAD:<file>` over only
  my files (and reverse only my hunk where another agent also edits), run, copy back.
- (2026-10-17) Seen, not mine: BulkPilot "takes a color by name" types "blue" after the hex
  (the box keeps "E69F00" on click), and tasks.real-element T7/T8 "no Why this look line"
  (WhyThisLook.tsx held other uncommitted edits); both fail with my change removed too.
- (2026-10-17) WORKED: finding who swallows a key: in the test, a capture `keydown` listener
  (`once`) that wraps the event's `preventDefault`, `stopPropagation` and
  `stopImmediatePropagation` to record a stack. It named Mantine's tooltip dismiss in one run.
- (2026-10-17) DID NOT WORK: `autoFocus` on a box mounted in the same render that closes a
  pop-out: the pop-out's effect focuses its trigger afterwards and the blur closes the box.
  WORKED: mount the box a frame later.
- (2026-10-17) DID NOT WORK: a CSS rule edit that adds `min-width` above an existing
  `min-width: 0` in the same rule: the later one wins. Read the whole rule.
- (2026-10-17) WORKED: Tab in a portaled list's search: close it and let the pop-out hand focus
  back to its trigger (`preventDefault`, then `onClose`); or focus the trigger without
  `preventDefault` so the browser's Tab moves on from there.
- (2026-10-17) DID NOT WORK: `combobox.selectFirstOption()` alone for screen readers: Mantine's
  `aria-activedescendant` is set only by its own arrow handler.
- (2026-10-17) WORKED: Enter submitting a form from a field that must commit first: keep
  `preventDefault`, then `requestAnimationFrame(() => form.requestSubmit(button))`.
- (2026-10-17) WORKED: Mantine Autocomplete with a controlled `dropdownOpened` and a pre-filtered
  `data`: Escape on an empty list reaches the form.
- (2026-10-17) DID NOT WORK: `aria-expanded` on a role=option (jsx-a11y refuses it). WORKED: the
  state in the option's name. DID NOT WORK: a VisuallyHidden suffix inside a button's name (an
  absolute span counts as a block). WORKED: `aria-label`.
- (2026-10-17) Two real-element files in one vitest run share one page, and both type: a Shape
  line test failed ("box" never written) only beside my ColorBox file and passed alone and with its
  own file. Run a typing test file on its own.
- (2026-10-17) The element merges edits of one layer value within 1 s (`DEFAULT_COALESCE_MS` in
  `History.ts`), so a fast test's three color commits are one undo step; assert that the last is
  gone, not that the one before is back. Mousedown-time layout shifts eat clicks: a message drawn on
  blur moved a test's button out from under its mouseup.
- (2026-10-17) DID NOT WORK: `hunks.py stage` (`git apply --cached --unidiff-zero`) when another
  agent's hunk sits above pure insertions of mine: git placed them by line number. WORKED: HEAD
  plus my edits by exact string replacement as a blob.
- (2026-10-17) DID NOT WORK: swapping HEAD over shared files to prove a test while it waits for a
  test slot: other agents rebuild and edit meanwhile. Run only the one test, copy back at once.
- (2026-10-17) DID NOT WORK: prettier over a whole `__tests__` folder (touches others' files);
  `// eslint-disable-next-line react-hooks/...` in compact-mantine (plugin not configured there);
  `{ ...keyboardEvent }` (prototype getters, empty spread); `setDraft(x); input.select()` in one
  handler (WORKED: `flushSync`); walking a just-opened Mantine list in `setTimeout(0)`.
- (2026-10-17) WORKED: a real-element click on a node after `await element.waitForStableFrame()`
  and `elementAt(point)` answering the node; a `focusin` listener logging stacks finds a focus
  thief in one run; `real.mjs --upload <absolute path>` for a one-off file; reaching a deep state
  for a --sr walk with a setup file of clicks (pilot it on a pointer session first).
- (2026-10-17) Found: `findByText` fails on a line the status region also speaks (use
  `findAllByText`); "Failed to fetch dynamically imported module" comes while other agents edit
  sources mid-run (rerun once); `user-select: none` alone does not stop Control+A highlighting
  text boxes; a blank Everything row auto-opens Which nodes, so assert where focus is before the
  key a test tests.
- (2026-10-12) WORKED: audit walks as one Playwright script per size through `with-browser.sh`
  with a `measure()` after every screenshot; owner-review pictures from stories reached by clicks.
- (2026-10-12) Never `open(p, "w").write(f(open(p).read()))`: the write truncates first.
- (2026-10-11) Did not work: bars.mjs on two builds at once (more than four browser slots);
  writing test data from memory (copy fixture rows from the file).

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
