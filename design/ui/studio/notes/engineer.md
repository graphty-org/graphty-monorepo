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

1. (2026-10-17, labels; commit 611619ee7) Label settings has "Size" (`sizePx`) beside "Size in";
   its vary glyph binds the label's size channel (`vary("sizePx")` -> `kind.size`, as color and
   background). Typed words: the source button reads "Fixed text" and the words get a "Text" line
   on the field column; switching to Fixed text opens the box a frame later (the closing pop-out
   focuses its trigger after the box's autoFocus). `.ws-text-kind` is not measured into the label
   column (`flex: 0 0 auto; min-width: var(--ws-label)`). `ValuePicker` opens on the value in force
   (`QuickActions.highlight`, additive) and closes on Tab. compact-mantine `useEscapeKey`: an
   Escape on a control with an open tooltip (Mantine's floating-ui dismiss stops it on the trigger,
   even while the tip is held invisible) closes the pop-out after dispatch unless something
   `preventDefault`ed it. Tests `Labels.real-element.test.tsx` "a label entry's size, keys, lists
   and widths", compact-mantine `PopoutEscapeTooltip.browser.test.tsx`,
   `quick-actions-highlight.test.tsx`. Walks `design/ui/studio/tmp/r1-dry1-labels/walk1`, `walk2`.
2. (2026-10-17) Today's other fixes, one line each (details in git, see above):
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
3. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
4. Find matches a boolean by its raw text ("yes" finds nothing while rows say Yes): needs an
   element answer (match on words the consumer supplies?) before the app can do anything.
5. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
6. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
7. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
   graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
   unset) before a real.mjs walk; end the session and start again after a rebuild.
8. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
   name and shape; a changed default or a renamed or removed member goes "for the owner". A new
   Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
   `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
9. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
   `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
   round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
   built: number card histogram for a run field, "lowest N", dashed chips at rest.
10. One BoundValue for one layer and for several (owner 2026-10-16); Layer is a temporary value,
    a data field is copied as is; Vary by Layer uses the data value's group list.
11. Anything keyed by a layer id that a document carries is remapped on apply
    (`documentRowKeys`): opened projects lost their rows before.
12. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
13. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.
14. Pre-existing failures seen today, not mine: graphty real-element BindingPopover Louvain names,
    BulkPilot and BulkVary colors, PopoversAndPickers "id", PropertyRows locked Tab, DataPage
    `pointer-events: none` picks; graphty browser `coverage.test` COLOR_BRANCHES and `words.test`
    "Node color by attribute"; compact-mantine Tree story "Keyboard" and figma tree toggles.

## Decisions and reasons

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
