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

0. (2026-10-18, color picker) Three defects in compact-mantine's picker, one in the app:
   (a) the swatch the picker opened on was named "the starting color", but after a second edit it
   is not the color the drawing started with: now "the color before this edit"; (b) the opening
   color was a swatch only when the consumer's set held it: `ColorPickerPanel` now puts it first
   at opening when the set lacks it (stable for the same field, since it is computed once at
   mount); (c) Enter in the picker's value box committed but left the pop-out open: new
   `closeOnEnter` prop (default false; `CompactColorInput` sets it; the gradient editor does
   not), which calls the enclosing popout's `close` -- and must `preventDefault()` the Enter, or
   the keypress lands on the trigger that `close` just focused and opens it again. App: an unset
   color row (`ValueField`) got compact-mantine's default palette while a set one got the
   document's colors, so the same line showed two sets; `ValueField` takes `swatches` and
   PropertyRow passes `ctx.documentColors` on both paths (`coverage.ts` count 13 -> 14). Tests:
   `CompactColorInput.browser` "picker swatches and Enter" (same set twice, unset line holds
   6366F1, no "starting", Enter closes with focus on the trigger). Walk
   `design/ui/studio/tmp/r1-dry3-color-picker-swatches/w1` (04 Enter closed; 07 tooltip "blue
   0000FF, the color before this edit"; 10 set and 15 unset show the same five swatches).
1. (2026-10-18, labels on the drawing) Three causes, none of them two labels stacked: (a) a pilot's
   "Magnon over Mme Thenardier" was a name drawn across ANOTHER NODE (the overlap rule only tests
   labels against labels; nodes count only with `labels.avoidNodesAndEdges`), so the app now
   defaults Graph settings' "Move labels off nodes and edges" ON (`labelsAvoid: true` in
   `state/store.ts`); (b) the label sits on its node's surface (`attachOffset` resolves to 0), so a
   halo (1.45x) ran through the words: `RichTextLabel.setRing(scale)` places the label beside the
   ring's sphere, `Node.ringLabel` calls it when the halo shows or goes and marks the declutter
   dirty; (c) found by the new test: `LabelDeclutter` read node world matrices with
   `computeWorldMatrix()`, which Babylon returns cached within one render id, so a node the layout
   moved (selection wakes it) was measured a step behind and the last step before rest left
   overlaps; now forced. Two layers labeling one node already draw one label, upper words.
   Tests: element `test/browser/label-clears-halo` (fails without b), `labels-on-a-dense-drawing`
   (Les Mis at 96, framed whole and on Cosette; fails without c; avoid case covers names over
   nodes; two-layer case). Walk `design/ui/studio/tmp/r1-dry3-labels-on-drawing/w1` (08 size 96,
   10 hidden; 09 F on Cosette: ring clear, no name over a name or a node); probe script and
   frozen-vs-fresh shots in the same folder.
2. (2026-10-18, framing; hover) The key's room only while a key shows entries, framed once when
   it arrives (`useOverlayInset`), F keeps the angle (`keepAngle`); a hover ends on `pointerleave`
   of the engine's input element, event `selection:hover-changed`. In full in
   `git show fa270090e:design/ui/studio/notes/engineer.md`, Top of mind 1-2.
3. (2026-10-18, find box) Keeps the reader's words, example rule over the reader's own column,
   two-line `ResultRow`, list sized to the panel: in full in `git show ef2f796ee:design/ui/studio/notes/engineer.md`, Top of mind 3.
4. Earlier 2026-10-18 entries (keys and focus: Which picker closing on blur, card x after its
   controls, Tab out of Analyze, inspector Escape) are in full in `git show 28e989215:design/ui/studio/notes/engineer.md`,
   Top of mind 3; filter steps, Highest, layer panel words in `git show 6d312090c:...`, 3-5.
5. Every fix of the earlier dry runs (and the inspector summaries: `WholeTruth.real-element`), and how the study build's source was landed: `git show e6e1d1616:design/ui/studio/notes/engineer.md`.
   Redo of a run (`runs.answered`, live scopes) and key-and-drawing (`useOverlayInset`,
   `KeyRoom`) are in full in `git show 5cd203ff0:design/ui/studio/notes/engineer.md`, Top of mind 5-6.
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

## Decisions and reasons

- (2026-10-18) **Names off nodes is the app's default, not a wider element declutter.** The
  element already offers the choice (`avoidNodesAndEdges`, which with declutter hides a label with
  no place clear of labels and nodes); making `declutter` count nodes would change what an existing
  option does (breaking). Cost: labels move to one of 8 places round their node, and a pass
  projects every node and edge (about 5 ms at 1,000 nodes, only while labels are in view).
- (2026-10-18) **The label clears the ring the way it clears the node,** not by a bigger gap for
  every label: an unselected label keeps its place; a selected one moves up by the ring's extra
  radius, and back when deselected. `setRing` is on the unexported `RichTextLabel`, so no API change.
- (2026-10-18) **Forcing the world matrix in the declutter pass,** not adding position checks to
  `labelsChanged`: the check already saw the move; the pass measured with Babylon's per-render-id
  cache. A position check on the label plane would also re-run the pass every frame for a
  bouncing label.

- (2026-10-18) **The key's room is reserved only while the key has entries, and its arrival frames
  once.** Reserving it up front cost every open a third of the canvas (three pilots read it as an
  off-center drawing); framing once when a key first covers a node costs one move at the moment the
  reader asked for color, and never when they placed the camera (the owner's original report was a
  key reframing a reader's zoom, which still holds). The rule lives in `useOverlayInset`, so any
  overlay arriving over a node gets it, not only the key.
- (2026-10-18) **Frame selection keeps the angle by passing `keepAngle`, not by a new element
  default.** Changing what `fitToGraph` with a scope does would be breaking; the option exists and
  keeping the angle is the app's choice. `zoomToSelection` (the find box) only moves the target, so
  it never turned the view.
- (2026-10-18) **The hover ends on the canvas's `pointerleave`, registered only while hovered.**
  Each node has its own handler, so a listener per node would put tens of thousands on one canvas;
  one listener exists at a time, added on hover start, removed when the hover ends. `contextmenu`
  is not a leave: a right-click keeps the pointer on the node (the walk shows Hovered 1 with the
  menu open) and moving onto the menu fires `pointerleave`.
- (2026-10-18) **A new event, not a wider `selection:changed`.** `selection:changed` is a
  membership delta (added, removed, counts); a hover carries none, and every existing listener
  (inspector, table, toolbar) would re-render on each hover. `selection:hover-changed` reaches only
  the hosts that show a hover.
- (2026-10-18) **The find example is "name == 'value'", not contains.** The rule subset refuses
  function calls (`function-not-supported`), so `contains(name, 'x')` would be an example that
  fails when typed; equality with a whole sample value of 20 characters or fewer runs. Adding
  contains to the element's rule language would be additive but is its own piece of work.
- (2026-10-18) **Wrapping lives in compact-mantine, not in a find-box style.** A two-line result
  row is a property of the shared row (`lines?: 1 | 2`, default 1 keeps every caller), so another
  list can take it; overriding `.cm-result-name` in the app would be a bespoke row.
- (2026-10-18) **The find list is sized to the panel, not to 320 px.** With a fixed cap it scrolled
  five rows while the panel had room below; the tree under it gives its room up to one row.
- (2026-10-18) **Escape is a field's in the inspector, but its tabs still clear.** "Escape inside
  any inspector field never clears the selection" was scoped to targets in `.ws-right` outside its
  `[role=tablist]`, so the earlier rule "Escape on the selected tab clears and the ring stays on the
  tab" (FocusAndTabOrder) still holds. Tab out of Analyze goes to the next Tab stop after the
  button it opened from (the inspector's first control), as Tab from the toolbar would.
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

- (2026-10-18) Closing a pop-out from an input's Enter keydown: the close focuses the trigger
  first, and without `preventDefault()` the same Enter activates that button and reopens the
  pop-out. The test caught it (panel still in the document). WORKED after preventDefault.
- (2026-10-18) Reading a pilot screenshot as "labels overlap" was wrong twice: cropped and
  enlarged, Magnon / Mme Thenardier and Lucy Grant / "name" were a label over another node and a
  neighbor's label on the ring. Crop before naming the mechanism. Measuring label rectangles from
  a billboard's world AABB (`boundingBox.vectorsWorld`) overstates them in perspective; project
  the plane's four corners through `getWorldMatrix()` instead, and a sphere's radius is its box's
  half-extent, not `boundingSphere.radiusWorld` (the box's half-diagonal).
- (2026-10-18) A Playwright probe of the served build with in-page `element.graph` reads
  (`design/ui/studio/tmp/r1-dry3-labels-on-drawing/probe.mjs`, run through `with-browser.sh`,
  REAL_DIST, SIZE=96) reproduced the pilot picture exactly and gave counts and passes per step.
  WORKED; faster than a real.mjs walk for a mechanism.
- (2026-10-18) Seen, not mine (fail at HEAD sources too): element `label-drawn-over-edges`
  "draws a selected node's label over its selection ring" (both; no gold on the node's row), app
  `StyleTab.real-element` "a Label entry picked from Text's + binds the label and states the
  counts" (times out at 15 s).

- (2026-10-18) Measuring the pilot screenshot first found the mechanism at once: the karate
  drawing's center sat at x 905 = 297 + (L + 903) / 2, so L = 313, the key room plus gap, on a
  canvas with no key. Measure the offset against the inset before suspecting the layout or the
  element's framing. In real-element tests the toolbar's bottom inset makes `viewInsets` never
  `{}`: wait on `left ?? top`, not on a non-empty object.
- (2026-10-18) Seen, not mine: graphty `Toolbar.stories` After Louvain, View Flyout 2D/3D (they
  press "View", the button is named "View, 3D" now); CanvasOverlays "lists every sample"
  (`session.data.source` missing from the stand-in); tasks "Deleted Louvain" found twice.
- (2026-10-18) `real.mjs --hover-at` on build 6d312090c showed Hovered 0 over Valjean while my own
  Playwright walk read `session.selection.hovered === "Valjean"`: the element hovered, the app's
  count was stale. Check the session before blaming the element. An app test that hovers a node
  right after a sample opens must `waitForStableFrame()` first: the camera is still framing the
  graph and `nodeScreenPosition` moves under the pointer.
- (2026-10-18) `contains(name, 'Acciaiuoli')` as the example: refused at the comma when typed
  (walk s3/10.png). `name == 'Acciaiuoli'` selects the one node (s4/08.png).
- (2026-10-18) GraphPlace.test renders the place with no panel height, so a list sized to its room
  never scrolled: the test now renders it in a 600 px panel, as the workspace does.
- (2026-10-18) Seen, not mine: inspector `tasks.real-element` T8, `FocusAfterAdding` (two) and
  compact-mantine figma tree "toggles x 188" fail with or without the find box change.
- (2026-10-18) Done on a new empty layer and Remove node color already land on the Which row and
  Fill "+" in the current source (tests and the s1/s2 walk); the frozen build's misses came from
  the picker staying open while other rows were edited, which closing on focus leave now prevents.
  real.mjs `--read` now walks out of a shadow root (the canvas) to its host's landmark.
- (2026-10-18) Earlier "seen, not mine" lists (ConditionCards `chipCount`, NamesAndRules, FocusAfterAdding, tasks "Deleted Louvain"): `git show ef2f796ee:design/ui/studio/notes/engineer.md`.
- (2026-10-18) A card's text box lists matches once something is typed (an empty box opened all 77
  names over the cards); the list covers Done, so Escape closes it first, then the picker.
- (2026-10-18) A card's text box now has a value list, so Enter on a highlighted value would also
  have run the picker's Done; `isDoneKey` skips an Enter the list already handled
  (`event.defaultPrevented`).
- (2026-10-18) Another agent staged deletions in the shared index between my check and my
  commit; the commit (failed on a long body line, luckily) would have carried them. Commit from a
  private index instead: `GIT_INDEX_FILE=<tmp>/index git read-tree HEAD`, `update-index
--cacheinfo` my blobs, commit with the hooks. WORKED (6bef23d3b), leaves their staging alone.
  commitlint also caps body lines at 100 characters.

- (2026-10-18) Staging only my hunks of a file another agent edits: write the file with my edits
  reversed (O), `git merge-file -p <HEAD copy> O <working file>`, then `hash-object -w` and
  `update-index --cacheinfo` into a private index. WORKED.
- Six entries of 2026-10-18 (a glyph grid's arrows in the study tool, tests seen failing that were
  others', vite re-optimizing mid-run, a style run with three agents editing) are in full in
  `git show 6fbf1615b:design/ui/studio/notes/engineer.md`.
- Four entries of 2026-10-18 (landing the frozen build's source, T7/T8 lookups, the r1-3-01 walk,
  re-optimized vite deps on a first run) are in full in `git show bffcbc76d:design/ui/studio/notes/engineer.md`.

- Five entries of 2026-10-18 (compact-mantine's failing-at-HEAD tests, nx refusing while
  `compact-mantine-headproof/` exists so build with `npm run build` per package, `waitForSettled()`
  before the layout rests, find-box quoting) are in full in
  `git show 204af3158:design/ui/studio/notes/engineer.md`.

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
