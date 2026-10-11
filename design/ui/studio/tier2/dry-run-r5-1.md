# Tier 2 dry run before round 5

Every tier 2 task half (A and B of T4, T12R and T17 to T24) was piloted from its start on build
8c015b806 (`criteria.md`, first line). The walks are in `rounds/r5/pilot/<task><half>/`. The pilots
reported 96 items, one row each below, with the class and the reason. Each item was checked against
the answer key and the earlier triages (`dry-run-r3-{1,2,3}.md`, `dry-run-r4-{1,2}.md`) first; the
six that read as new or unclassed were checked on their screenshots.

The question is the same as in every dry run: would a participant spend session time on a flaw in
the build instead of on what the task asks? No. Not one of the 96 items is an implementation defect
that needs a fix before the sessions. The six that were checked:

- **A gray bar at the right edge of the open "Add a table" menu** (T4A/06, T4B/06). It is not a
  scrollbar. Enlarged, the bar is the right end of the "Each row is" switch, which the open menu
  covers, showing past the menu's edge. The menu's three items fit, and it draws no scrollbar.
- **Node sizes after Control+Z undoes "Size on PageRank"** (T22B/14, 15). Every node is size 1, and
  the 3D view draws a node farther from the camera smaller. Measured across the redo (T22B/14
  against 16): the leaves are 14 to 17 px wide after the undo, and each one shrinks by the same
  factor, 0.8 to 0.9, when the PageRank sizes come back, while the lower-left hub grows 1.9 times.
  A stale size would not shrink every leaf by one factor. Valjean looks small after the undo
  because he sits deep in the layout. The key's note now names the mechanism.
- **The faint expand carets of the Nodes and Edges subheads under Attributes** (T21B/03, 04).
  Measured: #808080 on #2c2c2c, 3.5:1 at the caret's brightest pixel, above the 3:1 WCAG 1.4.11
  asks for a control. They are compact-mantine's Tree carets in the secondary gray Figma uses for
  tree disclosure. Both subheads start open, and no task needs them closed. Added to the key.
- **The Creek-to-Meadow route edge passing behind Pine Fork** (T20B/14). The same layout overlap
  as the Castellani, Jada and Quinn rows. Added to the key so graders record anyone who names Pine
  Fork as part of the walk.
- **The Selection row's focus ring after Escape** (T22B/13 to 16). Focus is on the row where the
  reader pressed Escape. Clearing the selection rightly does not move it, as on A's Everything row,
  which the key already records. Added to the key for B.
- **"Florentine families" listed twice on the start screen** (T19B/10, 11). This one is two things.
  First, what a Recent row shows is a design question. Second, the study tool refuses an ambiguous
  `--click`, so that step did nothing; that is the tool working as documented, not the app.

So the build stays frozen: 8c015b806 is the round 5 build, and the sessions start on it.

Classes, as in the earlier dry runs:

- **fix** -- an implementation or polish defect a participant could hit. None this time.
- **design** -- a question the sessions exist to answer (where something lives, what a returning
  user expects, what to call it). Left alone.
- **no change** -- the behavior is right or deliberate, or the claim did not hold.
- **owner** -- decided by the owner, or waiting on the owner, in `../owner-decisions.md`.
- **process** -- about how the pilot ran or what the answer key tells graders, not the app.

Several reasons recur. `dry-run-r3-1.md` defines them, and this file uses the same names:

- **3D overlap**
- **names by default**
- **focus on a heading**
- **covers until closed**
- **All N rows**
- **hover under the pointer**
- **tooltip on entry**

`dry-run-r4-1.md` adds **chosen face**: on 2026-10-10 the owner chose Figma's face for the chosen
side of a segmented control. That face is darker, with a 1px edge and a bolder label, on the
lighter track, so the chosen side does not stand out by a fill.

## Two tables (T4)

| #   | Defect                                                                                                                     | Class             | Reason                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | No words say which of Add and Leave out is chosen; the chosen side is the darker face; "a node" / "an edge" the same (07 to 10) | owner        | Chosen face                                                                                                               |
| 2   | "All 18 rows" while the preview stops at line 15; the unmatched line 17 is below the pane (07)                             | no change         | All N rows                                                                                                                |
| 3   | "Add a table" is a bare "+" named by its tooltip; its open menu covers "Each row is", the id picker and the check mark (04 to 06) | design; no change | Whether a returning user finds "Add a table" is what T4 measures. The menu: covers until closed                     |
| 4   | Load is enabled after the first file alone, and nothing warns that the graph will have no edges (04)                       | design            | A warning would answer the task before the sessions; the status line already reads "the load makes 10 nodes and 0 edges"  |
| 5   | The source row takes a click but shows no tooltip and keeps the arrow pointer (13)                                         | no change         | Controls show the arrow, only links the hand, as in Figma and desktop apps; the row's full text is on screen              |
| 6   | After Load the Graph page says nothing about the left-out row; only "From 2 files" and the counts (11)                     | design            | Whether a returning user checks what a load left out is what T4 grades                                                    |
| 7   | No player names are drawn, since name loads as an attribute; passes loads as an attribute and the weight reads "none" (07, 11) | design        | Which column names a node and which weighs a tie is set at import or after it; where a returning user looks for that is for the sessions |
| 8   | A short gray bar at the right edge of the open "Add a table" menu looks like a scrollbar (T4A/06)                          | no change         | Did not hold: the bar is the covered "Each row is" switch showing past the menu's edge (T4A/06 and T4B/06, enlarged)      |

## Filter steps (T17)

| #   | Defect                                                                                                                              | Class             | Reason                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | "New filter step" shows no count of what the step would keep before "Add step" (T17A/06)                                            | design            | A live preview is a feature the sessions may ask for                                                                                         |
| 10  | After "Add step" and "Save and turn on" the right-hand panel shows the Overview, not the step's editor (T17A/07, 11)                | no change         | Deliberate (`data-place/Filters.tsx`): the Overview shows what the step produced, and focus lands on the step's row, so Enter or a click reopens it |
| 11  | Right after the checkbox click no tooltip shows and the row keeps its gray hover fill; "off" is the only sign (T17A/08, 12)         | no change         | Hover under the pointer; tooltip on entry                                                                                                    |
| 12  | The key titles read "PageRank, full graph" over the whole graph's range while a step is on (T17A/07, 11)                           | design            | Whether readers take "full graph" for what is drawn is what the key records                                                                  |
| 13  | In an off step's editor "Save and turn on" turns it on; a following tick turns it off, shown only by "off" on the row (T17A/09 to 11) | no change; design | Deliberate: on an off step the button turns the step on, which is what its words say. How an off step shows is part of what T17 measures     |
| 14  | The toolbar's Filters tool opens with an empty Attribute box, not weight chosen on the Data page; "Add step" grayed (T17A/13)       | no change; design | Pointing at the grayed "Add step" shows "Choose an attribute first" (`dry-run-r4-2.md`, row 14). Whether the tool should start from the column is a door question T17 credits |
| 15  | The Data page's node attributes list only id, not the PageRank values (T17A/02)                                                    | design            | Where a run's results are listed is for the sessions (`dry-run-r4-2.md`, row 24)                                                              |
| 16  | Two near-overlapping pairs of dots, so a dot count comes out short at 4 or more and at 5 or more (T17A/07, 11)                      | design            | 3D overlap; the counts on screen are right                                                                                                   |
| 17  | "New filter step" shows no count before "Add step" (T17B/05, 06)                                                                    | design            | As 9                                                                                                                                         |
| 18  | After "Add step" and "Save and turn on" the panel shows the Overview (T17B/07, 11)                                                  | no change         | As 10                                                                                                                                        |
| 19  | With 8 typed and unsaved, the header still reads "shared_chapters is at least 5" (T17B/10)                                          | no change         | The header names the step as it is; a header that changed while typing would describe a step that does not exist                              |
| 20  | A tick after "Save and turn on" switches the step off, shown only by "off" on the row (T17B)                                        | no change; design | As 13                                                                                                                                        |
| 21  | After an untick no tooltip until the pointer leaves and returns; the row keeps a gray fill with its editor closed (T17B/08, 14)     | no change         | Tooltip on entry; hover under the pointer                                                                                                    |
| 22  | "PageRank, full graph" on both key titles while the range stays the whole graph's 0.003299 to 0.07543 (T17B/07, 11)                 | design            | As 12                                                                                                                                        |
| 23  | The "Attribute actions" menu covers the inspector's "Table: Edges" value (T17B/04)                                                  | no change         | Covers until closed                                                                                                                          |
| 24  | The Filters tool opens with an empty Attribute box; "Add step" grayed (T17B/15)                                                     | no change; design | As 14                                                                                                                                        |
| 25  | The Data page's node Attributes list only id and name, not the PageRank (T17B/02)                                                   | design            | As 15                                                                                                                                        |
| 26  | Two dots near 640,372 nearly coincide, so a count comes out one short (T17B/11)                                                     | design            | 3D overlap                                                                                                                                   |

## Shortest path (T18)

| #   | Defect                                                                                                                      | Class     | Reason                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | The highlighted Ivan-Kofi tie passes through Jada, who is not on the chain; hovering her shows no tooltip (T18A/10, 12)      | design    | 3D overlap; names by default                                                                                                                  |
| 28  | The highlighted Ravi-Pia tie passes through Quinn, who is not on the chain (T18A/18, 19)                                     | design    | 3D overlap; names by default                                                                                                                  |
| 29  | Chloe, the chain's start, half-covers a larger node not on the chain (T18A/10)                                               | design    | 3D overlap                                                                                                                                    |
| 30  | Hovering a node shows the hand and no tooltip, so the drawing names nothing until names are put on (T18A/12, 19, 20)         | design    | Names by default                                                                                                                              |
| 31  | From's suggestion list covers the To label and box; To's covers the Follow label and the Out / All row (T18A/03, 05, 14, 16) | no change | Covers until closed                                                                                                                           |
| 32  | The open Weight list covers its label and the "Each edge counts as 1" note (T18A/07)                                        | no change | Covers until closed                                                                                                                           |
| 33  | After a pick the focus ring on Find path is a thin outline against the blue button (T18A/06, 17)                            | no change | The shared primary-button focus (a white inset ring inside a 1px outline) is drawn; it is Figma's primary focus                               |
| 34  | The chain runs against two arrowheads; only Follow "All" says ties count both ways (T18A/10)                                 | design    | How a path that follows ties both ways shows that on the drawing is for the sessions; the element's `direction` option already offers one way |
| 35  | The highlighted Peruzzi-Bischeri tie passes through Castellani, not on the path (T18B/11)                                    | design    | 3D overlap                                                                                                                                    |
| 36  | Hovering Castellani shows the hand and no tooltip (T18B/12)                                                                  | design    | Names by default                                                                                                                              |
| 37  | The path's nodes are black while the key shows PageRank's orange range and one "Shortest path" row (T18B/07, 11)            | no change | Deliberate on this build (fewer words at rest on the key): the one row names what the black is (`dry-run-r3-2.md`, row 35)                    |
| 38  | After a pick the focus ring on Find path is faint against the blue button (T18B/06, 10)                                      | no change | As 33                                                                                                                                         |
| 39  | From's list covers the To label and box; To's covers the Weight label and box (T18B/03, 05)                                  | no change | Covers until closed                                                                                                                           |
| 40  | Reopened with p, the popover covers the lower end of the path; a rerun replaces the first chain with no record (T18B/09, 11)  | design    | Where the path form lives, what it covers while open, and whether a returning user wants both chains kept                                     |

## Notes (T19)

| #   | Defect                                                                                                                                     | Class             | Reason                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 41  | The selection halo around Farah also covers the smaller node half in front of her (T19A/02 to 04)                                          | design            | 3D overlap                                                                                                                         |
| 42  | The inspector's "1 note" counts only the graph's own note, not the project's two (T19A/07, 11, 12)                                         | design            | What that count covers is a T19 question                                                                                           |
| 43  | "Local only" reads the same before and after the save; only a fading toast says it saved; no focus mark after Save closes (T19A/09)         | design            | The saved-state mark is left to the sessions                                                                                       |
| 44  | The reopened project lands on the Graph place, its only note sign the "1 note" link; Undo is grayed (T19A/11)                               | design; no change | Where a returning user looks for notes is a T19 question. A reopened file starts a new undo history, as in Figma                  |
| 45  | The reopened drawing is framed a little smaller (T19A/11 against 09)                                                                       | owner             | The camera question in `../owner-decisions.md`                                                                                     |
| 46  | After Escape Escape clears the selection, the focus ring stays on the saved note card (T19A/05)                                            | no change         | Focus is on the note, where saving put it; Escape clears the selection and rightly does not move focus (`dry-run-r3-1.md`, row 40) |
| 47  | No script, console or request errors (T19A)                                                                                                | process           | A note, not a defect                                                                                                               |
| 48  | After the reopen the drawing is framed smaller and lower (T19B/12 against 09)                                                              | owner             | As 45                                                                                                                              |
| 49  | The app reopens on the Graph place; the "1 note" link counts only the graph's note (T19B/12)                                               | design            | As 42 and 44                                                                                                                       |
| 50  | After Escape Escape the focus ring stays on the saved Medici note card (T19B/05)                                                           | no change         | As 46                                                                                                                              |
| 51  | The start screen lists "Florentine families" under Recent projects and under Samples; `--click "Florentine families"` matched both and did nothing (T19B/10, 11) | design; process | What a Recent row shows is left to the sessions. The tool refuses an ambiguous click by design; the briefing's ways to name a control apply |

## Weight at load (T20)

| #   | Defect                                                                                                                                | Class             | Reason                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| 52  | No stop names are drawn, so the route reads only from "Nodes in order" (T20A/08 to 15)                                                | design            | Names by default                                                                            |
| 53  | The route's Park-to-Clinic edge shows no arrowhead; it ends under the large Clinic node (T20A/14, 15)                                 | design            | 3D overlap: the element ends each edge at the sphere's surface                              |
| 54  | The role list opens upward over its own box and the "minutes" label (T20A/05)                                                         | no change         | The shared select opens with the chosen option on the field, as Figma and macOS do          |
| 55  | "All 17 rows" while lines 16 and 17, then line 14, are cut off (T20A/04, 06, 07)                                                      | no change         | All N rows                                                                                  |
| 56  | The status line above Load never mentions the weight; only "Weight: minutes (farther)" confirms it (T20A/07)                          | no change         | The weight is confirmed on its own line; a count line that restated it would say it twice   |
| 57  | Picking From or To does not mark that stop; the popover sits over the drawing; each open list covers the field below (T20A/10 to 13)  | design; no change | How the path form shows its ends is for the sessions. The lists: covers until closed        |
| 58  | Creek and Summit, both on the route, nearly overlap; no names drawn; hovering shows the hand and no tooltip (T20B/14 to 16)           | design            | 3D overlap; names by default                                                                |
| 59  | The Meadow-to-Ridge edge shows no arrowhead at Ridge (T20B/14)                                                                        | design            | As 53                                                                                       |
| 60  | The thick black Creek-to-Meadow route edge passes behind the large blue Pine Fork node, not on the route (T20B/14)                    | design; process   | 3D overlap, as rows 27, 28 and 35. It was not in the key; it is now, so graders record anyone who names Pine Fork |
| 61  | "All 13 rows" while line 14 is cut off once "Higher means" appears (T20B/06, 07)                                                      | no change         | All N rows                                                                                  |
| 62  | Picking Trailhead in From or Summit in To does not mark that node (T20B/11, 13)                                                       | design            | As 57                                                                                       |
| 63  | The Farther helper line uses "longer", "distance" and "time", words the prompts avoid (T20B/07)                                       | process           | A possible wording echo for graders to record, not a defect; it shows only after the choice |
| 64  | No script, console or request errors (T20B)                                                                                           | process           | A note, not a defect                                                                        |

## Rerun on new data (T21)

| #   | Defect                                                                                                                                         | Class            | Reason                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 65  | Between Replace and Rerun the old histogram, range and Top 10 stay at full contrast; only the bar, an unlabeled icon and the key titles say "out of date" (T21A/06) | design | How a run that no longer matches its data shows it is the stale question T21 measures                                                                         |
| 66  | The left panel's title becomes "Graph friends-v2.csv" while the project stays "friends" (T21A/06, 07)                                          | design           | One name or two for project and file is left to the sessions                                                                                                                       |
| 67  | The source row's right-click menu covers the end of its counts and the key's minimum (T21A/04)                                                 | no change        | Covers until closed                                                                                                                                                                |
| 68  | The source row's small curved-stroke icon does not read as a file or a table (T21A/03)                                                         | no change        | Deliberate (`data-place/words.ts`): a one-table edge file wears the edge glyph; the file glyph marks a source with several tables                                                  |
| 69  | Between Replace and Rerun the old histogram, "12 of 12 have a value" and Top 10 led by Hal stay at full contrast (T21B/06)                     | design           | As 65                                                                                                                                                                              |
| 70  | The two new people are small saturated-blue dots the key does not explain (T21B/06)                                                            | design           | They have no PageRank yet, so the run's layer does not reach them, as the layer rules require. How a returning user reads them is the stale question                               |
| 71  | The PageRank row still reads 12 while the graph has 14 people (T21B/06)                                                                        | design           | The row counts the nodes the run measured, which is true of the stale run; how a stale run shows is what T21 measures                                                              |
| 72  | The left panel's title becomes "Graph team-v2.csv" while the project stays "team" (T21B/06, 07)                                                | design           | As 66                                                                                                                                                                              |
| 73  | The source row's right-click menu opens with no item highlighted and covers the end of the counts and the key's minimum (T21B/04)              | no change        | A menu opened by the pointer highlights nothing until the pointer or a key moves, as on macOS; covers until closed                                                                 |
| 74  | The Sources row's curved-stroke icon does not read as a file or a table (T21B/03)                                                              | no change        | As 68                                                                                                                                                                              |
| 75  | The expand carets of the Nodes and Edges subheads under Attributes are faint against the dark panel (T21B/03, 04)                              | no change; process | Measured: #808080 on #2c2c2c, 3.5:1 at the brightest pixel, above WCAG 1.4.11's 3:1; compact-mantine's Tree caret in Figma's secondary gray; both subheads start open. Added to the key |
| 76  | After Rerun no focus mark shows; one Tab rings the "ran ..." link in the inspector header (T21B/07, 08)                                         | no change        | Focus on a heading: one Tab lands on the inspector header's first link, so focus sat in the run's inspector above it; the key records it                                                 |

## Select where (T22)

| #   | Defect                                                                                                                                  | Class           | Reason                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 77  | Escape on a layer row clears the selection while the find box keeps the rule and "Rule: press Enter to select matches" (T22A/12)        | no change       | Escape clears the selection, as everywhere; the box holds what was typed, and Enter runs it again (`dry-run-r3-2.md`, row 80)                  |
| 78  | Selecting is not in the undo history, so Control+Z undid the setup's Size by PageRank, named only by a fading toast (T22A/13)           | design          | Standard undo history: selection is not an edit, as in Figma. Recorded for the sessions                                                        |
| 79  | The red "Put numbers in backticks:" reads as a refusal although Enter runs the option under it (T22A/07)                                | design          | Whether participants retype the rule or press Enter is what the find-box change is credited by                                                 |
| 80  | After Control+Z removes "Size on PageRank" the nodes are not one size: Valjean and Myriel among the smallest (T22B/14, 15)               | no change       | 3D perspective, measured: every node is size 1 and a farther node is drawn smaller; each leaf shrinks by the same 0.8 to 0.9 on the redo (T22B/14 against 16). The key now says so |
| 81  | The selection is not in undo; Control+Z after Escape removed the setup's size styling and the Size key (T22B/13, 14)                    | design          | As 78                                                                                                                                          |
| 82  | After Escape the find box still holds the accepted rule with "Rule: press Enter to select matches" (T22B/13 to 16)                      | no change       | As 77                                                                                                                                          |
| 83  | After Escape on the Selection row the row keeps its focus ring while the inspector shows the graph (T22B/13 to 16)                      | no change; process | Focus stays on the row where Escape was pressed; clearing the selection rightly does not move it, as A's Everything row. Added to the key for B |

## Edge endpoints (T24)

| #   | Defect                                                                                                                                  | Class     | Reason                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 84  | The "Hana" label box covers Ivan's sphere, so the Gus-Ivan tie reads as Gus to Hana; later it covers Ivan's ring (T24A/01, 03, 06)      | design    | 3D overlap: label placement measured with "Show all labels" ticked, which turns the element's label declutter off; tasks.md ticks it because T24 needs every name drawn                              |
| 85  | Chloe's label covers Farah's; Dev's covers most of Eli's (T24A/01)                                                                      | design    | As 84: label-on-label overlap is what declutter removes, and the setup turns it off on purpose                                                                                                          |
| 86  | Pointing at the line gives the hand and nothing else: no tooltip, no hover highlight (T24A/02)                                          | design    | Names by default: a hover card on the drawing is a new element capability the sessions may ask for                                                                                                      |
| 87  | After Select endpoints the blue band leaves the Gus-Ivan line, so nothing marks the tie (T24A/06)                                       | design    | The selection is now the two ends, which is what the command says; whether readers want the tie kept marked is for the sessions                                                                         |
| 88  | The open Edge actions menu covers the From value and the end of the Values tab label (T24A/05)                                          | no change | Covers until closed                                                                                                                                                                                     |
| 89  | The Everything inspector shows Fill Color 6366F1 (purple) while the PageRank layer draws every node orange (T24A/01)                     | owner     | The tension between a run painting at once and Everything's color                                                                                                                                       |

## Returning names (T12R)

| #   | Defect                                                                                                                                                     | Class            | Reason                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 90  | After the Degree click Hops "1" and Babet under the resting pointer both look lit; once the pointer moves only a thin outline marks the hop count (T12RA/05, 06) | owner; no change | Chosen face; hover under the pointer                                                                                                                            |
| 91  | No focus mark after Enter picks Javert or after "Back to Javert"; only the Values tab's hover fill is lit (T12RA/04, 07)                                   | no change        | Focus on a heading; Back returns focus to the Degree link that opened the list, and its ring shows only for a keyboard reader (`:focus-visible`), as every ring does    |
| 92  | Javert wears the same yellow glow as his 17 neighbors, so the drawing does not show which dot is Javert (T12RA/05)                                          | design           | The selection holds Javert and his neighbors, and one selection is drawn one way; how the asked-about node stands apart from his neighbors is for the sessions          |
| 93  | Hops "1" is a dark segment with a thin outline while Acciaiuoli under the resting pointer has a gray fill (T12RB/05)                                        | owner; no change | As 90                                                                                                                                                                    |
| 94  | After "Back to Medici" no focus mark shows; the Values tab keeps a hover fill under the resting pointer (T12RB/07 to 09)                                    | no change        | As 91                                                                                                                                                                    |
| 95  | A tie's inspector offers only From and To: no count and no names of the other families (T12RB/09)                                                          | design           | What a tie's inspector shows is for the sessions; the detour is not the task's path                                                                                      |
| 96  | The Tab order from the node's title to the Degree row and screen-reader output were not checked (T12RB)                                                     | process          | A gap in the pilot, not a defect; the key's 4 Tabs and Enter were walked on earlier builds, and none of the fixes in this build touch the neighborhood list                                       |

## Result

Counted: 96 rows, each by its first class (rows 3, 13, 14, 20, 24, 44, 51, 57, 60, 75, 83, 90 and
93 carry more than one): 0 fix; 48 design; 38 no change; 6 owner; 4 process. The build is not
refrozen: 8c015b806 is the round 5 build, and the sessions start on it.
