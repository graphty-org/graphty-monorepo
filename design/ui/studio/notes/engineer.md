# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier3` (branch `design/studio-tier3`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier3/criteria.md`.

Summarized 2026-10-17 from 158 KB. The full earlier notes (every dated entry from 2026-10-06 to
2026-10-17) are in git: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-10-17, focus and Tab order, graphty + compact-mantine) Focus never falls to the page.
   Checked with real.mjs --sr on a fresh build (`design/ui/studio/tmp/r1-dry1-focus-and-tab-order/a1`
   to `a6`); tests `frame/__tests__/focus.test.tsx` (guard) and
   `frame/__tests__/FocusAndTabOrder.real-element.test.tsx` (9 walks).
    - `installFocusGuard()` (frame/focus.ts, installed by Frame): Tab past the last stop wraps
      to the first (inside an open `[role=dialog]`, around it); a control removed or hidden while
      focused hands focus on after the frame it was drawn in: the same control drawn again (one
      element with the same tag, role and name -- a field keyed by its value), else the newest
      earlier control still there. A blank-page click is left alone (its control is still there).
    - F6 / Shift+F6 = commands `focus.next-panel` / `focus.previous-panel` ("Go to"): left panel,
      inspector, drawing, toolbar, table, Data page; back to each panel's last control. F6 fires in
      a text field (`firesWhileTyping`). Inspector right after the left panel: one press from a
      layer to its style.
    - Toolbar menus/popovers: their own onClose replaced the theme's focus return; Frame
      selection left focus on a menu row that then unmounted. `focusGoesWithClose()` also counts
      focus inside the closing dropdown.
    - compact-mantine: InfoCircle opens on activation only, `contained` keeps its bubble over the
      inspector; a Popout panel Tab leaves closes and focuses the stop after its trigger;
      number field Escape reverts and keeps focus; a tooltip whose trigger got focus by script
      (not Tab/arrows/Home/End/F6, not the pointer) is dismissed; InlineRename returns to its row.
    - Arrows on Node/Edge tabs: `useFocusLine` read a whole new section (the other tab) as "a line
      came back" and focused it; now only sections drawn both times count. WhichPicker's
      auto-open skips focus while a tab holds it.
    - Not mine, seen: compact-mantine `Tree.stories` Keyboard fails at the Alt+ArrowDown move
      with my files reverted too; graphty `WorkspaceToolbar.test.tsx` fails on another change's
      "View, 3D" name.
2. (2026-10-17, number card, graphty, commit a51efe4a2) The number card never hands the element
   a range it refuses. `NumberCard` in `style/WhichPicker.tsx` keeps each box's typed text as a
   draft (`Drafts`, `checkDrafts`) and calls `onChange` only when every box reads and from <= to;
   otherwise a `role="alert"` line under the boxes says why ("From is above to: 220 is more than
   205.", "\"$10,000\" is not a number. Type digits only, like 10000.") and the layer keeps the
   last range it took. Boxes are Mantine `TextInput`s (`NumberBox`): a click from outside selects
   the value, a digit after a starting 0 replaces it, grouping separators read through
   compact-mantine `useNumberParser`, any other character refused (`\p{Nd}`, spaces, `.,'+-`
   only). Highest above the count says "There are only 24 nodes, so this keeps all of them."
   The step writer clears "That rule could not be used for this layer" after a write succeeds.
    - Test: `style/__tests__/NumberCard.real-element.test.tsx` (4 tests, all fail on the old card).
    - Checked on a fresh build (`design/ui/studio/tmp/r1-dry1-number-card/walk1`, sources.graphml):
      10000 typed after the focused 0 gives 9 of 24; click "to" selects 250000; "1" and "15" held
      with the message, count stays 9; "10,000" reads; "$10,000" kept and refused after Tab;
      Highest 10000 says only 24; 220 then Control+A "205" holds, layer stays 220 to 250000.
    - The element's throw is right and unchanged. "The first crash moved every node" goes to the
      drawing unit; I could not reproduce it before (drawing and camera item) and the card can no
      longer reach that throw, so a reproduction needs a range rule written another way.
    - Seen, not mine: commit 7a23b98f9 put `useAnnounceChange(...)` in `Cards` INSIDE the
      `if (matched === 0 ...)` block (a conditional hook); the working tree has it outside.
3. (2026-10-17, spoken messages) Every app message is spoken from ONE polite status line that is
   on the page, empty, before it is written: it now lives in `Workspace.tsx` (it was in `Frame`,
   which the start screen does not mount). Rules, checked with real.mjs --sr on a fresh build
   (`design/ui/studio/tmp/r1-dry1-spoken-messages/walk1`..`walk5`):
    - Write with `store.set({ announcement })`. A notice that is not an error is spoken by the
      store itself (`store.ts`), and its toast passes `alert={false}` (new compact-mantine `Toast`
      prop); a failure's toast stays `role="alert"`. Never set both notice and announcement.
    - A count shown with a control (picker head, label count) uses `useAnnounceChange(words |
null)` (`state/useAnnounceChange.ts`): silent for the first words, speaks each change, null
      for a loading or zero state.
    - compact-mantine `DataTable`'s status line is empty at mount and speaks only a changed count
      with rows; the read page passes `labels.rowsShown` = its caption ("The first 50 rows of 331").
    - The find line speaks only while the find box has focus, or it talks over "Selection
      cleared" when Esc elsewhere changes the selection.
    - A receipt speaks "Shape: 6 changed" from an effect keyed on the receipt; its buttons are
      outside the words.
4. (2026-10-17, focus after adding, graphty + compact-mantine) One rule picks where focus goes in
   a line or card just drawn: `keystrokeTarget` in `style/useFocusLine.ts` -- its first box that
   takes typing (`input` not read-only, hidden, checkbox or radio), else its first control. Every
   add path (section "+", folder "+", Edge tab, "One value for all", Undo) and new condition cards
   (`WhichPicker` `Cards`) route through it. A read-only select's box is never `select()`ed.
    - Width on a layer made from a selection lost focus to "Add to edge line": the selection
      tab's row unmounted holding focus and `useFocusOnRemoval`'s rAF focused its section's "+"
      because `!node.isConnected` was true, AFTER the new tab had focused its own Width box. Now
      it acts only when focus fell to the page.
    - compact-mantine `ensureListboxKeyboard`: a letter typed on a CLOSED select-only trigger
      opens the list and types ahead (APG select-only combobox), as a bubble-phase listener that
      skips a key a field already used (`defaultPrevented`, a row's "="). The walk waits for the
      list to be drawn (rAF, 10-frame guard) and runs after Mantine's zero-delay index update.
      A type-ahead run now also resets on another field (a run carried "g" across tests).
    - Test: `style/__tests__/FocusAfterAdding.real-element.test.tsx`; compact-mantine
      `StyleSelect.browser.test.tsx` "opens on a letter typed while closed". `BulkEdit` no longer
      clicks the color box before typing (a click in a focused, selected box places the caret).
    - Checked on a fresh build (`design/ui/studio/tmp/r1-dry1-focus-after-adding/`): walk1 (Width
      on a find-made layer, Edge and Node Color typed "blue"/"orange" + Enter repaint, text card
      "Mme" gives 6 of 77, Shape list opens on Enter with nothing selected), walk3 (bars' Shape
      check by hand: "Box", Enter, Escape draws boxes). bars.mjs tier 3: text card and Color line
      "written"; its Shape check never ran because an earlier move clicks "phone: match", a name
      another agent's uncommitted WhichPicker edit removed.
    - Pre-existing, not mine: compact-mantine `tests/figma/overlays.browser.test.tsx` two tooltip
      tests fail with HEAD's listbox too; several style real-element tests fail on other agents'
      uncommitted renames ("Find a value", vary button label, Which row label).
5. (2026-10-17, color box, compact-mantine) Escape in every color box reverts and keeps focus
   (`revertOnEscape`, `flushSync(revert)` before `select()`); a refused entry says why in a
   `role="alert"` line; one parser (`color/typed-color.ts`) for every color box; picker swatches
   carry a tooltip and `aria-pressed`. Pre-existing: `tests/figma/tree.browser.test.tsx` "toggles:
   24px targets" fails on this branch. Details: `git show aed7d5cbb:design/ui/studio/notes/engineer.md`.
6. (2026-10-17, drawing and camera) Removing a channel repaints (null color falls back to the
   bootstrap paint); the key card never frames; taps between frames are kept (`held` + `tapped`
   from `CANVAS_KEY_DESCRIPTORS`); `zoomToPointer`; whole-number histograms; Kelly offered, not
   chosen (owner question). Not reproduced: "a refused range rule moved every node". Details: same
   commit as item 5.
7. (2026-10-17) Opened projects lost their rows: anything keyed by a layer id that a document
   carries must be remapped on apply (`documentRowKeys`, commit 619ce32be).
8. (2026-10-17) Combined Style panel (V7 tabs, condition cards, several layers) is built; files
   `style/cards.ts`, `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text
   field never round-trips through the element; one undo step per open is
   `TransactionOptions.after`. Not built: number card histogram for a run field, "lowest N",
   dashed chips at rest.
9. One BoundValue for one layer and for several layers (owner decision 2026-10-16); Layer is a
   temporary value, a data field is copied as is. Vary by Layer uses the same group list as a
   data value (`GroupRows`, `styles.layerGroups`).
10. Shared worktree: other agents commit beside me. Stage only my files; build commits from HEAD
    plus my hunks when a file is shared; re-check `git diff` on a shared file right before
    committing. Never `git stash` (not even `list`) in this repo's agents.
11. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
    it, run the test, copy back. Check a "passes without the fix" test before trusting it (the
    histogram test passed on HEAD at 8 bins because 16/8 happened to be whole).
12. graphty tests read compact-mantine from its `dist` and graphty-element from source; rebuild
    the app (`pnpm exec nx run graphty:build`, Sentry vars unset) before a real.mjs walk; a
    session serves the dist it started on, so end and start again after a rebuild.
13. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
14. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`.
15. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names; step N lands in screenshot N+1; `--end`
    always. Compare screenshots with PIL `ImageChops.difference(...).getbbox()` on the canvas
    crop (`(300,120,1195,835)` at 1440 x 900) before calling a drawing unchanged.

## Decisions and reasons

- (2026-10-17) **One focus guard for the whole workspace, not a fix per control.** Every pilot
  drop had the same shape (the focused control unmounted or blurred and nothing placed focus);
  the guard catches the next one, and per-control code stays for where a better target exists
  (inspector title after a "Why this look" link, the table's grid after Shift+T, the trigger
  after a pop-out). It waits a frame so a caller that places focus always goes first.
- (2026-10-17) **A tooltip shows for focus a key moved, never for focus a script put back.**
  Returned focus after Escape, a pick or Run put a bubble over the control the reader reached for
  next (Analyze after Run, Text +, the label gear).
- (2026-10-17) **A typed number is the reader's until the card can take it.** A box that holds no
  number, or a range the element would refuse, keeps its text, says why and writes nothing; a
  value is never rewritten into another number (0) behind the reader. Leaving a box the card took
  shows the number it holds; leaving a refused box keeps the text.
- (2026-10-17) **One status line, on the page before it speaks; a control's opening count is not
  news; a zero or loading state is never said.** Evidence: the pilots' --sr transcripts marked
  "Usage data stays off", "24 of 24", "0 of 0 rows", "No match" and the bulk receipt as arriving
  filled, and the undo notice was said twice (alert + status). The shared table's status region
  was fixed in compact-mantine, so every table gets it.
- (2026-10-17) **After an add, focus goes where the next keystroke belongs**: a box that takes
  typing before a swatch or a menu. A select takes typing too (letters open it on the match), so
  no control a reader lands on ignores keys. A cleanup that hands focus on must check that focus
  actually fell to the page, never that its own node is gone: a remounted tab may already hold it.
- (2026-10-17) **Escape never drops focus to the page.** A text box reverts and stays focused,
  inside a pop-out or not; only an untouched box inside a pop-out lets Escape close the pop-out.
  Evidence: three pilots ended Escape on the page body and lost their place.
- (2026-10-17) **A refusal says what the box takes, on screen and to a screen reader**, and a blur
  that throws an entry away says so; a red edge alone told readers nothing.
- (2026-10-17) **The element never moves the camera for the app's overlays; the app never
  frames on its own.** A key card growing or a page closing is not a reader asking. Insets only
  shape the next fit.
- (2026-10-17) **Canvas keys are a catalog fact** (`CANVAS_KEY_DESCRIPTORS`): the controllers read
  it, so the shortcuts list and the keys cannot drift, and the app does not copy element keys.
- (2026-10-17) **A palette the element ships is offered, not chosen, when choosing it would change
  an existing binding's drawing.** A consumer's own list (`groupPalettes`) is how a covering
  palette is picked without a changed default.
- (2026-10-14, round 6) Element additions, all additive: empty rows for starting rows, run
  `restoreLayer`, binding `otherwise`, value labels, preview palette and defaulted parts,
  proposeEncoding range fits, project palettes, `ties` on top N, descriptor `modifies`/`step`,
  in/out degree histograms.
- (2026-10-12) **One list of readable values** (`data.readableValues()`), run fields described
  by the same walk as data columns; one `columnFits` for picker and encoder. Two checks of one
  question produce this project's worst defects.
- (2026-10-12) **The style tree rides on the stack array**, so undo carries it with no new slice;
  order lives in the tree and other verbs' placements are reconciled into it; a hidden row reads
  as disabled only where painting is decided; the reader's lock refuses content edits only
  (`E_LOCKED`).
- (2026-10-12) **Changing a row's kind keeps the row** (`writeRow(id, { target })`); the rule is
  carried across kinds (`incident`, `ends`).
- (2026-10-12) **Starting rows on in the app** (`startingRows: true, runPlacement: "top"`) for
  every project opened after the workspace starts; a story's own project is left as its maker
  set it.
- (2026-10-11) **Study rules live where every caller passes** (`real.mjs --start` holds the gate
  and the slot wait). Answer-key facts live in `answers.md`, never in the tool.
- (2026-10-11) **Fix in the owning package; one change per problem; words at rest never rise.**
  A word count is diffed by word against the limit's own build before any word is cut.
- (2026-10-10) Owner decision: a chosen segment keeps Figma's face, never an inverse fill.
- (2026-10-10 to 10-11) Older standing calls: a warning that changes what Load does is part of
  Load's description; the table follows the drawing by the element's own scope; a rule names a
  column through `rulePath`; a command with nothing to do is disabled with a reason; leaving the
  step editor saves a whole rule.

## Thinking

- (2026-10-17) The no-reframe rule trades one surprise for another: a key card can now cover
  nodes (College football, left edge). If the studio sees readers lose nodes under the card, the
  fix is the card's place or size, not a camera move.
- (2026-10-17) "Keys polled per frame" hid taps for 2D pan and 3D turns too; any per-frame input
  needs a "pressed since the last frame" record.
- (2026-10-10) The dry run must walk what participants do, not last round's list; pilot each
  task on the candidate build and keyboard-press every control before freeze.
- (2026-10-10) A finding that traces to the prompt's own words is fixed in the prompt. The
  simulation understates costs a person pays; weigh those findings up.

## Tried: worked / did not work

- (2026-10-17) DID NOT WORK: wrapping Tab across the whole document while a Mantine Popover was
  open: its `trapFocus` did not claim Tab, so Tab from Run went to Main menu. WORKED: wrap inside
  the open `[role=dialog]`.
- (2026-10-17) Found: a blank Everything row (no `editableBase`) auto-opens Which nodes and moves
  focus to Add a condition on a tree click, so F6 from "the row" started in the inspector. A
  test must assert where focus is before the key it tests.
- (2026-10-17) Found: real.mjs steps took 30 s each on the start screen after Cancel on a Data
  page (the settle waits); unrelated to focus, not chased.
- (2026-10-17) WORKED: proving a fix in a file other agents had edited: build "theirs" as the
  working file with only my blocks swapped back to HEAD's, check that `diff HEAD theirs` plus my
  hunks equals `git diff HEAD`, swap, run, restore only if the file is still byte-equal to what was
  swapped in. Stage HEAD plus `diff -u theirs mine` as a blob. Run prettier on the staged blob:
  the pre-commit hook skips a file with unstaged changes.
- (2026-10-17) DID NOT WORK: a notes edit keyed on the first item's text; another agent had added
  a "0." item above it. Insert under the heading and renumber the whole list.
- (2026-10-17) WORKED: reaching a deep state for a --sr walk with a setup file of clicks (setup
  clicks run even in screen-reader mode); `--key Escape` in a setup can close a form the pointer
  walk needed open, so pilot the setup on a pointer session first.
- (2026-10-17) Other agents in the worktree copy HEAD over shared files to prove their tests and
  copy back: my edits vanished and came back mid-session. Re-check `git diff` on a shared file
  right before each edit and before staging; stage hunks with `tmp/spoken-messages/hunks.py`.
- (2026-10-17) DID NOT WORK: swapping HEAD copies over shared files (WhichPicker, PropertyRow) to
  prove a test fails: other agents' uncommitted hunks in those files ride along and could be lost
  if they edit during the run. Safe only for files no one else has touched (`git diff` first).
- (2026-10-17) WORKED: a `focusin` listener logging a short stack per focus change found the
  thief (`PropertyRow.tsx` rAF) in one run.
- (2026-10-17) DID NOT WORK: walking a just-opened Mantine list in `setTimeout(0)` alone; a
  type-ahead run kept across fields joined a previous test's "g" into "gpent".
- (2026-10-17) DID NOT WORK: `setDraft(x); input.select()` in one handler: React redraws the
  controlled value after the select and the caret lands at the end. WORKED: `flushSync`.
- (2026-10-17) WORKED: proving five new userEvent tests fail on HEAD by copying the old sources
  over the changed ones (`git show HEAD:<file>`), running, and copying back.
- (2026-10-17) WORKED: reproducing each acceptance item with real.mjs on the fresh build and
  pixel-diffing the canvas before and after a step; it showed the Cancel case had a residual
  6 px slide after the reframe was gone. DID NOT WORK: `engine.resize()` before the 3D inset
  shift (a guess at a stale render size); the slide came from insets read off the hidden canvas.
- (2026-10-17) DID NOT WORK: `{ ...keyboardEvent }` to copy an event (its fields are prototype
  getters; the spread is empty). Pass the fields by name.
- (2026-10-17) WORKED: a run-group palette test with a fake community executor
  (`createGraphSession({ runs: { execute } })`, as `groups-as-layers.test.ts` does).
- (2026-10-12) WORKED: staging my hunks out of files other agents were editing: HEAD plus my
  `-U0` hunks as a blob (`git hash-object -w` + `git update-index --cacheinfo`), an isolated
  tree from `git archive` for tsc and tests.
- (2026-10-12) WORKED: audit walks as one Playwright script per size through `with-browser.sh`
  with a `measure()` after every screenshot (clipped text, overflowing inputs, overlaps).
- (2026-10-12) WORKED: owner-review pictures from stories (`StylePanel.stories.tsx`,
  `capture-review-stories.mjs`), reaching each state by clicks in the play function.
- (2026-10-12) Never `open(p, "w").write(f(open(p).read()))`: the write truncates first.
- (2026-10-11) Did not work: bars.mjs on two builds at once (more than four browser slots);
  writing test data from memory (copy fixture rows from the file).
- (2026-10-11) A first real-element run after vite re-optimizes dependencies can fail every file
  with "Failed to fetch dynamically imported module"; rerun once before reading anything into it.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
