# Pilot triage: what must change before round 1 of the real-app study

Date: 2026-10-06. Build piloted: graphty 0.8.53, commit a1e6b91ff, the tier 1 workspace at
`/?next`. Sixteen tasks were walked once each on their answer key's success path. Thirteen reached
their end state (several only after a detour); three did not: the picture-and-numbers task (T13)
and the whole first session (T15) because the exported image has no key and the drawing never holds
still, and the save-and-reopen task (T14) because the study tool cannot answer the browser's
save-file picker. Task numbers are those of `tasks.md`.

Rule used to sort every finding:

- **Fix now** anything that would make a session fail for a reason the study is not trying to
  learn; every severity 3 or 4 build defect; every study-tool defect; every answer-key or
  task-wording error.
- **Defer** everything else, with the reason. A deferred design question is one the round is
  meant to measure, or one no task grade depends on.

Severity is 0-4 as in `criteria.md` (4 = the task cannot be done, or a user reports a wrong result
without knowing it). Fixes are grouped so each is one coherent change, listed most severe first.
"Package" says where the fix belongs: graph logic in graphty-element, words and arrangement in the
graphty app, test machinery in the study tool. A fix that changes graphty-element's public API
(exported names, types, events, published defaults) is listed by whoever makes it in
`design/ui/studio/owner-decisions.md` with what, why and the alternatives.

## What worked (keep it)

- Opening a sample is one click and draws at once; the Overview's node, edge and component counts
  are right on every sample (T2, T6).
- Opening `friends.csv` draws it in two steps with the right counts (T3, T16).
- The broken GraphML file is refused, and the refusal is announced assertively (T5).
- A ranking run paints the drawing the moment it finishes and its Top 10 lists names, not ids
  (T7, T9, T16).
- Sizing by a result works through the run's Style tab, and the legend gains a size entry (T9).
- The Label "+" adds a line, opens the attribute list, and names appear on the canvas with a live
  hidden-for-overlap count -- on Les Miserables and College football alike (T10).
- Find by name, then the Degree row, lists a node's neighbors by name under "Javert's 17
  connections" -- the task that scored 0 of 12 on the mock now reaches its end state (T12).
- Louvain gives groups with sizes and a members list (T8). The layout menu changes the drawing
  (T11). The unsaved-changes guard on Close project works (T14).

## Fix now

### 1. The drawing spins forever after Shift+A (graphty-element) -- severity 4

- **Seen:** T7, T8, T9, T13, T14, T15: with no input the whole drawing turns between screenshots;
  the exported image never matches the screen; a point click aimed from the last screenshot hits
  whatever has moved there; every tool step waits 15 s for a settle that never comes.
- **Likely mechanism (verify first):** `graphty-element/src/cameras/OrbitInputController.ts` keeps a
  `keysDown` map from `keydown`/`keyup` on the canvas, keyed by `evt.key.toLowerCase()` and blind
  to modifiers. Shift+A on a focused canvas sets `keysDown.a`; the app's Analyze popover then takes
  focus, so the `keyup` never reaches the canvas and `a` (yaw) stays held. Every task that spins
  starts with Shift+A; the ones that do not (T10, T12) do not spin.
- **Fix:** ignore keys pressed with Ctrl, Alt, Meta or Shift; clear `keysDown` on canvas `blur`
  (and on `visibilitychange`). Check the 2D controller (`TwoDInputController.ts`) for the same
  pattern. A browser test: focus the canvas, press Shift+A, move focus away, the camera holds.
- **Then re-check** whether the label counts arrive (fix 7) and whether the tool's settle check
  passes, before touching either.

### 2. The exported image has no key (graphty-element issue #133, plus the app's export dialog) -- severity 4

- **Seen:** T13 and T15: the downloaded PNG has no legend; the dialog itself says "The legend is
  not in the image".
- **Fix:** graphty-element draws the legend into the exported image from the same legend state the
  canvas shows (one legend switch; no export-only option). The app removes the "not in the image"
  note. Files: `graphty-element/src/screenshot/ScreenshotCapture.ts`, the session legend
  (`graphty-element/src/session/styles/legend.ts`), `graphty/src/workspace/export/ImageOutput.tsx`.
- **Proof:** T13's and T15's scripted paths pass the picture checklist. Until then both tasks stay
  held (`criteria.md` preflight 8).

### 3. The study tool cannot save a project, and picks controls behind an open dialog (study tool) -- severity 4

- **Save picker (blocks T14 outright):** the app's first save calls `window.showSaveFilePicker`,
  which headless Chromium rejects as a cancel, so Save does nothing; reopening from Recent projects
  and "Locate..." use `showOpenFilePicker`. Inject a stub with `addInitScript` that writes to and
  reads from the session folder and keeps the handle as Chromium would, so a save lands, Recent
  projects lists it, and reopening reads it back. Prove it on T14's path, then settle whether
  closing the tab and reopening the same storage works (`criteria.md` preflight 7).
- **Controls behind a modal:** in T13 `--click "Data"` took the left rail's Data button behind the
  open export dialog. While a dialog with `aria-modal` is open, resolve names only inside it.
- **Motion:** the settle check let a spinning drawing through without a word (fix 1). After fix 1
  lands, add a "the drawing is still moving" print when two canvas captures a moment apart differ,
  and prove it by planting a spin.
- **README:** say that a click which only opens or closes something prints just the screenshot
  path; note that a combobox is reopened by its label ("Method"), not its current value.
- File: `design/ui/studio/tool/real.mjs`, `design/ui/studio/tool/README.md`.

### 4. The answer key and setups do not match the build (tasks and answers) -- severity 4

Setups that fail make sessions void; paths that do not exist make graders score the build's words
as participant errors.

- **Analyze picks:** T7, T8, T9, T13, T14 and T15 paths and setups use Shift+A, type, Enter. Enter
  does nothing today (fix 5 makes it work). Keep Enter in the keyboard paths; in setups use
  `--click "<method>"` so a setup never depends on a key fix; add the missing "select the run row"
  step before reading Top 10 (T7).
- **T1:** replace `--hover "Local only"` with `--click "Local only"`; reading "Change this in
  Settings > Privacy" after answering also counts as checked on screen. T2's measure likewise.
- **T3 and the T7 B setup:** Open project or file... loads a CSV straight onto the canvas; there is
  no import page and no Load. The path is two steps; the counts are read from the Overview or Data
  > Sources ("41 rows, 41 edges"). Drop `--click Load` from the T7 B setup.
- **T4 (not run, kept for the record):** start from "New from data...", add the second file with
  "Add a table" > "File...".
- **T9:** select the run row by its on-screen name; pick the size attribute with
  `role=option:<name>`; path about 9 steps.
- **T10:** the drawing step "Style tab" is redundant (selecting Everything opens it).
- **T12:** drop `--key g` (it selects but does not list names, and focus is still in the find box);
  the path is find, Enter, then the Degree row.
- **T13:** use `role=tab:Image` / `role=tab:Data` (after fix 14; `role=gridcell:` until then) and
  `role=button:Export`; the path is 6 commands, not 7.
- **T14:** the corrected setup in `rounds/pilot/T14/setup.txt` (label line, then PageRank by
  click); run it as a whole once.

### 5. Analyze cannot pick a method from the keyboard (graphty app) -- severity 4 for keyboard users

- **Seen:** T7, T8, T9, T13, T14, T15: with one match listed, Enter and ArrowDown then Enter do
  nothing. Morgan and Sam (keyboard only) take T9, T10, T12, T14 and T15, and every ranking or
  grouping step goes through this list. WCAG 2.1.1.
- **Fix:** the filter field drives the list as a listbox (or a combobox with an active option):
  ArrowDown/ArrowUp move the active entry, Enter opens it, and with a single match Enter opens that
  one. File: `graphty/src/workspace/analyze/AnalyzePopover.tsx` (its only key handler, near line
  126, handles Escape alone).

### 6. A file that fails to open leaves a project that looks empty, and the reason vanishes (graphty app) -- severity 4

- **Seen:** T5: the refusal is a notice that clears after 6 s; behind it a project named after the
  file opens with "No nodes to draw", which reads as "it loaded and is empty" -- the task's own
  failure code. The line number graphty-element reports is never shown, and the sentence is the
  element's English ("The graphml source could not be read: unexpected end of input inside
  markup") passed through.
- **Fix:** a failed open leaves the app where it was (the start screen) and adds nothing to Recent
  projects; an error notice stays until dismissed and pauses while it has keyboard focus; the app
  writes the sentence from the element's `E_PARSE_FAILED` code and `details` (file incomplete, the
  line when known, ask for it again). Files: `graphty/src/workspace/Workspace.tsx` (the
  `opening.load(...).catch`), `graphty/src/workspace/frame/NoticeSlot.tsx`,
  `graphty/src/workspace/project/actions.ts`.
- Remove-before-add: no new notice; the existing one is made to last and to say the right thing.

### 7. "New from data..." then Load draws nothing (graphty app or graphty-element; find out which) -- severity 4

- **Seen:** T3 (two fresh sessions): the import page reads friends.csv correctly and says "the load
  makes 20 nodes and 41 edges"; after Load the Overview says 20 and 41 but the canvas stays empty
  and a click at its center finds nothing. No console error. T4's two-table load on the same page
  drew, so the difference is an edge table with no node table.
- **Fix:** root-cause first; a graph that has nodes must draw them. If the element never renders a
  graph built this way, the fix is the element's. Files: `graphty/src/workspace/data-page/`,
  `graphty-element/src/session/project/ingest.ts`.

### 8. The label count line reads "0 labels, 0 hidden" while names are drawn (graphty-element, perhaps the app) -- severity 4

- **Seen:** T15: after the label line was added the Style panel said "0 labels, 0 hidden to avoid
  overlap" with about 77 names on the canvas; the tool reported that the element never announced
  the label counts. In T10 the same line was right ("77 labels, 7 hidden"). A count that disagrees
  with the drawing breaks bar 5.
- **Fix:** re-test after fix 1 (a spinning camera may be what kept the counts from settling). If it
  persists, the counts must be announced whenever the drawn labels change, and the app shows only
  announced counts. Files: graphty-element's label placement and its label-count event;
  `graphty/src/workspace/style/LabelSection.tsx`.

### 9. graphty-element must not impose a default layout seed; the app passes its own (graphty-element and graphty app) -- severity 3, owner decision

- **Why:** owner decision 2026-10-06. The studio branch carries a merged element change
  (commit 85e9cafe1, "seed the default layout") that made the force layout's published seed default
  1. It comes out; the app passes a seed so the study draws the same way every load.
- **Fix:** undo 85e9cafe1's element changes (`graphty-element/src/layout/LayoutEngine.ts`
  `DEFAULT_LAYOUT_SEED`, `NGraphLayoutEngine.ts`, `RandomLayoutEngine.ts`,
  `managers/LayoutManager.ts` `withDefaultSeed`, the guide page and its tests). The app passes an
  explicit seed with the layout it asks for on every load and sample
  (`graphty/src/workspace/frame/ElementHost.tsx`, `graphty/src/workspace/layout/methods.ts`), and the
  Seed field shows that value (`layout/LayoutGroup.tsx` falls back to 0, which the flat layout's
  schema refuses). Record the restored published default in `owner-decisions.md`.
- **Proof:** two loads of each sample draw the same picture; Louvain and the label counts are
  re-recorded after this lands (they can depend on positions).

### 10. Undirected graphs are drawn with arrowheads (graphty-element) -- severity 3

- **Seen:** every sample (T2, T6-T12, T15): the Overview says Undirected, the edges carry arrows. T6
  asks whether every character can be reached; arrows invite "no". Marriages and shared chapters
  have no direction.
- **Fix:** the default edge style draws an arrowhead only when the graph is directed; a reader's
  own arrow line still wins. File: `graphty-element/src/config/EdgeStyle.ts` and where the default
  edge style is applied. A change to the default look: list it in `owner-decisions.md`.

### 11. The legend and the Style lines say things the drawing does not (graphty app) -- severity 3

- **Label block:** adding a label line adds a "Label: Everything" block that lists every node's
  name twice ("Anzelma Anzelma") and covers the left of the canvas, hiding nodes and names (T10,
  T14, T15, T16). A label needs no key. The legend card does not show label blocks.
- **Constant size block:** adding Size before binding it shows "Size: Influence -- Influence - Node
  Colour 1" (T9, T15): a key for a size that does not vary, with an internal layer name. That is
  a ready-made false "done" on the size step. The legend shows a size block only when the size
  varies.
- **Gray color chip:** the run row's Color line shows a gray swatch while the dots are an orange
  ramp (T9, T15). The chip shows the ramp it paints.
- Files: `graphty/src/workspace/canvas/LegendCard.tsx`, `canvas/legendWords.ts`, the Style tab's
  color line under `graphty/src/workspace/style/`. Removal, not addition: the card gets shorter.
  The British "Node Colour" in a layer name is graphty-element's word
  (`session/styles/channels.ts`) leaking to screen; drop it from the minted layer name.

### 12. Adding a label line makes a second row called "Everything" (graphty app) -- severity 3

- **Seen:** T10, T14, T15, T16: the tree shows two rows named Everything (one the built-in set, one
  the reader's paint layer). Participants cannot tell them apart; the study tool must address them
  as `Everything#1`/`Everything#2`.
- **Fix:** one row. The reader's Everything layer is drawn as the built-in Everything row's paint,
  not as a sibling with the same name (`graphty/src/workspace/style/row.ts` `writeLine`,
  `graphty/src/workspace/graph-place/rows.ts`). If two rows must stay, they may not share a name.

### 13. After find, the keyboard is stuck in the find box (graphty app) -- severity 3

- **Seen:** T12: choosing a result with Enter leaves focus in the find box; Escape clears it but
  stays; every later letter (including the G shortcut) is typed as a search. Morgan and Sam take
  T12.
- **Fix:** choosing a result moves focus to the selected node's inspector (its first value);
  Escape on an empty find box leaves it. File: `graphty/src/workspace/graph-place/FindBox.tsx`.
  Prove the keyboard path: find Javert, Enter, Tab to Degree, Enter lists 17 names.

### 14. The export dialog does not hold focus and names its two kinds as grid cells (graphty app) -- severity 3

- **Seen:** T13: the left rail behind the open Export dialog could be clicked and changed the
  panel; Image and Data are exposed as grid cells, so a screen reader does not hear two choices.
- **Fix:** the page behind is inert while the dialog is open; Image and Data are tabs (or a radio
  group) with their own names. File: `graphty/src/workspace/export/ExportDialog.tsx`. If the
  Mantine Modal's overlay is the cause, fix it in compact-mantine, not locally.

### 15. The CSV's group numbers are not the group names on screen (graphty-element) -- severity 3

- **Seen:** T13: the picture and the Communities list say Group 1 (20 members) to Group 6 (8); the
  CSV writes the algorithm's raw ids in another order (the 17-member group is "Group 2" on screen
  and 5 in the file). A report writer cannot join the table to the picture.
- **Fix:** the export writes the same group number the screen shows (the element already ranks
  groups for "Group N" in `graphty-element/src/session/results/types.ts`). A change to an export
  format: list it in `owner-decisions.md`. Holds until fix 2 lets T13 run anyway.

### 16. Two layout methods are broken (layout package and graphty-element) -- severity 3

- **Spectral** draws every node on one diagonal line (T11): `layout/src/indexed/spectral.ts` power
  iteration converges to the largest eigenvectors and orthogonalizes only once. Use the smallest
  non-trivial Laplacian eigenvectors (shift or deflate, re-orthogonalize each step).
- **"Force, flat"** spreads nodes into an even disk with no clusters (T11): the `force-2d` catalog
  entry (`graphty-element/src/catalog/layouts.ts`) says "the same pull and push as Spread Out" but
  runs ARF. Run the default force engine on one plane, or make the description true.
- A participant who picks either sees the graph wrecked and may think they broke it.

### 17. A GraphML file cut at 55% opened silently as 5 nodes and 0 edges (graphty-element or graph-io) -- severity 4, off the study path

- **Seen:** during setup, not in a pilot session; T5's file is cut at line 8 and is refused. The
  XML reader does throw on an unclosed element (`graph-io/src/common/xml.ts`), so either the element
  commits nodes before the parse fails, or the refusal notice expired (fix 6).
- **Fix:** reproduce with a file cut half way; a failed read must add nothing to the graph.
  Lower in the order only because no task reaches it.

### 18. App words that read as garbled (graphty app) -- severity 2

- "Undirected, from the file: directed 0" repeats the GML token to a reader who has never seen
  GML, and runs into the panel edge (every sample). Say where it came from in plain words
  (`graphty/src/workspace/inspector/words.ts`, `directionWords`).
- "1 edge row name 1 node no node row holds" (the import page's match sentence; T4 route).
- The CSV warning on Export > Data is written for developers ("the generic dialect has no
  direction column ...") (`graphty/src/workspace/export/DataOutput.tsx`).
- Fewer words, not more: app words at rest may not rise (bar 9).

### 19. Chrome names, tooltips and padding (graphty app) -- severity 2

- No tooltip on the Main menu button (`graphty/src/workspace/frame/menus.tsx`) or the "Local only"
  privacy chip (`graphty/src/workspace/privacy/PrivacyChip.tsx`); every icon control has its
  tooltip.
- Truncated names with no tooltip: Overview "Edges per ..." and the Data page's source rows
  ("Node ...", "Edge t...").
- Duplicate accessible names (bar 8): two controls named "Analyze" (toolbar and the tree's link);
  the Style tab panel named by its whole content.
- Method and Seed sit outside the inspector's padding on the Graph style tab
  (`graphty/src/workspace/layout/LayoutGroup.tsx`).

### 20. The grading rules and reference values (tasks and answers) -- severity 3, values before round 1

- **Accepted answers:** the PageRank run is named "Influence" on screen and Louvain's "Communities";
  graders accept either the method or the on-screen name for "what was the order based on" and
  "what the sizes mean". Characters' recorded facts are `id` and `name` (not
  `graphty_originalId`), on Les Miserables and Florentine; friends.csv's names are in `id`. Copy
  the screen's spellings for Javert's neighbors (MmeThenardier, Woman1, Woman2).
- **T10:** there is no "Show all labels" control; drop that branch. Success is names drawn plus the
  hidden count read and explained; "every name is on" beside a hidden count stays a false "done".
- **T3:** S needs 20 and 41 plus a rows check on screen (Data > Sources rows against edges, or the
  import page's sentence); stating "nothing dropped" from the Overview alone is SD.
- **T11:** "it did not help" is the expected opinion on this build, not a failure.
- **T15 picture checklist:** the key must name color and size; it does not list names.
- **Usage card measure:** add "skipped by opening a sample" (the card goes away unanswered and
  usage data stays off).
- **Reference values from the pilot (re-record on the final commit after fixes 1, 9 and 10):**
  Les Miserables PageRank top 3 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; Florentine
  PageRank range 0.03066 to 0.1458; friends.csv PageRank (as computed: directed, unweighted) Farah
  0.06608, Ava 0.06423, Hana 0.05883; Louvain on Les Miserables 6 groups, largest 20 (record
  whether it repeats across loads); label counts 7 hidden (Les Miserables) and 14 (College
  football) at 1440 x 900. The other rankings are still blank and must be filled in rehearsal.
- **"Weight used by default" is wrong for this build:** runs ignore the weight (see Deferred);
  the key records what the build computes.

## Deferred, with the reason

| Finding | Why it waits |
|---|---|
| No "Show all labels" control (T10) | Whether the live hidden count is enough is what T10 measures. Adding a control breaks remove-before-add without evidence; the key drops the branch (fix 20). |
| The PageRank run is called "Influence" and the word PageRank leaves the screen (T7, T9, T15, T16) | T7 and T9 measure exactly whether a reader can say what the order and sizes rest on; graders accept both words. It conflicts with the owner's rule that the trade's words are explained, never replaced, and the word comes from graphty-element's catalog (`plainName`), a neutrality problem. Bring it to a decision after round 1 with the sessions' answers. |
| Runs ignore the file's weight (friends.csv, Les Miserables `shared_chapters`; element issue #882) | No participant can see it and no grade depends on it (answers are graded against the screen). It does break the owner's 2026-09-30 rule that every run uses the weight by default; first element fix after round 1. Changing it changes the algorithm's options, a public API. |
| friends.csv loads as directed, so its ranking depends on which friend each row lists first | Edge tables load as directed by default in Gephi too (field convention). Watch whether participants remark on the arrows; decide after round 1. |
| 3D perspective makes equal dots look different sizes (T9) | It is what users get; T9 and T15 measure `meaning-wrong`. Re-check once the drawing holds still (fix 1). |
| G selects the neighborhood but shows a summary ("Acciaiuoli (1)") instead of names (T12) | Off every success path once the key drops `--key g`; watch for it. |
| Neighbor list shows no shared-chapter counts | Not needed by T12's success; the GML import does not record a weight. |
| The top-ranked node's label is the one hidden by overlap (T16) | No grade depends on it; a graphty-element label-priority question to file. |
| Histogram draws one equal bar per value for a continuous score (T7, T16) | No grade depends on it; graphty-element. |
| The legend and toolbar sit over the drawing; fit to view ignores them | Fix 11 shrinks the legend; framing around floating chrome needs a graphty-element fit-inset API (public). |
| Group Members shows "First 10" with no more; selecting a group does not mark its members | Three names suffice for T8. |
| "Edit source..." drops the first file; "Show the 1 unmatched row" shows none when adding to an open graph | T4 only, which is not run; tier 2. |
| The usage card disappears unanswered when a sample opens | The card and its wording are the owner's; recorded as a measure (fix 20). |
| The sample's description is gone once opened; "Components" is jargon; Degree does not look clickable; the Layout control is an unlabeled icon | Design questions the round measures (T2, T6, T12, T11). |
| A save that cannot reach a file gives no feedback | Only reachable where the picker cannot show; fix 3 makes the study path work. |
| The CSV column header `results.louvain.group` | An export format change (public); bundle with fix 15's decision if the owner wants it. |
| Labels are small and serif at the default zoom | Graders zoom screenshots before scoring "names drawn"; measure, not fix. |

## Order of work

1. Fix 1 (spin), then re-check 8 and the tool's settle; fix 9 (seed) and 10 (arrows) in the same
   graphty-element pass; rebuild the element and the app.
2. Fix 3 (tool) and 4 (paths and setups) in parallel with the element pass.
3. Fixes 5, 6, 7, 11, 12, 13, 14 in the app; 16 and 17 in the layout package and the element.
4. Fix 2 (#133) and 15; then T13 and T15 may run.
5. Fixes 18 and 19 if time allows before rehearsal; they are cheap and on every path.
6. Re-record every reference value (fix 20) on the final commit; re-pilot each touched task's
   scripted path; then preflight.
