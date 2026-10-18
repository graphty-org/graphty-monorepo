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

0. (2026-10-18, number card) Highest refuses a typed count above the node (edge) count: "There
   are only 24 nodes. Type 24 to keep all 24, or fewer." A count of every element reads
   "donations: all 24"; otherwise a top card reads "top 20 by hours" (`cardWords`). Every chip
   and the folded Which row say the count with its noun ("top 20 by donations, 24 nodes": ties
   are taken whole, so the two numbers differ), kept on one line by a no-break space. Leaving a
   card on refused text names the reason (`checkDrafts` `gist`, e.g. "from is above to (300000
   is more than 250000)"), never "not a number the card takes". A refusal clears as soon as the
   box reads as a number (same `reason` code: number, order, whole, count); a new problem waits
   for a commit. Test `style/__tests__/NumberCard.real-element` (4 new); walk
   `design/ui/studio/tmp/r1-dry2-r1-3-13/w1` (09-10 refusal cleared, 15-16 order, 20-24 Highest).
1. (2026-10-18, layer panel words) One name per control and history words that say what changed.
   A selection's Style tab says "The first style you set makes a layer for the 3 selected nodes."
   until its layer exists, and the notice after does not repeat a count name ("Made a layer for the
   3 selected nodes"; `madeWords`, `firstStyleWords` in `style/words.ts`). A "+" with one thing to
   add has its name as its tooltip. History names a channel with its kind (`channelPhrase`: "Undid
   changing edge color on Everything."), a condition change as "changing the conditions on Group 1"
   (WhichPicker step label), and a bulk write counts only the layers it changes (a literal value a
   layer already holds is skipped). Other-kind line: "Edges: 2 styles | not styled | nothing set"
   and always "Edit edges". Shape list name keeps its value ("Node shape, Box"; unset "Node shape,
   default Icosphere"). "Node id" for the id column in the label box and find (`sourceName`,
   `attributeName`). "Select layers...", "Update Louvain layers" for a run with several layers, "pass
   every condition", dropped card "was not finished", Fixed size speaks "Node size stays a fixed
   value", Which row is a heading, group row's description starts with its color word, back arrow
   tooltip, Open sample checks the open one ("Open now", from `data.source().config.url`).
   compact-mantine: `pickColor` in sentence case, QuickActions' empty message in an always-mounted
   polite region. Test `style/__tests__/LayerPanelWords.real-element`; walks
   `design/ui/studio/tmp/r1-dry2-r1-3-09/w1` (06, 10, 14, 15, 20), `w2` (11, 12, 15, 20, 24, 30),
   `w3` (SR), `w4` (11).
2. (2026-10-18, layer panel behavior) A fixed card holding a whole selector (edges picked by
   hand, selected, hovered) is finished (`isFinished` in `style/cards.ts`): removing an edge
   layer's only "Picked by hand" card now gives the "now styles all" notice with Undo, and closing
   the picker no longer says it dropped it. A default-named layer with no card left is renamed
   "All edges"/"All nodes" (`coverName` in `WhichPicker`); the notice's Undo puts back the cards
   AND the name (`commit(next, names)`). Several cards' default name fits the list beside a row's
   count, 17 characters (`NAME_ROOM`): words, else what they test ("Picked and name"), else
   "<first> and N more", else "<first> +N"; one card keeps its words. "kind is an edge
   attribute" carries "Add kind on the Edge tab" (button, and Enter in the search): `RowStyle`
   switches tab and hands the field to the other kind's picker (`KindControl.pick(side, justOn,
elsewhere)`, `WhichPicker adding/onElsewhere`). A run's group opened from Memberships or a run's
   Values is its layer row when the run made one (`groupInspected` in `inspector/inspected.ts`),
   so one header. Every layer row shows a count (nodes, else edges; `StyleTree`). `inspected.tab`
   (app store, additive) opens a row on a named tab: Why this look and the "Covered by" names
   (`LayerLink`, `CoveredLine`; `PaintedOver.layers`) open on Style. Test
   `style/__tests__/LayerPanelBehavior.real-element`; walks
   `design/ui/studio/tmp/r1-dry2-r1-3-10/w1` (08 notice and rename, 12 Undo, 14-15 Edge tab,
   16 drop notice on a canvas click), `w2` (09 Style tab, 11-12 Covered by), `w3/04` (one
   header), `w4/04` (name whole).

3. (2026-10-18, focus as a graph opens) After a sample, a file from the start screen, a recent
   project, Control+O over an open project and the Data page's Load, focus lands on the inspector's
   graph heading (`focusOpenedGraph` in `frame/focus.ts`), whose spoken name is "Graph, <project>:
   N nodes, M edges" (`Header.spoken`, `aria-label`), and only once the graph is read: Workspace's
   `loading` ref and `openingFile(store)` (project/actions) keep the element-up effect from
   focusing early. The style tree's Tab stop with nothing open is Everything (compact-mantine
   `Tree restingId`, additive). While a chosen file is read, focus waits on Load (Footer effect on
   `page.reading`), never the rail; Load's description is the model strip (`dp-model`). Sample
   buttons are described by their card's size and sentence. Back to the start screen focuses the
   way in that left it (`data-start-door`, `lastDoor`). "Same size at any depth" follows the size
   binding until set (state null): T43B's flip was the reader binding size, not the reopen; the
   switch now says "On while node size follows data". Test `start/__tests__/FocusAfterClose`
   (4 of 11 fail without the fix); walk `design/ui/studio/tmp/r1-dry2-r1-3-02/w1`-`w4`.
4. (2026-10-18, "+" waits) A section's "+" writes nothing: every property it adds is a line
   waiting for a value (Section's `waiting` state, once only for several rows), drawn at what the
   row's elements draw now (`beneathOf`; a selection's row not written yet reads over
   `"selection"`, not the whole graph) else the element's starting value. The pick writes it, and
   only then does a selection's layer get made and the key list it. Escape on a closed waiting
   control drops the line ("<name> not added"). Hide and Show still write at once (they are a
   pick). Test `style/__tests__/PlusWaits.real-element`; walks
   `design/ui/studio/tmp/r1-dry2-r1-3-08/w1` (14-17 node cube, 22 pick), `w2` (10-13 group,
   20-23 new layer), `w3` (size binding).
5. (2026-10-18, shared lists) A select-only list closes when focus leaves its trigger for another
   control (`focusout` in `ensureListboxKeyboard`, compact-mantine `listbox.tsx`; Mantine closes
   only a searchable Select on blur), so the grid no longer covers the panel after Tab and its
   drawn and announced highlights cannot part. Table cells of a selected row carry
   `aria-selected` (the focused cell is what a screen reader reads); real.mjs `selected=N` counts
   rows only. A column's options button is "more" with a tooltip. Tree carets drawn at rest
   (`--cm-icon-secondary`). A VariablePill with no glyph draws no empty slot. The Analyze list's
   active option: selected fill plus a ring 7.4:1 against the list (app `toolbar.css`). Test
   `compact-mantine/tests/components/SharedLists.browser.test.tsx`; walk
   `design/ui/studio/tmp/r1-dry2-r1-3-05/w2` (05, 06, 09, 11, 15), `w1/01.png`, `w3/02.png`.
6. (2026-10-18, color box) compact-mantine `colorWord` says the CSS keyword in words when the hex
   is exactly one (800080 "purple", 006400 "dark green"; table `CSS_COLOR_WORDS` in
   `utils/color-utils.ts`, checked against the `color-name` package), else a hue band; bands
   re-cut: green to 170, teal, blue to 235, indigo, violet, purple to 320, pink. 6366F1 is
   "indigo", Okabe-Ito 009E73 "green". `typedColor` joins a keyword typed as words ("dark green");
   hex digits are read from the unjoined text, so "abc def" is never ABCDEF. Refusal under the row:
   `.cm-paint-message { contain: inline-size }`. Escape speaks `colorEditDiscarded` from a status
   region that is always mounted. Hex and opacity boxes: `cursor: text`. Walk
   `design/ui/studio/tmp/r1-dry2-r1-3-04/w1` (06, 07), `w2`, `w3` (SR, 28-31).
7. Every fix of the earlier dry runs (and the inspector summaries: `WholeTruth.real-element`), and how the study build's source was landed: `git show e6e1d1616:design/ui/studio/notes/engineer.md`.
   Redo of a run (`runs.answered`, live scopes) and key-and-drawing (`useOverlayInset`,
   `KeyRoom`) are in full in `git show 5cd203ff0:design/ui/studio/notes/engineer.md`, Top of mind 5-6.
8. Open questions for the owner live in `owner-decisions.md` ("For the owner"): a bare rule name
   reading a run's field; comparisons by default in `selectorRule`; a larger or screen-pixel
   default label size; Kelly's palette for 10 to 19 groups.
9. Shared worktree: other agents commit beside me. Stage only my files. For a shared file, build
   the blob from `git show HEAD:<file>` plus my edits by exact string replacement in Python,
   `git hash-object -w` + `git update-index --cacheinfo`, then read `git diff --cached`. Never
   `git stash` (not even `list`). Commit headers <= 100 characters, scope from commitlint's list
   (`workspace` for studio notes, not `design`).
10. Prove a test fails without the change: copy the fixed file aside, `git show HEAD:<file>` over
    it, run only that test (`-t`), copy back at once. Only for files no one else has touched.
11. graphty tests read compact-mantine from its `dist` (rebuild it: `npm run build` there) and
    graphty-element from source; rebuild the app (`pnpm exec nx run graphty:build`, Sentry vars
    unset) before a real.mjs walk; end the session and start again after a rebuild. When nx
    refuses ("defined in multiple locations", a `compact-mantine-headproof` copy another agent
    is using), run `npm run build` in compact-mantine, graphty-element, then graphty.
12. API changes: additive ones go in `owner-decisions.md` under "decided by the team" with the
    name and shape; a changed default or a renamed or removed member goes "for the owner". A new
    Graph or element member needs `doors.ts` and `test/cost-coverage/method-classes.ts` lines,
    `npm run api:report` after a build, and `jsx.ts` regenerated by the build.
13. Combined Style panel (V7 tabs, condition cards, several layers): `style/cards.ts`,
    `style/WhichPicker.tsx`, `RowStyle` in `StylePanel.tsx`. A controlled text field never
    round-trips through the element; one undo step per open is `TransactionOptions.after`. Not
    built: number card histogram for a run field, "lowest N", dashed chips at rest. One
    BoundValue for one layer and for several (owner 2026-10-16).
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

- (2026-10-18) **Focus after an open goes to the graph's heading, after the read.** Focusing as
  the element comes up would speak "0 nodes" and not again (a second focus on the same element
  fires nothing). The heading is not a Tab stop and has no ring, so a pointer user sees no row's
  lock and eye; Tab moves on to the inspector's controls. The visible text stays "Graph"; the
  spoken name carries the project and size, starting with the visible word (label in name).
- (2026-10-18) **"Same size at any depth" was not flipped by the reopen.** Its state is null until
  the reader sets it, and null follows `useSizeBound` (a node size bound to data). In T43B the
  reader bound size to donations at detour d; Replace kept the binding, so the switch read on.
  Kept the rule (perspective misreads a bound size), added a description saying why it is on.
  Open: the app reading the key to decide this is graph logic; an element option would own it.
- (2026-10-18) **"+" never writes; the hybrid was rejected.** The unit's text allowed writing the
  value beneath when the elements agree and hiding that line from the key until a pick. That
  needs a "not picked yet" mark stored in the layer, which a saved file would carry and which
  would hide a real line from the key forever if never cleared. Writing nothing has no such state:
  the drawing, the key and the undo history are untouched by construction, and the old
  `cancelMade` path (Escape taking back a made layer) only remains for Hide/Show. Cost: about 15
  tests that asserted "+" wrote a starting value now assert it writes nothing, or pick a value.
- (2026-10-18) **The node "+" read the whole graph for its start.** A selection's row not written
  yet had no tree row, so `beneathOf` read `agreement("graph")`; a cube node among balls disagreed
  and the line started at Icosphere. `styles.agreement("selection")` answers for the selected
  elements, no element change needed.
- (2026-10-18) **A list closes on focus leaving, through its own click.** Escape dispatched to
  close it would also reach a surrounding popover's Escape capture and close the panel; a
  synthetic click on the trigger toggles only the list (Mantine's `toggleDropdown`), and
  ensureFocusModality and announceOpened ignore untrusted events. Only when focus moves to an
  element (`relatedTarget`), so a window losing focus leaves the list as it was.
- (2026-10-18) **"Selected" is said on each cell of a selected row; the row keeps it too.** The
  study tool, like a screen reader moving cell to cell, reads the focused cell's state; the row's
  `aria-selected` alone was never heard (T41B). Counting tools count rows only.
- (2026-10-18) **Already met on the frozen build, no change:** End and Home in a table row (unit
  test, walk `w2/11.png`); a hovered disabled "Style nodes" and the top bar's Undo show their
  reasons as drawn tooltips (probe on 5bd16cda6e: "Stays on: style edges first to stop styling
  nodes"); fixed role boxes draw no caret. A disabled StyleSelect (and the other four annotated
  controls) still give their reason as a native `title`, which real.mjs cannot see ("tooltip:
  null" on "Role of name"); a person's browser shows it. If a study needs it drawn, the five
  controls change together (`useControlAnnotation`), not one.
- (2026-10-18) Why this look names each line for the style tree row that holds the layer
  ("Louvain / Group 1") and opens that row; tests find the line by what it sets ("Color"), not by
  a run's name. A click on the node already selected brings its inspector back.

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

- (2026-10-18) Another agent staged deletions in the shared index between my check and my
  commit; the commit (failed on a long body line, luckily) would have carried them. Commit from a
  private index instead: `GIT_INDEX_FILE=<tmp>/index git read-tree HEAD`, `update-index
--cacheinfo` my blobs, commit with the hooks. WORKED (6bef23d3b), leaves their staging alone.
  commitlint also caps body lines at 100 characters.

- (2026-10-18) The study tool cannot move a glyph grid's highlight with arrows (Node shape list:
  ArrowDown and ArrowRight left "Icosphere" highlighted, w3); its pointer walk and the unit test
  cover the set name. Worth a look by whoever owns StyleSelect's `handleGridKeys`.
- (2026-10-18) Seen, not mine, with other agents' edits in the tree: words.test "vary glyph"
  (expects "Color by attribute", HEAD says "Node color by attribute"), StylePanel "several
  selected share one row" (option "id" is listed as "Node id" at HEAD), "binds with the keyboard
  alone", "Size on Selected ... starts from the size beneath" (the "+" no longer writes a starting
  value), BulkPilot two receipts, FocusAndTabOrder "Tab out of the Vary by list", tasks "Deleted
  Louvain" found twice, compact-mantine onChangeEnd swatch names.
- (2026-10-18) Worked: committing through a private index (`GIT_INDEX_FILE=<tmp>`, `git read-tree
HEAD`, then my blobs and paths) when another agent has files staged in the shared index; the
  real index then gets my two shared files set to the new HEAD and nothing else. Did not work:
  `git diff --cached` alone to check, since others stage between my calls.
- (2026-10-18) Seen, not mine: graphty real-element imports failing with "Failed to fetch
  dynamically imported module" right after another agent rebuilt compact-mantine's `dist` (Vite
  re-optimizes the dependency mid-run); the rerun passed. `DataPage` "All 12 rows" found twice is
  the grid's new status line repeating the caption; `tasks` T8 expects the old inspected shape.
- (2026-10-18) Staging my part of a file another agent is editing at the same time: write the
  file with my edits reversed by exact replacement (O), then `git merge-file -p <HEAD copy> O
<working file>` gives HEAD plus only my change; `git hash-object -w` + `git update-index
--cacheinfo`. WORKED for four shared style files. Running `vitest` from a `__tests__` folder
  finds no files (the include is `src/**`): run it from `graphty/`.
- (2026-10-18) A full style real-element run while three agents edit the same panel: 35 failures,
  most theirs (option names, tooltips, a whole-file "Failed to fetch dynamically imported module"
  while Vite re-optimized). Read each failing test for a "+" before claiming it.
- Four entries of 2026-10-18 (landing the frozen build's source, T7/T8 lookups, the r1-3-01 walk,
  re-optimized vite deps on a first run) are in full in `git show bffcbc76d:design/ui/studio/notes/engineer.md`.

- (2026-10-18) compact-mantine's full browser + default run: 10 failures, every one also failing
  with my five files put back to HEAD (QuickActions FieldChooser axe "community" option, a
  disabled select trigger's border color, tree toggles at x 184 not 188, color swatch tests from
  another agent's uncommitted color work); `tsc -p tsconfig.check.json` reports
  `tests/components/overlays/Toast.test.tsx` unused React, not mine.

- (2026-10-18) nx in the studio worktree refuses every target while an untracked
  `compact-mantine-headproof/` (another agent's) holds a second `@graphty/compact-mantine`
  package.json. Build graphty directly: `cd graphty && npm run build` (Sentry variables unset).
  WORKED. compact-mantine at HEAD already fails: `tsc` on `tests/components/overlays/Toast.test.tsx`
  (unused React), `CompactColorInput.onChangeEnd` and figma swatch tests that expect a swatch
  named by its bare hex, the SwatchesAndChangeEnd story, Tree, QuickActions FieldChooser, the
  untracked SharedLists test. Not mine; left alone.

- (2026-10-18) `waitForSettled()` resolves before the force layout is at rest: two position reads
  ten frames apart differ. A layout test waits until two reads agree (`rest` in
  `style-change-keeps-layout.test.ts`). Proving a fix against old code without git stash: copy the
  changed files aside, `git show HEAD:<path> > <path>`, run the test, copy back. WORKED.
- (2026-10-18) Selecting with the find box for a walk: a quoted value works
  (`role != 'volunteer'`), a bare word is read as a column, and `phone == null` reads "null" as a
  column; `!phone && role` selects the people with no phone. A rule matches edges too when they
  lack the column (`role != 'volunteer'` took all 63 edges), worth a look by whoever owns rules.
- (2026-10-18) nx failed to build the project graph (a stray `compact-mantine-headproof` copy);
  `npm run build` in compact-mantine, graphty-element, then graphty worked.

- Older entries (2026-10-06 to 2026-10-18, the dry runs' walks and test runs) are in full in
  `git show 6dd52bfa1:design/ui/studio/notes/engineer.md`.

- (2026-10-18) Found, not fixed: graphty-element `real-input.test.ts` "three wheel turns out in 3d
  zoom out as far as three turns in zoom in" fails every run (start/out 1.4045 vs in/start
  1.4366, tolerance 0.01); the 2D case and the three-out-undo-three-in check pass. Zoom to the
  pointer in 3D moves the orbit target toward the pointer, and on-screen spread is not inversely
  proportional to camera distance for nodes off the target's depth, so a further three notches
  out from the start do not mirror three in. No camera code changed since 4e7c5cddd, which added
  the test; needs its own unit.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.
