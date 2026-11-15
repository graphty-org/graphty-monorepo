# Tier 5 round 1 scores

Build 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`, the first line of `../../criteria.md`).
Scored 2026-11-03 from the 30 session grades (`sessions/<id>/grade.md`), the scripts
(`tool/steps.mjs`, `endstate.mjs`, `keydraw.mjs`, `waits.mjs`, `score.mjs`), the session repros
under `repro/`, the scripted walk (`bars/`, `bars-light/`) and the four expert walks in `expert/`
(accessibility, Figma product designer, visual designer, screenshot audit). The start gate ran
before this round (`plan.md`, "Gate evidence").

## Result in one paragraph

All 30 sessions are valid (28 pointer, 2 keyboard), none was run on Sonnet, and no participant
said "done" on a wrong screen. **Four bars fail: 1, 4, 8 and 9; bar 3 fails on one task; bars 2 and
5 hold; bars 6 and 7 are not measured** because the content designer's and the interaction
designer's walks did not run (bar 7 already sits at its allowance of 5). Task success fails on two
tasks: T73 (0 of 4: every session reached the right people through the canvas's Neighborhood and
made a hand-picked layer, which the key grades P) and T75 (1 of 2: T75 A stopped by a confirmed
defect in the filter's value picker). Bar 4 fails on four confirmed severity 3 findings, still to go
through the two skeptics. Bar 9 fails on at least four parts of the selection editor that people on
different task halves named as the moment they were least sure: the new Or group, the words
Condition... and Or..., By position's count box, and the value picker. Cost (bar 8) fails on T70,
T74 and T78, mostly outside the editor: naming the layer, the Fill color box, and hiding an
existing color layer that drowned the new color.

With same-model participants on 2 to 4 sessions per task, a failed bar is strong evidence and a
held bar is weak (`../../criteria.md`, "Measures").

## Sessions

| | Count |
| --- | --- |
| Sessions graded | 30 (r1-s01 to r1-s30) |
| VOID | 0 |
| Valid pointer sessions | 28 |
| Valid keyboard sessions (Sam) | 2 (r1-s29 T70 A, r1-s30 T71 A) |
| Run on Sonnet | 0 (every grade records Opus, claude-opus-5-5) |
| False "done" | 0 of 30 |
| Grades S / SD / P / F | 17 / 4 / 7 / 0 on pointer sessions; Sam S, S |

Seven grades are P in `grade.md` (r1-s09, r1-s10, r1-s11, r1-s12, r1-s14, r1-s18, r1-s23). The
form the graders returned had no P, so they wrote F or G there; this file uses `grade.md`'s P.

## Bars

| # | Bar | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Task success | **Fails** (T73, T75) | T73 0 of 4 (no half succeeds), T75 1 of 2 (A fails). Seven tasks hold: T70 4/4, T71 4/4, T72 2/2, T74 3/4, T77 2/2, T78 3/4, T79 2/2 |
| 2 | False "done" | Holds | 0 in 28 pointer and 2 keyboard sessions |
| 3 | Wrong turns | **Fails** (T75) | T75 median 3.5 (7 and 0). Every other task at most 1 |
| 4 | Severity 3 and 4 open | **Fails, pending skeptics** | 4 confirmed severity 3 (below). End-state check: no real mismatch |
| 5 | Keyboard | Holds | Sam S and S; no confirmed keyboard block; 0 serious or critical axe findings at both sizes in both themes |
| 6 | The owner's data rules | **Not measured** | 0 confirmed violations; the content designer's word count and the interaction designer's walk did not run; 1 candidate |
| 7 | Figma and graphty consistency | **Not measured** (at the limit) | 0 severity 3 or 4; 5 confirmed severity 2 against an allowance of 5; the interaction designer's walk did not run and 2 Figma candidates are open, so one more confirmed item fails it |
| 8 | Cost on core tasks | **Fails** (T70, T74, T78; T71 B and T73 A by half) | Per half below |
| 9 | The owner's feedback | **Fails** | 4 editor elements named by two sessions on different halves, plus 1 confirmed calm-first severity 2, against an allowance of 3. The calm-first check itself has not run on this build |

### Bar 1, per task and half

| Task | A | B | Successes | Holds |
| --- | --- | --- | --- | --- |
| T70 | s01 S, s03 S | s02 S, s04 S | 4 of 4 | yes |
| T71 | s05 S, s07 S | s06 S, s08 S | 4 of 4 | yes |
| T72 | s21 S | s22 S | 2 of 2 | yes |
| T73 | s09 P, s11 P | s10 P, s12 P | 0 of 4 | **no** (both halves 0) |
| T74 | s13 SD, s15 S | s14 P, s16 SD | 3 of 4 | yes (B 1 of 2) |
| T75 | s23 P | s24 S | 1 of 2 | **no** (A 0) |
| T77 | s25 S | s26 S | 2 of 2 | yes |
| T78 | s17 SD, s19 S | s18 P, s20 S | 3 of 4 | yes (B 1 of 2) |
| T79 | s27 S | s28 SD | 2 of 2 | yes |

- **T73: one route, four P's.** All four went to the person or gauge on the canvas (find box or
  table row, then Node actions > Neighborhood, Hops 2) and made "New layer from selection". The
  set and the count were right every time (16 of 24, 7 of 11), but the layer holds a fixed list of
  ids ("Picked by hand: 16 nodes"), not "within 2 hops of", which the key grades P. No session typed
  "within" into Which nodes, so the editor's Within hops step was not tested at all. r1-s09's ten
  extra steps came from a study setup defect (below); its grade would be P without it.
- **T75 A** reached Degree min 10 (112 of 549) and then could not remove the stranded 7: the
  Largest component step changed nothing (it has no "So far"), and the Results entries of a run on
  the 112 bound the step to the whole graph (confirmed defect, bar 4).
- **T74 B and T78 B** each hold on one success of two: r1-s14 colored the top 3 from a table
  selection (P), r1-s18 typed seven station names across two layers (P).

### Bar 3, wrong turns per task (median)

T70 0 (1, 0, 0, 0); T71 0; T72 0; T73 1 (4, 1, 0, 1); T74 1 (1, 0, 1, 3); **T75 3.5 (7, 0)**; T77 0;
T78 1 (1, 2, 0, 1); T79 0.5 (0, 1). Without the two picks the confirmed value-picker defect caused
in r1-s23 (its wrong turns 5 and 6), T75 is 2.5 and still fails; it rests on one session. r1-s09's
wrong turns 2 to 4 came from the setup defect; without them T73 stays at 1.

### Bar 8, steps per core task half (`tool/steps.mjs`; limit = path + 3)

| Half | Path | Sessions | Median | Limit | Holds |
| --- | --- | --- | --- | --- | --- |
| T70 A | 15 | 23, 20 | 21.5 | 18 | no |
| T70 B | 15 | 24, 25 | 24.5 | 18 | no |
| T71 A | 9 | 11, 11 | 11 | 12 | yes |
| T71 B | 9 | 12, 13 | 12.5 | 12 | no (by 0.5) |
| T73 A | 12 | 32, 13 | 22.5 | 15 | no |
| T73 B | 12 | 12, 12 | 12 | 15 | yes |
| T74 A | 13 | 21, 19 | 20 | 16 | no |
| T74 B | 13 | 14, 27 | 20.5 | 16 | no |
| T78 A | 17 | 25, 22 | 23.5 | 20 | no |
| T78 B | 19 | 68, 33 | 50.5 | 22 | no |

`steps.mjs` pools the two halves and so reports T71 and T73 as holding; the criteria count per
half, which this table follows. Where the extra steps went:

- **T70**: every session made the filter first (the key's "also success" order), which adds the
  trip back to Graph; three typed a name into the new layer's name box, which opens in rename mode
  (2 steps); the color box took 2 to 6 extra (a click in the box, Control+A, or the picker's three
  tries); two hid the PageRank layer so the orange would show. Almost none of it is in the
  selection editor.
- **T73**: nobody took the path, so these numbers describe the canvas route, not the editor. A's
  32 includes r1-s09's ten setup-detour steps.
- **T74**: By position's count box (a typed "top 5" and its error; Enter needed before the count
  moves) and the Fill box; r1-s16 detoured through the run's own layer.
- **T78**: three of four took the Data place filter on edges instead of the step's Advanced >
  Edges where (an accepted route that costs the trip to Data and back); r1-s18 counted neighbors
  by hand (68). r1-s20's 33 includes 6 checks after success (27 before).

### Bar 4, the end-state check

`endstate.mjs` flags four sessions (r1-s01, r1-s03, r1-s14, r1-s29): an encoding layer "selects 24
(or 11) but paints 0". In each the participant had hidden that layer with its eye (`hidden: true`
in `styles.json`), so painting nothing is right: the check counts a hidden layer as painting (a
tool defect, below). No real mismatch remains. `keydraw.mjs`: 39 key rows, 0 disagreements.

### Bar 5

Sam's two sessions are S (T70 A in 89 inputs, T71 A in 64). No keyboard block: the accessibility
walk finished every path by keys, and Sam's long way to Done is cost, not a block (he never tried
Escape, which `decided.md` 585 makes Done on the workspace). The scripted walk read 0 serious or
critical axe findings on every tier 5 screen at 1440 x 900 and 900 x 700 in both themes
(`bars/bars.json`, `bars-light/bars.json`).

## Confirmed problems

"Confirmed" follows `../../criteria.md`: two sessions on different task halves; a session or an
expert plus a scripted `real.mjs` repro; or an expert's screenshot-visible finding the screenshot
audit also shows. A replay of an expert's walk on the same build counts as a scripted repro, as in
the void round. None has been through the two skeptics in this round; each is "confirmed, before
skeptics".

### Severity 3 (bar 4)

1. **The screen reader hears a count from a panel it cannot see.** While a workspace is open over
   a selected layer, each count change is spoken twice, the second from the covered inspector row,
   over another base ("15 of 24" then "4 of 24 nodes" in the filter host). Accessibility finding 1,
   repros `expert/a11y/k1b/14.png`, `k2/28.png`; both skeptics kept it at 3 in the void round on
   this same build. Fixed in `WhichPicker.tsx` after the freeze; this build still has it
   (`decided.md`, "After round 1 (void)"). Owner: graphty app.
2. **A filter step picked from a run's results counts over a different computation.** After
   Connected components ran on the 112 nodes showing, the filter picker offers "Connected
   components, 3 values" and "Piece size, 2 to 105"; picking either gives a step over a new
   whole-graph run ("Group 1, 549"; "549 to 549") and starts a second run. The picker names the two
   runs alike; only the matches strip's columns say "(visible)" and "(whole graph)". Session r1-s23
   (stopped T75 A) plus repro `repro/r1-s23/repro.sh` (`run/09.png`, `run/10.png`, both viewed: the
   step reads "Group 1 549" under a top bar of 112 of 549). A count over a base nobody can tell.
   Owner not traced: the app's picker binding, or how graphty-element names a run's result.
3. **"Is exactly" (and every other how-to-match choice) does not take.** Choosing it in a text
   step's list leaves the step on "Contains", by pointer and by keyboard; the saved step matches
   substrings. Session r1-s18 plus repro `repro/r1-s18/repro.sh` (`05.png` viewed: Contains still
   ticked after the choice). Rated 3 because a reader who chose an exact match gets a substring
   count. Against it, for the skeptics: the reopened list shows Contains, so there is a sign, and on
   the study's data the two counts were equal. Owner: graphty app.
4. **Clear then Escape deletes a saved filter card, and Undo takes away something else.** A card
   closed with Done and reopened, then Clear and Escape: "Filter not added", the card and its steps
   are gone, and Control+Z undoes an unrelated edit (a layer's color). Accessibility finding 2, repro
   `expert/a11y/k1b/44.png` to `49.png`. No decided rule permits it on a saved card ("Escape never
   discards work" and "Clear has an undo", `decided.md` 599 and 601); the Escape path in
   `SelectionEditor.tsx:812` skips the `openedNew` check Cancel makes. No participant met it. On a
   new card the same sequence is the decided-rule collision already held at 2. Owner: graphty app.

### Counted in bar 9 (allowance 3)

Selection-editor elements named in the follow-up's "least sure" answer by two sessions on
different task halves (pointer sessions; the coding is in "Measures", below):

5. **A just-added Or group.** It opens at B 0 with the picker reopened, its range drawn full across
   the column's span while it reads "0 so far", and the preview switching to group colors; people
   could not tell a second way into the same filter from a new filter, or a waiting step from a
   broken one. r1-s05 (T71 A), r1-s06 (T71 B), r1-s07 (T71 A), r1-s25 (T77 A); r1-s26 (T77 B) read
   the grey bounds as set values. Figma finding 4 shows the same range.
6. **Condition... and Or... say nothing of "and" or "or else".** r1-s08 (T71 B), r1-s21 (T72 A),
   r1-s24 (T75 B); r1-s22 picked Condition... by elimination. Figma's watch item: Condition... adds
   a narrowing step in group A and a widening "Add" step in an Or group.
7. **By position's count box.** An empty box with "of all nodes" at about 9 px: no "top" or
   "bottom", no "number or percent", and no change until Enter. r1-s13 (T74 A), r1-s15 (T74 A),
   r1-s16 (T74 B); Figma finding 5 (no # / %, no top / bottom, no Computed on).
8. **The value picker.** r1-s18 and r1-s20 (T78 B: Degree and other graph measures appear only when
   typed), r1-s23 (T75 A: two runs' results named alike, item 2), r1-s27 (T79 A: the outline's
   "Value..." row and the picker's "Value..." read as two places for one thing). Three faults in one
   element; read fault by fault, only "measures hidden until searched" repeats, and on one half.
   Without this item bar 9 still fails (4 against 3).
9. **The read-only outline at rest breaks its column on Except.** No 40 px verb column in the
   inspector's outline, so "Except" sits at the heading's edge and its value 21 to 36 px off its
   group's other rows. Visual 3, Figma 9, screenshot audit (`engineer/style-1200x900/13.png`).

Sam's two sessions both named the way to Done by keyboard (T70 A, T71 A); counted, that is a sixth.

### Counted in bar 7 (allowance 5)

10. **The value picker, once typed in, jumps up over its field and the header's Done.** Figma 1,
    visual 4; sessions r1-s29 (T70 A) and r1-s30 (T71 A) met it. `decided.md` 734.
11. **Clear renames a filter card "a selection".** Figma 6 (`figma/w3/07.png`), confirmed in the void
    round by repro (`expert/a11y/k2/07.png`). `decided.md` 631-632.
12. **The workspace header is far in the Tab order and never an F6 stop.** Tab past the last control
    goes to the status bar; Done is 11 to 34 keys back. Accessibility 3; Sam's two sessions
    (different halves); repro `repro/r1-s30/`. `decided.md` 607-608.
13. **A new yes-or-no card is titled by an instruction**, "trained pick yes or no", while a new
    category card is titled by its attribute. Figma 7 (`figma/w2/06.png`) and r1-s01. A candidate
    for bar 6 too ("a sentence at rest"), which only the screenshot audit confirms.
14. **A colleague's two-step card rests as one row.** "trained Yes 14 of 24" hides its "hours min
    10" step, with no caret; a click expands it. Figma 3; the audit's `engineer/thanks-1200x900/04.png`
    shows the same (viewed). T77 asks the reader to change the hidden step; r1-s26 read the first
    click as "nothing opened".

### Severity 2, confirmed, gating no bar (the editor)

- **A filter card's name stops describing it** after an Or group or a second step ("role board",
  "telemetry no" over a two-way card). r1-s05, r1-s06, r1-s07, r1-s08 (both T71 halves), visual 8,
  audit. Decided to follow edits, not built.
- **The selection preview opens in group colors**, green for an orange layer, faded like a filter's
  removal. r1-s01, r1-s02, r1-s03, r1-s04, r1-s27, r1-s28 and Sam (r1-s29). Decided (owner question
  2, `decided.md` 32); reported as the owner's question below, not as a defect.
- **The Neighborhood route keeps no rule** (all four T73 sessions, both halves): see insight 1.
- **The By position error says the opposite of the screen**: "the count and drawing still use the
  highest 10" while the header reads 24 of 24 and every node is drawn as a match. r1-s13 (T74 A),
  r1-s16 (T74 B), repros `repro/r1-s13/`, `repro/r1-s16/`.
- **At 900 x 700 the preview is a 44 px sliver** and the title loses the rule's name (audit,
  accessibility 7). No session ran at that size; the width rule belongs in `decided.md`.
- **A chosen reference shows only its id** ("v02" after "James Carter"; visual 5, audit).

### Severity 2, confirmed, outside the editor (backlog)

- **A new color inside an existing layer's color ramp disappears.** FF8000 and FFA500 sat inside
  PageRank's or Betweenness's orange-to-brown, so the drawing looked unchanged; the key's small
  "4 nodes covered by Staff" was not read as the cause. r1-s01, r1-s03, r1-s29 (T70 A), r1-s14
  (T74 B), r1-s15 (T74 A). Four of them hid the existing layer to see theirs.
- **The empty Fill color box gives no cue**: a click shows a text cursor only, the picker opens from
  a tiny swatch, and people guessed a color name. r1-s03, r1-s04, r1-s10, r1-s11, r1-s14, r1-s19,
  r1-s21 (seven sessions on six task halves). The "least sure" moment of 8 of 28 pointer sessions is the
  Fill box or the drawing after it.
- **The color picker closes on its first click when the box is empty** (committing a salmon).
  r1-s02 (T70 B), r1-s22 (T72 B), r1-s28 (T79 B), repros `repro/r1-s02/`, `repro/r1-s22/`. Its
  swatches hold no orange (r1-s01, r1-s02, r1-s16, r1-s22, r1-s28).
- **"Stop varying node color by data" sets the default indigo**, so the narrowed run layer looks
  gone. r1-s16 plus repro.
- **Style layers "+" with the sidebar search open closes the list and opens no menu.** r1-s28 plus
  repro `repro/r1-s28/`.
- **The Neighborhood panel's header names a gauge by id ("G03")** while the line under it says
  "Cedar Bend". r1-s10, r1-s12, repro `repro/r1-s10/`.
- **The start page does not scroll under the wheel over the hero's left column.** r1-s09 plus repro.

## Candidates (not confirmed)

| Candidate | Severity | Source | What confirms it |
| --- | --- | --- | --- |
| Largest component computes over the full graph, has no So far, changes nothing on a one-piece graph and the outline lists it as if it narrowed | 3 | r1-s23 (T75 A); known since build 7ca4cae647, graded P by the key | A scripted repro (the key's own walk would do) |
| A second filter card previews over the full graph; its So far covers only its own steps | 3 | r1-s23 | A scripted repro, and a `decided.md` ruling on whether cards stack |
| Graph measures (Degree) missing from the open value picker until typed | 3 (r1-s18), 2 (r1-s20) | Two T78 B sessions, one half | A session on another half, or a repro plus the audit |
| Right-click on a table row opens nothing, where the canvas right-click opens Neighborhood | 2 | r1-s10, r1-s12 (T73 B, one half) | A repro |
| Count needs Enter before it moves (By position, the hours box, a typed name) | 2 | r1-s15, r1-s18, r1-s30 | Seen on three halves (T74 A, T78 B, T71 A) but in three different boxes; confirmed if the skeptics class it as one finding |
| A yes-or-no test drawn as a "Value..." dropdown, not a Yes \| No segment with counts | 2 (bar 7) | Figma 2 | The audit |
| Hiding the matches strip enlarges the preview and cuts nodes at its edges | 2 (bar 7) | Figma 8 | The audit or a replay |
| The blank 240 px band where the hidden node table was | 2 (bar 9) | visual 1 | The audit on a start with the table open (r1-s02, r1-s04 screenshots exist) |
| No match's chit drawn as an unticked checkbox | 2 | visual 2, Figma 17 (1) | The audit |
| Waits over 10 s on the scripted 50,000-node walk (4 of 74, longest 15.9 s) | 2 each (bar 9) | `tool-dry-run-2.md` | A reader of the screenshots: progress shown or not |
| Escape is Done on the workspace, but Done shows no key | 1 to 2 (bar 6: a key with no visible button showing it) | Sam never found it | A scripted repro of Done's tooltip |
| Three screens over the 50-word budget (57, 66, 67) | 2 (bar 9) | scripted count | The content designer's hand count |

## Candidate insights

Each with its evidence. For the skeptics.

1. **The canvas is the first door for "near one person", and it throws the rule away.** Four of
   four T73 sessions, both halves, went find or table, then Node actions > Neighborhood, and made
   "New layer from selection": the right set, kept as fixed ids. None opened Which nodes and typed
   "within". The editor's Within hops step is unreached, not refuted. Evidence: `styles.json` of
   r1-s09 to r1-s12 (match ids); r1-s12's least-sure moment (the table row's right-click). The fix
   the evidence points at: the Neighborhood panel makes a "Within N hops of X" layer, so the door
   people use writes the rule the editor holds.
2. **Adding a second way in (Or) is the editor's least-understood moment.** Four sessions on three
   halves named the just-added Or group, three on three halves named the Condition... / Or... words,
   and the card keeps its first step's name after the Or. Every one still succeeded (T71 4 of 4), so
   this is cost and doubt, not failure. Evidence: items 5, 6 and the card-name finding.
3. **A count that waits for Enter reads as a step that did nothing.** By position (r1-s15), the
   hours Min box (r1-s30), a typed name (r1-s18): the header stays at "24 of 24" or "11 of 11" until
   Enter, while the date box on the same workspace applies as typed. People retyped or opened
   menus. Evidence: as cited in the candidates table.
4. **Picking happens in group colors, coloring happens after Done, so nobody sees the final look
   before committing it.** Five of five T70 readers took the green for "who is picked", and five of
   five wanted to see the layer's real color against what is already drawn; four of them then met an
   orange drowned in PageRank's ramp. Group colors is decided; the gap is the order (choose, then
   color) and the missing sign that a lower layer already colors the same nodes. Evidence: owner
   question 1 below; the color-ramp finding.
5. **Results entries do not say which run they belong to.** Two entries named "Connected
   components" and two named "Piece size", told apart only by the strip's "(visible)" and "(whole
   graph)" columns, and a pick that binds the other run. This is the confirmed severity 3 above and
   T75 A's failure. The fix belongs where the run's scope is named (graphty-element gives a run's
   facts; the app's picker words them).
6. **The weak-links fix is still not found.** Three of four T78 sessions counted over the strong
   ties, all through a Data place filter that removes the weak ties from the whole picture; none
   reached the step's Advanced > Edges where. One (r1-s18) never found a count of neighbors at all.

## Measures (not gates)

**The owner's question on T70 (the drawing while choosing).** Five sessions answered (r1-s01 to
r1-s04, r1-s29). Read the group colors as a preview of who is picked: 3 at once (r1-s01, r1-s03,
r1-s29), 1 after a moment of "these will be green" (r1-s04), 1 read the fade as the filter's
removal ("am I hiding these five as well?", r1-s02). Which default they want: all 5 asked to see
the layer's own color or the real picture while choosing (r1-s01 and r1-s03 also asked for a
warning that another layer already colors the same nodes). Nobody touched the Styled switch.

**The owner's question on T71 (the matches strip while picking).** Five sessions (r1-s05 to r1-s08,
r1-s30): all 5 used the strip under the drawing (names, roles, hours; r1-s07 trusted it most), 0
hid it, 0 said it got in the way. What got in the way: the group colors (r1-s05, r1-s06, r1-s07),
the Group colors / Styled / Table buttons (r1-s08 avoided them), and for Sam the strip in the Tab
order between him and Done.

**First door per session.**

| Task | Doors |
| --- | --- |
| T70 | Data place filter 3 (s01, s02, s03), canvas toolbar Filters 1 (s04); all four did the filter before the layer |
| T71 | Data place filter 2 (s05, s07), canvas toolbar Filters 2 (s06, s08) |
| T72 | table (s21), Style layers (s22) |
| T73 | find box (s09, s11), table row right-click (s10, s12), then Neighborhood in all 4 |
| T74 | table sorted by the measure (s13, s15), Analyze (s14, s16) |
| T75 | canvas toolbar Filters (s23), Data place filter (s24) |
| T77 | the top bar's filter chip, then the card (s25, s26) |
| T78 | Data place filter on edges (s17, s19), Edges table (s18, s20) |
| T79 | Style layers (s27), find box (s28) |

**Overwhelm (a measure; the rating check did not hold).** Pointer median 3 over 28 (ten 2s, fifteen
3s, two 4s, one 5). By half: T70 A 3, B 2.5; T71 A 2, B 2.5; T72 A 2, B 3; T73 A 3.5, B 2.5; T74 A 3,
B 3; T75 A 5, B 2; T77 A 2, B 3; T78 A 2, B 3.5; T79 A 3, B 3. Sam 3 and 3. Beside them: the
placement study 2 to 3; the rating check 3 and 5 on the rejected build, 2 and 3 on the frozen one.

"Least sure", coded by the screen element named (pointer):

| Element | Sessions | Editor? |
| --- | --- | --- |
| A just-added Or group | s05 T71A, s06 T71B, s07 T71A, s25 T77A | yes |
| Condition... / Or... | s08 T71B, s21 T72A, s24 T75B | yes |
| By position's count box | s13 T74A, s15 T74A, s16 T74B | yes |
| The value picker | s18 T78B, s20 T78B, s23 T75A, s27 T79A | yes |
| The read-only card after a click | s26 T77B | yes (one half) |
| The Fill color box, its picker, or the drawing after it | s01, s02, s03, s04, s10, s11, s14, s19 | no |
| A layer's empty sections after Done (Shape, Visibility, Text, Fill, Shaders) | s22 T72B | no |
| The Style tab with nothing picked | s17 T78A | no |
| Style layers "+" with the search open | s28 T79B | no |
| The table row's right-click | s12 T73B | no |
| The start page after Discard (setup defect) | s09 T73A | no |
| Sam: the way to Done by keyboard | s29 T70A, s30 T71A | yes |

**The weak-links task (T78).** First door for "just the strong ties": the Data place filter 3 (s17,
s19, s20), the Edges table by hand 1 (s18). The scope was told from the top bar's edge count and the
Degree range dropping (s17 3-8 to 1-5). Reached through the step's Advanced: 0 of 4, so the Edges
where fix is **not re-tested**.

**Finding Edit (T77).** r1-s25: the card, then "Edit" (two buttons share the name; the step missed).
r1-s26: the card, whose first click shows Edit in place of the count, then Edit.

**The two "+".** Not counted by script. The graders report one off-path "+" problem: Style layers
"+" with the search results open (r1-s28).

**50,000 nodes (T79).** `waits.mjs` over r1-s27 and r1-s28: 23 timed steps, longest 8.5 s
(`r1-s28/06.png`), 0 over 10 s. Neither participant waited, retried or gave up during one.

**Algorithms in the editor (T74 B, T75).** No T74 B session picked a measure in the editor (both
ran Betweenness from Analyze). In T75 A a pick in the editor started a second run, which surprised
the participant and cost the task (item 2). T75 B ran nothing.

**Fix coverage, against the placement study's baselines (from the grades and step logs).**

| Fix | Baseline | This round | Result |
| --- | --- | --- | --- |
| Wrong value ticked in a checklist | 6/9 | 0 of 6 pointer sessions that ticked a checklist (s01, s03, s05, s07, s27, s28); 1 of 2 keyboard (s29, caught by the preview) | better |
| Wrong row deleted | 4/9 | No grade records a delete; the logs were not scanned for one | not re-tested |
| Place lost to Escape | 5/9 | 0 of 3 sessions that pressed Escape (s09, s16, s23) | better (small base) |
| A guessed word | 3/9 | 9 of 28 pointer sessions guessed an editor word (Condition... s08, s21, s22, s24; By position s13, s15, s16; Degree s17, s19) | not confirmed (32% against 33%) |
| The weak-links filter found | 1/3 | 0 of 4 through Edges where; 3 of 4 counted over the strong ties another way | not re-tested |

**One-domain evidence.** A measure that runs when picked (T74 B): not reached. A step that depends
on the steps before it (T75 A): reached in the wrong card, one session. A reference found by name
(T73 B; A by the reference search): not reached (canvas route). Degree on a directed network (T78
B): r1-s20, one session, Degree over All, right.

**Problems by package.** graphty app: every confirmed item above except the 50,000-node fog
(graphty-element, known) and the picker swatches (compact-mantine's table of hues, if the
swatches are its). Item 2's owner is not traced.

## The study

- **A setup that does not match its briefing (r1-s09).** T73 A's briefing says Grace saved the
  project and has a newer copy of the list; the setup saves nothing, so the start page has no
  Recent projects and the newer copy does not exist. She discarded the start (and its PageRank run)
  looking for it: ten steps and three wrong turns. A study defect, not the build's. Fix the
  briefing or the setup before T73 A runs again.
- **`endstate.mjs` counts a hidden layer as painting.** Four false mismatches (r1-s01, r1-s03,
  r1-s14, r1-s29). Skip a layer with `hidden: true`.
- **`score.mjs` cannot read most of this round's grades.** It reads 5 grades as lacking the three
  grade lines (they start with `Grade:` before the heading) and 19 overwhelm lines as unreadable
  (written `Overwhelm: 3 (least sure: ...)`), so its bar 1 and bar 9 lines are wrong. Bars 1 to 3
  and 9 here are scored by hand from `grade.md`. Either the grader template or the parser must give.
- **`steps.mjs` pools a task's halves**; the criteria count per half (bar 8 table above).
- **The graders' return form has no P.** Seven P's arrived as F or G.
- **The tool's ambiguous-name refusals** (r1-s04, r1-s16, r1-s22, r1-s25: two controls with one
  name, "the step did nothing") are counted as tool lines, not wrong turns. Two of them name a real
  shared-name defect ("telemetry", "Edit").

## What the round needs next

1. The skeptics on items 1 to 14 and the six insights; a severity 3 that falls to 2 still fails
   nothing new, but bar 4 holds only if all four fall.
2. Fix the four severity 3 findings; re-walk each fix by its repro.
3. Bar 9: the four named editor elements are fixable surfaces (the Or group's first state, the
   Condition... / Or... words, By position's box, the value picker's measures and run names); then
   the calm-first check on the new frozen build over every screen it lists, before round 2's
   sessions are read.
4. Run the content designer's and the interaction designer's walks, so bars 6 and 7 have their
   feeds; bar 7 has no room left.
5. T73: make the Neighborhood panel's layer keep the rule, or the editor's Within hops step stays
   untested by people.
6. Fix the study tool items above before round 2 is scored.
