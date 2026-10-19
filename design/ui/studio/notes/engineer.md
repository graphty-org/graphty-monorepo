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

0. (2026-10-18, focus after a style line) Enter in a new Color box sent focus to the section's
   disabled "+": not a tab redraw, but the line's CONTROL being swapped in place. A line "+" added
   draws `ValueField`; once written it draws `CompactColorInput` (another component), so the box
   that held focus left the page and the focus guard's `rescue` (frame/focus.ts) handed focus to
   the previous control, the "+". A layer made from a selection kept focus only because its tab
   remounts and `useFocusLine` re-asks. Fix once, in `Field`: `useFocusKept` (PropertyRow.tsx)
   remembers the line's control that had focus and, when it is gone and focus is on the page,
   focuses the line's new control (`lineTarget`, now exported from useFocusLine.ts). The same
   hook fixes Undo putting a binding's pill back where a color box was. Section draws lines "+"
   added in the order added (Color stays below Width once written). Memberships' entry focuses the
   inspector title in a frame callback. compact-mantine `tooltipPlacement.ts`: headings' words are
   obstacles, the trigger's own heading (a heading in the same parent) weighted x10, so a section
   "+"'s tooltip opens above or below rather than over its own title. Tests:
   `FocusAfterWriting.real-element` (7; 5 failed before the change; the Remove cases already
   passed: the pilot's Effects "+" was the pointer's hover, not focus) and overlays.browser "opens
   off its own section's heading". Walk `design/ui/studio/tmp/r1-dry3-style-line-focus/w1` (07
   box kept, 09 tooltip above Visibility, 16 Color under Width, 20 Shift+Tab proves focus was on
   Fill "+", 21 Undo in the box, 28-29 Group 1's heading then its next control).
1. (2026-10-18, condition card keys) In `WhichPicker.tsx`: a card's remove button is now drawn
   right after its header in the DOM (still absolutely placed in the corner), so Tab goes remove,
   match, values, Add a condition, Done. A text card's Autocomplete has `openOnFocus={false}` and
   catches ArrowDown in `onKeyDownCapture` on a closed list (stopPropagation at the root's capture
   stops Mantine's own ArrowDown, which would highlight the first option even on a closed list),
   so opening, Undo or a removed card never opens the list, and ArrowDown+Enter is Done, not a
   suggestion. Undo while open: `Cards` keeps `held` (each layer's selector after this open's
   last write landed; `useStepWriter` now has `busy()` and a `landed` callback) and, when a layer
   holds another selector with no write on its way, redraws the cards from the layers. A row with
   no card opens on Add a condition (the auto-opened list made one press close it). Letters typed
    - Tab take the highlighted attribute. `data-enter-done` on value check boxes. NumberCard
      focuses its first number box after Highest or Between; a filter step focuses its card's value
      after an attribute is picked (`Filters.tsx`). Words: card header "3 nodes", one layer's head
      "8 of 24 nodes", the open cards' "Which nodes" is a heading naming the group, and the count
      is announced from `WhichPicker` (which outlives the cards, so Enter in a number box still says
      it). compact-mantine: new `focusWithRing(el)` (sets `data-cm-modality="keyboard"`, focuses),
      because a select trigger hides its ring after a pointer press and Chromium ignores
      `focus({focusVisible})` (probed: buttons and check boxes never ring, a read-only input always
      matches `:focus-visible`). Tests: `ConditionCardKeys.real-element` (6, all fail on the old
      picker; the Undo case must change the rule by a list pick, since typed text is taken back by
      the box's own undo) and FilterStepCard "picking an attribute hands focus to its value". Walks
      `tmp/r1-dry3-condition-card-keys/w1` (05 no list, 06 list with nothing lit, 07 Enter closed,
      rule kept; 12 Undo shows Mlle; 14 Shift+Tab reaches Remove) and `w2` (09 Add, no list; 12
      "don"+Tab; 15 Highest focuses the box; 22 Enter on a ticked value; 25-26 filter focus).
2. (2026-10-18, shape list typing; color picker) compact-mantine type-ahead clears the highlight on
   a run no option starts with; the picker's "color before this edit" swatch and `closeOnEnter`;
   `ValueField` swatches: in full in `git show bdd01700e:design/ui/studio/notes/engineer.md`, Top of
   mind 0-1. Known: 12 compact-mantine tests fail on that commit too (QuickActions FieldChooser
   axe and play, CompactColorInput swatches/onChangeEnd, select disabled trigger, Tree toggles).
3. (2026-10-18, labels on the drawing) Names drawn across other nodes (app defaults "Move labels off
   nodes and edges" on), labels beside the halo ring (`RichTextLabel.setRing`), declutter forcing
   world matrices: in full in `git show 273e236a4:design/ui/studio/notes/engineer.md`, Top of mind 1.
4. (2026-10-18, framing; hover) The key's room only while a key shows entries, framed once when
   it arrives (`useOverlayInset`), F keeps the angle (`keepAngle`); a hover ends on `pointerleave`
   of the engine's input element, event `selection:hover-changed`. In full in
   `git show fa270090e:design/ui/studio/notes/engineer.md`, Top of mind 1-2.
5. (2026-10-18, find box) Keeps the reader's words, example rule over the reader's own column,
   two-line `ResultRow`, list sized to the panel: in full in `git show ef2f796ee:design/ui/studio/notes/engineer.md`, Top of mind 3.
6. Earlier 2026-10-18 entries (keys and focus, filter steps, layer panel words): `git show 28e989215:design/ui/studio/notes/engineer.md` and `6d312090c`.
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

- (2026-10-18) Seen, not mine, with others' uncommitted edits in the worktree: 15 style
  real-element tests (ColorBox, PropertyRows 3, OneLineRows, RowKinds 2, StylePanel 3, Groups,
  LayerPanelWords, BindingPopover Louvain, BulkPilot 2) fail with my focus change switched off too.
  Older "seen, not mine" lists: `git show bdd01700e:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Worked: a document `focusin` listener logging `new Error().stack` in a failing test
  names who moved focus (here `rescue` in frame/focus.ts), faster than reading the hooks.
- (2026-10-18) Seen, not mine: an edge Width of 3 drew the edges dashed in the walk
  (`r1-dry3-style-line-focus/w1/13.png`); `ConditionCardKeys.real-element` imports a
  `LayerSelector` the element does not export, which stops `tsc` (another agent's file), so the
  walk build used `vite build` alone.
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
- (2026-10-18) Measuring the pilot screenshot first found the mechanism at once: the karate
  drawing's center sat at x 905 = 297 + (L + 903) / 2, so L = 313, the key room plus gap, on a
  canvas with no key. Measure the offset against the inset before suspecting the layout or the
  element's framing. In real-element tests the toolbar's bottom inset makes `viewInsets` never
  `{}`: wait on `left ?? top`, not on a non-empty object.
- (2026-10-18) `real.mjs --hover-at` on build 6d312090c showed Hovered 0 over Valjean while my own
  Playwright walk read `session.selection.hovered === "Valjean"`: the element hovered, the app's
  count was stale. Check the session before blaming the element. An app test that hovers a node
  right after a sample opens must `waitForStableFrame()` first: the camera is still framing the
  graph and `nodeScreenPosition` moves under the pointer.
- (2026-10-18) `contains(name, 'Acciaiuoli')` as the example: refused at the comma when typed
  (walk s3/10.png). `name == 'Acciaiuoli'` selects the one node (s4/08.png).
- (2026-10-18) GraphPlace.test renders the place with no panel height, so a list sized to its room
  never scrolled: the test now renders it in a 600 px panel, as the workspace does.
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
