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

00. (2026-10-18, names and words) A control is named for what it chooses beside its column
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
00. (2026-10-18, layer panel) App only (`graphty/src/workspace/style/`). A selection's first edit
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
000. (2026-10-18, focus and keys) The focus guard (`installFocusGuard`) is installed by
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

1. (2026-10-17) Color box, drawing (rendering groups, wheel zoom), the key's titles and truthful
   counts: in full in `git show 7ce810382:design/ui/studio/notes/engineer.md`, items 1-4.
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
    unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
    refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
    is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
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

- (2026-10-18) Found: renaming a list option or a control breaks every test that finds it by its
  old exact name; convert those lookups to `/^<name>(,|$)/` before the run, and grep for dynamic
  `{ name: field }` helpers too (ConditionCards `addCard`, StylePanel `varyBy`, NumberCard).
- (2026-10-18) Found: a test run of 30 real-element files queued 7 minutes for a slot and took
  about 25; run the changed files' tests early in the background while walking.
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

- (2026-10-18) Found: a Mantine Tooltip on a focused button takes a bubbling Escape (floating-ui
  `useDismiss` stops it), so a container's `onKeyDown` never hears it. WORKED: the container's
  `onKeyDownCapture` for non-text targets.
- (2026-10-18) DID NOT WORK: `pgrep -f "<session dir> --key"` in a background wait loop: the loop's
  own command line matches, so it waits forever. Run steps in the foreground, a few per call
  (each `--step` takes 10-20 s in --sr mode).
- (2026-10-18) Found: a focus target drawn after the element comes up (the style tree's rows) is
  not there when `onElementReady` runs; a MutationObserver that moves focus once the row is drawn,
  dropped on the placeholder's blur, WORKED.
- (2026-10-18) Worked: deferring a blur's refusal to after the pointerup. Did not work: drawing it
  at once on blur; the message pushed Done down between mousedown and mouseup and the click was
  lost (walk w1, step 21).
- (2026-10-18) Found: a count said twice traced to the count's key, not to two writers: a hook
  that resets on null speaks the same words again after every recount; dedupe against the last
  words said, not the last words seen.
- (2026-10-18) Shared files moved under me again (Workspace, LabelSection, PropertyRow,
  WhichPicker all gained other agents' hunks mid-task), so only the hook (mine alone) was proved
  by swapping HEAD; the rest stage as HEAD plus my exact replacements.
- (2026-10-17) That day's tried entries (proving a test fails while others edit the same files,
  finding who swallows a key with a capture listener, `autoFocus` racing a pop-out's focus return,
  Enter submitting a form a frame later, Mantine combobox quirks, test slots, typing tests that
  share a page) are in full in `git show 7ce810382:design/ui/studio/notes/engineer.md`.
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
