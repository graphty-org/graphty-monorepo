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

0. (2026-10-18, summaries) The inspector says the whole truth: a selection's category row lists
   every value with its count (`attributeSummary` in `inspector/words.ts`), a file column none of
   the selection holds reads "0 of 4 have a value" (`summaryRows`, NodeValues), Degree is a range
   from the element (`SelectionStatistics.degree`, additive); an attribute lists its values
   (`ValueCountRows`, GraphValues, `data.valueCounts`), "Kind" is "Value type"; a stat DataRow's
   name wraps (compact-mantine `tree.css.ts`); a partly filled attribute row puts its fill on a
   second line (`descriptionVisible`); one-value bins read "1: 1 node" (`rangeWords`);
   `formatNumber` (whole parts exact over 1,000) is the key's (`legendNumber`) and the table's
   (`DataTable formatNumber`, additive); an undirected edge's ends are Node A / Node B
   (`edgeEnds` in `table/columns.ts`, also EdgeValues); an unset label color draws an empty
   swatch (`CompactColorInput emptySwatch`, additive). Test
   `inspector/__tests__/WholeTruth.real-element`, element `selection-on-session`. Walk
   `design/ui/studio/tmp/r1-dry2-r1-3-07/w1` (03, 05, 09, 11-14, 19, 21).
1. (2026-10-18) The study build 5bd16cda6e was frozen from uncommitted edits; they are now
   commits d4c279613 (element `canvas:element-click`), babb23528, 3650da1d8, c0199136c
   (compact-mantine tooltips, lists, popout margin and paint reset), 812266215 (inspector),
   40cd76a18 (style), 3a2368f54 (data page) and 6dd52bfa1 (notes). Freeze a study build only from
   a clean worktree (`git status` shows no modified tracked file), so its source is in git.
2. (2026-10-18) Why this look names each line for the style tree row that holds the layer
   ("Louvain / Group 1") and opens that row; tests find the line by what it sets ("Color"), not
   by a run's name. A click on the node already selected brings its inspector back.
3. (2026-10-18) Every fix of the second dry run, in full (labels, undo, inspector and table, key,
   find box, names and words, focus and keys, lists, number card, spoken messages, layer panel,
   shared controls): `git show 6dd52bfa1:design/ui/studio/notes/engineer.md`, Top of mind 0-11.
   Before building a handed-out fix, check `git merge-base --is-ancestor <fix> <pilot commit>`.
4. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
5. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
6. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
   it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
7. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
   graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
   unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
   refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
   is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
8. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
   name and shape; a changed default or a renamed or removed member goes "for the owner". A new
   Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
   `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
9. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
   `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
   round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
   built: number card histogram for a run field, "lowest N", dashed chips at rest. One
   BoundValue for one layer and for several (owner 2026-10-16).
10. Element facts worth citing: layers paint one kind (a row is two parts); selectors everything,
    expression, has, ids, top, member, rule, state; a user layer that sets nothing is refused
    (`E_BAD_LAYER`); Top N takes a tie group whole; `data.histogram` takes data columns only, a
    run field uses `run.result.histogram`; a bound label size wins over a label style's `sizePx`
    in the same stack (`writeRank` in `StylePainter.ts`).
11. Study tool: `real.mjs --start <dir> empty|setup:<file>` through its own browser slot;
    `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name will not match
    (it prints the control it hit); step N lands in screenshot N+1; `--end` always. A select's
    option click can fail on `cm-pointer-still` (list opened under a still pointer): use
    `--key ArrowUp --key Enter`. Compare drawings with PIL `ImageChops.difference(...).getbbox()`
    on the canvas crop `(300,120,1195,835)` at 1440 x 900.

## Decisions and reasons

- (2026-10-18) **A column no selected node holds is said from the column list.** The element's
  statistics list only the attributes the selection carries (its documented contract), so the app
  lists the file's node columns missing from them as "0 of N". Making the element list every
  column would change what an existing call returns (breaking); reading "absent means none" is
  reading its documented fact, not computing over the graph.
- (2026-10-18) **A selection's degree is the element's range, not the app's walk.** Each node's
  degree is the element's; min and max over a selection is computing over the graph, so the
  element publishes `degree { min, max }` (the `graphty.degree` value, edges touching).
- (2026-10-18) **One number spelling for a value everywhere.** The key used exponents below
  0.001 and the table three fraction digits, so a score read three ways. All three now call
  `formatNumber`; it keeps a whole part exact (12,345 never 12,350), which four significant
  digits alone did not.
- (2026-10-18) **A stat's name wraps; a list row's name still ellipsizes.** A stat's name is a
  label the reader must read whole; a list row's name is the reader's own string with a tooltip.
  "Largest component" became a stat row (still clickable) so it wraps too.

- (2026-10-18) **A study build is frozen only from committed source.** Build 5bd16cda6e held
  uncommitted edits, so no git commit reproduced what the pilots walked until they were landed
  afterwards. A clean `git status` before the copy keeps every finding traceable to a commit.
- (2026-10-18) **The node-click subscription sits above the snapshot release list in `Graph.ts`.**
  It was inserted between that list's comment and its handler, so the comment ("AFTER the layout
  manager's own subscription") read as if it explained the click; moved, no behavior change.

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

- (2026-10-18) The layer panel's and shared controls' decisions (Escape takes back only a layer
  a starting value made, a recorded default name, "not styled" by `paintedTarget`, a dropped card
  said on unmount, a still pointer holds back only the fill, a grid opens below its field, a
  tooltip goes to the side that covers no control, a press keeps a trigger's tooltip closed, a
  select that cannot change has no caret) are in full in
  `git show eb1206275:design/ui/studio/notes/engineer.md`.

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

- (2026-10-18) Selecting with the find box for a walk: a quoted value works
  (`role != 'volunteer'`), a bare word is read as a column, and `phone == null` reads "null" as a
  column; `!phone && role` selects the people with no phone. A rule matches edges too when they
  lack the column (`role != 'volunteer'` took all 63 edges), worth a look by whoever owns rules.
- (2026-10-18) nx failed to build the project graph (a stray `compact-mantine-headproof` copy);
  `npm run build` in compact-mantine, graphty-element, then graphty worked.

- Older entries (2026-10-06 to 2026-10-18, the dry runs' walks and test runs) are in full in
  `git show 6dd52bfa1:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Landing the frozen build's source while other agents edit the same worktree:
  WORKED: save each package's `git diff` before anything else, then stage exactly those hunks
  with `git apply --cached --include=<path> <saved diff>`; files another agent edited after the
  save (NodeValues.tsx, color.css.ts, session.api.md) keep their newer edits unstaged. Commit
  with `git commit -F` (a pathspec commit takes the working tree, not the index).
- (2026-10-18) Found: T7 and T8 in `inspector/__tests__/tasks.real-element.test.tsx` failed on the
  frozen source: they looked for the Why this look line by the run's name, which the tree-row
  naming replaced. Fixed the lookup (the line that sets Color). 16 of 16 pass with
  InspectorTargets.
- (2026-10-18) Found, not fixed: graphty-element `real-input.test.ts` "three wheel turns out in 3d
  zoom out as far as three turns in zoom in" fails every run (start/out 1.4045 vs in/start
  1.4366, tolerance 0.01); the 2D case and the three-out-undo-three-in check pass. Zoom to the
  pointer in 3D moves the orbit target toward the pointer, and on-screen spread is not inversely
  proportional to camera distance for nodes off the target's depth, so a further three notches
  out from the start do not mirror three in. No camera code changed since 4e7c5cddd, which added
  the test; needs its own unit.
- (2026-10-18) Found: a first graphty browser run after rebuilding compact-mantine or the element
  fails every file to import ("Forced re-optimization of dependencies"); a run while another
  agent's graphty run re-optimizes the shared `node_modules/.vite/vitest` cache loses Babylon's
  shader chunks mid-test (timeout). Both pass on the next run with a settled cache.
- (2026-10-18) Fresh-build walk `design/ui/studio/tmp/r1-dry2-r1-3-01/w1`: node 1's Why this
  look reads "Louvain / Group 1 Color" (03); its link opens Group 1's layer, tree row selected
  (04); clicking node 1 again brings the node's inspector back (05).

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.
