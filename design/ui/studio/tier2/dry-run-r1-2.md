# Tier 2 second dry run before round 1: what to fix and what to leave

Every tier 2 task was walked once more, each prompt on both datasets, on the build the study was
about to use (3dfe7daf9e45, graphty@0.8.56), after the first dry run's fixes were built
(`dry-run-r1-1.md`). This page lists every problem the walk found, sorts it, and gives the reason.

The sessions are for learning what a returning user needs. A session spent on a clipped name, a
dead-looking button or a focus ring in the wrong place teaches nothing about that, so every such
problem is fixed before round 1. A real design question -- where something lives, what a reader
expects, what a new concept is called -- is left in, because answering it is what the sessions are
for.

Classes:

- **(a) fix now.** An implementation or polish defect a participant could hit. Each names its fix
  group (below).
- **(b) leave for the sessions.** An open design question the study exists to answer.
- **(n) no change.** Expected behavior, a property of the drawing that is not a build defect, or
  not a problem; the reason says which.

Screenshots are under `rounds/r1d1/pilot/<task>/` (for example `T4A/09.png`). The two halves of
a task are its two datasets: T4A people and messages, T4B players and passes; T17A, T18A, T19A,
T23A and T24A the friends network; T17B and T22B the novel's characters; T18B, T19B, T23B and
T12RB the Florentine families; T20A the bus stops, T20B the hiking trails; T21A friends and its
second version, T21B a team list and its second version; T22A the bus stops; T24B the city stops;
T12RA the novel's characters.

Fixing the (a) list changes the build again, so round 1 runs on a new frozen build, with every
task re-piloted on it and every "known on this build" note in the answer key re-recorded.

## Fix groups

| Group | What it fixes | Package |
| ----- | ------------- | ------- |
| Rows and shared controls | A row's name cut while its count keeps the room; a selected row that cannot be told from its children; the unchosen half of a two-way choice drawn as if disabled; a right-click menu that opens with an item already highlighted; Escape in an open list closing the panel around it | compact-mantine |
| Import page and Sources | A green check on a table with a left-out row; a stray space and an oversized link in the read summary; two opposite links on screen at once; the left-out sentence in small type; a child row that shows its parent's inspector; an inspector left open from the other page; a column name that does not open its role box; two things named "Graph"; a replaced graph drawn small in one corner | graphty |
| Missing end | A left-out row that does not say which of its two ends has no node | graphty-element, graphty |
| Filters | A step that is off looking the same as one that is on; a step row that does not say what it keeps; Save on an off step that changes nothing; the filter chip with no tooltip | graphty |
| Run record | The Method box empty after a run; "Bellman Ford" | graphty-element, graphty |
| Path form and Made with | Escape in the Weight list throwing away From and To; the weight's value written as a wrapped sentence or a contradiction; a run's date with no time; "Advanced" naming two things | graphty |
| Key words | The key naming a run's highlight by the element's layer name ("Shortest route"); two key sections and two entries for one path | graphty |
| Path color | The path's nodes hard to tell from the default node color | graphty-element |
| Labels on top | A label hidden by a node or by a selected edge's band drawn in front of it | graphty-element, graphty |
| Focus | Focus landing on a value row (Degree, the first path node) that reads as a selection; no focus after "Back to"; a focus outline after a pointer click on a line | graphty |
| Notes | A tooltip opening over the note just saved, and drawn under the canvas key; delete drawn as a minus sign | graphty |
| Neighborhood | "Filter to neighbors" drawn as plain text, with no tooltip and no sign of how to undo it; the list's order changing with the hop count; the heading in graph jargon | graphty |
| Find and selection | The hint under the find box still asking for Enter after the rule ran; the result list ending on half a row; nodes and ties under one heading "Elements"; a selection of several edges listing none of them | graphty |
| Study tool | The setup's last click leaving a hover on the participant's first screen; setups and answer notes disagreeing on the panel that opens; a key coordinate off the line | studio tool |

## Two tables (T4)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 1 | T4A: before Load, the Tables list shows a green check on "Edges: messages.csv 23 rows" though one of its rows names a missing node and will be left out (`T4A/06.png`, `07.png`). | (a) Import page and Sources | The mark says "all fine" while the warning below says otherwise; the table holding a left-out row must show a warning mark with the count. |
| 2 | T4A: the Sources row cuts the name to "people.c..." while "12 nodes, 22 edges" keeps its room (`T4A/09.png`). | (a) Rows and shared controls | The name is the part that says which source this is; the count must yield first. One fix in the shared row, not per caller. |
| 3 | T4A: selecting the source row highlights it and all three child rows as one block (`T4A/11.png`); selecting a child highlights only it but shows the same source inspector (`12.png`). | (a) Rows and shared controls (tint), Import page and Sources (child content) | The selected row must stand out from its children's tint, and a child row must open what it names (its table, or the left-out rows), not its parent. |
| 4 | T4A: the unchosen "Add" of Add / Leave out is drawn so dim it reads as disabled (`T4A/06.png`). | (a) Rows and shared controls | An available choice drawn as unavailable. |
| 5 | T4A: "1 edge row was left out: it names a node missing from the node rows." is set smaller than the rows around it (`T4A/11.png`). | (a) Import page and Sources | The task's key fact must be at least as legible as the rows it explains. |
| 6 | T4A: no names are drawn; people.csv's name column comes in as an Attribute, and messages.csv's emails column as an Attribute with "Weight: none" (`T4A/06.png`, `08.png`). | (b) | Whether names are drawn by default, and whether a column called name is guessed as the label, are open design questions; the key notes both and excludes them from grading. |
| 7 | T4B: the one-table summary reads "10 node rows and 0 edge rows read ; the load makes ..." with a space before the semicolon, and its link is larger than the sentence (`T4B/04.png`). | (a) Import page and Sources | Broken text. |
| 8 | T4B: before Load both tables show a green check though passes.csv has a row that will be left out (`T4B/06.png`, `07.png`). | (a) Import page and Sources | Same as 1; it leads to the "everything arrived" wrong answer. |
| 9 | T4B: after "Show the 1 unmatched row" is clicked, the link keeps its words while the row already shows, and "Show all rows" above the table does the opposite (`T4B/07.png`). | (a) Import page and Sources | A control that gives no sign it acted, beside its opposite; while the unmatched rows show, only the way back is offered. |
| 10 | T4B: the unmatched row does not mark which value has no node: "s11" in the to column looks like "s04" (`T4B/07.png`); the inspector does not mark it either (`11.png`). | (a) Missing end | The fact the reader needs (which name is missing) is computed by the element and dropped before the screen; it must reach the row. |
| 11 | T4B: after Load the Graph page says nothing about the left-out row, only "From 2 files" and the counts (`T4B/08.png`). | (b) | Where a left-out row is reported after load is the T4 question: the Sources list is the designed home, and whether returning users look there is what the sessions measure. |
| 12 | T4B: after switching from the Data page back to the Graph page, the inspector still shows the source ("players.csv and passes.csv / Source") with nothing selected on that page (`T4B/13.png`). | (a) Import page and Sources | An inspector for something not on the page; a page switch must clear a selection only the other page shows. |
| 13 | T4B: the rail's "Graph" button and the main landmark share the accessible name "Graph". | (a) Import page and Sources | No two reachable things share a name; the single main landmark needs no name. |

## Filter steps (T17)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 14 | T17A: two pairs of nodes sit nearly on top of each other in the start drawing (about 567,758 / 583,753 and 717,745 / 735,744), so a reader counting dots under a filter gets fewer than the chip says (`T17A/01.png`, `13.png`). | (n) | Not a build defect: the drawing is 3D, and two nodes at different depths project onto one spot; spacing nodes by their drawn size is a deferred layout feature (the layout's `nodeSize` option is "not used yet"). The key records each overlap, and counts are graded from what the chip and lists say. |
| 15 | T17A: a step that is off shows it only by the empty 12-pixel checkbox; the label is not dimmed and there is no "off" (`T17A/10.png`, `12.png`). | (a) Filters | The rows pass `dimmed` and a state description, but the shared row hides the description and the dimming does not show; on and off must look different. |
| 16 | T17A: editing a step that is off and pressing Save step saves the new value and leaves the step off, so the drawing does not change (`T17A/12.png`). | (a) Filters | A save with no visible effect reads as a failed edit. Decided: saving a step turns it on (the reader edited it to use it; undo restores), and the announcement says so. |
| 17 | T17A: the attribute's "Filter to..." is reachable only from the "..." menu in the inspector header; the weight row in the Attributes list has no filter action of its own (`T17A/04.png`). | (b) | Where the filter action lives is a discovery question the sessions answer; the menu works and is labeled. |
| 18 | T17A: the header chip "19 of 20 nodes" has no tooltip naming the step behind it or how to undo it (`T17A/09.png`). | (a) Filters | A count that hides something must offer the way out beside it. |
| 19 | T17B: a step that is on does not say what it keeps: no "77 to 26 nodes" on its row (`T17B/07.png`). | (a) Filters | The outcome is computed and passed to the row, then hidden by the shared row; it must show, after the condition, without cutting it. |
| 20 | T17B: an unticked step differs only by its empty checkbox; the editor's "Off" is small gray text (`T17B/10.png`, `11.png`, `14.png`). | (a) Filters | Same as 15. |
| 21 | T17B: editing an off step to 8 and saving leaves the drawing at 77 (`T17B/12.png`). | (a) Filters | Same as 16. |
| 22 | T17B: the New filter step form shows no count of what a value would keep before Add step (`T17B/06.png`). | (b) | A preview is new behavior; the count appears right after adding, and whether readers want it sooner is for the sessions. |
| 23 | T17B: no implementation faults; every click landed and the counts match the key. | (n) | Not a problem. |

## Shortest chain (T18)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 24 | T18A: one Escape to close the open Weight list closes the whole Path popover, and reopening it shows From and To empty (`T18A/07.png`-`09.png`). | (a) Rows and shared controls, Path form and Made with | Escape closes the innermost thing first; the shared list must consume the Escape that closes it, and the popover must ignore an Escape already consumed. |
| 25 | T18A: Advanced run settings on the finished run shows Method empty; its list offers Dijkstra and Bellman Ford with neither checked (`T18A/12.png`-`14.png`). | (a) Run record | The option is "unset" and the element picks the method, but the run never records which one it used, so the screen cannot say. |
| 26 | T18A: the open Weight list covers the "Weight" label and the "Not read -- ..." sentence (`T18A/07.png`). | (n) | A list overlays the fields below it and closes on a pick, as in the first dry run; the grayed option's own words, "(loaded, not read)", say it is not read. |
| 27 | T18A: Made with's Weight value is a lowercase sentence ("not read -- weight's meaning is not set, and a path needs a distance") wrapped to three lines in the value column (`T18A/11.png`). | (a) Path form and Made with | A value column holds short facts; the explanation belongs on a line of its own. |
| 28 | T18A: the method is spelled "Bellman Ford" (`T18A/13.png`). | (a) Run record | The standard name is "Bellman-Ford"; the element's catalog derives the label from the value "bellman-ford" and has no way to state it. |
| 29 | T18A: the key's headings read "Edge color: Shortest path" and "Color: Shortest path" beside "Color: PageRank", and its entries say "Shortest route (edges)" and "Shortest route (nodes)" where everything else says "Shortest path" (`T18A/11.png`). | (a) Key words | The app shows the element's layer names where the app owns the words; one name per meaning. |
| 30 | T18A: two nodes overlap at the bottom, one on the path and one not (`T18A/11.png`, `01.png`). | (n) | As 14. |
| 31 | T18A: no script errors, console errors or failed requests. | (n) | Not a problem. |
| 32 | T18B: the Shortest path popover covers the lower third of the drawing, hiding nodes the pick buttons could reach (`T18B/02.png`-`08.png`). | (b) | Where the path form lives is a design question the sessions answer (first dry run, 33). |
| 33 | T18B: the highlighted Peruzzi-Bischeri edge passes straight through an orange node not on the path (`T18B/09.png`). | (n) | As 14: a 3D projection; names on the drawing (an open question) would tell the reader which node the edge reaches. |
| 34 | T18B: Made with's Weight value "none (each edge counts 1)" wraps, leaving "1)" alone on a line (`T18B/06.png`, `09.png`). | (a) Path form and Made with | Same as 27. |
| 35 | T18B: the popover, tree row, inspector and key titles say "Shortest path" but the key's entries say "Shortest route" (`T18B/06.png`). | (a) Key words | Same as 29. |
| 36 | T18B: picking From or To does not mark the node on the drawing (`T18B/04.png`, `05.png`). | (b) | A new behavior; whether readers look for it is for the sessions (first dry run, 34). |
| 37 | T18B: the From list opens over the To label (`T18B/03.png`). | (n) | As 26. |
| 38 | T18B: after a run, focus lands on the first "Nodes in order" row with a ring that looks like a selection (`T18B/06.png`, `09.png`). | (a) Focus | Focus must land where the reader reads it as "here is the result", not on a value row that looks picked. |
| 39 | T18B: both runs read "ran Oct 8" with no time, and the second replaces the first with no trace (`T18B/06.png`, `09.png`). | (a) Path form and Made with for the time; (b) for the trace | Two runs on one day must differ in their own record. Whether several path runs are kept was deferred on purpose and is for the sessions. |

## Notes and reopening (T19)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 40 | T19A: after Control+Enter saves a note, focus moves to the Notes "+" and its tooltip "Add note N" opens over the note just saved, hiding its end and the key's left edge (`T19A/04.png`, `07.png`). | (a) Notes | The reader cannot read back what they wrote; focus goes to the saved note, and no tooltip opens over it. |
| 41 | T19A: after Find with Enter selects Farah, focus lands on the inspector's "Degree" row with a ring (`T19A/02.png`). | (a) Focus | A ring on a value row reads as a choice the reader did not make, and the next Enter opens it. |
| 42 | T19A: Farah's node overlaps a larger neighbor, half under it (`T19A/02.png`, `14.png`, `01.png`). | (n) | As 14. |
| 43 | T19A: "Delete note" is drawn as a bare minus sign (the pointer stays an arrow; the tooltip works). | (a) Notes for the glyph; (n) for the pointer | A minus reads as "collapse"; delete is a trash can. The arrow pointer over buttons is the shared theme's desktop convention, used on every button. |
| 44 | T19B: the same tooltip covers the note just saved, and is itself drawn under the canvas key, cutting off its "N" (`T19B/04.png`, `07.png`). | (a) Notes | Same as 40, plus a tooltip must draw above the canvas key. |
| 45 | T19B: after Find selects the Medici, focus lands on "Degree 6 >" with a blue ring (`T19B/02.png`). | (a) Focus | Same as 41. |
| 46 | T19B: the start screen lists "Florentine families" twice, under Recent projects and under Samples (`T19B/10.png`). | (b) | Whether a returning reader tells their saved work from the sample is the T19 question; the key names the risk. |

## Weight at load (T20)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 47 | T20A: Method is empty in the finished run's Advanced settings; its list offers both methods with neither checked (`T20A/13.png`, `14.png`). | (a) Run record | Same as 25. |
| 48 | T20A: the path's nodes are dark navy and the others a medium blue of the same hue; only the thick edges stand out (`T20A/12.png`). | (a) Path color | The first dry run moved the path color out of the ranking colors; on an unranked drawing it now sits next to the default node color. A result the reader cannot see. |
| 49 | T20A: the key lists "Shortest route (edges)" and "Shortest route (nodes)" with the same swatch under two headings (`T20A/12.png`). | (a) Key words | One result, one key section. |
| 50 | T20A: no stop names are drawn (`T20A/08.png`, `12.png`). | (b) | As 6. |
| 51 | T20A: the "minutes" role box sits under the column name, and a click on the name misses it (`T20A/04.png`). | (a) Import page and Sources | A label that does not open its own control. |
| 52 | T20A: "Advanced" names both the button "Collapse Advanced run settings" and the region around Method, which takes "Advanced" into its name. | (a) Path form and Made with | Two reachable things share a name. |
| 53 | T20B: Method empty after the run (`T20B/14.png`, `16.png`). | (a) Run record | Same as 25. |
| 54 | T20B: "Total distance 7.5" has no unit (`T20B/13.png`). | (b) | The program does not know the unit; whether to borrow the column's name is a design question (first dry run, S9). |
| 55 | T20B: the path's nodes are a dark indigo hard to tell from the default blue-violet; no names drawn (`T20B/13.png`). | (a) Path color for the color; (b) for the names | Same as 48; names as 6. |
| 56 | T20B: the key uses the element's layer names, and sits over the top-left of the drawing (`T20B/13.png`). | (a) Key words for the names; (b) for the place | Names as 29. Where the key sits is an open owner item. |
| 57 | T20B: the Data page does not show that km is the loaded weight or what direction it reads (`T20B/15.png`). | (b) | Whether and where a loaded weight shows after load is the T20 question (first dry run, 60). |
| 58 | T20B: the Graph row reads "Shortest path 4 hops" beside a 7.5 km answer (`T20B/13.png`). | (b) | What a weighted path's row counts is a design question; the key's read-wrong case measures it (first dry run, 62). |

## Replace with a new file (T21)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 59 | T21A: the Sources row cuts "friends.csv" to "friends.c..." and "friends-v2.csv" to "friends-...", hiding the "v2" that tells them apart (`T21A/03.png`, `09.png`). | (a) Rows and shared controls | Same as 2. |
| 60 | T21A: after Load the new layout fills about the middle third of the canvas where the old one filled most of it (`T21A/06.png` against `01.png`). | (a) Import page and Sources | A replacing load lays the graph out again, so it must fit the view as an open does; keeping the camera still is right after a run, not after new data. |
| 61 | T21A: Made with's Weight reads "weight, meaning not set, read as closer" (`T21A/02.png`, `07.png`). | (a) Path form and Made with | Reads as a contradiction; the value says how it was read, and a line under it says the meaning was assumed. Same group as 27. |
| 62 | T21B: between Load and Rerun the histogram, the "12 of 12 have a value" line, the Top 10 and the key stay at full contrast; only a small bar says the data changed (`T21B/06.png`). | (b) | How stale values are marked is left for the sessions (first dry run). |
| 63 | T21B: "ran Oct 8" reads the same before and after Rerun (`T21B/06.png`, `08.png`). | (a) Path form and Made with | Same as 39: a run's record must show its time. |
| 64 | T21B: the Sources row's right-click menu opens with "Edit source..." already highlighted, which leads to the "added, not replaced" trap; the menu covers the row's counts and the key's edge (`T21B/04.png`). | (a) Rows and shared controls for the highlight; (n) for the overlap | A menu opened by the pointer has no keyboard position yet, so nothing is highlighted. A menu covers what is under it while open (first dry run, 19). |
| 65 | T21B: the Sources row cuts "team-v2.csv" to "team-v2..." (`T21B/09.png`). | (a) Rows and shared controls | Same as 2. |
| 66 | T21B: Load moves the reader from the Data page back to the Graph page (`T21B/05.png` to `06.png`). | (b) | Where a replacing load lands (with the Rerun bar, or on the source) is part of the rerun question the sessions answer. |

## Marking what meets a condition (T22)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 67 | T22A: after Enter, the rule stays selected in the find box with "press Enter to select matches" under it (`T22A/06.png`). | (a) Find and selection | A stale hint invites a second Enter and does not confirm what happened; after the rule runs, the line says what was selected. |
| 68 | T22A: a selection of three edges lists no members, only "Edges 3" (`T22A/06.png`). | (a) Find and selection | A list answers with names, not counts (a standing design rule); each selected edge is listed by its ends with the value the rule tested. |
| 69 | T22A: no stop names are drawn, so the slow links cannot be placed on the map (`T22A/06.png`). | (b) | As 6. |
| 70 | T22A: the resting find box never shows how a rule starts; the backtick form appears only after a mistake, and the "=" example uses ">" with `9`. | (b) | Whether the resting box teaches rule syntax is what T22 measures; teaching it at rest also adds words to the screen. |
| 71 | T22B: the line under the find box still reads "Rule: press Enter to select matches" after 13 ties are selected (`T22B/06.png`). | (a) Find and selection | Same as 67. |
| 72 | T22B: the example number in the help line and the refusal is `16`, a value from the data, near the task's 10 (`T22B/02.png`, `03.png`). | (n) | The example is valid because it comes from the file; the key records the priming risk. |
| 73 | T22B: a selection of 13 edges lists no members (`T22B/06.png`). | (a) Find and selection | Same as 68. |

## How far a neighborhood reaches (T23)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 74 | T23A: the setup's last click leaves the pointer where it landed, so the first screens show a hover on the Sana row the participant never made (`T23A/05.png`). | (a) Study tool | The setup clears focus before handing over; it must also move the pointer off the page. |
| 75 | T23A: the PageRank row's tooltip opens over the left rail, covering the Notes icon while it shows (`T23A/09.png`). | (n) | A tooltip covers what is under it while the pointer rests and goes when it leaves. |
| 76 | T23A: in browse mode a screen reader hears each Hops and Follow choice twice (radio "1", then text "1"). | (n) | No tier 2 session uses a screen reader (owner, 2026-10-07). The markup is the shared segmented control's radio-plus-label; check it with a real screen reader before changing it, since the study tool's reading mode has reported its own blind spots as findings before. |
| 77 | T23A: once "Filter to neighbors" is on, nothing in the panel says how to undo it; only the "15 of 20 nodes" chip shows the filter (`T23A/08.png`). | (a) Neighborhood | A pressed toggle must say what pressing it again does. |
| 78 | T23A: no names are drawn, so the 15 dots cannot be checked against the list. | (b) | As 6. |
| 79 | T23B: before the click, "Filter to neighbors" is plain text in the same weight and indent as the names under it (`T23B/05.png`, `06.png`). | (a) Neighborhood | A command drawn as a list row; it must look like a button at rest. |
| 80 | T23B: Hops 1 is alphabetical, Hops 2 is in discovery order (Acciaiuoli, Castellani, Strozzi, Barbadori, ...). | (a) Neighborhood | Inconsistent lists; display order is the app's, and every hop count lists the same way. |
| 81 | T23B: the find box's result list ends on half a row ("Select where name is Medici (1)"), with the sidebar rows showing below and nothing saying it scrolls (`T23B/03.png`). | (a) Find and selection | A list that cuts a row reads as ending there. |
| 82 | T23B: after filtering, the PageRank row reads 15 with an out-of-date mark and "Ran on 15 nodes; 12 shown now" (`T23B/08.png`). | (b) | Whether a view filter should mark a run out of date is left for the sessions (first dry run, 91 and 97). |
| 83 | T23B: the neighbor panel's words ("nodes", "hops", "Neighborhood") are graph jargon for families and marriages. | (b) | The vocabulary gap is what the sessions should watch; the one regression in it is 91. |

## Asking about one tie (T24)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 84 | T24A: the label of the node under Ivan (about 818,560) is hidden by Ivan's sphere; only "H..a" shows (`T24A/01.png`, `02.png`, `05.png`). | (a) Labels on top | A name drawn behind a node cannot be read. Labels sort by depth with the nodes today, and the element offers no way to draw them on top. |
| 85 | T24A: Chloe and Farah overlap at about 715-735,745, and Eli and Dev at about 570,755, with their labels colliding (`T24A/01.png`). | (n) for the overlap; (b) for the collision | Overlap as 14. Collision handling between labels is an open rendering design (first dry run, 101). |
| 86 | T24A: after a pointer click on a line, the canvas shows a thin focus outline (`T24A/02.png`). | (a) Focus | A pointer click must not draw a keyboard focus ring; the canvas's own ring is `:focus-visible`, so something focuses it from script after the click -- trace it. |
| 87 | T24A: the Edge actions menu covers the inspector's tabs ("Valu", `T24A/04.png`). | (n) | As 64's overlap. |
| 88 | T24B: the selected tie's blue band is drawn over the Stadium label, cutting it to "Stadi m" (`T24B/03.png`, `04.png`). | (a) Labels on top | Same as 84. |
| 89 | T24B: a click on empty canvas with the Everything inspector open changes nothing (`T24B/02.png`). | (n) | With nothing selected, an empty click has nothing to clear; the pointer cursor over a clickable edge (built after the first dry run) is the near-miss help. |
| 90 | T24B: the key's point for the tie (753,258) is about 90 px off the line along the drawing, and a click there lands on empty canvas. | (a) Study tool for the key; (n) for the build | The line's widened hit area is built; a point 90 px away should miss. The key's coordinate is re-recorded from the new build. |

## Returning to a neighborhood (T12R)

| # | Problem | Class | Reason |
| - | ------- | ----- | ------ |
| 91 | T12RA: the heading "17 nodes within 1 hop of Javert" replaced the plain "Javert's 17 connections" that earlier rounds validated. | (a) Neighborhood | A regression from tested plain language. One form at every hop count, "Javert's 17 connections", with the Hops control above it saying how far. The control's own word "Hops" is left for the sessions (83). |
| 92 | T12RA: "Filter to neighbors" is plain text with no outline and no tooltip (`T12RA/07.png`). | (a) Neighborhood | Same as 79. |
| 93 | T12RA: after "Back to Javert", nothing shows focus; the Degree row that opened the view has no ring (`T12RA/08.png`). | (a) Focus | The code intends focus to return to Degree; it does not. |
| 94 | T12RA: the find list mixes the node and his ties under one heading, "Elements", and its last row is cut in half (`T12RA/03.png`). | (a) Find and selection | Two kinds of thing under one generic heading invite a wrong pick; the half row as 81. |
| 95 | T12RA: no names drawn; the PageRank key covers the top-left of the drawing (`T12RA/01.png`). | (b) | Names as 6; the key's place as 56. |
| 96 | T12RB: "Filter to neighbors" looks like text at rest and shows a fill only on hover, with no tooltip (`T12RB/06.png`, `07.png`). | (a) Neighborhood | Same as 79. |
| 97 | T12RB: the find dropdown's last row is cut by its bottom edge, over the layer list's Selection row (`T12RB/03.png`, `04.png`). | (a) Find and selection | Same as 81. |
| 98 | T12RB: after the setup the inspector shows PageRank (Style), not Everything, while other tier 2 answer notes assume the setups end on Everything (`T12RB/01.png`). | (a) Study tool | The setups end where the ranked routine leaves them (on the run just styled); the answer notes are corrected to say so, so graders and setups agree. |

## Counts

Of the 98 items, 65 are fixed before round 1 in whole or in part, 19 are left for the sessions,
13 need no change, and one is split between no change and the sessions (85). Six fixed items
also hold a part left for the sessions (39, 55, 56) or needing no change (43, 64, 90).

The pattern under the open questions is unchanged from the first dry run: names are not drawn by
default (6, 50, 69, 78, 95 and the reasons of 33 and 55) and nodes overlap in the 3D drawing (14,
30, 33, 42, 85). Neither is polish. Both decide whether a reader can check a list against the
drawing, and both are for the sessions and the owner, not for this list.
