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

0. (2026-10-19, style fields: Tab, remove, Escape; graphty `style/PropertyRow.tsx`,
   `style/useFocusLine.ts`; compact-mantine `inputs/useNumberField.ts`, `inputs/DiscardNote.tsx`)
   Mechanism of the Tab bug: the box writes in its blur handler; React renders that write in the
   microtask between focusout and focusin, so the control Tab was going to (the bind button) is
   replaced before focus lands, focus falls to the page, and the old `useFocusKept` (or the
   focus guard's rescue, which picked the Style tab) sent it back. Now `useFocusKept` remembers
   the control focus is on OR going to (focusout's `relatedTarget` inside the line), in module
   state so a line in a remounted tab (a selection's first value makes its layer) takes it up,
   and restores the control of the same aria-label, else the line's field (that keeps Undo of
   Stop varying landing in the field). `useFocusLine`'s pending ask is answered when the line
   already holds focus. Remove: `PropertyRow`'s remove calls `focusSectionNext`, which now asks
   for the section's `[data-plus]` itself, never the line sliding up. Escape discard: one shared
   `DiscardNote` (a mounted VisuallyHidden status plus an aria-hidden visible copy) in
   CompactColorInput, StyleNumberInput and ComboInput; `useNumberField` returns `discarded`.
   Words reuse `labels.colorEditDiscarded`. Tests: FocusAfterWriting (Tab on a new and a set
   width, selection color Tab, Remove+Enter on Paint and Everything, Escape in width and color),
   Labels (settings Size Escape), compact-mantine StyleNumberInput, ComboInput, CompactColorInput.
   Walk: `design/ui/studio/tmp/r1-dry1-style-field-focus/again/` 03-06, 10-11. Polish left: the
   number box's note wraps in the 110 px field and pushes the line (and Label settings' Size
   row) down; a full-width note under the line would read better.
1. Earlier 2026-10-19 entries (why-this-look lands, layer list into view, a grid is one Tab
   stop, re-walk of three fixes, find box words and keys, inspector heading focus ring, Analyze
   filter Tab, selection announcements by name) in full in
   `git show e0482cf5e:design/ui/studio/notes/engineer.md`, Top of mind 0 to 7.
2. Earlier 2026-10-19 entries (inspector after Undo and `useChosen`, Select all with Mod+A,
   table Show in table and sorting, F6 regions) in full in
   `git show 1c6a68ee4:design/ui/studio/notes/engineer.md`, Top of mind 5 and 6.
3. Earlier 2026-10-19 entries (Quick actions' label line, condition card keys, one name per
   control, Style nodes reason, label count and selection ring) in full in
   `git show d60b1956b:design/ui/studio/notes/engineer.md`, Top of mind 0 to 1b.
4. STILL OPEN (2026-10-19): compact-mantine `colorWord` calls Kelly's pink E68FAC (hue 340) "red".
   Fix idea: boundary between 340 and 344, or lightness too, with E68FAC in the test. In full:
   `git show 3db58912a:design/ui/studio/notes/engineer.md`, Top of mind 0.
5. Earlier 2026-10-18 entries (find box words, keyboard stops and Escape, screen-reader names,
   summaries and the Data place, focus after a style line, shape list typing and the color picker,
   labels on the drawing, framing and hover, keys and focus, filter steps, layer panel words, redo
   of a run): Top of mind 0c to 6 of `git show e247f1900:design/ui/studio/notes/engineer.md`.
6. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
7. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
8. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
9. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
   graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
   unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
   refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
   is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
10. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
11. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
    `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
    round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
    built: number card histogram for a run field, "lowest N", dashed chips at rest. One
    BoundValue for one layer and for several (owner 2026-10-16).
12. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused by
    `styles.add` (`E_BAD_LAYER`) but `styles.addRow` takes an empty row of any target (2026-10-19); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
13. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

- (2026-10-19) **A redrawn line restores focus by the control's name, else its field.** The name
  survives a redraw for buttons (bind, remove); a box's name changes with its state, and the
  field is where a box's focus belongs anyway. By position failed the Undo of Stop varying.
- (2026-10-19) **A discard note is spoken by a live region that is always mounted and shown by a
  copy hidden from assistive tech.** A region that appears with its words is not reliably read;
  showing the region itself would read the words twice or need its own layout slot.

- (2026-10-19) **Select all means the whole drawing: every visible node and the edges among
  them**, through `{ scope: "visible" }`. A node a filter hides is not one the reader can see
  selected. Two-way door: a node-only variant would need a new element target.
- (2026-10-19) **A tooltip and its control's name are one string in code**, so they cannot
  drift; the longer words win ("Stop varying node size by data: use one value for all"), and
  tests match the name by its start.
- (2026-10-19) **Check what the study tool reads before changing a name.** Its candidate list
  used `aria-label || innerText`, so an `aria-labelledby` group read as all its text ("Shape
  Shape Size"); the app was right and the fix was the tool's.
- (2026-10-19) **A pressed switch over nothing says so; a default-on switch over nothing stays
  quiet.** Only the reader's press is a request, so only it shows the empty key's line.
- (2026-10-19) **A key row no element shows is no row, whatever hides it.** "covered by X" kept a
  value the reader cannot find on the canvas; the Style panel already names the covering layer.
- (2026-10-19) **A layer's kind is the union of its looks and its conditions.** A condition is
  the reader building that half as surely as a look is.

- (2026-10-18) **A finding against an older build is checked against HEAD before any code.** The
  Analyze findings (Enter, tooltip, run message) came from pilot screenshots of build 58556989e;
  117 commits later all three were fixed and tested, so the right change was none.
- (2026-10-18) **The key reads which values a layer holds from `styles.groups`, fixed in the
  element.** Its count claimed the layer's elements and gave the graph's; computing per-layer
  counts in the app (or via `preview({ within })`) would have worked around a documented defect.
  Display order and which rows to show stay the app's, so ordering the key like the table is app
  code. **A row counts the half being built**: a condition with nothing set yet is what the reader
  is making, so "Node and edge layer, 63" on a node card at 0 of 24 was false.
- (2026-10-18) **The app names a rule's columns through the element, not by parsing.** The rule
  language is the element's; `renamePaths` already rewrote paths for `checkRule`'s suggestion, so
  exporting it was the smallest additive door. Structure values had no name fact anywhere (panels
  hard-coded "Degree"), so `data.structureValues()` was added beside `readableValues()` rather
  than into it: new entries there would change an existing call's result. The example rule stays
  in rule text (bare column names), since it teaches what to type.
- (2026-10-18) **After a corrected rule runs, the box keeps the reader's words.** Writing the
  corrected path into the box put `=graphty.degree > 10` on screen, the very path the reader never
  sees elsewhere. Whether a bare name should read the structure stays the owner's question.
- (2026-10-18) **`picked` adds to aria-selected rather than replacing `current`'s.** Tests and the
  combobox pattern read the current option as aria-selected; a picked row is marked too, with a
  visible check so the mark is not color alone.

- (2026-10-18) **An unset select holds no value; its default is the placeholder.** A check must
  mean "set here", and Mantine will not fire a pick equal to its value, so holding the default made
  the starting value impossible to choose. Reverses "the value beneath carries the same check".
  Cost: code that read the unset input's `.value` reads "" (one graphty test); recorded for the
  owner as not blocking.
- (2026-10-18) **An own walk timer in StyleSelect fought the shared type-ahead.** Walking to the
  default from `onDropdownOpen` raced Mantine's own open update (it runs after and resets the
  store index, so Enter picked nothing while the cell looked lit) and, delayed past it, undid a
  letter-typed open. One shared notion of "the option a list opens on" (`inForce`) fixed both.
- (2026-10-18) **A dead stop leaves the Tab order; a dimmed command stays.** A full "+" adds
  nothing and its lines are their own stops; Undo with nothing to undo is still the command the
  reader looks for. Reverses the earlier "every + is a Tab stop" call (tests updated).
- (2026-10-18) **A condition card's undo step is one finished change, not one open.** Typed then
  dragged was one step, so Control+Z threw away the typed value with the drag. Typing that writes
  per keystroke (a text card) still merges while focus stays in that box. Reverses "each
  open-and-close is one undo step" (tier3 design 2026-10-16).
- (2026-10-18) **Undo's accessible name says what it undoes.** Reverses "the accessible names stay
  the verbs": a screen reader hears the tooltip's words only on hover, so the name carries them.
- (2026-10-18) **Escape clears the selection in the inspector except in a field.** The canvas
  menu promises "Clear selection Escape"; a heading or a button holds nothing Escape could undo.
- (2026-10-18) **The next stop is found by page order from the opener's toolbar,** not by the
  opener's index among Tab stops: a roving toolbar has one stop, which may be another tool.
- (2026-10-18) **The caret's tooltip is fixed in placement, not given a fixed side.** Every side
  covers something in a tree; weighting the row's own words generalizes the own-heading rule.
- (2026-10-18) **Group colors go in a bound pill's name, not its description.** The study tool
  and many screen readers read a description late or not at all, and the chits are not controls;
  the name is what Tab lands on. Order is facts then groups so `^... colors$`-style names became
  `...: ` prefixes in tests. Applies to every categorical line (shape and Layer pills too).
- (2026-10-18) **A merged key section takes no name,** rather than labelling the row: one element
  says "Color: Poster". `CanvasOverlays.test` finds the section by role inside the Legend.

- (2026-10-18) **A larger selection disables a node-reading analysis rather than opening it
  empty.** An open form with Source and Sink unset has no way to fill them (the Analyze form reads
  ends only from the selection), so Run would only refuse; the row's reason says what to do.
  Applies to every algorithm whose options read nodes, not only Most flow.
- (2026-10-18) **Id columns are told apart by the element's `holdsNodeIds` / role `key`, in the
  app's words, not by the element dropping their mean.** Changing what `selection.statistics()`
  returns would be breaking; which statistic a reader sees is the app's choice.
- (2026-10-18) **Category gets its own icon (Boxes) instead of text losing Aa.** The read-the-file
  page and the summary already call such columns categories; one icon per concept.
- (2026-10-18) **Focus is kept by the line, not by `useFocusLine`.** The tab was never redrawn
  (the walk and a DOM identity check showed the tab, section and line elements unchanged); only
  the control inside the line was replaced. Making every control one component across waiting,
  set and bound would be a large rewrite; a line that takes focus back whenever its own focused
  control leaves the page covers every swap (first value, Undo to a binding, any later one) in
  one place. It acts only when focus fell to the page, so a caller that placed focus wins.
- (2026-10-18) Further dated decisions (tooltip weighting, labels on the drawing, the key's
  room, the filter step reusing the condition card, refusing Highest above the count, chip
  nouns, "Edit edges", condition-change names, bulk-step counts, `pickColor` casing, the open
  sample's URL, canvas-click drops, counts versus name room) in full in
  `git show b824a5e61:design/ui/studio/notes/engineer.md`, "Decisions and reasons".
- (2026-10-18) **Staging a shared file by HEAD line numbers, never `git apply --cached -U0`.** A
  zero-context hunk applied after a skipped foreign hunk landed 18 lines off (StylePanel would
  not parse). `hunks2.py` in `tmp/r1-dry2-r1-3-10` rewrites HEAD's lines bottom-up and stages
  the blob; check the index by `git checkout-index --prefix=graphty/tmp/<dir>/` and `tsc` on it.

- Ten decisions of 2026-10-18 (focus after an open, "Same size at any depth", "+" never writes,
  the node "+" start, a list closing on focus leaving, "Selected" said per cell, already-met items,
  key line names) are in full in `git show 28e989215:design/ui/studio/notes/engineer.md`.
- Thirty further decisions of 2026-10-18 (color box, redo of a run, inspector summaries, the key's
  room, find box words, focus) are in full in `git show e6e1d1616:design/ui/studio/notes/engineer.md`.

Older decisions (28 entries, 2026-10-17 to 10-18) are in full in git: `git show 14b7a7606:design/ui/studio/notes/engineer.md`.

## Thinking

- (2026-10-17) Tooltips on focus keep costing keys: they cover the next control and (until today)
  ate Escape. If another tooltip defect comes up, ask whether an icon button with a visible
  pop-out title needs a focus tooltip at all.
- (2026-10-18) If the reserved key column reads as wasted room on a graph with no key, reserve it
  only while the key has entries and frame once when it first appears; never fit on its growth.
- (2026-10-17) "Keys polled per frame" hid taps; any per-frame input needs a "pressed since the
  last frame" record.
- (2026-10-10) The dry run must walk what participants do; pilot each task on the candidate build
  and keyboard-press every control before freeze. A finding that traces to the prompt's own words
  is fixed in the prompt.

## Tried: worked / did not work

- (2026-10-19) Worked: tracing focusin/focusout plus a MutationObserver on `[data-line]` inside a
  real-element test showed the gap (focusout at 167 ms, the target replaced, focusin on the
  restored copy at 307 ms). Did not work at first: restoring by the held control's index -- after
  Stop varying the index pointed Undo at the restored Stop varying button instead of the field.
- (2026-10-19) A walk on `graphty/dist` showed the old behavior once because another agent
  rebuilt `graphty/dist` between my build and the walk (the dist then vanished mid-session).
  Build a private copy for walks: `npx vite build --outDir tmp/<task>/dist` and `REAL_DIST` it.

- (2026-10-19) DID NOT WORK, and cost another agent its uncommitted notes edit: `open(p, "w").write(f(open(p).read()))` in Python truncates the file BEFORE it reads it (the write target is evaluated first), so the read is empty. Read into a variable first, then open for writing. The lost edit (a condensation of Top of mind) was redone from its transcript.
- (2026-10-19) Did not work: Tab in Analyze's filter calling `open()` with only `preventDefault`:
  the card opened but focus sat on Back, because the focus trap's document listener still saw the
  Tab. Worked: also `stopPropagation`. The first test only checked "focus inside the card" and
  passed on the broken version; it now asserts Run.
- 2026-10-19 Tooltip text as the only hint after a click: did not work (Mantine closes the
  tooltip on click and keeps it shut while the pointer stays); the hint also goes on the button
  as `aria-description`, and the tooltip shows it again on the next hover. Worked.

- (2026-10-19) New layer from selection as `addRow` of one kind with nothing set: DID NOT WORK at
  first -- the element refused it ("writes no channel"), caught as a notice; the screenshot of the
  failing test showed "The layer could not be made". Fixed in the element, not the app. Focus on
  the Style tab after a menu command: a `requestAnimationFrame` after the store write WORKED
  (the menu's own focus return runs on close, before the awaited add resolves).
- (2026-10-19) Swapping the tree's checkbox for `Checkbox.Indicator` (no input): did not keep
  the themed look (the theme styles `Checkbox` only), so kept `Checkbox` inside `aria-hidden`.
- (2026-10-19) A page-level live region for a list's message. DID NOT WORK: any always-present
  `role=status` in `document.body` collides with consumers' own `getByRole("status")`. Put the
  region in the open surface it belongs to, made lazily, words one frame later.
- (2026-10-19) Reproducing a pilot screenshot on the frozen build BEFORE fixing showed that one of
  three tooltip findings was misread (the Tab-out "Shape box" tooltip belonged to the next
  button). WORKED. A rule keyed on an ARIA link silently skips every control that overwrites
  the link; floating-ui's middleware state (`state.elements`) is the dependable pairing.

- (2026-10-19) An in-page probe that measures label WORDS on screen and compares them with the
  declutter's own rectangles (they matched to the pixel) settled "is the count lying?" in one run:
  it was not; the rule was too strict. WORKED. A zoom in perspective scales world-sized labels and
  their gaps together, so a count can only move with zoom through a rule fixed in pixels.
  Wheeling out past the fitted view did not zoom further in the probe (zoom3 equals the start).

- (2026-10-18) Did not work: queuing a real.mjs `--start` while four pilot sessions hold every
  browser slot. The start blocks with no output; a `timeout` around it kills the client but leaves
  the queued `--serve` process (kill it by pid). Worked: the real-element test as the check.
- (2026-10-18) Did not work: a one-size rule that compared `swatch.size` with no `size` set hid
  every size ramp in a unit test (undefined === undefined); scoped to category blocks with a size.
  A covered line named "Shortest route" (the element's layer name) where the key names the run as
  the Analyze list does; naming a run's layer by `runName` fixed it.
- (2026-10-18) Undo's reason after the press that dimmed it: WORKED by un-dismissing the same
  tooltip element when its trigger turns off. Not tried and rejected on reading: a `key` on the
  Tooltip to remount it, which remounts the button and drops keyboard focus to the page. The
  condition-card step split keyed on `document.activeElement` alone merged a Tab-committed "from"
  with the next commit in "to" (the Tab had moved focus there); keying on a box that holds its own
  typing (`hasPendingEdit`) WORKED.

- (2026-10-18) Did not work: proving the Enter-says-No-match test by waiting for the first "No
  match" announcement. The old box spoke twice while typing (unsettled, then with the example), so
  the second arrived after Enter and the test passed on the old code. Waiting for the settled line
  ("To select by a value") before Enter made it fail on the old code and pass on the new.
- (2026-10-18) Worked: compact-mantine's States play test strips the "on" attributes and expects
  the drawing to change; a fill keyed on a new `data-current` failed it, `data-active` (an "on"
  marker it knows) passes.

- (2026-10-18) Mantine's Select calls `onDropdownOpen` BEFORE queuing its own
  `updateSelectedOptionIndex` timer, so a timer set in `onDropdownOpen` runs first and is undone:
  the cell stays lit (DOM attribute) while the store index is -1, and Enter does nothing. A
  document listener's timer is queued after React's handlers, so it runs after Mantine's. Seen in
  the walk (w1/12: Enter left the grid open), reproduced by a FieldStates test. WORKED once moved.
- (2026-10-18) A layer added on nodes and edges is held as two layers with one name (edge part
  `set: null`): find a layer's write by name AND the channel, not the first by name.
- (2026-10-18) Selecting Les Miserables' node "0" (its gml id) opened nothing: the element keeps
  other ids. Take ids from `session.data.nodes()`.
- (2026-10-18) A tooltip test failed only in a full file run: `findByRole("tooltip")` waits 1 s by
  default, the theme's open delay is 1 s, so it raced. Give it the hang guard. WORKED.
- (2026-10-18) Seen, not mine (fail on HEAD's sources too): KeysLeaveNothingOpen "Tab from a
  card's value reaches the card's remove button" (the remove moved after the header in 9f8c35c76)
  and FocusAndTabOrder "Tab out of the Vary by list" (focus returns to "Node size by attribute").
  `UnsetLine.real-element` (untracked, another agent) stops graphty `tsc`; walk build used
  `vite build`. "Done on a new layer" failed once on the first, cold run of two files (13.8 s,
  message lost) and passed on four warm runs, mine and HEAD's.
- (2026-10-18) Proving failure by copying HEAD over my four files for one `-t` run, then copying
  back, WORKED; check `git diff --stat` after, since another agent committed TableDock meanwhile.
- (2026-10-18) Worked: a document `focusin` listener logging `new Error().stack` names who moved
  focus. Staging only my hunks of a shared file: `git merge-file` into a private index (details
  and every older entry: `git show d714c8530:design/ui/studio/notes/engineer.md`, "Tried").
- (2026-10-18) After a commit from a private index the shared index still holds the old blobs, so
  `git status` shows my files staged backwards and another agent's commit would revert them. Put
  HEAD's blobs back for my paths only: `git update-index --add --cacheinfo <mode>,<blob>,<path>`
  from `git ls-tree HEAD -- <path>`. WORKED (status clean after).
- (2026-10-18) Found, not fixed: graphty-element `real-input.test.ts` 3D wheel zoom-out symmetry
  fails every run (1.4045 vs 1.4366); needs its own unit.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18, second re-ask) Truthful counts again: still landed (97d8bff7c, swatch and Color
  line; 52cb47a85 `builtParts`). The pilot screenshots cited were taken on build 58556989e, older
  than both. On the tip, whose `graphty/dist` equals the frozen build tier3-r1d3-52cb47a85a byte for
  byte, `TruthfulCounts.real-element` (2) and `LayerRowAndKey.real-element` (5) pass. `groupMarks`
  in `StyleTree.tsx` reads the swatch from the layer's `set`/`encode` only, never its selector, so
  a gained condition (T48B) keeps it as well as a lost one. Check a pilot folder's
  `session.json` `commit` before treating its screenshots as current.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.
