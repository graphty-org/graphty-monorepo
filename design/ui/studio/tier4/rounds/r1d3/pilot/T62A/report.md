# Pilot: T62 A (pantries.csv, "which site opened most recently") -- targeted re-walk

Build: a53beb7179 (frozen, served from .study-builds/tier4-r1d3-a53beb7179). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing, the table open). All screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Result: reached by pointer and by keyboard. Answer on screen: **Bayview Clinic** (P12, Mar 8,
2023), with `opened`'s kind set to date (calendar glyph in the header).

## How the walks were run

Each walk replayed the same route from the previous frozen build (bccf8fe47f), each in its own
session. All matched every check point to the end (exit 0), so every screen below is this build's
own. The keyboard walk (w4-keys) matched the first round's 73-step route end to end. The two
detours had first been replayed against the first round's walks, which drew the dates as
"Mar 2, 2015" after "Set in Data"; this build keeps a text-kind column as ISO text whatever its
role (the decided behavior, the same as on bccf8fe47f), so they were walked again from the
previous build's routes and matched.

## Route 1: success path by pointer (p1-path)

All 7 steps matched. Start: `opened` reads Aa with ISO text "2015-03-02"; the inspector shows
"Time: opened" with "Set in Data" (p1-path/01.png). Header "Options for opened" > Type > date turns
the glyph to a calendar and the cells to "Mar 2, 2015" (p1-path/05.png); "Options for opened" >
Sort descending gives "Sorted by opened, newest first" with P12 Bayview Clinic, Mar 8, 2023 on
top (p1-path/06.png). Path steps: 5, as the answer key says.

## Route 2a: detour, the inspector's "Set in Data" (w2-inspector)

All 11 steps matched. "Set in Data" sets the node Time to `opened`: Fields gains a Time row, the
canvas toolbar gains a clock button, the header reads "Aa Time opened" and the cells stay ISO text
(w2-inspector/02.png). Header clicks sort and put Bayview Clinic on top; Escape in the Time row's
list keeps the value; Fields "+" > Kind adds an empty row that Escape takes back. Header menu >
Type > date then sets the kind: calendar glyph, "Mar 8, 2023", "Sorted by opened, newest first"
(w2-inspector/12.png).

## Route 2b: detour, Data > Fields "+" > Time > opened (w3-fields)

All 12 steps matched. Fields "+" > Time adds an empty Time row with its list open; choosing
`opened` gives the same state as 2a, and the header menu's Type still checks text, with number and
yes/no marked "12 will not convert" (w3-fields/07.png). Right-click on the header opens the same
header menu; right-click on the source row offers nothing about a column's kind; Escape closes
each menu (w3-fields/13.png).

## Route 3: success path by keyboard only (w4-keys, --keys --sr)

All 73 steps matched, so the Tab order and findings of the earlier walks stand. ArrowRight walks
the grid headers to "text opened"; Shift+F10 opens the header menu at Type; ArrowRight, ArrowDown
to "date", Enter sets the kind; Shift+F10 > Sort descending gives "Sorted by opened, newest
first"; arrows reach the cell "Bayview Clinic" and Enter selects P12 (w4-keys/60.png).

## Routes in the fix list

Each route below ran in its own session on this build (a53beb7179), by replay of the newest earlier
walk of the same route, from that route's own start (the setup its task uses: volunteers.graphml for
T65 A, gauges.csv and flows.csv for T65 B, T66 B, T68 B and T64 B, pantries.csv and deliveries.csv for
T66 A, T68 A and T64 A). Every one replayed to its end with every check point matched (exit 0), so
each screen is the same as on the walk it replayed; the last screenshot of each was looked at. Steps
that printed "ambiguous" or "nothing on screen is called" did the same on the walk replayed (a tool
name, not the app). Folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T62A/.

| Route | Folder | Steps | What the end screen shows |
| --- | --- | --- | --- |
| T62 A success path (pointer, again) | r00-T62A-path | 7 | "Sorted by opened, newest first", P12 Bayview Clinic, Mar 8, 2023 on top, calendar glyph (06.png) |
| T65 A success path | r01-T65A-path | 24 | 14 of 24 nodes, 4 nodes selected; role Select card chip "5 of 24" (17.png) |
| T65 A other card order | r02-T65A-order | 11 | same counts; Escape after typing 12 keeps 12 (12.png) |
| T65 A keyboard walk (the chip's spoken count) | r03-T65A-keys | 127 | announces "Filter on: 14 of 24 nodes, 22 edges" then "4 nodes selected"; Undo announced (111.png, 123.png) |
| T65 A undo and redo of the keep card's edit | r04-T65A-redo | 28 | "Redid turning on the filter ...", 14 of 24 and 4 selected (29.png) |
| T65 B success path | r05-T65B-path | 15 | 5 of 12 nodes, 3 nodes selected; installed Select card chip "5 of 12" (14.png) |
| T65 B other card order (Undo and Redo of the depth edit) | r06-T65B-order | 7 | same state after Undo and Redo (08.png) |
| T65 B keyboard and screen-reader walk | r07-T65B-keys-sr | 12 | "5 of 5 rows, 3 selected", "3 nodes selected"; browse mode reads both cards as "Node 5 of 12" (11.png, 13.png) |
| T65 B style layer Which nodes | r08-T65B-which-nodes | 7 | unchanged (08.png) |
| T66 A Data source card's count | r09-T66A-sourcecard | 15 | Data source card "12 of 13", 12 of 13 nodes, 17 of 18 edges (13.png) |
| T66 B Data source card's count | r10-T66B-sourcecard | 17 | "11 of 12", 11 of 12 nodes, 13 of 14 edges (18.png) |
| T68 A start | r11-T68A-start | 4 | narrowed card "12 of 13", 17 of 18 edges shown (05.png) |
| T68 B start | r12-T68B-start | 3 | "11 of 12", 13 of 14 edges; Escape clears the selection (04.png) |
| T64 A success path | r13-T64A-path | 21 | label site, Weight trips, Higher means closer (22.png) |
| T64 A table role re-run | r14-T64A-table-role | 31 | Shortest path lists "trips (closer, loaded, not read)" and starts on None, as answers.md says (32.png) |
| T64 B table role re-run | r15-T64B-table-role | 14 | path found (15.png) |
| T64 B Analyze's weight | r16-T64B-analyze-weight | 7 | Weight "km (farther)", path G05, G08, G09, total km 5.3 (08.png) |

None of these routes belongs to T62 A; they are reported here because this pass listed them.

## Mismatches between the answer key and the screen

None on the success path.

## Defects (crash, block or a wrong result that spoils grading)

None on the pointer success path or the two detours.

On the listed routes of other tasks (not T62 A), one wrong count that can spoil grading, the same on
both datasets: a Select card's chip counts over the whole graph, not what it marks within the picture,
against decided.md "A Select card's count counts what it marks" (which expects A "4 of 14", B "3 of 5").
T65 A reads "5 of 24" while "4 nodes selected" (r01-T65A-path/17.png); T65 B reads "5 of 12" while
"3 nodes selected", and a screen reader reads both cards as "Node 5 of 12" (r05-T65B-path/14.png,
r07-T65B-keys-sr/13.png). Minor: the live message reads "1 edges" (r07-T65B-keys-sr/08.png).

Keyboard (carried, unchanged on this build): the header menu, the only place that sets a column's
kind, opens only with Shift+F10; the "..." button is not a Tab or arrow stop and nothing on screen
names the key (w4-keys/48.png, 49.png).
