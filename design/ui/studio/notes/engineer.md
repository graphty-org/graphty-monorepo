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

0. (2026-10-19, label count and the selection ring) Measured first with an in-page probe of the
   frozen build (`design/ui/studio/tmp/r1-dry1-labels-overlap-ring/probe.mjs`, word rectangles
   from each label plane's corners): at default size Les Miserables draws NO overlapping words,
   only 3 pairs within 2 px, and at size 96 the count did change with zoom (10 to 8). So "0
   hidden" was honest by the old rule; the reader's "touching" was the defect. graphty-element
   `LabelDeclutter`: `LABEL_CLEARANCE` (3 px) between kept words and from other nodes' circles
   (`isClear`, `coversNode`, the node grid's buckets widened to match), fixed in pixels so the
   camera decides it; `projectNode` sizes a node by `node.label.ringScale` (new getter on the
   unexported `RichTextLabel`, no API change), so a label moved beside a selected node clears the
   ring, not the node. Tests: `label-declutter` "hides a label whose words touch a kept one, and
   shows it again when a zoom opens the gap" (real wheel), `label-clears-halo` "are apart when the
   label was moved beside its node" (both fail on HEAD). Walks w2 (Les Mis: 0 hidden at default
   size with nothing touching, 14 at 96, 13 zoomed in, 14 back), w3 (volunteers at 96: 0 hidden,
   nothing within 3 px; Lucy Grant selected, ring clear, crop w3/15). Red before and after (not
   mine): `label-drawn-over-edges` "draws a selected node's label over its selection ring" (x2).
   Earlier Top-of-mind 0 and 0a (size clamp; Analyze Enter, tooltip, message; labels third
   hand-out): `git show 9ed873a75:design/ui/studio/notes/engineer.md`.

1. (2026-10-18, layer rows and the key agree with what a layer draws: `styles.groups` counted over
   the layer's selector, `rows.ts` `builtParts`, `legendWords.ts` `heldRows`/`coveredLine`) in
   full, with its walks and the tests red on HEAD then, in
   `git show 9ed873a75:design/ui/studio/notes/engineer.md`, Top of mind 1.
   0d. (2026-10-18, undo words and keys) in full in `git show e247f1900:design/ui/studio/notes/engineer.md`, Top of mind 0.
2. Earlier 2026-10-18 entries (find box words, keyboard stops and Escape, screen-reader names,
   summaries and the Data place, focus after a style line, shape list typing and the color picker,
   labels on the drawing, framing and hover, keys and focus, filter steps, layer panel words, redo
   of a run): Top of mind 0c to 6 of `git show e247f1900:design/ui/studio/notes/engineer.md`.
3. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
4. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
5. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
6. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
   graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
   unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
   refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
   is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
7. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
   name and shape; a changed default or a renamed or removed member goes "for the owner". A new
   Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
   `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
8. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
   `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
   round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
   built: number card histogram for a run field, "lowest N", dashed chips at rest. One
   BoundValue for one layer and for several (owner 2026-10-16).
9. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
   expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
   (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
   run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
   in the same stack (`writeRank` in `StylePainter.ts`).
10. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

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
- (2026-10-18) **A tooltip avoids its own section's title by weighting, not by a new default
  side.** In a column of section headers every side covers something (the neighbor's "+" above
  and below, the window edge right, the title left), so the least-covered side won and that was
  the title. Headings now count by their words, and the trigger's own heading ten times, so a
  neighbor's "+" is covered before the title the reader is reading. Shared, so every "+" at a
  section's end gets it.
- (2026-10-18) Labels on the drawing (names off nodes as the app's default, the label clearing the
  ring, the declutter pass forcing world matrices): in full in
  `git show bdd01700e:design/ui/studio/notes/engineer.md`, "Decisions and reasons".

- (2026-10-18) The key's room and its one framing, Frame selection keeping the angle, the hover
  ending on `pointerleave`, `selection:hover-changed`: in full in
  `git show bdd01700e:design/ui/studio/notes/engineer.md`, "Decisions and reasons".
- Four find-box and Escape decisions of 2026-10-18 (the "name == 'value'" example, two-line rows
  in compact-mantine, the list sized to the panel, Escape in inspector fields):
  `git show 10800b21b:design/ui/studio/notes/engineer.md`.
- (2026-10-18) **The filter step reuses the condition card instead of its own condition row.**
  One job, one component: the step's own row took one value and offered only "is" on text,
  while the card already took several and offered contains. Reusing `CardBody` gave the step
  every card fix at once and let two files go. **A new step applies only when added**: a reader
  who never pressed Add step did not confirm it (a pilot left for the Graph place and the drawing
  dropped to 3 of 24 silently). Edits to an existing step still save on leaving, as decided
  earlier; Escape in a typed box first puts the box back, as in every card, then closes.
- (2026-10-18) **Highest above the count is refused, not capped.** Refusing uses the card's
  existing refusal path (text kept, nothing written, reason under the boxes); a silent cap would
  write a number the reader did not type. The inline "There are only N, so this keeps all of
  them" line stays for a stored count above the total (a smaller graph opened later). Switching
  to Highest starts at min(10, total).
- (2026-10-18) **Every chip's count names its noun**, not only Highest's: a bare trailing number
  read as part of any card's words ("donations 10000 to 250000, 9"). No test asserted the bare
  form.

- (2026-10-18) **The other kind's line has one button, "Edit edges", in every state.** Three
  wordings ("Edit edges", "Style edges", "Edges: 0 styles / Edit") read as three controls. The
  state is the text before it ("not styled", "2 styles", "nothing set"); turning a kind on is the
  Edge tab's own "Style edges" switch, one click further, so the line no longer writes anything.
- (2026-10-18) **A condition change is named "changing the conditions on <layer>".** "Which nodes"
  (the step's old label) names a panel, not an act; "changing which nodes 3 nodes styles" read
  badly when a layer is named by its count. The pattern matches "changing node size on Hubs".
- (2026-10-18) **A bulk step counts the layers its write changes.** A Vary-by-layer table edit
  merges into one step that keeps its first label (no element API renames a step), so a second
  group changed in the same open still reads "1 layer". Marked `ponytail:` in MultiRowPanel.
- (2026-10-18) **`pickColor` lowers a label's capital in compact-mantine, not in the app.** Every
  caller passes a title-case label; fixing it where the sentence is made fixes every swatch.
  Recorded under "decided by the team" as a fix of wrong output.
- (2026-10-18) **The open sample is read from `session.data.source().config.url`,** the element's
  record of the import, not the project's name, which a reader can rename.
- (2026-10-18) **A canvas click already said the drop.** On build 5bd16cda6e the canvas click
  unmounts the cards and the notice shows and is announced (T41A detours/35, and a probe on the
  frozen build); the pilot's 36 is a later click on the layer row. No change; every close path
  unmounts `Cards`, whose cleanup says it.
- (2026-10-18) **Rows show counts at the cost of name room.** The count column cut "Picked by hand
  and name" in the list; the default name budget follows the list (17), the narrowest place.
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
