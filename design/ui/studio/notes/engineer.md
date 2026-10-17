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

Summarized again 2026-10-17 (25.6 KB). The long entries for names and words, focus and Tab
order, the number card, spoken messages, focus after adding, the color box and drawing and camera
are in git: `git show afc2ee150:design/ui/studio/notes/engineer.md`.

1. (2026-10-17, undo, graphty) A graph opened as a new project starts its history: the app calls
   `session.history.clear()` once the open lands (sample: `Workspace.tsx` after `opening.load`;
   Data page load with intent "new"; a fresh non-project document in `openInSession`; a project
   file clears itself in the element). `project.dirty` stays false after the clear (the element's
   save point follows `clear`). Adding data to an open graph stays undoable. Undo notices name the
   act: "adding the layer Cosette"; a batch with no label names its ops ("changing settings and
   importing data") from `HistoryStep.ops`, never "2 changes". A text box keeps Control+Z and
   Control+Shift+Z while it holds typing since it was focused, Enter included; focus and Escape
   hand them back to the app (`trackPendingEdits` in `keys/keys.ts`). Clear selection is disabled
   "Nothing is selected" with an empty selection. Test `frame/__tests__/UndoHistory.real-element.test.tsx`.
1. (2026-10-17, condition lists) Add a condition (`AddCondition` in `WhichPicker.tsx`): typing
   makes the first match active (`selectFirstOption` in an effect on the typed text), the search
   is `role=combobox` with `aria-controls` (the Options' own `id`), `aria-activedescendant` (my
   state: Mantine's own is set only by its arrow handler, so the search runs
   `withKeyboardNavigation={false}` and handles arrows, Enter, Escape and Tab itself) and
   `aria-description` "N options". Tab closes the list and moves focus to the button first, so the
   browser's Tab moves on from there (Shift+Tab is prevented and lands on the button); the list
   is `tabIndex=-1`. Width = the `.ws-which-open` column's width on open, so it never passes the
   inspector. Cards: Enter in a `[data-enter-done]` box (text card, number box) that is not
   `aria-invalid` closes the picker as Done (`isDoneKey` on the region); Done only with a card;
   an unfinished card shows the layer's matched count (`without`). Element (additive):
   `holdsNodeIds` on `AttributeDescriptor` and `ReadableValue` (every node's value spells its
   id); `cardFields` drops such columns so "Node id" is listed once. Test
   `style/__tests__/ConditionLists.real-element.test.tsx`; element `readable-values.test.ts`.
2. (2026-10-17, yes and no, graphty) A yes-or-no column reads one way everywhere. graphty-element
   types it `AttributeDescriptor.type === "boolean"` (measurement stays "categorical"); the app
   reads that fact, never the values. One helper set in `inspector/words.ts`: `yesNoWord`,
   `valueWord(value, type?)` (a boolean, or "true"/"false" text of a boolean column, as Yes/No:
   selection statistics and rule values come over as text), and `valueText` (node values).
   Used by the node inspector, the selection summary, Find's hit and value rows, the load preview
   (`DraftColumn.type`) and filter-step words (`Namer.value`). Data place and the attribute
   inspector: `typeOf(measurement, type)` gives glyph `yes-no` (`GLYPHS.yesNo` = ToggleRight),
   "Yes or no"; the attribute header now draws its row's type glyph. Filter step on a boolean
   column: a Select of Yes/No (values "true"/"false", starts at Yes, as the style card does),
   rule `categories ["true"]`, which the element's `inCategories` matches on `String(value)`.
   Test `data-place/__tests__/YesNo.real-element.test.tsx`; walk on a fresh build
   `design/ui/studio/tmp/r1-dry1-yes-and-no/walk1` (preview Yes/No, icon, "trained is Yes" 24 to
   15, inspector Yes, "Yes (15)", Find "trained: Yes").
    - Open: Find matches a boolean by its raw text, so typing "yes" finds nothing while every
      row says Yes. The words are the app's, the matching the element's: needs an element answer
      (match a boolean on words the consumer supplies?) before the app can do anything.
    - Seen, not mine: graphty `DataPage.real-element.test.tsx` 7 fail at a select pick with
      `pointer-events: none` -- the uncommitted compact-mantine `cm-pointer-still` rule in
      StyleSelect/inputs.css (a list opened under an unmoved pointer); userEvent clicks without
      moving first. Commit 660c58f96 took my three FindBox lines before `valueWord` existed.
3. (2026-10-17, find box; commits 4736d4836 element, 81b72a941 compact-mantine, 660c58f96 app,
   ef95e565f placement fix) Checked on a fresh build (`design/ui/studio/tmp/r1-dry1-find-box/`
   walk1 Les Mis, walk2 sources.graphml, walk3 lesmis-poster; test
   `graph-place/__tests__/FindBox.real-element.test.tsx`, element `test/session/rule-check.test.ts`):
    - `selection.checkRule(where)` (element, additive): unknown paths, candidates by plain or
      technical name, `suggestion` = the rule rewritten when each has one candidate
      (`renamePaths` in `predicate.ts`). The find box says "No column named ..." (with "Did you
      mean:" and the rewrite as the Enter option) in its 200 ms check and on Enter.
    - `selectorRule(sel, { comparisons: true })`: >=/<= range, > threshold `above`, bare name =
      `data.<name>`; `<`, a text order, `id` and a lone name stay expressions. Default unchanged.
      Cards read find rules through it; threshold-above and an expression leaf are fixed cards
      with words ("Degree above 16", "Rule: hours"). `selectorName` (cards.ts) names a find-made
      layer from its cards: "donations 10000 or more", "shared_chapters 5 or more" (edge card,
      no Ends card).
    - Find list: `listOpen`; a capture `pointerdown` outside and focus moving to another control
      close it; typing, a click in the box and the arrows reopen. compact-mantine `SearchInput`'s
      clear button clears on Escape. Mod+F on `find.focus`, which also selects the box's text.
    - For the owner: a bare name reading a run's field (breaking), and comparisons by default.
    - Not mine: ConditionCards "Style edges, on in 0 of" fails on another agent's KindSwitch label.
4. (2026-10-17, earlier today, details in git as above) Names and words (`FIND_ATTRIBUTE`,
   `valueFact`, `bindLabel`); focus never falls to the page (`installFocusGuard`, F6 panels);
   number card drafts (`NumberCard`, never hands the element a range it refuses); one status line
   in `Workspace.tsx` (`store.set({ announcement })`, `useAnnounceChange`); `keystrokeTarget` for
   focus after an add; color box Escape and refusals; drawing and camera (null color repaint, no
   card framing, `held` + `tapped` keys, `zoomToPointer`).
5. (2026-10-17) Opened projects lost their rows: anything keyed by a layer id that a document
   carries must be remapped on apply (`documentRowKeys`, commit 619ce32be).
6. (2026-10-17) Combined Style panel (V7 tabs, condition cards, several layers) is built; files
   `style/cards.ts`, `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text
   field never round-trips through the element; one undo step per open is
   `TransactionOptions.after`. Not built: number card histogram for a run field, "lowest N",
   dashed chips at rest.
7. One BoundValue for one layer and for several layers (owner decision 2026-10-16); Layer is a
   temporary value, a data field is copied as is. Vary by Layer uses the same group list as a
   data value (`GroupRows`, `styles.layerGroups`).
8. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement, never
   `hunks.py` when another agent's hunk sits above mine (see Tried); read `git diff --cached`
   before every commit. Never `git stash` (not even `list`) in this repo's agents.
9. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run the test, copy back. Check a "passes without the fix" test before trusting it (the
   histogram test passed on HEAD at 8 bins because 16/8 happened to be whole).
10. graphty tests read compact-mantine from its `dist` and graphty-element from source; rebuild
    the app (`pnpm exec nx run graphty:build`, Sentry vars unset) before a real.mjs walk; a
    session serves the dist it started on, so end and start again after a rebuild.
11. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
12. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`.
13. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names; step N lands in screenshot N+1; `--end`
    always. Compare screenshots with PIL `ImageChops.difference(...).getbbox()` on the canvas
    crop (`(300,120,1195,835)` at 1440 x 900) before calling a drawing unchanged.

## Decisions and reasons

- (2026-10-17) **Opening is not a change.** A new graph's history starts after it is read, so
  one Undo too many never unloads the graph; the app clears history (the element's public
  `history.clear()`), the element's own project-file open already did. Evidence: pilots T39A,
  T45A, T49A/B emptied the graph with one Control+Z and read "Undid 2 changes."
- (2026-10-17) **Typing is the text box's to undo, Enter included.** Enter ran the typing (a
  find, a value) but the reader still sees it in the box; Control+Z there undoing an app step
  out of sight was the defect (T49B find box). Escape (the box dropped the typing) and focus hand
  Undo back to the app, so "type, Escape, Control+Z" still undoes the app step.
- (2026-10-17) **A list's search is a combobox that names its first match as active, and Tab
  never enters the list.** Every pilot that typed a field name and pressed Enter got nothing (the
  Mantine search selects only on an arrow key); Tab landed on the scrolling listbox. The list is as
  wide as the column it adds to. A data column that only repeats the node ids is the element's
  fact (`holdsNodeIds`), and the app lists that thing once, as Node id.
- (2026-10-17) **Enter in a card's text or number box is Done**, unless the box refuses what it
  holds; Done shows only when there is a card to finish.

- (2026-10-17) **A yes-or-no column is known by the element's `type`, never by its values.** The
  app maps only a boolean, or "true"/"false" text of a column the element types `boolean`, to
  Yes/No. The data table already said Yes/No (compact-mantine `labels.yes`); every other place
  now matches it. The filter step keeps the element's spelling ("true") in the rule and shows Yes.

- (2026-10-17) **A rule over a column nothing answers is refused with words, never "Nothing
  matches".** The element reports it (`checkRule`) with what it may have meant; the app words it.
  Making a bare name read a run's field is the owner's call (it changes what existing rules match).
- (2026-10-17) **A wider reading of an existing public function goes behind an option** whose
  default keeps today's return (`selectorRule` comparisons); flipping the default is the owner's.

- (2026-10-17) **One name per control, from one function.** The Vary by button, its tooltip and
  its pop-out title all come from `bindLabel`; both attribute lists from `FIND_ATTRIBUTE`; a row's
  fact from `valueFact`. Evidence: three names for one control, two names for one list, in pilots.
- (2026-10-17) **"Not set" only where the field shows nothing of its own.** A value in force (an
  option's default, "Leave as is", a palette's group color) is passed as the value, so its name
  is the value; Reset is disabled while it equals the default, since pressing it changes nothing.
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

- (2026-10-17) WORKED: naming an unlabeled batch from `HistoryStep.ops` through the same
  WORDS map, skipping codes whose words need params (`PARAM_WORDS`). Considered and left: giving
  the element's import batches the import's fact (`session/data.ts`, `draft.ts`), which changes a
  returned fact; after the history clear only an add-with-settings load still reaches it.
- (2026-10-17) WORKED: Tab handled in a portaled list's search by closing it and focusing the
  trigger in keydown without `preventDefault`: the browser's Tab then moves on from the trigger
  (Shift+Tab is prevented so it stays on the trigger). DID NOT WORK: `combobox.selectFirstOption()`
  alone for screen readers: Mantine's `aria-activedescendant` is local state its own arrow
  handler sets, so the search takes `withKeyboardNavigation={false}` and the app keeps the id.
- (2026-10-17) `npm run api:report` failed on a missing `dist/logging.d.ts` (another build in
  flight) after writing catalog and session; staged only my lines from those two reports.
- (2026-10-17) DID NOT WORK: `hunks.py stage` (`git apply --cached --unidiff-zero`) on a file
  where another agent's hunk sits above mine and mine are pure insertions: with no removed lines
  to anchor on, git placed them by line number, shifted by the other hunk. It committed
  `checkRule:` inside a GraphtyError and a helper inside `isBlankRow` (fixed in ef95e565f).
  WORKED: `git show HEAD:<file>` plus my edits by exact string replacement in Python,
  `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`.
- (2026-10-17) `findByText` fails ("multiple elements") on a line the status region also speaks;
  use `findAllByText` there.
- (2026-10-17) "Failed to fetch dynamically imported module" on a real-element run comes while
  other agents edit sources mid-run; rerun once. One find-test failure (1.4 s) did not come back
  in 7 runs; it came right after the same kind of mid-run edits.

- (2026-10-17) DID NOT WORK: `aria-expanded` on a role=option (jsx-a11y refuses it; ARIA gives an
  option no expanded state). WORKED: the state in the option's name.
- (2026-10-17) DID NOT WORK: prettier over a whole `__tests__` folder in the shared worktree (it
  touches other agents' files). Format only my own files.
- (2026-10-17) Shared worktree: another agent's half-edited test (`await` outside async) put a
  Vite error overlay over every real-element test, and a half-edited PropertyRow broke tsc;
  `npx vite build` (no tsc) still built the app for real.mjs. A test that fails with my files
  swapped back to HEAD is not mine (the locked-layer Tab test, "Deleted Louvain" twice).

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
