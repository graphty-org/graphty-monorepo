# Tier 2 round 3 insights: returning users on the real graphty app

What round 3 of the returning-user study shows, on build 26f3bb968e43, after two independent
skeptics checked every fault, bar, problem and candidate insight in `scores.md` against the grades,
transcripts, `session.json` files, screenshots, the task file, the answer key, the bars run and the
build's source. Rule applied: a claim both skeptics drop is dropped; a claim either one weakens or
drops is weakened, unless the other answers its reason with evidence. Most severe first. Severity is
Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer unknowingly).
Screenshot paths are relative to `sessions/`.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. A failure is strong evidence; a pass is weak until real people confirm it. Seven sessions
saying the same thing are not seven people: the seven T18 asides about a lost first chain are
nearly word for word the same. Several counts below come from the study's own setup or follow-up
question rather than from the app; each says so.

54 of 56 sessions succeeded. After the checks, **the one failure that is both real and caused by the
app is Shift-click on a node, and its fix belongs in graphty-element.** The two T24 failures were
decided by that defect and by a prompt and an answer key that measure different things.

## 1. Confirmed severity 3: Shift-click or Ctrl-click on a node replaces the selection

**Both skeptics keep it, from the source as well as the sessions.** In graphty-element at
26f3bb968e43, a click on a node always calls `selectionManager.select(this.node)`
(`NodeBehavior.handleClick`), which replaces the selection; only the click on an edge reads
`shiftKey` and adds (`Graph.ts`). The graphty app adds nothing on a modifier click. The study tool
holds the key down around a real mouse click (`real.mjs`, `act`), so the tool is not the cause.

- All 4 T24 sessions met it. r3-s41: Gus selected, Shift-click on Ivan, Selection stays 1
  (`r3-s41/05.png`, then Ctrl-click, `06.png`). r3-s42 and r3-s43 gave up on selecting both people
  after it. In r3-s44 the step notes were lost, so the route there is rebuilt from screenshots.
- Nothing on screen says how to pick two people. The habit it breaks is the one from spreadsheets
  and file browsers.
- Owner: graphty-element (a node click with Shift or Ctrl adds, as an edge click already does). A
  scripted repro should land with the fix.

## 2. The study's fault: T24's prompt and its answer key measure different things

**Both skeptics keep this as the round's strongest finding, and it is about the study, not the
app.** The prompt was reworded this round to "point out Gus and Ivan, and nobody else, on the
drawing", deliberately avoiding "select". The answer key still credits only a selection of exactly
the two people, and it still lists "selecting Gus and then Ivan with Shift held" as a route, which
does not work on this build (item 1). The prompt pilots that would have walked the reworded prompt
were never run.

- r3-s42 and r3-s43 marked the two people with a one-hop shortest path: both drawn black with their
  tie, nobody else marked (`r3-s43/13.png`). Each described the end state accurately; r3-s43 even
  noted the yellow ring as a second mark. They did what the prompt asked; the key's selection rule
  failed them.
- **Bar 6 (a confirmed false "done") is dropped as an app finding by both skeptics.** No one
  reported a wrong state; "done" was false only against the key's rule.
- **The "path used to mark the two" problem (sev 2) is dropped** by both: the path behaved
  correctly and was fully visible.
- **Bar 1 on T24 is weakened**: it fails by the key's letter (2 of 4), but as evidence about the
  app it shows the Shift-click defect, not a 2-in-4 failure rate.

Before T24 runs again, the prompt and the key must ask for the same outcome, and every route the key
names must be walked on the build.

## 3. Confirmed severity 3: drawn names cover each other and the ties a task asks about

**Kept at severity 3 by both, from the screenshot audit and the visual specialist; session support
is thin.** On friends, "Chloe" sits over "Farah" (Farah's sphere is behind Chloe's, so a click at her
center selects Chloe), "Dev" over "Eli", and "Hana" covers the lower half of Ivan's dot with the
Gus-Ivan line ending at the label's edge (`r3-s43/01.png`). On bus stops the "Stadium" label hides
the Station-Stadium tie. In sessions it cost r3-s42 one near-miss click; r3-s41 rated it sev 1 and
read the tie correctly; no one misread a tie, including the key's Gus-to-Hana trap.

Owner: graphty-element (label placement, and a layout that spaces node sizes, not only centers).
Already on the owner's list; reported as a class, not as new.

This is now the **only** confirmed severity-3 finding under bar 10. The other two the scores named
are weakened: a second Find path replacing the first is severity 2 (item 6), and the Add page's
repeated-ties warning is severity 2 (three specialists rated 2, one rated 3 from screen-reader
reasoning; no session reached that page).

## 4. Confirmed severity 2: a number typed alone offers only "is equal to", cut off

**Both skeptics weaken it from 3 to 2: every grader rated it 2, 4 of 4 succeeded, and the cost was
one detour each.** On Les Miserables, 4 of 4 typed "10" first into the find box. The box offered the
two ties of exactly 10 and a Values row cut to "Select where shared_chapters is 1..." at the panel
edge (`r3-s10/02.png`); its whole text ("is 10 (2)") is only in a tooltip. Only r3-s16 selected the
two ties and started again; r3-s10 only hovered (`r3-s10/03.png`), correcting the scores.

Kept beside it at severity 2: the cut-off row (4 sessions; r3-s14 read it as possibly "10 or more"
until hovering), ">=10" with no column getting "No match" and a generic example (r3-s14, s16), and
the red "Put numbers in backticks:" worded as a refusal (r3-s09, s11, s13 and the controls expert).

**The rule language is copied, not discovered** (weakened from "never learned"): 0 of 8 typed "="
unprompted this round and 0 of 8 in round 2, and the histories may not name the rule syntax, so this
is not primed. Every rule came from a hint, a correction or an example. Whether people learn it over
visits cannot be shown with simulated participants, who carry nothing between rounds.

## 5. Confirmed severity 2: nothing on the Graph place points to filtering

**Kept by both.** 5 of 8 T17 participants looked on the Graph place before finding Filters on the
Data place: the toolbar's Layout button (r3-s33, s34, s38) and the "Everything" layer's style panel,
which has Fill, Shape, Effects, Label and Tooltip but no way to narrow the drawing
(`r3-s33/03.png`). r3-s35 and r3-s36 said so. It cost one or two wrong turns each; all 8 succeeded.
This is the one clean case of a feature with no visible control from where people look first.

## 6. Other confirmed problems, after the verdicts

Severity 2:

- **A second Find path replaces the first with no notice** (7 T18 sessions). Weakened from 3 and
  moved out of the implementation faults: it is the app's chosen behavior, every second run was what
  the study's follow-up question asked for, and all 7 had written the first chain down, so nothing
  was lost. The controls expert's claim that Undo then restates the second run's From and To is
  not shown: one specialist, no script.
- **Shortest path is ranked under Betweenness when "path" or "shortest path" is typed** in the
  Analyze list (7 sessions and the visual expert).
- **At Hops 2 the neighbor list does not say who is one step away and who two** (r3-s48, two
  experts).
- **"Select endpoints" is only in the tie's unlabeled "..." menu** (weakened from 3). Both who
  opened the menu (r3-s41, s44) found it at once; r3-s42 and s43 never needed to look because they
  were still trying Shift-click. Confounded with item 1.
- **The cut-off "Select where ..." row, ">=10" getting "No match", and the backticks refusal** (item
  4).

Severity 1 (each weakened to opinion-only or no observed cost, or kept at 1):

- No names drawn unless the setup turns them on, so a route or chain is checked only against a list
  (the app's default; no answer misread).
- "As the file says" loads a CSV directed and Follow "All" is unexplained; "PageRank, full graph"
  under a filter (r3-s33 and r3-s34 read it correctly and found it helpful).
- T20: a count column loads as "Attribute" with Load enabled (8 of 8 set the role correctly; the
  risk is inferred, not seen). Also T4.
- T21: Replace lives on a right-click or an unlabeled "..." (8 of 8 found it, 6 with no wrong turn);
  nothing in words says the run is out of date after Replace (0 of 8 read old values as current).
  "Plain Save opens Save as on a never-saved project" is standard behavior: severity 0.
- T22: the result is only a selection (the task never asked to keep it).
- T18: "4 hops" against "5 nodes, 4 edges"; tie arrows against the chain; the find box gives no
  hint that the program can work out the chain (r3-s26, who succeeded by hand, and r2-s26).
- T23: the neighbor list reached only through "..." or the Degree arrow (4 of 4 at or near the
  success path); "Filter to neighbors" turning gray.
- T4: "Leave out" preselected with Load enabled (all 3 noticed it; the prompt asks them to check).
- T19: a new note takes the inspector's subject (the setup ends on the PageRank inspector, which is
  why 3 of 3 opened it first; no note was saved on the wrong subject); nothing lasting says the
  project is saved (a message shows and the header renames; the prompt invites the worry).
- T12R: nothing says what a connection is; the find list mixes the node with its ties.
- The Degree row's arrow selects the node and its neighbors (the key records it as designed: a
  design choice, not a fault).
- One session only: a rule matching nothing replaces the selection, a Width of 24 hidden by the
  selection band (r3-s15), the same value at two precisions (r3-s22).

Kept as recorded, outside the app: the leak check read no participant log in any session and passed
anyway (re-run by hand: 55 clean, r3-s10 read the head of the study tool's `with-browser.sh`, kept);
`--end` deleted the step notes of r3-s03, s10, s13, s44, s45 and r3-s48's were rewritten; the
round's gate (prompt pilots, bars on the build) was skipped.

## 7. Candidate insights, after the verdicts

1. **A task word that does not name the measured outcome lets a reader reach a different, valid
   one.** Kept by both (item 2).
2. **Readers type the prompt's most prominent data word first** (rewritten; one skeptic dropped the
   original "a returning user types the threshold first"). On bus stops, where the prompt names the
   column, 3 of 4 typed "minutes"; on Les Miserables, whose prompt gives "shared chapters" (not a
   column anyone could type), 4 of 4 typed "10". So the box must answer both a column name and a
   bare number with a working rule.
3. **The rule language is copied, not discovered** (weakened; item 4).
4. **The app's memory of the last action makes repeat work cheap** (weakened). The 16 of 16
   follow-ups within target measure a participant who remembers the route minutes later, which a
   simulated participant always does. What the app can claim: 6 of 7 who repeated a path reopened
   it from the Analyze list's Recent entry, one step shorter.
5. **A feature with no visible control costs a guess** (weakened from "found by a guess every
   time"). Every such feature was found and the costs were small; only Filters (item 5) shows it
   cleanly.
6. **Repeat work needs the earlier answer kept beside the new one** (weakened). The loss cost
   nothing in all 7 T18 sessions, the seven remarks are one model's template, and the T21 example
   (r3-s19) is what the participant said he would do, not what he did.
7. **Readers check a drawn answer against names, and the drawing gives none** (weakened). It is the
   default label setting plus behavior seen in many sessions and in round 2, but no answer was
   misread and no session showed whether anyone tried to turn names on.

## 8. Bars after the verdicts

| #   | Bar                                     | Scored | After the verdicts                                                                                                                                                                                                                            |
| --- | --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Each task's success rate, each half     | Fails  | Fails by the key's letter (T24 2 of 4); not evidence about the app beyond item 1                                                                                                                                                              |
| 2   | Earlier work kept                       | Holds  | Holds                                                                                                                                                                                                                                         |
| 3   | Confirmed severity-4 problems open      | Holds  | Holds                                                                                                                                                                                                                                         |
| 4   | Confirmed silent commit on success path | Holds  | Holds                                                                                                                                                                                                                                         |
| 5   | Numbers that disagree with drawing/data | Holds  | Holds                                                                                                                                                                                                                                         |
| 6   | Confirmed false "done"                  | Fails  | **Holds**: both T24 "done" claims described the screen accurately; dropped by both skeptics                                                                                                                                                   |
| 7   | The loaded weight read as loaded        | Holds  | Holds; (b)'s "8 of 8 chose Farther" was led by the T20 prompt ("treats more minutes as a longer trip")                                                                                                                                         |
| 8   | Automated accessibility check           | Fails  | Fails by its letter on one axe hit, `scrollable-region-focusable` on the find results, which is likely a false positive: the list is an ARIA combobox with `aria-activedescendant`, and ArrowUp/ArrowDown move and scroll the active option (`FindBox.tsx`). The three hand-found focus faults are one specialist each and need scripts |
| 9   | App words at rest                       | Fails  | Fails (b) by one word (31 against 30) on the edge's inspector; the counter also counts the data names "friends" and "team.csv", which the bar leaves out, and without them the screen passes. Fix the counter, then re-measure both rounds       |
| 10  | Expert walkthrough and screenshot audit | Fails  | Fails on one confirmed severity-3 finding (drawn names, on the owner's list), not three; the rise from 124 to 139 findings is mostly newly walked screens and detours, so not like for like                                                    |
| 11  | Cost of the core four                   | Holds  | Holds                                                                                                                                                                                                                                         |

## 9. What the next round needs

- **graphty-element: Shift-click and Ctrl-click on a node add to the selection**, as on an edge,
  with a test that drives a real modifier click.
- **T24's prompt and key made to measure the same outcome**, and every route the key names walked
  on the build, before T24 runs again. Run the prompt pilots the plan named; the runner must refuse
  to start a round without its gate evidence.
- **The study tool**: a leak check that reads no log must fail; `--end` must not delete notes
  written during a session; the bar 9 counter must leave out data names.
- **A script for each one-specialist claim** before it is scored: the two focus drops (picking
  Shortest path with Enter; adding a Color to a selection's layer), Undo after a second path, and
  whether axe's find-list hit survives keyboard use.
- **The app, at severity 2**: a bare number in the find box offering "or more" beside "equal to"
  and its row not cut; filtering reachable from the Graph place; Shortest path ranked first for
  "path"; the neighbor list saying each name's distance at Hops 2; a second path announced or kept.
